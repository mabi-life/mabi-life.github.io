/* 핫딜 공통: 경매장 카드와 홈 한 줄 알림이 같은 기준·같은 시세 파일을 씁니다. 토템은 넣지 않아요. */
(function (global) {
  const WD = 'https://mabi-data.mabilife.workers.dev/';
  const WT = () => '?t=' + Math.floor(Date.now() / 3e5);
  const HOT = {
    TRADES: 3,
    SHOW: 10,
    MIN: 10000000,
    HOUR: 1 * 3600 * 1000,
    TWO: 2 * 3600 * 1000,
    DROPS: 2,
    FILL: 3,
    FILL_FALL: 0.1
  };
  const CFIX = '하이드라 연성 마법 보호 감소 수치';
  const eK = r => r.kind + '|' + r.affix + '|' + r.name + '|' + r.rank;
  const cK = r => r.c + '|' + r.a + '|' + r.l;

  function getJ(u) {
    return fetch(u).then(r => {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    });
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, c => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    }[c]));
  }
  function med(h) {
    if (!h || !(h.length >= HOT.TRADES)) return null;
    const k = h.slice(-10).map(x => x[1]).sort((a, b) => a - b), m = k.length, mid = m >> 1;
    return [m % 2 ? k[mid] : Math.round((k[mid - 1] + k[mid]) / 2), m];
  }
  function val(snap, keys) {
    if (!snap || !snap.m) return null;
    let v = null;
    for (const k of keys) {
      const x = snap.m[k];
      if (x && (!v || x < v)) v = x;
    }
    return v;
  }
  function snapSrc(s, tab) {
    const k = tab === 'idea' ? 'idea' : tab === 'enchant' ? 'enchant' : tab === 'echo' ? 'echo' : tab === 'totem' ? 'totem' : 'relic';
    return (s.src && s.src[k]) || s.u;
  }
  function sameCycle(s, upd, tab) {
    if (!s || !upd) return false;
    const su = snapSrc(s, tab);
    return !!(su && su === upd);
  }
  function pts(snaps, keys, min, upd, tab) {
    const curT = Date.parse(upd) || 0, out = [];
    (snaps || []).forEach(s => {
      if (sameCycle(s, upd, tab)) return;
      const st = Date.parse(s.u || s.t);
      if (curT && st && st > curT) return;
      const v = val(s, keys);
      if (v) out.push({ t: st || 0, v });
    });
    if (min) out.push({ t: curT || Date.now(), v: min, cur: 1 });
    return out;
  }
  function dropCount(list, cut) {
    let n = 0;
    for (let i = 1; i < list.length; i++) if (list[i].t >= cut && list[i].v < list[i - 1].v) n++;
    return n;
  }
  function echoKeys(r) {
    const k = 'c|' + cK(r), ks = [k];
    if (r.a === CFIX) {
      ks.push('c|' + r.c + '|' + r.a + '|' + (2 * r.l - 1));
      ks.push('c|' + r.c + '|' + r.a + '|' + (2 * r.l));
    }
    return ks;
  }
  function applyCFix(rows, hist) {
    const M = {}, hm = {}, out = [], srt = (x, y) => x[0] - y[0] || x[1] - y[1] || x[2] - y[2];
    (rows || []).forEach(r => {
      if (r.a !== CFIX) { out.push(r); return; }
      const l = r.l > 10 ? Math.ceil(r.l / 2) : r.l, ok = cK(r), k = r.c + '|' + r.a + '|' + l;
      if (hist[ok]) { (hm[k] = hm[k] || []).push(...hist[ok]); if (ok !== k) delete hist[ok]; }
      let m = M[k];
      if (!m) { m = M[k] = { c: r.c, a: r.a, l, v: l, min: null, n: 0, g30: 0, _L: [], _r: [] }; out.push(m); }
      m.n += r.n || 0; m.g30 += r.g30 || 0;
      if (r.L) m._L.push(...r.L); else if (r.min) m._L.push([r.min, r.st || 0, 0]);
      if (r.t) m._r.push(r);
    });
    Object.values(M).forEach(m => {
      const L = m._L.sort(srt).slice(0, 40), k = cK(m), h = (hm[k] || []).sort((x, y) => x[0] < y[0] ? -1 : x[0] > y[0] ? 1 : x[1] - y[1]);
      if (L.length) { m.L = L; m.min = L[0][0]; m.st = L[0][1]; }
      if (h.length) {
        hist[k] = h; m.last = h[h.length - 1][1];
        const rec = h.slice(-10).map(x => x[1]);
        m.avg = Math.round(rec.reduce((a, b) => a + b, 0) / rec.length); m.t = h.length;
      } else if (m._r.length) {
        const w = m._r.map(r => Math.min(r.t, 10)), ws = w.reduce((a, b) => a + b, 0);
        m.t = m._r.reduce((a, r) => a + r.t, 0); m.last = m._r[0].last;
        m.avg = Math.round(m._r.reduce((a, r, i) => a + (r.avg || r.last || 0) * w[i], 0) / ws);
      }
      delete m._L; delete m._r;
    });
    return out;
  }
  function qualify(it, snaps) {
    if (!it.min || !it.ref || !(it.t >= HOT.TRADES) || !(it.ref >= HOT.MIN)) return null;
    if (/미완성/.test(it.name || '') || /미완성/.test(it.label || '')) return null;
    if (!(it.min < it.ref)) return null;
    const upd = it.upd || '';
    const curT = Date.parse(upd) || Date.now();
    const p = pts(snaps, it.keys, it.min, upd, it.tab);
    it.drops2 = dropCount(p, curT - HOT.TWO);
    it.drops1 = dropCount(p, curT - HOT.HOUR);
    it.fall = (it.ref - it.min) / it.ref;
    it.pct = Math.round(it.fall * 100);
    it.curAt = upd;
    return it;
  }
  function collect(ctx) {
    const snaps = (ctx.Floor && ctx.Floor.snaps) || [];
    const cand = [];
    const push = it => { if (qualify(it, snaps)) cand.push(it); };
    const D = ctx.D, Hs = ctx.Hs || {}, Idea = ctx.Idea, E = ctx.E, EH = ctx.EH || {}, C = ctx.C, CH = ctx.CH || {};
    if (D && D.skills) D.skills.forEach(s => (s.options || []).forEach(o => Object.keys(o.lv || {}).forEach(l => {
      const v = o.lv[l]; if (!v || !v[0]) return;
      const R = med(Hs[o.name + '|' + l]);
      push({ tab: 'relic', arc: s.name, name: o.name, lv: +l, label: o.name + ' Lv' + l, kind: '유물', min: v[0], n: v[1], ref: R && R[0], t: R && R[1], keys: ['r|' + o.name + '|' + l], upd: D.updated });
    })));
    if (Idea && Idea.floor) {
      const R = med(Idea.t || []);
      push({ tab: 'idea', name: '무리아스의 유물(이데아)', label: '무리아스의 유물(이데아)', kind: '유물', min: Idea.floor, n: Idea.listings || 0, ref: R && R[0], t: R && R[1], keys: ['idea'], upd: Idea.updated || (D && D.updated) });
    }
    if (E && E.length) E.forEach((r, i) => {
      const R = med(EH[eK(r)]);
      push({ tab: 'enchant', idx: i, name: r.name, label: r.name + (r.rank ? ' · 랭크 ' + r.rank : ''), kind: '인챈트', min: r.min, n: r.n, ref: R && R[0], t: R && R[1], keys: ['e|' + eK(r)], upd: ctx.Eup });
    });
    if (C && C.length) C.forEach((r, i) => {
      const label = (r.c ? r.c + ' ' : '') + (r.a || '각성 없음') + (r.a && r.l ? ' Lv' + r.l : ''), R = med(CH[cK(r)]);
      push({ tab: 'echo', idx: i, name: r.a || r.c || '', label, kind: '에코스톤', min: r.min, n: r.n, ref: R && R[0], t: R && R[1], color: r.c, lv: r.l, keys: echoKeys(r), upd: ctx.Cup });
    });
    const primary = cand.filter(it => it.drops2 >= HOT.DROPS);
    primary.forEach(it => { it.via = 'run'; it.drops = it.drops2; });
    let list = primary.slice();
    if (list.length < HOT.FILL) {
      const have = new Set(list.map(it => it.tab + '|' + it.keys.join(',')));
      const fill = cand.filter(it => !have.has(it.tab + '|' + it.keys.join(',')) && it.drops1 >= 1 && it.fall >= HOT.FILL_FALL);
      fill.forEach(it => { it.via = 'fill'; it.drops = it.drops1; });
      fill.sort((a, b) => b.drops - a.drops || b.fall - a.fall || a.min - b.min);
      list = list.concat(fill.slice(0, HOT.FILL - list.length));
    }
    list.sort((a, b) => b.drops - a.drops || b.fall - a.fall || a.min - b.min);
    return list;
  }
  function dropLine(it) {
    const h = it.via === 'fill' ? 1 : 2;
    return h + '시간 동안 ' + it.drops + '번 갱신 · 중앙값 대비 −' + it.pct + '%';
  }
  function bannerText(list) {
    if (!list || !list.length) return '';
    const n = list.length, first = list[0].label || list[0].name || '';
    if (n === 1) return '지금 경매장 핫딜 1건 · ' + first;
    return '지금 경매장 핫딜 ' + n + '건 · ' + first + ' 외';
  }
  function showBanner(list) {
    const el = document.getElementById('hotAlert');
    if (!el) return;
    const text = bannerText(list);
    if (!text) { el.hidden = true; el.textContent = ''; el.removeAttribute('aria-label'); return; }
    el.textContent = text;
    el.hidden = false;
    el.setAttribute('aria-label', text);
  }
  function bootHome() {
    const el = document.getElementById('hotAlert');
    if (!el) return;
    const q = WT();
    Promise.all([
      getJ(WD + 'auction/data.json' + q).catch(() => null),
      getJ(WD + 'auction/history.json' + q).catch(() => ({ t: {} })),
      getJ(WD + 'auction/idea_data.json' + q).catch(() => null),
      getJ(WD + 'auction/enchant_data.json' + q).catch(() => null),
      getJ(WD + 'auction/enchant_history.json' + q).catch(() => ({ t: {} })),
      getJ(WD + 'auction/echo_data.json' + q).catch(() => null),
      getJ(WD + 'auction/echo_history.json' + q).catch(() => ({ t: {} })),
      getJ(WD + 'auction/floor_snaps.json' + q).catch(() => ({ snaps: [] }))
    ]).then(([D, hist, Idea, eData, eHist, cData, cHist, Floor]) => {
      const EH = (eHist && eHist.t) || {};
      const CH = (cHist && cHist.t) || {};
      const C = applyCFix((cData && cData.rows) || [], CH);
      const list = collect({
        D: D, Hs: (hist && hist.t) || {}, Idea: Idea,
        E: (eData && eData.rows) || [], EH: EH, Eup: (eData && eData.updated) || '',
        C: C, CH: CH, Cup: (cData && cData.updated) || '',
        Floor: Floor && Array.isArray(Floor.snaps) ? Floor : { snaps: [] }
      });
      showBanner(list);
    }).catch(() => showBanner([]));
  }

  global.HotDeal = { HOT, collect, med, qualify, dropLine, bannerText, showBanner, bootHome, eK, cK, CFIX, applyCFix, echoKeys, getJ, WD, WT };
  if (document.getElementById('hotAlert')) {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bootHome);
    else bootHome();
  }
})(window);
