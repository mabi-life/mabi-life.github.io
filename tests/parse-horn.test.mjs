// parseHorn 테스트 — 실행: node tests/parse-horn.test.mjs
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const ctx = { window: {} };
vm.runInNewContext(readFileSync(join(root, 'docs/coin/core.js'), 'utf8'), ctx);
const { parseHorn } = ctx.window.MabiCoin;

let passed = 0;
function t(name, fn) { try { fn(); passed++; console.log('PASS', name); } catch (e) { console.error('FAIL', name); console.error(e); process.exitCode = 1; } }

t('5개 75만에 삽니다 → 개당 15만', () => {
  const r = parseHorn('브리레흐의 구슬 5개 75만에 삽니다~~');
  assert.equal(r.length, 1);
  assert.equal(r[0].k, 'bri');
  assert.equal(r[0].side, 'buy');
  assert.equal(r[0].p, 150000);
});

t('N개를 X만 합계도 개당으로', () => {
  const r = parseHorn('브리구슬 5개를 75만에 삽니다');
  assert.equal(r.length, 1);
  assert.equal(r[0].p, 150000);
  assert.equal(r[0].k, 'bri');
});

t('개당 15만 우선 (x5개 = 75만)', () => {
  const r = parseHorn('3채널 브리입구 / 브리레흐의 구슬 개당 15만x5개 = 75만 삽니다~');
  assert.equal(r.length, 1);
  assert.equal(r[0].k, 'bri');
  assert.equal(r[0].side, 'buy');
  assert.equal(r[0].p, 150000);
});

t('개당 붙여쓰기 + 수량·합계가 있어도 개당 우선', () => {
  const r = parseHorn('브리구슬 개당15만x5개씩 75만 삽니다');
  assert.equal(r.length, 1);
  assert.equal(r[0].p, 150000);
});

t('구슬 25만 10개 팝니다 — 25만이 개당, 10개는 수량', () => {
  const r = parseHorn('구슬 25만 10개 팝니다');
  assert.equal(r.length, 1);
  assert.equal(r[0].side, 'sell');
  assert.equal(r[0].p, 250000);
});

t('ㅍㅍ 브리구슬 25만 10개 — 개당 25만 유지', () => {
  const r = parseHorn('ㅍㅍ 브리구슬 25만 10개');
  assert.equal(r.length, 1);
  assert.equal(r[0].k, 'bri');
  assert.equal(r[0].side, 'sell');
  assert.equal(r[0].p, 250000);
});

t('9월 오파스 글은 가격 없음', () => {
  const r = parseHorn('9월달쯤에 피방에서 브리도시다 버스시간되서 구구값 못받아가신분을 찾습니다.');
  assert.equal(r.length, 0);
});

t('기존 단순 구구·ㅍㅍ는 그대로', () => {
  assert.equal(parseHorn('구구 브리 20만')[0].p, 200000);
  assert.equal(parseHorn('ㅍㅍ 탈라구슬 30만')[0].p, 300000);
  assert.equal(parseHorn('ㅍㅍ 탈라구슬 30만')[0].k, 'tala');
});

if (!process.exitCode) console.log('all', passed, 'ok');
