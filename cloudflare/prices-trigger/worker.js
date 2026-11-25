// Cloudflare Cron → GitHub Actions workflow_dispatch for update-prices.
// No KV / storage. Free-plan friendly: one cron trigger, tiny CPU.
const OWNER = 'mabi-life';
const REPO = 'mabi-life.github.io';
const WORKFLOW = 'prices.yml';
const REF = 'main';
const STALE_MS = 20 * 60 * 1000; // queued longer than this is not a live run
const IN_PROGRESS_MAX_MS = 40 * 60 * 1000; // prices.yml timeout-minutes
const ZERO_JOB_GRACE_MS = 5 * 60 * 1000; // brand-new runs may have 0 jobs for a moment
const RUNS = `https://api.github.com/repos/${OWNER}/${REPO}/actions`;

function ghHeaders(token) {
  return {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'mabi-prices-trigger',
    'X-GitHub-Api-Version': '2022-11-28',
  };
}

async function ghJson(url, headers) {
  const res = await fetch(url, { headers });
  if (!res.ok) return null;
  try {
    return await res.json();
  } catch (_) {
    return null;
  }
}

async function listRuns(headers, status) {
  const j = await ghJson(
    `${RUNS}/workflows/${WORKFLOW}/runs?status=${status}&per_page=5`,
    headers,
  );
  return (j && j.workflow_runs) || [];
}

async function jobCount(headers, runId) {
  const j = await ghJson(`${RUNS}/runs/${runId}/jobs?per_page=1`, headers);
  if (!j) return null;
  return typeof j.total_count === 'number' ? j.total_count : (j.jobs || []).length;
}

async function tryCancel(headers, runId) {
  try {
    await fetch(`${RUNS}/runs/${runId}/cancel`, { method: 'POST', headers });
  } catch (_) {}
}

function ageMs(iso) {
  const t = Date.parse(iso);
  return t ? Date.now() - t : 0;
}

function isGhost(run, jobs) {
  const age = ageMs(run.created_at);
  if (run.status === 'queued' && age > STALE_MS) return true;
  if (jobs === 0 && age > ZERO_JOB_GRACE_MS) return true;
  if (run.status === 'in_progress' && ageMs(run.run_started_at || run.created_at) > IN_PROGRESS_MAX_MS) return true;
  return false;
}

async function inspect(headers, runs) {
  const ghosts = [];
  const realInProgress = [];
  const realQueued = [];
  for (const run of runs) {
    const age = ageMs(run.created_at);
    let jobs = null;
    // Skip the jobs API when queued>20m is already enough to call it a ghost.
    if (!(run.status === 'queued' && age > STALE_MS)) {
      jobs = await jobCount(headers, run.id);
    }
    if (isGhost(run, jobs)) {
      ghosts.push(run);
      continue;
    }
    if (run.status === 'in_progress') realInProgress.push(run);
    else if (run.status === 'queued') realQueued.push(run);
  }
  return { ghosts, realInProgress, realQueued };
}

async function dispatch(headers) {
  const res = await fetch(`${RUNS}/workflows/${WORKFLOW}/dispatches`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ref: REF }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`dispatch ${res.status}: ${body.slice(0, 200)}`);
  }
}

export default {
  async scheduled(_controller, env) {
    const token = env.GH_TOKEN;
    if (!token) throw new Error('GH_TOKEN missing');
    const headers = ghHeaders(token);

    const open = (await listRuns(headers, 'in_progress')).concat(await listRuns(headers, 'queued'));
    const { ghosts, realInProgress, realQueued } = await inspect(headers, open);
    for (const g of ghosts) await tryCancel(headers, g.id);
    if (ghosts.length) console.log(`ignored ${ghosts.length} stale/empty prices.yml run(s)`);

    if (realInProgress.length) {
      console.log('skip: prices.yml already in_progress');
      return;
    }
    if (realQueued.length) {
      console.log('skip: prices.yml already queued');
      return;
    }

    // Nothing real is running (ghost queued/empty-job/stale in_progress ignored).
    // This also covers: last success is older than 20m and no real in_progress.
    await dispatch(headers);
    console.log('dispatched prices.yml');
  },
};
