const SERVERS = ['류트', '만돌린', '하프', '울프'];
const KEEP_MS = 48 * 3600 * 1000;
const CAP = 3000;

function cors(h = {}) {
  return {
    ...h,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

async function collect(env) {
  if (!env.NEXON_API_KEY) throw new Error('NEXON_API_KEY missing');
  let prev = { rows: [] };
  try {
    const raw = await env.HORN.get('history');
    if (raw) prev = JSON.parse(raw);
  } catch (_) {}
  const map = new Map();
  for (const r of prev.rows || []) map.set(r.id, r);
  const cut = Date.now() - KEEP_MS;
  let ok = 0;
  const st = {};
  for (const s of SERVERS) {
    const u =
      'https://open.api.nexon.com/mabinogi/v1/horn-bugle-world/history?server_name=' +
      encodeURIComponent(s);
    try {
      const res = await fetch(u, {
        headers: { 'x-nxopen-api-key': env.NEXON_API_KEY },
      });
      st[s] = res.status;
      if (!res.ok) {
        continue;
      }
      const d = await res.json();
      ok++;
      for (const x of d.horn_bugle_world_history || []) {
        const m = (x.message || '').trim();
        if (!m) continue;
        const n = (x.character_name || '').trim();
        const t = x.date_send || '';
        const rid = await sha12(`${s}|${n}|${t}|${m}`);
        if (!map.has(rid)) map.set(rid, { id: rid, s, t, n, m });
      }
    } catch (e) {
      st[s] = 'exc';
    }
  }
  const nowKst = new Date(Date.now() + 9 * 3600000).toISOString().slice(0, 19) + '+09:00';
  if (!ok) {
    await env.HORN.put('last_error', JSON.stringify({ at: nowKst, status: st }));
    throw new Error('no server ok');
  }
  await env.HORN.put('last_ok', JSON.stringify({ at: nowKst, status: st }));
  const all = [...map.values()]
    .filter((r) => {
      const ms = Date.parse(r.t);
      return !Number.isNaN(ms) && ms >= cut;
    })
    .sort((a, b) => (a.t < b.t ? 1 : -1));
  const per = {};
  const rows = [];
  for (const r of all) {
    per[r.s] = (per[r.s] || 0) + 1;
    if (per[r.s] <= CAP) rows.push(r);
  }
  const kst = new Date(Date.now() + 9 * 3600000)
    .toISOString()
    .replace('Z', '+09:00');
  const body = {
    updated: kst.slice(0, 19) + '+09:00',
    source:
      'Cloudflare Worker + NEXON Open API horn-bugle-world/history (5분 cron, 48시간)',
    rows,
  };
  await env.HORN.put('history', JSON.stringify(body));
  return { ok, count: rows.length, updated: body.updated };
}

async function sha12(s) {
  const b = new TextEncoder().encode(s);
  const h = await crypto.subtle.digest('SHA-1', b);
  return [...new Uint8Array(h)]
    .map((x) => x.toString(16).padStart(2, '0'))
    .join('')
    .slice(0, 12);
}

async function authed(request, env) {
  const tok = env.COLLECT_TOKEN;
  if (!tok) return false;
  const h = request.headers.get('Authorization') || '';
  const given = h.startsWith('Bearer ') ? h.slice(7) : (request.headers.get('X-Collect-Token') || '');
  const enc = new TextEncoder();
  const [a, b] = await Promise.all([
    crypto.subtle.digest('SHA-256', enc.encode(given)),
    crypto.subtle.digest('SHA-256', enc.encode(tok)),
  ]);
  const x = new Uint8Array(a), y = new Uint8Array(b);
  let d = 0;
  for (let i = 0; i < x.length; i++) d |= x[i] ^ y[i];
  return d === 0;
}

export default {
  async fetch(request, env, ctx) {
    if (request.method === 'OPTIONS')
      return new Response(null, { status: 204, headers: cors() });
    const url = new URL(request.url);
    if (url.pathname === '/collect') {
      if (request.method !== 'POST' || !(await authed(request, env)))
        return Response.json({ error: 'unauthorized' }, { status: 401, headers: cors({ 'Cache-Control': 'no-store' }) });
      try {
        const r = await collect(env);
        return Response.json(r, { headers: cors() });
      } catch (e) {
        return Response.json(
          { error: 'collect failed' },
          { status: 500, headers: cors() }
        );
      }
    }
    if (url.pathname === '/health') {
      const [h, le, lo] = await Promise.all([
        env.HORN.get('history').then((r) => (r ? JSON.parse(r).updated : null)),
        env.HORN.get('last_error').then((r) => (r ? JSON.parse(r) : null)),
        env.HORN.get('last_ok').then((r) => (r ? JSON.parse(r) : null)),
      ]);
      return Response.json({ updated: h, last_ok: lo ? { at: lo.at } : null, last_error: le ? { at: le.at } : null }, { headers: cors({ 'Cache-Control': 'no-store' }) });
    }
    if (
      url.pathname === '/' ||
      url.pathname === '/horn_history.json' ||
      url.pathname.endsWith('.json')
    ) {
      if (url.searchParams.get('refresh') === '1' && (await authed(request, env))) {
        ctx.waitUntil(collect(env).catch(() => {}));
      }
      const raw = await env.HORN.get('history');
      if (!raw)
        return new Response('{"rows":[],"updated":null}', {
          headers: cors({
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store',
          }),
        });
      return new Response(raw, {
        headers: cors({
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'public, max-age=30',
        }),
      });
    }
    return new Response('mabi horn worker', { headers: cors() });
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(collect(env));
  },
};
