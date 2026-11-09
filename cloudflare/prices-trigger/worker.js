// Cloudflare Cron → GitHub Actions workflow_dispatch for update-prices.
// No KV / storage. Free-plan friendly: one cron trigger, tiny CPU.
const OWNER = 'mabi-life';
const REPO = 'mabi-life.github.io';
const WORKFLOW = 'prices.yml';
const REF = 'main';

function ghHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'mabi-prices-trigger',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

async function hasActiveRun(headers) {
  const base = `https://api.github.com/repos/${OWNER}/${REPO}/actions/workflows/${WORKFLOW}/runs`;
  for (const status of ['in_progress', 'queued']) {
    const res = await fetch(`${base}?status=${status}&per_page=1`, { headers });
    if (!res.ok) continue;
    const j = await res.json();
    if ((j.total_count || 0) > 0) return status;
  }
  return null;
}

export default {
  async scheduled(_controller, env) {
    const token = env.GH_TOKEN;
    if (!token) throw new Error('GH_TOKEN missing');
    const headers = ghHeaders(token);
    const active = await hasActiveRun(headers);
    if (active) {
      console.log(`skip: prices.yml already ${active}`);
      return;
    }
    const res = await fetch(
      `https://api.github.com/repos/${OWNER}/${REPO}/actions/workflows/${WORKFLOW}/dispatches`,
      {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ ref: REF }),
      },
    );
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`dispatch ${res.status}: ${body.slice(0, 200)}`);
    }
    console.log('dispatched prices.yml');
  },
};
