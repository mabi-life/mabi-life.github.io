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
  const tierOk = g => mode !== 'high_tier' || !minTier || (g.tier || 0) >= minTier;
  const selected = goods.filter(g => routePosts.includes(g.post) && tierOk(g)).map(g => ({
    ...g, _planQty: qtyMap[g.id] != null ? Math.min(qtyMap[g.id], g.limit) : g.limit
  }));
  const left = cloneLeft(selected);
  const trips = [];
  const W = +cap.weight || 0, SL = +cap.slots || 0;

  const byHighTier = [...left].sort((a, b) => (b.g.tier || 0) - (a.g.tier || 0) || routePosts.indexOf(a.g.post) - routePosts.indexOf(b.g.post));
  const byTravel = [...left].sort((a, b) => routePosts.indexOf(a.g.post) - routePosts.indexOf(b.g.post) || (b.g.tier || 0) - (a.g.tier || 0));

  for (let run = 0; run < maxRuns && left.some(x => x.left); run++) {
    const state = { w: 0, s: 0 };
    let L = [];
    if (mode === 'min_travel') {
      // Fill earlier towns before later ones; within town prefer higher tier.
      for (const post of routePosts) {
        const more = packPass(byTravel, state, W, SL, g => g.post === post, run === 0);
        L = L.concat(more);
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
  return { mode, minTier, trips, note: mode === 'high_tier'
    ? `고등급 우선 추천(휴리스틱): 여러 교역소의 고티어를 같은 회차에 섞을 수 있습니다.${minTier ? ` T${minTier} 미만은 추천에서 빼고 직접 추가할 수 있게 두었습니다.` : ''} 최단·최적해를 보장하지 않습니다.`
    : '이동 최소화 추천(휴리스틱): 루트 앞 교역소를 먼저 채웁니다. 이동 거리 실측·최적해를 보장하지 않습니다.' };
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
