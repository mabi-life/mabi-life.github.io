// 물교 플래너(docs/barter/core/planner.mjs) 테스트 — 실행: node tests/barter-planner.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import {
  capacity, recommendTrips, capacityWarnings, weeklyWarnings,
  applyTripEdit, resetTripToRecommendation, materialsForTrips, tripTotals, CARRIERS, unassigned, moveItem
} from '../docs/barter/core/planner.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
// 데이터: docs/barter/index.html에 내장된 #data
const html = readFileSync(join(root, 'docs/barter/index.html'), 'utf8');
const goodsData = JSON.parse(html.match(/<script id="data" type="application\/json">([\s\S]*?)<\/script>/)[1]);
const goodsById = Object.fromEntries(goodsData.goods.map(g => [g.id, g]));
const pk = goodsData.routes.find(r => r.id === 'pk');
assert.ok(pk, 'pk route');

let passed = 0;
function t(name, fn) { try { fn(); passed++; console.log('PASS', name); } catch (e) { console.error('FAIL', name); console.error(e); process.exitCode = 1; } }

t('alpaca base 10/1100', () => {
  const c = capacity({ carrierId: 'alpaca' });
  assert.equal(c.slots, 10); assert.equal(c.weight, 1100);
});
t('janmang alpaca base 10/1200', () => {
  const c = capacity({ carrierId: 'janmang_alpaca' });
  assert.equal(c.slots, 10); assert.equal(c.weight, 1200);
});
t('floatship base 8/1200', () => {
  const c = capacity({ carrierId: 'floatship' });
  assert.equal(c.slots, 8); assert.equal(c.weight, 1200);
});
t('GM only additive +1/+100', () => {
  const c = capacity({ carrierId: 'alpaca', gmMerchant: true });
  assert.equal(c.slots, 11); assert.equal(c.weight, 1200);
  assert.ok(c.bonuses.includes('그랜마 상인'));
});
t('cover only additive +1/+100', () => {
  const c = capacity({ carrierId: 'alpaca', tradeCover: true });
  assert.equal(c.slots, 11); assert.equal(c.weight, 1200);
});
t('GM+cover provisional stack', () => {
  const c = capacity({ carrierId: 'alpaca', gmMerchant: true, tradeCover: true });
  assert.equal(c.slots, 12); assert.equal(c.weight, 1300);
  assert.match(c.stackingNote || '', /가산 가정/);
});
t('custom capacity', () => {
  const c = capacity({ carrierId: 'custom', customSlots: 9, customWeight: 1500, gmMerchant: true });
  assert.equal(c.slots, 10); assert.equal(c.weight, 1600);
});
t('verified carriers listed', () => {
  assert.ok(CARRIERS.some(c => c.id === 'alpaca' && c.verified));
  assert.ok(CARRIERS.some(c => c.id === 'floatship' && c.verified));
});

t('high_tier can mix posts in one trip', () => {
  const cap = capacity({ carrierId: 'alpaca', gmMerchant: true });
  const goods = goodsData.goods.filter(g => pk.posts.includes(g.post) && (g.tier !== 6 || goodsData.default6[g.post] === g.id));
  const rec = recommendTrips({ routePosts: pk.posts, goods, mode: 'high_tier', capacity: cap });
  assert.ok(rec.trips.length >= 1);
  const mixed = rec.trips.some(tr => new Set(tr.items.map(it => goodsById[it.goodsId].post)).size > 1);
  assert.ok(mixed, 'expected at least one cross-town high-tier trip');
  assert.match(rec.note, /휴리스틱/);
});

t('min_travel prefers earlier posts first', () => {
  const cap = capacity({ carrierId: 'alpaca', gmMerchant: true });
  const goods = goodsData.goods.filter(g => pk.posts.includes(g.post) && (g.tier !== 6 || goodsData.default6[g.post] === g.id));
  const rec = recommendTrips({ routePosts: pk.posts, goods, mode: 'min_travel', capacity: cap });
  assert.ok(rec.trips.length >= 1);
  // first item of first trip should be from first post when possible
  const firstPost = goodsById[rec.trips[0].items[0].goodsId].post;
  assert.equal(firstPost, pk.posts[0]);
});

t('weight/slot overload warnings keep quantities', () => {
  const cap = capacity({ carrierId: 'custom', customSlots: 2, customWeight: 100 });
  const g = goodsData.goods.find(x => x.weight >= 15 && pk.posts.includes(x.post) && x.limit >= 10);
  const trip = { items: [{ goodsId: g.id, qty: g.limit }] };
  const w = capacityWarnings(trip, cap, goodsById);
  assert.equal(w.lines[0].qty, g.limit); // quantities preserved
  assert.ok(w.overload);
  assert.ok(w.warns.some(x => x.type === 'weight' || x.type === 'slots'));
});

t('weekly aggregate over cap warning', () => {
  const g = goodsData.goods.find(x => x.limit >= 3 && pk.posts.includes(x.post));
  const trips = [
    { items: [{ goodsId: g.id, qty: g.limit }] },
    { items: [{ goodsId: g.id, qty: 1 }] }
  ];
  const w = weeklyWarnings(trips, goodsById);
  assert.ok(w.over.some(x => String(x.goodsId) === String(g.id) && x.used === g.limit + 1));
  assert.equal(trips[0].items[0].qty, g.limit); // not discarded
});

t('edit add/replace/remove and live totals', () => {
  const g1 = goodsData.goods.find(x => pk.posts.includes(x.post));
  const g2 = goodsData.goods.find(x => pk.posts.includes(x.post) && x.id !== g1.id);
  let trip = { items: [{ goodsId: g1.id, qty: 2 }] };
  trip = applyTripEdit(trip, { goodsId: g2.id, qty: 3 });
  trip = applyTripEdit(trip, { goodsId: g1.id, qty: 5 });
  assert.deepEqual(trip.items.find(x => x.goodsId === g1.id), { goodsId: g1.id, qty: 5 });
  assert.equal(trip.customized, true);
  const tot = tripTotals(trip.items, goodsById);
  assert.ok(tot.weight > 0 && tot.slots > 0);
  trip = applyTripEdit(trip, { goodsId: g2.id, qty: 0 });
  assert.ok(!trip.items.some(x => x.goodsId === g2.id));
});

t('reset restores recommendation snapshot', () => {
  const cap = capacity({ carrierId: 'alpaca', gmMerchant: true });
  const goods = goodsData.goods.filter(g => pk.posts.includes(g.post) && (g.tier !== 6 || goodsData.default6[g.post] === g.id));
  const rec = recommendTrips({ routePosts: pk.posts, goods, mode: 'high_tier', capacity: cap });
  const base = rec.trips[0];
  let trip = applyTripEdit({ ...base, items: base.items.map(x => ({ ...x })) }, { goodsId: base.items[0].goodsId, qty: 1 });
  assert.equal(trip.customized, true);
  trip = resetTripToRecommendation(base);
  assert.equal(trip.customized, false);
  assert.deepEqual(trip.items, base.items.map(x => ({ goodsId: x.goodsId, qty: x.qty })));
});

t('materials aggregate across trips', () => {
  const g = goodsData.goods.find(x => x.mats && x.mats.length && pk.posts.includes(x.post));
  const need = materialsForTrips([{ items: [{ goodsId: g.id, qty: 2 }] }], goodsById);
  for (const [m, k] of g.mats) assert.equal(need[m], k * 2);
});


// ---- 미리보기 오버레이 추가 테스트 ----
const ko = goodsData.routes.find(r => r.id === 'ko');
const active = r => goodsData.goods.filter(g => r.posts.includes(g.post) && (g.tier !== 6 || goodsData.default6[g.post] === g.id));

// 라이브 app.js의 plan()을 그대로 떼어 와서, 기본 설정(고등급 우선·전부)이 라이브와 같은 회차를 내는지 확인
const appSrc = readFileSync(join(root, 'docs/barter/app.js'), 'utf8');
const planSrc = appSrc.split('\n').slice(50, 58).join('\n');
assert.match(planSrc, /^function plan\(r\)/);
function livePlan(r, W, SL) {
  const S = { cw: W, cs: SL };
  const routeGoods = rr => active(rr), qtyOf = g => g.limit, doneOf = () => 0;
  return new Function('S', 'routeGoods', 'qtyOf', 'doneOf', planSrc + '\nreturn plan;')(S, routeGoods, qtyOf, doneOf)(r);
}
for (const [W, SL] of [[1200, 11], [1100, 10], [1300, 12], [1200, 8], [1700, 7]]) for (const r of [pk, ko]) {
  t(`default high_tier == live plan() ${r.id} ${SL}칸/${W}`, () => {
    const lv = livePlan(r, W, SL);
    const rec = recommendTrips({ routePosts: r.posts, goods: active(r), mode: 'high_tier', capacity: { weight: W, slots: SL }, maxRuns: 4 });
    const norm = runs => runs.map(ru => { const m = {}; for (const x of ru) m[x.id] = (m[x.id] || 0) + x.q; return m; });
    assert.deepEqual(norm(rec.trips.map(tr => tr.items.map(i => ({ id: i.goodsId, q: i.qty })))), norm(lv.runs.map(ru => ru.L.map(x => ({ id: x.g.id, q: x.q })))));
  });
}
t('janmang + GM = 11/1300', () => {
  const c = capacity({ carrierId: 'janmang_alpaca', gmMerchant: true });
  assert.equal(c.slots, 11); assert.equal(c.weight, 1300); assert.equal(c.stackingNote, null);
});
t('minTier filter: only T>=4 recommended, rest unassigned', () => {
  const all = [...pk.posts, ...ko.posts];
  const goods = goodsData.goods.filter(g => all.includes(g.post) && (g.tier !== 6 || goodsData.default6[g.post] === g.id));
  const rec = recommendTrips({ routePosts: all, goods, mode: 'high_tier', capacity: capacity({ carrierId: 'alpaca', gmMerchant: true }), minTier: 4 });
  for (const tr of rec.trips) for (const it of tr.items) assert.ok(goodsById[it.goodsId].tier >= 4);
  assert.ok(rec.trips.some(tr => new Set(tr.items.map(it => goodsById[it.goodsId].post)).size >= 3), 'mixes 3+ posts');
  const un = unassigned(rec.trips, goods);
  assert.ok(un.length > 0 && un.every(x => x.tier < 4));
  assert.match(rec.note, /T4 미만/);
});
t('minTier ignored in min_travel', () => {
  const goods = active(pk);
  const a = recommendTrips({ routePosts: pk.posts, goods, mode: 'min_travel', capacity: { weight: 1200, slots: 11 }, minTier: 5 });
  const b = recommendTrips({ routePosts: pk.posts, goods, mode: 'min_travel', capacity: { weight: 1200, slots: 11 } });
  assert.deepEqual(a.trips.map(x => x.items), b.trips.map(x => x.items));
});
t('every recommended trip fits capacity', () => {
  for (const mode of ['high_tier', 'min_travel']) for (const cid of ['alpaca', 'janmang_alpaca', 'floatship', 'elephant']) {
    const cap = capacity({ carrierId: cid, gmMerchant: true, tradeCover: true });
    const rec = recommendTrips({ routePosts: pk.posts, goods: active(pk), mode, capacity: cap });
    for (const tr of rec.trips) { const w = capacityWarnings(tr, cap, goodsById); assert.ok(!w.overload, `${mode} ${cid}`); }
  }
});

// ---- 드래그 이동/합치기/순서 ----
const T = () => [
  { items: [{ goodsId: 1, qty: 2 }, { goodsId: 2, qty: 3 }, { goodsId: 3, qty: 4 }], customized: false },
  { items: [{ goodsId: 4, qty: 5 }, { goodsId: 2, qty: 1 }], customized: false }
];
t('move to another round (position)', () => {
  const src = T(), out = moveItem(src, { from: 0, goodsId: 1, to: 1, index: 1 });
  assert.deepEqual(out[0].items.map(x => x.goodsId), [2, 3]);
  assert.deepEqual(out[1].items.map(x => x.goodsId), [4, 1, 2]);
  assert.ok(out[0].customized && out[1].customized);
  assert.deepEqual(src, T(), 'input not mutated');
});
t('move merges same item quantity, keeps target position', () => {
  const out = moveItem(T(), { from: 0, goodsId: 2, to: 1, index: 0 });
  assert.deepEqual(out[1].items, [{ goodsId: 4, qty: 5 }, { goodsId: 2, qty: 4 }]);
  assert.ok(!out[0].items.some(x => x.goodsId === 2));
});
t('reorder within round (down, up, end, no-op)', () => {
  assert.deepEqual(moveItem(T(), { from: 0, goodsId: 1, to: 0, index: 3 })[0].items.map(x => x.goodsId), [2, 3, 1]);
  assert.deepEqual(moveItem(T(), { from: 0, goodsId: 1, to: 0, index: 2 })[0].items.map(x => x.goodsId), [2, 1, 3]);
  assert.deepEqual(moveItem(T(), { from: 0, goodsId: 3, to: 0, index: 0 })[0].items.map(x => x.goodsId), [3, 1, 2]);
  const src = T(); assert.equal(moveItem(src, { from: 0, goodsId: 2, to: 0, index: 1 }), src, 'same place = unchanged');
  assert.equal(moveItem(src, { from: 0, goodsId: 2, to: 0, index: 2 }), src, 'just below itself = unchanged');
});
t('drop on new round creates trip', () => {
  const out = moveItem(T(), { from: 1, goodsId: 4, to: 2 });
  assert.equal(out.length, 3); assert.deepEqual(out[2].items, [{ goodsId: 4, qty: 5 }]); assert.ok(out[2].customized);
});
t('move never cuts quantity even when over capacity', () => {
  const big = [{ items: [{ goodsId: pk.posts && goodsData.goods[10].id, qty: 999 }] }, { items: [] }];
  const out = moveItem(big, { from: 0, goodsId: goodsData.goods[10].id, to: 1 });
  assert.equal(out[1].items[0].qty, 999);
  const w = capacityWarnings(out[1], capacity({ carrierId: 'alpaca' }), goodsById); assert.ok(w.overload);
});
t('invalid move returns original', () => {
  const src = T();
  assert.equal(moveItem(src, { from: 5, goodsId: 1, to: 0 }), src);
  assert.equal(moveItem(src, { from: 0, goodsId: 99, to: 1 }), src);
  assert.equal(moveItem(src, { from: 0, goodsId: 1, to: 7 }), src);
});

console.log(`\n${passed} tests passed`);
