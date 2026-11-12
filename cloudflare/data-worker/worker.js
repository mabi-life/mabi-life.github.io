// mabi-data: 비공개 저장소(mabi-life/mabi-data)의 NEXON Open API 수집 JSON을
// mabi-life.com 에서 온 요청에만 내려주는 Worker. 그 외 출처는 403.
//
// 요청 경로: Origin 검사(항상 먼저) → isolate 메모리 → Cache API(caches.default)
//          → D1(비공개, 바인딩으로만 접근) → (D1이 비었을 때만) GitHub API.
// GitHub이 원본. cron(5분)이 바뀐 파일만 D1로 복사하므로 사용자 요청은 GitHub을 기다리지 않음.
// 응답은 Cache-Control: private → CDN이 Worker(Origin 검사)를 건너뛰고 내주지 않음.
const REPO = 'mabi-life/mabi-data';
const ALLOW = new Set(['https://mabi-life.com', 'https://www.mabi-life.com']);
// 경로 → [브랜치, 서버 신선도(초)]. 목록에 없는 파일(누적 원본 등)은 제공하지 않음.
const FILES = {
  'prices.json': ['prices', 300],
  'pyeollin_history.json': ['prices', 300],
  'auction/data.json': ['prices', 300],
  'auction/history.json': ['prices', 300],
  'auction/idea_data.json': ['prices', 300],
  'auction/enchant_data.json': ['prices', 300],
  'auction/enchant_history.json': ['prices', 300],
  'auction/echo_data.json': ['prices', 300],
  'auction/echo_history.json': ['prices', 300],
  'auction/warranty_data.json': ['prices', 300],
  'horn_beads.json': ['horn', 120],
};
const SWR = 3600; // 신선도가 지난 뒤에도 이 시간(초)까지는 바로 주고 뒤에서 갱신
const BROWSER_TTL = 120; // 브라우저 캐시(private)
const PART = 400000; // D1 한 행에 넣을 최대 글자 수(행 최대 2MB 이하로)
const CACHE_HOST = 'https://mabi-data.cache/v2/'; // 캐시 키: Origin 미포함

const MEM = new Map(); // path → {bytes, sha, at}
const INFLIGHT = new Map();
let lastKick = 0;

function originOf(req) {
  const o = req.headers.get('Origin');
  if (o) return ALLOW.has(o) ? o : null;
  const r = req.headers.get('Referer');
  if (!r) return null;
  try { const u = new URL(r).origin; return ALLOW.has(u) ? u : null; } catch (_) { return null; }
}

function hdr(origin, extra = {}) {
  const h = { 'X-Content-Type-Options': 'nosniff', Vary: 'Origin', ...extra };
  if (origin) {
    h['Access-Control-Allow-Origin'] = origin;
    h['Access-Control-Allow-Methods'] = 'GET, OPTIONS';
  }
  return h;
}

function gh(env, url, raw) {
  return fetch(url, {
    headers: {
      Authorization: `Bearer ${env.GH_TOKEN}`,
      Accept: raw ? 'application/vnd.github.raw' : 'application/vnd.github+json',
      'User-Agent': 'mabi-data-worker',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
}

// 읽기는 가장 가까운 D1 읽기 복제본으로 (read replication: auto)
const rdb = (env) => (env.DB.withSession ? env.DB.withSession('first-unconstrained') : env.DB);

async function dbRead(env, path) {
  const r = await rdb(env).prepare(
    'SELECT f.sha AS sha, f.parts AS parts, p.body AS body FROM files f JOIN parts p ON p.path = f.path WHERE f.path = ?1 ORDER BY p.i'
  ).bind(path).all();
  const rows = r.results || [];
  if (!rows.length || rows.length !== rows[0].parts) return null;
  return { sha: rows[0].sha, bytes: new TextEncoder().encode(rows.map((x) => x.body).join('')) };
}

async function dbWrite(env, path, sha, buf) {
  const text = new TextDecoder().decode(buf);
  const parts = [];
  for (let i = 0; i < text.length; ) {
    let e = Math.min(i + PART, text.length);
    const c = text.charCodeAt(e - 1);
    if (e < text.length && c >= 0xd800 && c <= 0xdbff) e--; // 서로게이트 쌍을 자르지 않음
    parts.push(text.slice(i, e));
    i = e;
  }
  if (!parts.length) parts.push('');
  await env.DB.batch([
    env.DB.prepare('DELETE FROM parts WHERE path = ?1').bind(path),
    ...parts.map((b, i) => env.DB.prepare('INSERT INTO parts (path, i, body) VALUES (?1, ?2, ?3)').bind(path, i, b)),
    env.DB.prepare('INSERT OR REPLACE INTO files (path, sha, bytes, parts, updated) VALUES (?1, ?2, ?3, ?4, ?5)')
      .bind(path, sha, buf.byteLength, parts.length, Date.now()),
  ]);
}

// GitHub 트리의 blob sha와 D1을 비교해 바뀐 파일만 복사.
async function syncAll(env) {
  const t0 = Date.now();
  const out = { at: t0, changed: [], errors: [], rate: null };
  const have = new Map(((await env.DB.prepare('SELECT path, sha FROM files').all()).results || []).map((r) => [r.path, r.sha]));
  for (const br of [...new Set(Object.values(FILES).map((f) => f[0]))]) {
    try {
      const res = await gh(env, `https://api.github.com/repos/${REPO}/git/trees/${br}?recursive=1`);
      out.rate = res.headers.get('x-ratelimit-remaining');
      if (!res.ok) { out.errors.push(`${br}:${res.status}`); continue; }
      const sha = new Map(((await res.json()).tree || []).filter((e) => e.type === 'blob').map((e) => [e.path, e.sha]));
      for (const [p, [b]] of Object.entries(FILES)) {
        if (b !== br) continue;
        const s = sha.get(p);
        if (!s) { out.errors.push(`${p}:missing`); continue; }
        if (have.get(p) === s) continue;
        const fr = await gh(env, `https://api.github.com/repos/${REPO}/git/blobs/${s}`, true);
        if (!fr.ok) { out.errors.push(`${p}:${fr.status}`); continue; }
        const buf = await fr.arrayBuffer();
        await dbWrite(env, p, s, buf);
        MEM.set(p, { bytes: new Uint8Array(buf), sha: s, at: Date.now() });
        out.changed.push(p);
      }
    } catch (e) {
      out.errors.push(`${br}:exc`);
    }
  }
  out.ms = Date.now() - t0;
  await env.DB.prepare('INSERT OR REPLACE INTO meta (k, v) VALUES (?1, ?2)').bind('last_sync', JSON.stringify(out)).run();
  return out;
}

function kickSync(env, ctx) {
  if (Date.now() - lastKick < 60000) return;
  lastKick = Date.now();
  ctx.waitUntil(syncAll(env).catch(() => {}));
}

function cachePut(path, ent) {
  return caches.default.put(
    new Request(CACHE_HOST + path),
    new Response(ent.bytes, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': `max-age=${86400}`, // 내부 Cache API 보관용. 신선도는 X-Stored-At으로 판단
        'X-Stored-At': String(ent.at),
        'X-Sha': ent.sha || '',
      },
    })
  ).catch(() => {});
}

function revalidate(env, ctx, path, cur) {
  if (INFLIGHT.has(path)) return;
  const p = (async () => {
    const row = await rdb(env).prepare("SELECT sha, (SELECT v FROM meta WHERE k = 'last_sync') AS ls FROM files WHERE path = ?1").bind(path).first();
    // cron이 멈췄을 때 대비: 마지막 동기화가 12분 넘게 지났으면 여기서 한 번 동기화
    let lsAt = 0;
    try { lsAt = row && row.ls ? JSON.parse(row.ls).at : 0; } catch (_) {}
    if (row && Date.now() - lsAt > 12 * 60000) kickSync(env, ctx);
    let ent;
    if (row && cur && row.sha === cur.sha) ent = { bytes: cur.bytes, sha: cur.sha, at: Date.now() };
    else {
      const d = await dbRead(env, path);
      if (!d) return;
      ent = { ...d, at: Date.now() };
    }
    MEM.set(path, ent);
    await cachePut(path, ent);
  })().catch(() => {}).finally(() => INFLIGHT.delete(path));
  INFLIGHT.set(path, p);
  ctx.waitUntil(p);
}

async function getFile(env, ctx, path, branch, ttl) {
  const now = Date.now(), fresh = ttl * 1000, max = (ttl + SWR) * 1000;
  const m = MEM.get(path);
  if (m && now - m.at < fresh) return [m.bytes, 'mem'];
  if (m && now - m.at < max) { revalidate(env, ctx, path, m); return [m.bytes, 'mem-stale']; }
  const c = await caches.default.match(new Request(CACHE_HOST + path));
  if (c) {
    const at = +c.headers.get('X-Stored-At') || 0;
    if (now - at < max) {
      const ent = { bytes: new Uint8Array(await c.arrayBuffer()), sha: c.headers.get('X-Sha'), at };
      MEM.set(path, ent);
      if (now - at < fresh) return [ent.bytes, 'cache'];
      revalidate(env, ctx, path, ent);
      return [ent.bytes, 'cache-stale'];
    }
  }
  try {
    const d = await dbRead(env, path);
    if (d) {
      const ent = { ...d, at: now };
      MEM.set(path, ent);
      ctx.waitUntil(cachePut(path, ent));
      return [ent.bytes, 'd1'];
    }
  } catch (_) {}
  // D1이 비어 있을 때(첫 배포 등)만: GitHub에서 한 번 받아 주고, 뒤에서 D1 채우기
  const r = await gh(env, `https://api.github.com/repos/${REPO}/contents/${path}?ref=${branch}`, true);
  if (!r.ok) return null;
  const bytes = new Uint8Array(await r.arrayBuffer());
  kickSync(env, ctx);
  return [bytes, 'github'];
}

async function health(env) {
  const [f, s] = await Promise.all([
    rdb(env).prepare('SELECT path, bytes, updated FROM files ORDER BY path').all(),
    rdb(env).prepare("SELECT v FROM meta WHERE k = 'last_sync'").first(),
  ]);
  const ls = s ? JSON.parse(s.v) : null;
  const files = Object.keys(FILES).map((p) => {
    const r = (f.results || []).find((x) => x.path === p);
    return { path: p, stored: !!r, bytes: r ? r.bytes : 0, updated: r ? new Date(r.updated).toISOString() : null };
  });
  return {
    store: 'd1',
    files,
    last_sync: ls && { at: new Date(ls.at).toISOString(), ms: ls.ms, changed: ls.changed.length, errors: ls.errors, github_rate_remaining: ls.rate },
  };
}

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (url.pathname === '/robots.txt')
      return new Response('User-agent: *\nDisallow: /\n', { headers: { 'Content-Type': 'text/plain' } });
    if (url.pathname === '/health') {
      try {
        return Response.json(await health(env), { headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' } });
      } catch (_) {
        return Response.json({ error: 'health failed' }, { status: 500, headers: { 'Cache-Control': 'no-store' } });
      }
    }
    // Origin 검사: 캐시·D1·GitHub 어느 것보다 먼저, 모든 요청에서.
    const origin = originOf(req);
    if (!origin) return new Response('forbidden', { status: 403, headers: hdr(null, { 'Cache-Control': 'no-store' }) });
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: hdr(origin, { 'Access-Control-Max-Age': '86400' }) });
    if (req.method !== 'GET' && req.method !== 'HEAD') return new Response('method', { status: 405, headers: hdr(origin) });
    const path = url.pathname.replace(/^\/+/, '');
    const f = FILES[path];
    if (!f) return new Response('not found', { status: 404, headers: hdr(origin, { 'Cache-Control': 'no-store' }) });
    const got = await getFile(env, ctx, path, f[0], f[1]);
    if (!got) return new Response('upstream error', { status: 502, headers: hdr(origin, { 'Cache-Control': 'no-store' }) });
    return new Response(req.method === 'HEAD' ? null : got[0], {
      status: 200,
      headers: hdr(origin, {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': `private, max-age=${BROWSER_TTL}`,
        'X-Data-Source': got[1],
      }),
    });
  },
  async scheduled(event, env, ctx) {
    ctx.waitUntil(syncAll(env));
  },
};
