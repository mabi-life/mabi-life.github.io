const SERVERS = ['류트', '만돌린', '하프', '울프'];
const KEEP_MS = 48 * 3600 * 1000;
const CAP = 3000;

// 거뿔 내역(NEXON Open API 결과)은 mabi-life.com 에서 온 요청에만 제공. 그 외 출처는 403.
const ALLOW = new Set(['https://mabi-life.com', 'https://www.mabi-life.com']);
function originOf(req) {
  const o = req.headers.get('Origin');
  if (o) return ALLOW.has(o) ? o : null;
  const r = req.headers.get('Referer');
  if (!r) return null;
  try { const u = new URL(r).origin; return ALLOW.has(u) ? u : null; } catch (_) { return null; }
}

function cors(h = {}, origin = null) {
  const o = {
    ...h,
    'X-Content-Type-Options': 'nosniff',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    Vary: 'Origin',
  };
  if (origin) {
    o['Access-Control-Allow-Origin'] = origin;
    o['Access-Control-Allow-Methods'] = 'GET, OPTIONS';
    o['Access-Control-Allow-Headers'] = 'Content-Type';
  }
  return o;
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

// 거뿔 내역 캐시: 5분 cron이라 60초 신선, 5분까지는 바로 주고 뒤에서 KV로 갱신.
const H_KEY = 'https://mabi-horn.cache/v1/history';
const H_FRESH = 60000, H_STALE = 300000;
let hRefreshing = null;
async function hPut(raw) {
  await caches.default.put(new Request(H_KEY), new Response(raw, {
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'max-age=3600', 'X-Stored-At': String(Date.now()) },
  })).catch(() => {});
}
function hRefresh(env, ctx) {
  if (hRefreshing) return;
  hRefreshing = env.HORN.get('history', { cacheTtl: 60 })
    .then((raw) => (raw ? hPut(raw) : null))
    .catch(() => {})
    .finally(() => { hRefreshing = null; });
  ctx.waitUntil(hRefreshing);
}
async function historyBody(env, ctx) {
  const c = await caches.default.match(new Request(H_KEY));
  if (c) {
    const age = Date.now() - (+c.headers.get('X-Stored-At') || 0);
    if (age < H_FRESH) return [c.body, 'cache'];
    if (age < H_STALE) { hRefresh(env, ctx); return [c.body, 'cache-stale']; }
  }
  const raw = await env.HORN.get('history', { cacheTtl: 60 });
  if (!raw) return null;
  ctx.waitUntil(hPut(raw));
  return [raw, 'kv'];
}

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/robots.txt')
      return new Response('User-agent: *\nDisallow: /\n', { headers: { 'Content-Type': 'text/plain' } });
    const origin = originOf(request);
    if (request.method === 'OPTIONS')
      return new Response(null, { status: origin ? 204 : 403, headers: cors({}, origin) });
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
      if (!origin)
        return new Response('forbidden', { status: 403, headers: cors({ 'Cache-Control': 'no-store' }) });
      if (url.searchParams.get('refresh') === '1' && (await authed(request, env))) {
        ctx.waitUntil(collect(env).catch(() => {}));
      }
      // Origin 검사 통과 뒤에만 캐시 조회. Cache API(데이터센터별) → KV(cacheTtl) 순.
      const res = await historyBody(env, ctx);
      if (!res)
        return new Response('{"rows":[],"updated":null}', {
          headers: cors({
            'Content-Type': 'application/json; charset=utf-8',
            'Cache-Control': 'no-store',
          }, origin),
        });
      return new Response(request.method === 'HEAD' ? null : res[0], {
        headers: cors({
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'private, max-age=60',
          'X-Data-Source': res[1],
        }, origin),
      });
    }
    return new Response('mabi horn worker', { headers: cors() });
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(collect(env));
  },
};
