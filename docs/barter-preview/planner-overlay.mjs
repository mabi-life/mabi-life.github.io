/* 물교 플래너 확장 — 기존 app.js는 그대로 두고 그 위에
   운송수단 선택·그랜마/덮개·추천 방식·회차 버튼·회차별 편집(드래그 포함)을 얹는다. */
import { CARRIERS as PC, capacity, recommendTrips, tripTotals, weeklyWarnings, applyTripEdit, unassigned, moveItem, setTripQty } from './core/planner.mjs?v=4';

const ALLR = { id: 'all', name: '페라 → 칼리다 → 카루숲 → 오아시스 → 셀라·콘누스 항구', posts: ['페라', '칼리다', '카루숲', '오아시스'] };
const ROUTE_IDS = ['pk', 'ko'];
const TIERS = [[0, '전부 (고티어 먼저)'], [3, 'T3 이상만'], [4, 'T4 이상만'], [5, 'T5 이상만'], [6, 'T6만']];

function pvDef() {
  const d = { v: 1, carrierId: 'alpaca', customSlots: 10, customWeight: 1100, gm: true, cover: false, mode: 'high_tier', minTier: 0, scope: 'route', plans: {} };
  // 라이브 설정 이어받기: 기존 프리셋(그랜마+알파카 11/1200) = 알파카+그랜마, 직접 입력 = 직접 입력
  if (S.carrier === 1) { d.carrierId = 'custom'; d.customSlots = +S.cs || 0; d.customWeight = +S.cw || 0; d.gm = false; }
  return d;
}
const pv = () => { if (!S.pv || S.pv.v !== 1) S.pv = pvDef(); if (!S.pv.plans) S.pv.plans = {}; return S.pv; };
const cap = () => { const p = pv(); return capacity({ carrierId: p.carrierId, customSlots: p.customSlots, customWeight: p.customWeight, gmMerchant: !!p.gm, tradeCover: !!p.cover }); };
const syncCap = () => { const c = cap(); S.cw = c.weight; S.cs = c.slots; };
const scopeRoutes = () => pv().scope === 'all' ? [ALLR] : D.routes.filter(r => ROUTE_IDS.includes(r.id));
const routeById = id => id === 'all' ? ALLR : D.routes.find(r => r.id === id);
const minTierNow = () => pv().mode === 'high_tier' ? (+pv().minTier || 0) : 0; // high_then_low ignores minTier (packs all, then leftovers)
const qtyMapOf = r => Object.fromEntries(routeGoods(r).map(g => [g.id, qtyOf(g)]));
const fpOf = r => { const c = cap(); return JSON.stringify({ c: [c.slots, c.weight], m: pv().mode, t: minTierNow(), g: routeGoods(r).map(g => [g.id, qtyOf(g)]) }); };
const copyItems = items => (items || []).map(x => ({ goodsId: +x.goodsId, qty: +x.qty }));

function freshRec(r) {
  return recommendTrips({ routePosts: r.posts, goods: routeGoods(r), mode: pv().mode, capacity: cap(), qtyMap: qtyMapOf(r), minTier: minTierNow(), maxRuns: 8 });
}
function ensurePlan(r) {
  const p = pv(), f = fpOf(r), P = p.plans[r.id];
  if (!P || (P.fp !== f && !P.trips.some(t => t.customized))) {
    const rec = freshRec(r);
    p.plans[r.id] = { fp: f, note: rec.note, rec: rec.trips.map(t => ({ items: copyItems(t.items) })), trips: rec.trips.map(t => ({ items: copyItems(t.items), customized: false })) };
    if (P) saveSoon();
  }
  return p.plans[r.id];
}
const stale = r => { const P = pv().plans[r.id]; return !!P && P.fp !== fpOf(r); };

/* ---- 기존 plan()을 회차 카드(추천→편집) 기준으로 교체: 기존 1·2회차 카드/상세 팝업이 편집 결과를 그대로 보여 줌 */
plan = function (r) {
  const P = ensurePlan(r), c = cap();
  const runs = P.trips.map(t => {
    const L = []; let w = 0, s = 0;
    for (const it of t.items) { const g = G[it.goodsId], q = Math.max(0, +it.qty || 0); if (!g || !q) continue; L.push({ g, q }); w += q * (g.weight || 0); s += Math.ceil(q / (g.perSlot || 1)); }
    return { L, w, s };
  }).filter(ru => ru.L.length);
  const off = {};
  for (const ru of runs) for (const x of ru.L) { const o = off[x.g.id] || 0; x.off = o; x.dn = Math.max(0, Math.min(x.q, doneOf(x.g) - o)); x.fin = x.dn >= x.q ? 1 : 0; off[x.g.id] = o + x.q; }
  if (VIEW && VIEW.id === r.id && VIEW.n > 1 && runs[VIEW.n - 1]) { const k = VIEW.n - 1; return { runs: [runs[k], ...runs.filter((_, j) => j !== k)], W: c.weight, SL: c.slots }; }
  return { runs, W: c.weight, SL: c.slots };
};
let VIEW = null;

/* ---- 상단 설정 */
function cfgHtml() {
  const p = pv(), c = cap(), car = PC.find(x => x.id === p.carrierId) || PC[PC.length - 1];
  const opt = PC.map(x => `<option value="${x.id}" ${x.id === car.id ? 'selected' : ''}>${esc(x.name)}${x.slots != null ? ` · ${x.slots}칸 / ${fmt(x.weight)}` : ''}</option>`).join('');
  const bon = c.bonuses.length ? ' + ' + c.bonuses.join(' + ') : '';
  const tierSel = p.mode === 'high_tier' ? `<label class="pvSub">추천에 담을 등급 <select data-pv="minTier">${TIERS.map(([v, n]) => `<option value="${v}" ${+p.minTier === v ? 'selected' : ''}>${n}</option>`).join('')}</select></label>` : '';
  const kst = t => new Date(t).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' KST';
  const feedTs = Object.values(S.prices || {}).filter(x => x && x.src === 'feed' && x.t).map(x => +x.t || Date.parse(x.t)).filter(Boolean);
  const priceLine = feedTs.length ? `공유 시세 ${kst(Math.max(...feedTs))} 기준` : (SNAP && SNAP.t ? `기본 시세 ${kst(SNAP.t)} 기준 · ⚙에서 「💹 시세 불러오기」로 최신화` : '시세 없음 · ⚙에서 「💹 시세 불러오기」');
  return `<div class="pvPrevBan" style="margin:0 0 10px;padding:8px 12px;border-radius:8px;background:#3a3220;border:1px solid #6b5a33;color:#f7d98b;font-size:13.5px">⚠ 프리뷰 페이지입니다 · 라이브 <a href="/barter/" style="color:#9fd3f7">/barter/</a>와 별도 · 완료↔회차 적재 동기화 · 「고등급 먼저 · 저티어 모아서」 실험</div><section class="pvCfg" aria-label="운송·추천 설정">
  <div class="pvRow"><b class="pvH">🚚 운송</b>
    <select data-pv="carrier" title="운송 수단">${opt}</select>
    ${car.id === 'custom' ? `<label class="pvSub">슬롯 <input class="n" data-pv="cs" value="${p.customSlots}" inputmode="numeric"></label><label class="pvSub">무게 <input class="n" data-pv="cw" value="${p.customWeight}" inputmode="numeric"></label>` : ''}
    <label class="pvTg"><input type="checkbox" data-pv="gm" ${p.gm ? 'checked' : ''}> 그랜마 상인 <small>+1칸 · +100</small></label>
    <label class="pvTg"><input type="checkbox" data-pv="cover" ${p.cover ? 'checked' : ''}> 교역 확장 덮개 <small>+1칸 · +100</small></label>
    <span class="pvCap" title="${esc((car.note ? '출처: ' + car.note + ' · ' : '') + '기본 ' + c.base.slots + '칸·' + c.base.weight + bon)}">적재 한도 <b>${c.slots}칸 · ${fmt(c.weight)}</b> <small>(기본 ${c.base.slots}칸·${fmt(c.base.weight)}${c.bonuses.length ? ' +' + (c.slots - c.base.slots) + '칸·+' + (c.weight - c.base.weight) : ''})</small></span>
  </div>
  <div class="pvRow"><b class="pvH">🧭 추천</b>
    <label class="pvRad"><input type="radio" name="pvMode" data-pv="mode" value="min_travel" ${p.mode === 'min_travel' ? 'checked' : ''}> 이동 최소화 <small>지역(교역소) 순서대로 채움</small></label>
    <label class="pvRad"><input type="radio" name="pvMode" data-pv="mode" value="high_tier" ${p.mode === 'high_tier' ? 'checked' : ''}> 고등급 우선 <small>여러 교역소를 돌며 고티어만 섞어 싣기</small></label>
    <label class="pvRad"><input type="radio" name="pvMode" data-pv="mode" value="high_then_low" ${p.mode === 'high_then_low' ? 'checked' : ''}> 고등급 먼저 · 저티어 모아서 <small>앞 회차 T3+ · 남은 T2 이하는 최소 회차로</small></label>
    ${tierSel}
    <span class="pvSep"></span>
    <label class="pvRad"><input type="radio" name="pvScope" data-pv="scope" value="route" ${p.scope !== 'all' ? 'checked' : ''}> 루트별</label>
    <label class="pvRad"><input type="radio" name="pvScope" data-pv="scope" value="all" ${p.scope === 'all' ? 'checked' : ''}> 4개 교역소 전체 순회</label>
    <button class="sm" data-pv="regenAll" title="현재 설정으로 회차 추천을 새로 만듭니다">↻ 추천 다시 만들기</button>
  </div>
  <div class="pvMeta">시세: ${priceLine} · 교역품 데이터 ${esc(D.source.fetched)} (Prilus) · 추천은 휴리스틱(최적해 보장 아님)</div>
</section>`;
}

/* ---- 회차별 카드 (추천 → 직접 편집) */
const allOf = (P, id) => P.trips.reduce((a, t) => a + t.items.filter(x => +x.goodsId === +id).reduce((b, x) => b + (+x.qty || 0), 0), 0);
function tripCard(r, P, t, i, c, cum) {
  const tot = tripTotals(t.items, G), owned = C().owned;
  const ow = tot.weight - c.weight, os = tot.slots - c.slots;
  let cost = 0, unk = 0; const need = {};
  // Shared done state with round popup (C().done): prior trips consume done offset
  const doneOff = {};
  for (let ti = 0; ti < i; ti++) for (const it of (P.trips[ti].items || [])) doneOff[it.goodsId] = (doneOff[it.goodsId] || 0) + (+it.qty || 0);
  const rows = tot.lines.map(l => {
    const g = G[l.goodsId], u = unitCost(g); cost += u.s * l.qty; unk += u.u;
    for (const [m, k] of g.mats) need[m] = (need[m] || 0) + k * l.qty;
    const off6 = g.tier === 6 && S.active6[g.post] !== g.id;
    const off = doneOff[g.id] || 0;
    const dn = Math.max(0, Math.min(l.qty, doneOf(g) - off));
    const fin = dn >= l.qty ? 1 : 0;
    doneOff[g.id] = off + l.qty;
    const exBtn = fin
      ? `<button class="sm dong" data-a="unex" data-g="${g.id}" data-n="${off}" title="완료 해제 · 재료 복원">✔ 완료</button>`
      : `<button class="sm" data-a="ex" data-g="${g.id}" data-n="${off + l.qty}" title="이 회차 수량 교환완료 + 재료 차감">✔ 완료</button>`;
    return `<tr class="pvItem${fin ? ' done fin' : ''}" data-r="${r.id}" data-i="${i}" data-g="${g.id}" title="끌어서 다른 회차로 옮기거나 순서를 바꿀 수 있어요"><td class="pvHd" aria-label="끌어서 옮기기">⠿</td><td><span class="t t${g.tier || 0}">${g.tier ? 'T' + g.tier : '—'}</span></td><td>${esc(g.post)}</td><td class="gnm" title="${esc(g.name)}">${iconHtml(g.name)}${esc(g.name)}${fin ? ' <span class="dbadge">완료</span>' : ''}${off6 ? ' <span class="warn" title="이번 시즌 선택된 6티어가 아님">비활성</span>' : ''}</td>
      <td class="r pvQc" title="${esc(`전체 회차 합계 ${allOf(P, g.id)} / 주간수량 ${qtyOf(g)}`)}"><input class="n pvQ" data-pv="qty" data-r="${r.id}" data-i="${i}" data-g="${g.id}" value="${l.qty}" inputmode="numeric" aria-label="${esc(g.name)} 이번 회차 수량 (주간수량 ${qtyOf(g)})"${fin ? ' disabled' : ''}><span class="pvMax">/ ${qtyOf(g)}</span></td>
      <td class="r${fin ? ' mut' : ''}">${fmt(l.weight)}</td><td class="r${fin ? ' mut' : ''}">${l.slots}</td>
      <td style="white-space:nowrap">${exBtn} <button class="ghost sm" data-pv="del" data-r="${r.id}" data-i="${i}" data-g="${g.id}" title="이 회차에서 빼기" aria-label="${esc(g.name)} 빼기">✕</button></td></tr>`;
  }).join('');
  const inTrip = new Set(t.items.map(x => +x.goodsId));
  const left = Object.fromEntries(unassigned(P.trips, routeGoods(r), qtyMapOf(r)).map(x => [x.goodsId, x.left]));
  const cands = routeGoods(r).filter(g => !inTrip.has(g.id)).sort((a, b) => (left[b.id] ? 1 : 0) - (left[a.id] ? 1 : 0) || (b.tier || 0) - (a.tier || 0));
  const addSel = `<select id="pvAdd_${r.id}_${i}" aria-label="추가할 교역품">${cands.map(g => `<option value="${g.id}">T${g.tier || '—'} ${esc(g.post)} · ${esc(g.name)}${left[g.id] ? ` (남음 ${left[g.id]})` : ''}</option>`).join('')}</select>`;
  const mats = Object.entries(need);
  let short = 0;
  const matRows = mats.map(([m, n]) => { cum[m] = (cum[m] || 0) + n; const bad = cum[m] > (owned[m] || 0); if (bad) short++; const p = price(m);
    return `<div class="pvMr${bad ? ' neg' : ''}"><span>${iconHtml(m)}${esc(m)}</span><span class="r">${fmt(n)}</span><span class="r mut">보유 ${fmt(owned[m] || 0)}</span><span class="r mut">${p == null ? '<span class="warn">가격?</span>' : gk(p)}</span></div>`; }).join('');
  const warns = [];
  if (ow > 0) warns.push(`⚠ 무게 초과 +${fmt(ow)}`);
  if (os > 0) warns.push(`⚠ 슬롯 초과 +${os}칸`);
  const posts = [...new Set(tot.lines.map(l => l.post))];
  const hasRec = !!P.rec[i];
  return `<article class="pvTrip${warns.length ? ' over' : ''}${t.customized ? ' edited' : ''}" data-trip="${i}" data-r="${r.id}">
    <div class="pvTh"><h4>${i + 1}회차 <span class="pvPosts">${posts.length ? esc(posts.join(' → ')) : '비어 있음'}</span>${t.customized ? '<span class="pvEd">✏️ 편집됨</span>' : '<span class="pvRec">추천</span>'}</h4>
      <span>${t.customized && hasRec ? `<button class="ghost sm" data-pv="reset" data-r="${r.id}" data-i="${i}">↺ 추천으로 되돌리기</button>` : ''}${!hasRec ? `<button class="ghost sm" data-pv="dropTrip" data-r="${r.id}" data-i="${i}">회차 삭제</button>` : ''}</span></div>
    ${rows ? `<table class="rt pvT"><tr><th></th><th>티어</th><th>교역소</th><th>품목</th><th class="r pvQh">이번회차 / 주간수량</th><th class="r">무게</th><th class="r">슬롯</th><th>교환</th></tr>${rows}</table>` : '<div class="mut" style="margin:8px 0">담긴 품목이 없어요. 아래에서 추가하세요.</div>'}
    <div class="pvAdd">${cands.length ? `${addSel}<input class="n" id="pvAddQ_${r.id}_${i}" placeholder="수량" inputmode="numeric" aria-label="추가 수량"><button class="sm" data-pv="add" data-r="${r.id}" data-i="${i}">＋ 추가</button>` : '<span class="mut">추가할 품목 없음</span>'}</div>
    <div class="esum"><span>무게 <b class="${ow > 0 ? 'neg' : ''}">${fmt(tot.weight)} / ${fmt(c.weight)}</b></span><span>슬롯 <b class="${os > 0 ? 'neg' : ''}">${tot.slots} / ${c.slots}</b></span><span>재료비 <b class="neg">${gk(cost)}</b>${unk ? '<span class="warn">+?</span>' : ''}</span></div>
    ${warns.length ? `<div class="pvWarn">${warns.join(' · ')} <small>— 편집한 수량은 그대로 두었어요. 직접 줄이거나 다른 회차로 옮겨 주세요.</small></div>` : ''}
    ${mats.length ? `<details class="pvMats"><summary>필요 재료 ${mats.length}종${short ? ` <span class="neg">· 누적 기준 부족 ${short}종</span>` : ''}</summary><div class="pvMl">${matRows}</div></details>` : ''}
  </article>`;
}

function editorHtml() {
  const p = pv(), rs = scopeRoutes();
  let tab = p.scope === 'all' ? 'all' : (ROUTE_IDS.includes(UI.pvTab) ? UI.pvTab : 'pk');
  const r = routeById(tab), P = ensurePlan(r), c = cap();
  const ww = weeklyWarnings(P.trips, G);
  const un = unassigned(P.trips, routeGoods(r), qtyMapOf(r));
  const cum = {};
  const tabs = p.scope === 'all' ? `<span class="pvTab on">${esc(ALLR.posts.join(' → '))}</span>` :
    rs.map(x => { const Q = ensurePlan(x); return `<button class="pvTab ${x.id === tab ? 'on' : ''}" data-pv="tab" data-r="${x.id}">${esc(x.posts.join(' → '))} <small>${Q.trips.length}회차${Q.trips.some(t => t.customized) ? ' · ✏️' : ''}${stale(x) ? ' · ⚠' : ''}</small></button>`; }).join('');
  const nEd = P.trips.filter(t => t.customized).length;
  const nOver = P.trips.filter(t => { const T = tripTotals(t.items, G); return T.weight > c.weight || T.slots > c.slots; }).length + (ww.over.length ? 1 : 0);
  return `<details class="pvEdit" id="pvEdit" aria-label="회차별 적재 편집"${UI.pvOpen ? ' open' : ''}>
  <summary class="pvSum"><span class="pvArr" aria-hidden="true">▸</span><b>🧾 회차별 적재</b><span class="pvGuide">펼쳐서 품목을 직접 편집하실 수 있어요 · 줄을 끌어 다른 회차로 옮길 수도 있어요</span>
    <span class="pvStat">${P.trips.length}회차${nEd ? ` · <span class="pvEd">✏️ 편집 ${nEd}</span>` : ''}${nOver || stale(r) ? ` · <span class="neg">⚠ 확인 ${nOver + (stale(r) ? 1 : 0)}</span>` : ''}</span></summary>
  <div class="pvEh"><small class="mut">추천 → 직접 편집 · ⠿ 줄을 끌어 다른 회차 카드(또는 「＋ 회차 추가」)에 놓으면 옮겨지고, 같은 카드 안에서는 순서가 바뀌어요. 같은 품목이 있으면 수량이 합쳐져요. 위 루트 카드와 상세표에도 반영돼요.</small><div class="pvTabs">${tabs}</div></div>
  ${stale(r) ? `<div class="pvStale">⚠ 운송·추천 설정이 바뀌었어요. 편집한 회차는 그대로 두고, 무게·슬롯·한도는 새 설정으로 다시 계산했어요. <button class="sm" data-pv="regen" data-r="${r.id}">이 루트 추천 다시 만들기</button></div>` : ''}
  ${ww.over.length ? `<div class="pvWarn">⚠ 주간 교환 한도 초과: ${ww.over.map(o => `${esc(o.name)} <b>${o.used}/${o.limit}</b>`).join(' · ')} <small>— 편집 내용은 유지돼요.</small></div>` : ''}
  <div class="pvGrid">${P.trips.map((t, i) => tripCard(r, P, t, i, c, cum)).join('')}
    <button class="pvNew" data-pv="addTrip" data-r="${r.id}">＋ 회차 추가</button></div>
  ${un.length ? `<div class="pvUn"><b>회차에 안 담긴 교환</b> ${un.map(x => `<span class="pvChip"><span class="t t${x.tier}">${x.tier ? 'T' + x.tier : '—'}</span>${esc(x.name)} ×${x.left}</span>`).join('')}</div>` : '<div class="pvUn pos">이번 주 교환 수량이 모두 회차에 담겼어요.</div>'}
  <div class="pvFoot mut">${esc(P.note || '')}</div>
</details>`;
}

/* ---- 수량 자동 나누기 안내 */
function longToast(m) { toast(m); clearTimeout(toast.h); toast.h = setTimeout(() => { const el = $('#toast'); if (el) el.style.display = 'none'; }, 3800); }
const clampMsg = (g, res) => `${g.name}: 주간수량 ${qtyOf(g)}개 중 앞 회차에 ${qtyOf(g) - res.max}개 → 이번 회차는 최대 ${res.max}개`;
function splitMsg(g, res, i) {
  const parts = [];
  if (res.clamped) parts.push(`주간수량 안에서 최대 ${res.max}개로 맞춤`);
  for (const p of res.pulled) parts.push(`${p.from + 1}회차에서 ${p.qty}개 당겨옴`);
  // 품목별로 최종 도착 회차(들어온 양 − 다시 밀려난 양)를 계산해 요약
  const net = {}, order = [];
  for (const m of res.moves) {
    if (!net[m.goodsId]) { net[m.goodsId] = {}; order.push(m.goodsId); }
    net[m.goodsId][m.to] = (net[m.goodsId][m.to] || 0) + m.qty;
    if (m.from !== i || m.goodsId !== g.id || m.bumped) net[m.goodsId][m.from] = (net[m.goodsId][m.from] || 0) - m.qty;
  }
  for (const id of order) {
    const d = Object.entries(net[id]).filter(([r, q]) => q > 0 && +r !== i).sort((x, y) => x[0] - y[0]);
    if (!d.length) continue;
    const tot = d.reduce((a, x) => a + x[1], 0), gg = G[id];
    const where = d.length === 1 ? `${+d[0][0] + 1}회차` : d.map(([r, q]) => `${+r + 1}회차 ${q}개`).join('·');
    const own = +id === g.id && res.moves.some(m => m.goodsId === g.id && m.from === i && !m.bumped);
    parts.push(own ? `남은 ${tot}개 → ${where}` : `T${gg.tier || '—'} ${gg.name} ${tot}개 → ${where}`);
  }
  return parts.join(', ');
}

/* ---- 기존 렌더 함수에 얹기 (기존 섹션은 그대로, 순서: 설정 → 기존 루트 카드 → 회차 편집 → 지도·재료) */
renderDash = function () {
  const pv0 = $('#paste2') ? $('#paste2').value : '';
  syncCap(); renderWeek();
  $('#dash').className = '';
  $('#dash').innerHTML = cfgHtml() + `<div class="ecards">${scopeRoutes().map(cardHtml).join('')}</div>` + editorHtml() + xMats();
  if ($('#paste2')) $('#paste2').value = pv0;
};
const curRound = (r, pl) => { const n = Math.max(1, +UI['pvRound_' + r.id] || 1); return Math.min(n, Math.max(1, pl.runs.length)); };
cardHtml = function (r) {
  const pl = plan(r), n = curRound(r, pl), total = pl.runs.length;
  const btns = Array.from({ length: total }, (_, j) => j + 1).filter(k => k !== n)
    .map(k => `<button type="button" class="pvRb" data-pv="round" data-r="${r.id}" data-n="${k}" aria-label="${k}회차 보기" title="${k}회차 보기">${k}회차</button>`).join('');
  return `<div class="flip pvFlip" data-r="${r.id}"><div class="card face" data-a="detail" data-r="${r.id}" role="button" tabindex="0" title="클릭하면 상세표 팝업">${faceHtml(r, pl.runs[n - 1], n, pl)}</div>${btns ? `<div class="pvRbs" role="group" aria-label="다른 회차 보기">${btns}</div>` : ''}</div>`;
};
const _detailHtml = detailHtml;
detailHtml = function (r) {
  const n = curRound(r, plan(r));
  if (n === 1) { const k = 'flip_' + r.id, o = UI[k]; UI[k] = false; try { return _detailHtml(r); } finally { UI[k] = o; } }
  const k = 'flip_' + r.id, o = UI[k]; UI[k] = false; VIEW = { id: r.id, n };
  try { return _detailHtml(r).replace('<span class="rtag">1회차</span>', `<span class="rtag">${n}회차</span>`).replace('1회차 남은 교환 없음', `${n}회차 남은 교환 없음`); }
  finally { VIEW = null; UI[k] = o; }
};
const _renderWeek = renderWeek;
renderWeek = function () {
  _renderWeek();
  // 주간 바의 운송 이름(기존 프리셋 이름)을 새 운송 선택으로 표시
  const sp = [...document.querySelectorAll('#week > span')].find(x => /^운송/.test(x.textContent.trim()));
  const m = sp && sp.querySelector('.mut'); if (!m) return;
  const c = cap(), car = PC.find(x => x.id === pv().carrierId);
  m.textContent = (car ? car.name.replace(/\s*\(.*\)$/, '') : '') + (c.bonuses.length ? ' + ' + c.bonuses.join(' + ') : '');
};
const _renderDetail = renderDetail;
renderDetail = function () {
  if (dOpen !== 'all') return _renderDetail();
  let el = $('#dmodal'); if (!el) { el = document.createElement('div'); el.id = 'dmodal'; document.body.appendChild(el); }
  el.innerHTML = `<div class="dbk" data-a="dclose"></div><div class="dbox" role="dialog" aria-modal="true">${detailHtml(ALLR)}</div>`;
};
const _renderLayer = renderLayer;
renderLayer = function () {
  _renderLayer();
  if (!(layer && layer.t === 'settings')) return;
  const sel = document.getElementById('carrier'), c = cap(), car = PC.find(x => x.id === pv().carrierId);
  if (sel) sel.closest('label').innerHTML = `운송 <span class="mut" style="font-size:13px;text-align:right">${esc(car ? car.name : '')}${c.bonuses.length ? ' + ' + esc(c.bonuses.join(' + ')) : ''}<br>위 「🚚 운송」에서 변경</span>`;
  for (const id of ['cw', 'cs']) { const e = document.getElementById(id); if (e) { e.disabled = true; e.value = id === 'cw' ? c.weight : c.slots; } }
};

/* 전체 순회 카드(가상 루트)의 1⇄2회차 전환은 기존 핸들러가 D.routes에서 못 찾으므로 여기서 처리 */
window.addEventListener('click', e => {
  const b = e.target.closest('[data-a="flip"][data-r="all"]'); if (!b) return;
  e.stopImmediatePropagation(); e.stopPropagation();
  const k = 'flip_all'; UI[k] = !UI[k]; try { localStorage.setItem(UIK, JSON.stringify(UI)); } catch (x) {}
  b.closest('.flip').outerHTML = cardHtml(ALLR);
}, true);

const P_ = id => ensurePlan(routeById(id));
const int = v => Math.max(0, Math.floor(+String(v).replace(/[^\d]/g, '') || 0));
document.addEventListener('change', e => {
  const t = e.target, k = t.dataset && t.dataset.pv; if (!k) return;
  const p = pv();
  if (k === 'carrier') return mut(() => { p.carrierId = t.value; syncCap(); }, '운송: ' + (PC.find(x => x.id === t.value) || {}).name);
  if (k === 'cs' || k === 'cw') return mut(() => { p[k === 'cs' ? 'customSlots' : 'customWeight'] = int(t.value); syncCap(); });
  if (k === 'gm' || k === 'cover') return mut(() => { p[k] = t.checked; syncCap(); }, `${k === 'gm' ? '그랜마 상인' : '교역 확장 덮개'} ${t.checked ? '켬' : '끔'}`);
  if (k === 'mode') return mut(() => { p.mode = t.value; }, t.value === 'high_tier' ? '고등급 우선 추천' : t.value === 'high_then_low' ? '고등급 먼저 · 저티어 모아서' : '이동 최소화 추천');
  if (k === 'minTier') return mut(() => { p.minTier = +t.value || 0; });
  if (k === 'scope') return mut(() => { p.scope = t.value; });
  if (k === 'qty') {
    const rid = t.dataset.r, P = P_(rid), i = +t.dataset.i, gid = +t.dataset.g, g = G[gid];
    const res = setTripQty(P.trips, { trip: i, goodsId: gid, qty: int(t.value), goodsById: G, capacity: cap(), weeklyMax: qtyOf(g) });
    if (res.trips === P.trips) { if (res.clamped) longToast(clampMsg(g, res)); t.value = res.qty != null ? res.qty : t.value; return; }
    mut(() => { pv().plans[rid].trips = res.trips; }); // 한 번의 되돌리기(↶)로 전체 넘김을 취소
    return longToast(splitMsg(g, res, i) || '회차 수량 수정');
  }
});
document.addEventListener('click', e => {
  const b = e.target.closest('[data-pv]'); if (!b || /INPUT|SELECT|TEXTAREA/.test(b.tagName)) return;
  const k = b.dataset.pv, rid = b.dataset.r, i = +b.dataset.i;
  if (k === 'round') { UI['pvRound_' + rid] = +b.dataset.n; try { localStorage.setItem(UIK, JSON.stringify(UI)); } catch (x) {} const f = b.closest('.flip'); if (f) f.outerHTML = cardHtml(routeById(rid)); if (dOpen === rid) renderDetail(); return; }
  if (k === 'tab') { UI.pvTab = rid; try { localStorage.setItem(UIK, JSON.stringify(UI)); } catch (x) {} return renderDash(); }
  if (k === 'del') { const P = P_(rid), g = G[+b.dataset.g], q = (P.trips[i].items.find(x => +x.goodsId === +b.dataset.g) || {}).qty || 0; mut(() => { P.trips[i] = applyTripEdit(P.trips[i], { goodsId: +b.dataset.g, qty: 0 }); }); return longToast(`${g.name} ${q}개를 ${i + 1}회차에서 뺐어요 → 「회차에 안 담긴 교환」`); }
  if (k === 'add') {
    const P = P_(rid), sel = document.getElementById(`pvAdd_${rid}_${i}`), qe = document.getElementById(`pvAddQ_${rid}_${i}`);
    if (!sel || !sel.value) return;
    const gid = +sel.value, left = (unassigned(P.trips, routeGoods(routeById(rid)), qtyMapOf(routeById(rid))).find(x => x.goodsId === gid) || {}).left;
    if (!left) return longToast(`${G[gid].name}: 주간수량 ${qtyOf(G[gid])}개를 이미 모두 회차에 담았어요`);
    const q0 = int(qe && qe.value) || left, q = Math.min(q0, left);
    mut(() => { P.trips[i] = applyTripEdit(P.trips[i], { goodsId: gid, qty: q }); });
    return longToast(q0 > left ? `${G[gid].name}: 주간수량 안에서 남은 ${left}개만 추가했어요` : `${G[gid].name} ×${q} 추가`);
  }
  if (k === 'addTrip') { const P = P_(rid); return mut(() => { P.trips.push({ items: [], customized: true }); }, '회차 추가'); }
  if (k === 'dropTrip') {
    const P = P_(rid), go = () => mut(() => { P.trips.splice(i, 1); }, '회차 삭제');
    if (!P.trips[i].items.length) return go();
    return pvConfirm(`담긴 품목 ${P.trips[i].items.length}종은 「회차에 안 담긴 교환」으로 돌아가요.`, { title: `${i + 1}회차를 삭제할까요?`, ok: '삭제', danger: true }).then(y => { if (y && P.trips[i]) go(); });
  }
  if (k === 'reset') {
    const P = P_(rid);
    return pvConfirm('이 회차에서 편집한 내용이 사라져요.', { title: `${i + 1}회차를 추천 내용으로 되돌릴까요?`, ok: '되돌리기', danger: true }).then(y => {
      if (!y || !P.trips[i]) return;
      const fresh = freshRec(routeById(rid)).trips[i];
      mut(() => { P.trips[i] = { items: copyItems(fresh ? fresh.items : P.rec[i].items), customized: false }; }, `${i + 1}회차 추천으로 되돌림`);
    });
  }
  if (k === 'regen' || k === 'regenAll') {
    const ids = k === 'regen' ? [rid] : scopeRoutes().map(x => x.id);
    const edited = ids.some(id => (pv().plans[id] || { trips: [] }).trips.some(t => t.customized));
    const go = () => mut(() => { for (const id of ids) delete pv().plans[id]; for (const id of ids) ensurePlan(routeById(id)); }, '추천을 다시 만들었어요');
    if (!edited) return go();
    return pvConfirm('현재 설정으로 추천을 다시 만들면 편집한 회차의 내용이 사라져요.', { title: '추천을 다시 만들까요?', ok: '다시 만들기', danger: true }).then(y => { if (y) go(); });
  }
});

/* ---- 확인 창 (브라우저 confirm 대신, 사이트 팝업 스타일) ---- */
let pvDlg = null;
function pvConfirm(msg, { title = '확인', ok = '확인', cancel = '취소', danger = false } = {}) {
  if (pvDlg) pvDlg.close(false);
  return new Promise(resolve => {
    const prev = document.activeElement, root = document.createElement('div');
    root.id = 'pvConfirm';
    root.innerHTML = `<div class="pvCbk"></div><div class="pvCbox${danger ? ' pvDanger' : ''}" role="alertdialog" aria-modal="true" aria-labelledby="pvCt" aria-describedby="pvCm">
<h3 id="pvCt">${esc(title)}</h3>${msg ? `<p id="pvCm">${esc(msg)}</p>` : ''}
<div class="pvCbtn"><button type="button" data-c="0">${esc(cancel)}</button><button type="button" data-c="1" class="pvCok">${esc(ok)}</button></div></div>`;
    const btns = [...root.querySelectorAll('button')];
    const close = v => {
      if (!pvDlg) return; pvDlg = null;
      document.removeEventListener('keydown', onKey, true); root.remove();
      try { prev && prev.focus && prev.focus({ preventScroll: true }); } catch (x) {}
      resolve(v);
    };
    const onKey = e => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); close(false); }
      else if (e.key === 'Enter') { e.preventDefault(); e.stopImmediatePropagation(); close(document.activeElement === btns[0] ? false : true); }
      else if (e.key === 'Tab') {
        e.preventDefault(); e.stopImmediatePropagation();
        const j = btns.indexOf(document.activeElement); btns[(j + (e.shiftKey ? btns.length - 1 : 1)) % btns.length].focus();
      } else if (e.key === ' ') { /* 포커스된 버튼 기본 동작 */ }
      else { e.stopImmediatePropagation(); if (e.ctrlKey || e.metaKey) e.preventDefault(); } /* 창이 떠 있는 동안 되돌리기 단축키 등 차단 */
    };
    root.addEventListener('click', e => {
      e.stopPropagation();
      if (e.target.classList.contains('pvCbk')) return close(false);
      const b = e.target.closest('button[data-c]'); if (b) close(b.dataset.c === '1');
    });
    document.addEventListener('keydown', onKey, true);
    document.body.appendChild(root); pvDlg = { close };
    btns[1].focus({ preventScroll: true });
  });
}

document.addEventListener('toggle', e => { if (e.target && e.target.id === 'pvEdit') { UI.pvOpen = e.target.open; try { localStorage.setItem(UIK, JSON.stringify(UI)); } catch (x) {} } }, true);

/* ---- 드래그로 회차 편집 (Pointer Events: 마우스·펜·터치). 터치는 ⠿ 손잡이 바로, 줄은 길게 눌러(0.35초) 시작 */
let drag = null, suppressClick = false, ghost = null, line = null;
function dragCleanup() {
  ghost && ghost.remove(); line && line.remove(); ghost = line = null;
  document.body.classList.remove('pvDragging');
  document.querySelectorAll('.pvDrop,.pvSrc').forEach(x => x.classList.remove('pvDrop', 'pvSrc'));
}
function startDrag(x, y) {
  drag.active = true; suppressClick = true;
  document.body.classList.add('pvDragging'); drag.row.classList.add('pvSrc');
  ghost = document.createElement('div'); ghost.className = 'pvGhost';
  const q = drag.row.querySelector('input.pvQ'), nm = drag.row.querySelector('.gnm');
  ghost.innerHTML = `${nm ? nm.innerHTML : ''} <b>×${q ? esc(q.value) : ''}</b>`;
  line = document.createElement('div'); line.className = 'pvLine'; line.style.display = 'none';
  document.body.append(ghost, line); moveDrag(x, y);
}
function moveDrag(x, y) {
  ghost.style.transform = `translate(${x + 14}px,${y + 10}px)`;
  document.querySelectorAll('.pvDrop').forEach(e => e.classList.remove('pvDrop'));
  const el = document.elementFromPoint(x, y);
  const card = el && el.closest('.pvTrip[data-trip]'), nb = el && el.closest('.pvNew');
  drag.to = null; drag.idx = null; line.style.display = 'none';
  if (card && card.dataset.r === drag.r) {
    card.classList.add('pvDrop'); drag.to = +card.dataset.trip;
    const rows = [...card.querySelectorAll('tr.pvItem')];
    let idx = rows.filter(rw => { const b = rw.getBoundingClientRect(); return b.top + b.height / 2 < y; }).length;
    drag.idx = idx;
    const tb = card.querySelector('table.pvT');
    if (rows.length && tb) {
      const tr = tb.getBoundingClientRect(), ref = idx < rows.length ? rows[idx].getBoundingClientRect().top : rows[rows.length - 1].getBoundingClientRect().bottom;
      Object.assign(line.style, { display: 'block', left: tr.left + 'px', width: tr.width + 'px', top: (ref - 1) + 'px' });
    }
  } else if (nb && nb.dataset.r === drag.r) { nb.classList.add('pvDrop'); drag.to = 'new'; }
  if (y < 90) scrollBy(0, -14); else if (y > innerHeight - 40) scrollBy(0, 14);
}
function finishDrag(ok) {
  const d = drag; drag = null; dragCleanup();
  if (!ok || !d || !d.active || d.to == null) return;
  const P = P_(d.r), to = d.to === 'new' ? P.trips.length : d.to;
  const merge = to !== d.i && P.trips[to] && P.trips[to].items.some(x => +x.goodsId === d.g);
  const nt = moveItem(P.trips, { from: d.i, goodsId: d.g, to, index: d.idx });
  if (nt === P.trips) return;
  const nm = (G[d.g] || {}).name || '';
  mut(() => { pv().plans[d.r].trips = nt; }, to === d.i ? `${nm} 순서 바꿈` : `${nm} → ${to + 1}회차${merge ? ' (같은 품목 수량 합침)' : ''}`);
}
document.addEventListener('pointerdown', e => {
  if (e.pointerType === 'mouse' && e.button !== 0) return;
  const row = e.target.closest && e.target.closest('tr.pvItem'); if (!row) return;
  if (e.target.closest('input,button,select,a,textarea')) return;
  const onHandle = !!e.target.closest('.pvHd');
  drag = { row, r: row.dataset.r, i: +row.dataset.i, g: +row.dataset.g, x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, id: e.pointerId, active: false, ready: e.pointerType !== 'touch' || onHandle, timer: null };
  if (e.pointerType === 'mouse') e.preventDefault(); // 글자 선택 방지
  if (!drag.ready) drag.timer = setTimeout(() => { if (drag && !drag.active) { drag.ready = true; startDrag(drag.lx, drag.ly); } }, 350);
});
window.addEventListener('pointermove', e => {
  if (!drag || e.pointerId !== drag.id) return;
  drag.lx = e.clientX; drag.ly = e.clientY;
  if (!drag.active) {
    const dd = Math.hypot(e.clientX - drag.x, e.clientY - drag.y);
    if (!drag.ready) { if (dd > 10) { clearTimeout(drag.timer); drag = null; } return; } // 터치 스크롤로 판단
    if (dd < 6) return;
    startDrag(e.clientX, e.clientY);
  }
  e.preventDefault(); moveDrag(e.clientX, e.clientY);
}, { passive: false });
window.addEventListener('pointerup', e => { if (!drag || e.pointerId !== drag.id) return; clearTimeout(drag.timer); if (drag.active) { finishDrag(true); setTimeout(() => { suppressClick = false; }, 0); } else drag = null; });
window.addEventListener('pointercancel', e => { if (drag && e.pointerId === drag.id) { clearTimeout(drag.timer); finishDrag(false); } });
document.addEventListener('touchmove', e => { if (drag && drag.active) e.preventDefault(); }, { passive: false });
window.addEventListener('click', e => { if (suppressClick) { suppressClick = false; e.stopPropagation(); e.preventDefault(); } }, true);
document.addEventListener('keydown', e => { if (e.key === 'Escape' && drag) { clearTimeout(drag.timer); finishDrag(false); } });

syncCap(); save(); render();
