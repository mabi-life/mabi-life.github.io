/** Internal barter trip planner core (Node + browser). No DOM. */

export const CARRIERS = [
  { id: 'alpaca', name: '알파카 마차 (일반·크리스마스)', slots: 10, weight: 1100, verified: true, note: '나무위키·공식 커뮤니티 교차' },
  { id: 'janmang_alpaca', name: '잔망루피 알파카', slots: 10, weight: 1200, verified: true, note: '공식 출시 안내 캡처(사용자 제공) · 그랜마 포함 11/1300' },
  { id: 'floatship', name: '부유선', slots: 8, weight: 1200, verified: true, note: '나무위키' },
  { id: 'elephant', name: '코끼리', slots: 7, weight: 1700, verified: true, note: '나무위키' },
  { id: 'camel', name: '낙타', slots: 7, weight: 1400, verified: true, note: '나무위키' },
  { id: 'dogsled', name: '개썰매', slots: 11, weight: 700, verified: true, note: '나무위키' },
  { id: 'cart', name: '마차', slots: 8, weight: 900, verified: true, note: '나무위키' },
  { id: 'custom', name: '직접 입력', slots: null, weight: null, verified: false, note: '수동 용량' }
];

export const BONUS = {
  gmMerchant: { slots: 1, weight: 100, label: '그랜마 상인' },
  tradeCover: { slots: 1, weight: 100, label: '교역 확장 덮개' }
};

export function capacity({ carrierId, customSlots = 0, customWeight = 0, gmMerchant = false, tradeCover = false }) {
  const c = CARRIERS.find(x => x.id === carrierId) || CARRIERS.find(x => x.id === 'custom');
  let slots = c.id === 'custom' ? (+customSlots || 0) : (+c.slots || 0);
  let weight = c.id === 'custom' ? (+customWeight || 0) : (+c.weight || 0);
  const applied = [];
  if (gmMerchant) { slots += BONUS.gmMerchant.slots; weight += BONUS.gmMerchant.weight; applied.push(BONUS.gmMerchant.label); }
  if (tradeCover) { slots += BONUS.tradeCover.slots; weight += BONUS.tradeCover.weight; applied.push(BONUS.tradeCover.label); }
  return {
    slots, weight,
    base: { slots: c.id === 'custom' ? +customSlots || 0 : c.slots, weight: c.id === 'custom' ? +customWeight || 0 : c.weight, carrierId: c.id, name: c.name },
    bonuses: applied,
    stackingNote: (gmMerchant && tradeCover)
      ? '그랜마+덮개 동시 적용은 공식 확인 전 가산 가정입니다. 실제와 다르면 직접 입력으로 맞추세요.'
      : null
  };
}

export function itemLoad(g, q) {
  const qty = Math.max(0, +q || 0);
  const perSlot = Math.max(1, +g.perSlot || 1);
  const wt = +g.weight || 0;
  return { qty, weight: qty * wt, slots: qty ? Math.ceil(qty / perSlot) : 0 };
}

export function tripTotals(items, goodsById) {
  let weight = 0, slots = 0;
  const lines = [];
  for (const it of items) {
    const g = goodsById[it.goodsId] || it.g;
    if (!g) continue;
    const L = itemLoad(g, it.qty);
    weight += L.weight; slots += L.slots;
    lines.push({ goodsId: g.id || it.goodsId, name: g.name, qty: L.qty, weight: L.weight, slots: L.slots, tier: g.tier || 0, post: g.post, limit: g.limit, perSlot: g.perSlot, unitWeight: g.weight, mats: g.mats || [] });
  }
  return { weight, slots, lines };
}

export function weeklyUsage(trips) {
  const used = {};
  for (const t of trips) for (const it of t.items || []) {
    used[it.goodsId] = (used[it.goodsId] || 0) + Math.max(0, +it.qty || 0);
  }
  return used;
}

export function weeklyWarnings(trips, goodsById) {
  const used = weeklyUsage(trips);
  const over = [];
  for (const [id, q] of Object.entries(used)) {
    const g = goodsById[id];
    if (!g) continue;
    if (q > g.limit) over.push({ goodsId: id, name: g.name, used: q, limit: g.limit, excess: q - g.limit });
  }
  return { used, over };
}

export function capacityWarnings(trip, cap, goodsById) {
  const tot = tripTotals(trip.items || [], goodsById);
  const warns = [];
  if (tot.weight > cap.weight) warns.push({ type: 'weight', used: tot.weight, max: cap.weight });
  if (tot.slots > cap.slots) warns.push({ type: 'slots', used: tot.slots, max: cap.slots });
  return { ...tot, warns, overload: warns.length > 0 };
}

function cloneLeft(goods) {
  return goods.map(g => ({ g, left: Math.max(0, +g._planQty != null ? g._planQty : g.limit) })).filter(x => x.left > 0);
}

function packPass(order, state, W, SL, filter, trim) {
  const L = [];
  for (const x of order) {
    if (!x.left || !filter(x.g)) continue;
    const ps = x.g.perSlot || 1, wt = x.g.weight || 0;
    let q = Math.min(x.left, wt ? Math.floor((W - state.w) / wt) : x.left, (SL - state.s) * ps);
    if (trim && q > ps && q % ps && q < x.left) q -= q % ps;
    if (q <= 0) continue;
    x.left -= q; state.w += q * wt; state.s += Math.ceil(q / ps);
    L.push({ goodsId: x.g.id, qty: q, g: x.g });
  }
  return L;
}

/** Heuristic recommendations — not proven optimal. */
export function recommendTrips({ routePosts, goods, mode = 'high_tier', capacity: cap, qtyMap = {}, minTier = 0, maxRuns = 8 }) {
  // high_then_low: include all tiers; other modes keep previous filters
  const tierOk = g => {
    if (mode === 'high_then_low') return true;
    if (mode === 'high_tier' && minTier) return (g.tier || 0) >= minTier;
    return true;
  };
  const selected = goods.filter(g => routePosts.includes(g.post) && tierOk(g)).map(g => ({
    ...g, _planQty: qtyMap[g.id] != null ? Math.min(qtyMap[g.id], g.limit) : g.limit
  }));
  const left = cloneLeft(selected);
  const trips = [];
  const W = +cap.weight || 0, SL = +cap.slots || 0;
  const HIGH = 3; // T3+ = high, T2 and below (incl. null as low for skaha-less routes) = low leftovers

  const byHighTier = [...left].sort((a, b) => (b.g.tier || 0) - (a.g.tier || 0) || routePosts.indexOf(a.g.post) - routePosts.indexOf(b.g.post));
  const byTravel = [...left].sort((a, b) => routePosts.indexOf(a.g.post) - routePosts.indexOf(b.g.post) || (b.g.tier || 0) - (a.g.tier || 0));
  // low leftovers: denser pack — prefer heavier/higher slot use among T<=2, still prefer earlier posts lightly
  const byLowPack = [...left].sort((a, b) => (a.g.tier || 0) - (b.g.tier || 0) || (b.g.weight || 0) - (a.g.weight || 0) || routePosts.indexOf(a.g.post) - routePosts.indexOf(b.g.post));

  const hasHigh = () => left.some(x => x.left && (x.g.tier || 0) >= HIGH);
  const hasLow = () => left.some(x => x.left && (x.g.tier || 0) < HIGH);

  for (let run = 0; run < maxRuns && left.some(x => x.left); run++) {
    const state = { w: 0, s: 0 };
    let L = [];
    if (mode === 'min_travel') {
      for (const post of routePosts) {
        const more = packPass(byTravel, state, W, SL, g => g.post === post, run === 0);
        L = L.concat(more);
      }
    } else if (mode === 'high_then_low') {
      // Early rounds: only T3+ (same multi-post mix as high_tier). Never fill with low yet.
      if (hasHigh()) {
        L = L.concat(packPass(byHighTier, state, W, SL, g => (g.tier || 0) >= HIGH, run === 0));
        // if still room but no more high fits, leave room empty — low waits for leftover rounds
      } else if (hasLow()) {
        // Leftover rounds: pack T2 and below into as few trips as possible; mix trading posts OK
        L = L.concat(packPass(byLowPack, state, W, SL, g => (g.tier || 0) < HIGH, false));
        L = L.concat(packPass(byLowPack, state, W, SL, g => (g.tier || 0) < HIGH, false));
      }
    } else {
      // high_tier: allow multiple towns' higher tiers in the same trip.
      if (run === 0) {
        L = L.concat(packPass(byHighTier, state, W, SL, g => (g.tier || 0) >= 3, true));
        L = L.concat(packPass(byHighTier, state, W, SL, () => true, false));
      } else {
        L = L.concat(packPass(byHighTier, state, W, SL, () => true, false));
      }
    }
    if (!L.length) break;
    const posts = [...new Set(L.map(x => x.g.post))];
    trips.push({
      id: `trip-${run + 1}`,
      label: `${run + 1}회차 추천`,
      mode,
      heuristic: true,
      posts,
      items: L.map(({ goodsId, qty }) => ({ goodsId, qty })),
      weight: state.w,
      slots: state.s
    });
  }
  const note = mode === 'high_then_low'
    ? '고등급 먼저 · 저티어 모아서(휴리스틱): 앞 회차에 T3+만 싣고, 남은 T2 이하는 교역소를 섞어 최소한의 뒷 회차로 몰아 담습니다. 최단·최적해를 보장하지 않습니다.'
    : mode === 'high_tier'
      ? `고등급 우선 추천(휴리스틱): 여러 교역소의 고티어를 같은 회차에 섞을 수 있습니다.${minTier ? ` T${minTier} 미만은 추천에서 빼고 직접 추가할 수 있게 두었습니다.` : ''} 최단·최적해를 보장하지 않습니다.`
      : '이동 최소화 추천(휴리스틱): 루트 앞 교역소를 먼저 채웁니다. 이동 거리 실측·최적해를 보장하지 않습니다.';
  return { mode, minTier, trips, note };
}

export function materialsForTrips(trips, goodsById) {
  const need = {};
  for (const t of trips) for (const it of t.items || []) {
    const g = goodsById[it.goodsId]; if (!g) continue;
    for (const [m, k] of g.mats || []) need[m] = (need[m] || 0) + k * (+it.qty || 0);
  }
  return need;
}

export function priceStatus(name, priceMap, missingSet = new Set()) {
  if (missingSet.has(name)) return { status: 'missing', price: null };
  const e = priceMap[name];
  if (e == null) return { status: 'missing', price: null };
  if (typeof e === 'number') return { status: 'ok', price: e };
  if (typeof e === 'object' && e.min != null) return { status: 'ok', price: e.min, stale: !!e.stale };
  return { status: 'missing', price: null };
}

export function applyTripEdit(trip, { goodsId, qty }) {
  const items = (trip.items || []).map(x => ({ ...x }));
  const i = items.findIndex(x => x.goodsId === goodsId);
  const q = Math.max(0, +qty || 0);
  if (q <= 0) {
    if (i >= 0) items.splice(i, 1);
  } else if (i >= 0) items[i].qty = q;
  else items.push({ goodsId, qty: q });
  return { ...trip, items, customized: true };
}

export function resetTripToRecommendation(recommendedTrip) {
  return {
    ...recommendedTrip,
    items: (recommendedTrip.items || []).map(x => ({ goodsId: x.goodsId, qty: x.qty })),
    customized: false
  };
}

/** 회차에 배정되지 않은 남은 수량 (qtyMap 기준, 없으면 주간 한도). */
export function unassigned(trips, goods, qtyMap = {}) {
  const used = weeklyUsage(trips);
  const out = [];
  for (const g of goods) {
    const want = qtyMap[g.id] != null ? Math.min(+qtyMap[g.id] || 0, g.limit) : g.limit;
    const left = want - (used[g.id] || 0);
    if (left > 0) out.push({ goodsId: g.id, name: g.name, left, tier: g.tier || 0, post: g.post });
  }
  return out;
}

/**
 * 회차 간 이동 / 같은 회차 안 순서 바꾸기 (순수 함수).
 * from·to: 회차 인덱스 (to === trips.length 이면 새 회차를 만들어 넣음)
 * index: 대상 회차 목록에서 넣을 위치 (생략 시 맨 끝). 같은 품목이 이미 있으면 수량을 합치고 그 자리를 유지.
 * 수량은 절대 자르지 않는다(초과는 경고만).
 */
export function moveItem(trips, { from, goodsId, to, index }) {
  const out = trips.map(t => ({ ...t, items: (t.items || []).map(x => ({ ...x })) }));
  const src = out[from];
  if (!src) return trips;
  const si = src.items.findIndex(x => String(x.goodsId) === String(goodsId));
  if (si < 0) return trips;
  if (to === out.length) out.push({ items: [], customized: true });
  const dst = out[to];
  if (!dst) return trips;
  const [it] = src.items.splice(si, 1);
  if (from === to) {
    let at = index == null ? dst.items.length : Math.max(0, Math.min(+index, dst.items.length + 1));
    if (si < at) at -= 1;
    at = Math.max(0, Math.min(at, dst.items.length));
    if (at === si) return trips; // 제자리
    dst.items.splice(at, 0, it);
    dst.customized = true;
    return out;
  }
  const ex = dst.items.find(x => String(x.goodsId) === String(goodsId));
  if (ex) ex.qty = (+ex.qty || 0) + (+it.qty || 0);
  else { const at = index == null ? dst.items.length : Math.max(0, Math.min(+index, dst.items.length)); dst.items.splice(at, 0, it); }
  src.customized = true; dst.customized = true;
  return out;
}

/* ---------- 회차 수량 편집: 자동 나누기(넘김) · 당겨오기 · 주간수량 상한 · 낮은 티어 밀어내기 ---------- */
const sumQty = (trip, id) => (trip.items || []).filter(x => String(x.goodsId) === String(id)).reduce((a, x) => a + (+x.qty || 0), 0);
function addTo(trip, id, q) {
  const ex = trip.items.find(x => String(x.goodsId) === String(id));
  if (ex) ex.qty = (+ex.qty || 0) + q; else trip.items.push({ goodsId: +id, qty: q });
}
function takeFrom(trip, id, q) {
  const ex = trip.items.find(x => String(x.goodsId) === String(id)); if (!ex) return 0;
  const t = Math.min(q, +ex.qty || 0); ex.qty -= t;
  if (ex.qty <= 0) trip.items.splice(trip.items.indexOf(ex), 1);
  return t;
}
function loadOf(trip, G) { let w = 0, s = 0; for (const x of trip.items) { const g = G[x.goodsId]; if (!g) continue; w += x.qty * (g.weight || 0); s += Math.ceil(x.qty / (g.perSlot || 1)); } return { w, s }; }

/**
 * 밀어낼 품목 고르기 규칙(문서화):
 *  1) 티어가 가장 낮은 품목부터 (티어 없음 = 0)
 *  2) 같은 티어면 개당 무게가 무거운 품목부터 (적게 빼고 자리를 크게 확보)
 *  3) 그래도 같으면 목록 아래쪽(나중에 담긴) 품목부터
 *  pinned(사용자가 방금 수량을 정한 품목)는 그 회차에서 밀어내지 않음.
 */
function pickBump(trip, G, pinned) {
  let best = null, bi = -1;
  trip.items.forEach((x, i) => {
    if (pinned && String(x.goodsId) === String(pinned)) return;
    const g = G[x.goodsId]; if (!g || !(+x.qty > 0)) return;
    const k = [g.tier || 0, -(g.weight || 0), -i];
    if (!best || k[0] < best[0] || (k[0] === best[0] && (k[1] < best[1] || (k[1] === best[1] && k[2] < best[2])))) { best = k; bi = i; }
  });
  return bi < 0 ? null : trip.items[bi];
}
/** 넘친 무게·슬롯을 없애는 최소 개수 */
function minBump(item, g, ex) {
  const Q = +item.qty, ps = g.perSlot || 1, wt = g.weight || 0;
  for (let b = 1; b <= Q; b++) {
    const dw = b * wt, ds = Math.ceil(Q / ps) - Math.ceil((Q - b) / ps);
    if (dw >= ex.w && ds >= ex.s) return b;
  }
  return Q;
}
/** k회차가 용량을 넘으면 낮은 티어부터 다음 회차로 밀어냄(연쇄). 마지막이면 새 회차. */
function settle(trips, k, G, cap, moves, pinned, guard) {
  if (guard.n++ > 400) return;
  const t = trips[k]; if (!t) return;
  for (let loop = 0; loop < 50; loop++) {
    const L = loadOf(t, G), ex = { w: Math.max(0, L.w - cap.weight), s: Math.max(0, L.s - cap.slots) };
    if (!ex.w && !ex.s) return;
    const cand = pickBump(t, G, k === pinned.trip ? pinned.goodsId : null);
    if (!cand) return; // 더 뺄 게 없음(고정 품목만 남음) → 경고로 남김
    // 혼자서도 못 들어가는 품목만 남은 새 회차가 끝없이 생기지 않게
    if (t.items.length === 1 && k >= trips.length - 1 && trips.length >= 20) return;
    const g = G[cand.goodsId], b = minBump(cand, g, ex), id = cand.goodsId;
    takeFrom(t, id, b); t.customized = true;
    moves.push({ goodsId: +id, qty: b, from: k, to: k + 1, bumped: true });
    place(trips, k + 1, id, b, G, cap, moves, pinned, guard);
  }
}
function place(trips, k, id, q, G, cap, moves, pinned, guard) {
  if (q <= 0) return;
  if (k >= trips.length) trips.push({ items: [], customized: true });
  addTo(trips[k], id, q); trips[k].customized = true;
  settle(trips, k, G, cap, moves, pinned, guard);
}

/**
 * i회차의 goodsId 수량을 qty로 정함.
 *  - 줄이면: 줄인 만큼 다음 회차로 넘김(같은 품목이면 합침). 다음 회차가 넘치면 그 회차의 낮은 티어부터 그다음으로 밀어냄(연쇄, 필요하면 새 회차).
 *  - 늘리면: 뒤 회차의 같은 품목에서 먼저 당겨오고, 모자라면 미배정분에서 채움. 상한 = 주간수량 − 앞 회차들에 담긴 수량.
 *    늘린 회차가 넘치면 그 회차의 다른 품목(낮은 티어부터)을 다음 회차로 밀어냄. 방금 고친 품목은 고정.
 *  - 회차 전체 합계는 주간수량을 넘지 않음.
 * 반환 { trips, moves, pulled:[{from,qty}], clamped, max, qty }
 */
export function setTripQty(trips, { trip: i, goodsId, qty, goodsById: G, capacity: cap, weeklyMax }) {
  const out = trips.map(t => ({ ...t, items: (t.items || []).map(x => ({ ...x })) }));
  const T = out[i]; if (!T) return { trips, moves: [], pulled: [], clamped: false };
  const g = G[goodsId]; if (!g) return { trips, moves: [], pulled: [], clamped: false };
  const wmax = Math.max(0, +weeklyMax || 0);
  const before = out.slice(0, i).reduce((a, t) => a + sumQty(t, goodsId), 0);
  const max = Math.max(0, wmax - before);
  let want = Math.max(0, Math.floor(+qty || 0)); const clamped = want > max; if (clamped) want = max;
  const cur = sumQty(T, goodsId), moves = [], pulled = [], guard = { n: 0 };
  const pinned = { trip: i, goodsId };
  if (want === cur) return { trips: clamped ? out : trips, moves, pulled, clamped, max, qty: want };
  if (want < cur) {
    takeFrom(T, goodsId, cur - want); T.customized = true;
    moves.push({ goodsId: +goodsId, qty: cur - want, from: i, to: i + 1, bumped: false });
    place(out, i + 1, goodsId, cur - want, G, cap, moves, { trip: -1 }, guard);
  } else {
    let need = want - cur;
    for (let k = i + 1; k < out.length && need > 0; k++) {
      const t = takeFrom(out[k], goodsId, need);
      if (t) { pulled.push({ from: k, qty: t }); need -= t; out[k].customized = true; }
    }
    addTo(T, goodsId, want - cur); T.customized = true;
    settle(out, i, G, cap, moves, pinned, guard);
  }
  // 비어 버린 '추가' 회차는 정리하지 않음(사용자가 만든 회차일 수 있음) — 화면에서 삭제 가능
  return { trips: out, moves, pulled, clamped, max, qty: want };
}

/* ---------- 방치물품: 이번 주 일부러 안 할 교환 (회차·재료 계산에서 빠짐) ---------- */
/** parked: [{goodsId, qty}] → {goodsId: qty} */
export function parkedMap(parked) {
  const m = {};
  for (const x of parked || []) { const q = Math.max(0, +x.qty || 0); if (q) m[+x.goodsId] = (m[+x.goodsId] || 0) + q; }
  return m;
}
const normPark = m => Object.entries(m).filter(([, q]) => q > 0).map(([id, q]) => ({ goodsId: +id, qty: q }));
/** 회차 from의 품목을 통째로 방치함으로 (같은 품목이 있으면 합침). 반환 { trips, parked, qty } */
export function parkItem(trips, parked, { from, goodsId }) {
  const out = trips.map(t => ({ ...t, items: (t.items || []).map(x => ({ ...x })) }));
  const src = out[from]; if (!src) return { trips, parked, qty: 0 };
  const si = src.items.findIndex(x => String(x.goodsId) === String(goodsId));
  if (si < 0) return { trips, parked, qty: 0 };
  const [it] = src.items.splice(si, 1); src.customized = true;
  const q = Math.max(0, +it.qty || 0), m = parkedMap(parked);
  m[+goodsId] = (m[+goodsId] || 0) + q;
  return { trips: out, parked: normPark(m), qty: q };
}
/** 남은(미배정) 수량을 방치함으로. 반환 { parked, qty } */
export function parkLeft(parked, { goodsId, qty }) {
  const q = Math.max(0, Math.floor(+qty || 0)); if (!q) return { parked, qty: 0 };
  const m = parkedMap(parked); m[+goodsId] = (m[+goodsId] || 0) + q;
  return { parked: normPark(m), qty: q };
}
/** 방치함에서 빼기. to가 숫자면 그 회차(to === trips.length 이면 새 회차)에 넣고, null이면 그냥 빼서 「회차에 안 담긴 교환」으로. */
export function unparkItem(trips, parked, { goodsId, to = null, index }) {
  const m = parkedMap(parked), q = m[+goodsId] || 0;
  if (!q) return { trips, parked, qty: 0 };
  delete m[+goodsId];
  let out = trips;
  if (to != null) {
    out = trips.map(t => ({ ...t, items: (t.items || []).map(x => ({ ...x })) }));
    if (to === out.length) out.push({ items: [], customized: true });
    const dst = out[to]; if (!dst) return { trips, parked, qty: 0 };
    const ex = dst.items.find(x => String(x.goodsId) === String(goodsId));
    if (ex) ex.qty = (+ex.qty || 0) + q;
    else { const at = index == null ? dst.items.length : Math.max(0, Math.min(+index, dst.items.length)); dst.items.splice(at, 0, { goodsId: +goodsId, qty: q }); }
    dst.customized = true;
  }
  return { trips: out, parked: normPark(m), qty: q };
}
/** 남은 수량을 회차에 넣기 (드래그). */
export function placeLeft(trips, { goodsId, qty, to, index }) {
  const q = Math.max(0, Math.floor(+qty || 0)); if (!q) return trips;
  const out = trips.map(t => ({ ...t, items: (t.items || []).map(x => ({ ...x })) }));
  if (to === out.length) out.push({ items: [], customized: true });
  const dst = out[to]; if (!dst) return trips;
  const ex = dst.items.find(x => String(x.goodsId) === String(goodsId));
  if (ex) ex.qty = (+ex.qty || 0) + q;
  else { const at = index == null ? dst.items.length : Math.max(0, Math.min(+index, dst.items.length)); dst.items.splice(at, 0, { goodsId: +goodsId, qty: q }); }
  dst.customized = true;
  return out;
}
