// mabi-data: 비공개 저장소(mabi-life/mabi-data)의 NEXON Open API 수집 JSON을
// mabi-life.com 에서 온 요청에만 내려주는 Worker. 그 외 출처는 403.
const REPO = 'mabi-life/mabi-data';
const ALLOW = new Set(['https://mabi-life.com', 'https://www.mabi-life.com']);
// 경로 → [브랜치, 엣지 캐시 초]. 목록에 없는 파일(누적 원본 등)은 제공하지 않음.
const FILES = {
  'prices.json': ['prices', 60],
  'pyeollin_history.json': ['prices', 60],
  'auction/data.json': ['prices', 60],
  'auction/history.json': ['prices', 60],
  'auction/idea_data.json': ['prices', 60],
  'auction/enchant_data.json': ['prices', 60],
  'auction/enchant_history.json': ['prices', 60],
  'auction/echo_data.json': ['prices', 60],
  'auction/echo_history.json': ['prices', 60],
  'auction/warranty_data.json': ['prices', 60],
  'horn_beads.json': ['horn', 30],
};

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

export default {
  async fetch(req, env, ctx) {
    const url = new URL(req.url);
    if (url.pathname === '/robots.txt')
      return new Response('User-agent: *\nDisallow: /\n', { headers: { 'Content-Type': 'text/plain' } });
    const origin = originOf(req);
    if (!origin) return new Response('forbidden', { status: 403, headers: hdr(null, { 'Cache-Control': 'no-store' }) });
    if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: hdr(origin, { 'Access-Control-Max-Age': '86400' }) });
    if (req.method !== 'GET' && req.method !== 'HEAD') return new Response('method', { status: 405, headers: hdr(origin) });
    const path = url.pathname.replace(/^\/+/, '');
    const f = FILES[path];
    if (!f) return new Response('not found', { status: 404, headers: hdr(origin, { 'Cache-Control': 'no-store' }) });
    const [branch, ttl] = f;
    const cache = caches.default;
    const key = new Request(`https://mabi-data.cache/${branch}/${path}`);
    let res = await cache.match(key);
    if (!res) {
      const gh = await fetch(`https://api.github.com/repos/${REPO}/contents/${path}?ref=${branch}`, {
        headers: {
          Authorization: `Bearer ${env.GH_TOKEN}`,
          Accept: 'application/vnd.github.raw',
          'User-Agent': 'mabi-data-worker',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      });
      if (!gh.ok) return new Response('upstream ' + gh.status, { status: 502, headers: hdr(origin, { 'Cache-Control': 'no-store' }) });
      res = new Response(gh.body, {
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': `public, max-age=${ttl}` },
      });
      ctx.waitUntil(cache.put(key, res.clone()));
    }
    return new Response(req.method === 'HEAD' ? null : res.body, {
      status: 200,
      headers: hdr(origin, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': `public, max-age=${ttl}` }),
    });
  },
};
