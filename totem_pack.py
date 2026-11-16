#!/usr/bin/env python3
"""토템 경매장 → docs/auction/totem_data.json (+ totem_history.json 누적).
auction/list·history 를 auction_item_category=토템 으로 커서 순회.
일반 토템은 (item_name, 정규화한 효과 묶음)으로 묶고,
브리 레흐·탈라가흐 주화는 매물마다 한 줄(효과 전부 + 가격 + date_auction_expire)로 둡니다.
공식 스키마(AuctionItem): item_option 배열, date_auction_expire(UTC).
브리 주화 3효과 상한은 공식 11/5 패치 안내(id=4893335). 탈라 가흐 주화(id=4893919)는 종류만 확인돼 상한은 넣지 않습니다."""
import json, os, re, sys, time, datetime, statistics, urllib.request, urllib.parse, urllib.error
from collections import Counter
H = os.path.dirname(os.path.abspath(__file__))
KEY = os.environ.get('NEXON_API_KEY_SERVICE') or os.environ.get('NEXON_API_KEY') or sys.exit('NEXON_API_KEY 필요')
KST = datetime.timezone(datetime.timedelta(hours=9))
CAT = '토템'
KEEP_TYPES = ('토템 효과', '토템 추가 옵션')

def get(q, ep='list'):
    url = 'https://open.api.nexon.com/mabinogi/v1/auction/' + ep + '?' + q
    for a in range(5):
        try:
            r = urllib.request.Request(url, headers={'x-nxopen-api-key': KEY, 'accept': 'application/json'})
            return json.load(urllib.request.urlopen(r, timeout=30))
        except urllib.error.HTTPError as e:
            # 본문만 짧게, 요청 헤더(키)는 출력하지 않음
            print('retry', ep, a, e.code, file=sys.stderr)
            if e.code == 400:
                return {}
            time.sleep(2 * (a + 1))
        except Exception as e:
            print('retry', ep, a, type(e).__name__, file=sys.stderr)
            time.sleep(2 * (a + 1))
    return {}

def series(name):
    if '두근두근' in name:
        return '두근두근'
    if '브리 레흐' in name:
        return '브리 레흐'
    # Official Nov 12, 2026 patch notice (id=4893919): [탈라 가흐의 주화] is
    # 물리 / 마법 / 연금 / 지원 토템, 4 types. Series key matches the UI chip.
    if '탈라 가흐' in name or '탈라가흐' in name:
        return '탈라가흐'
    if '왕립' in name:
        return '왕립'
    if '특산품' in name:
        return '특산품'
    return '기타'

# Official Nov 5, 2026 notice (id=4893335) ranges for [브리 레흐의 주화].
# 탈라 가흐 주화(id=4893919) is the same 4 types; official numeric ranges were
# not published in that notice, so max is omitted for that series.
COIN_SLOTS = {
    '물리': [
        {'id': 'md', 'k': '최대대미지', 'max': 20},
        {'id': 'cd', 'k': '크리티컬 대미지', 'max': 10, 'u': '%'},
        {'id': 'ad', 'k': '아르카나 스킬 보너스 대미지', 'max': 3, 'u': '%'},
    ],
    '마법': [
        {'id': 'ma', 'k': '마법 공격력', 'max': 20},
        {'id': 'cd', 'k': '크리티컬 대미지', 'max': 10, 'u': '%'},
        {'id': 'ad', 'k': '아르카나 스킬 보너스 대미지', 'max': 3, 'u': '%'},
    ],
    '연금': [
        {'id': 'al', 'k': '모든 속성 연금술 대미지', 'max': 20, 'aka': ['모든 연금술 대미지']},
        {'id': 'cd', 'k': '크리티컬 대미지', 'max': 10, 'u': '%'},
        {'id': 'ad', 'k': '아르카나 스킬 보너스 대미지', 'max': 3, 'u': '%'},
    ],
    '지원': [
        {'id': 'vb', 'k': '전장의 서곡, 비바체 공격력', 'max': 1, 'u': '%'},
        {'id': 'mb', 'k': '음악 버프 지속 시간', 'max': 20},
        {'id': 'he', 'k': '힐링 효과', 'max': 20, 'u': '%'},
    ],
}

def is_coin(name):
    return series(name) in ('브리 레흐', '탈라가흐') and '주화' in (name or '')

def coin_kind(name):
    m = re.search(r'\((물리|마법|연금|지원)\s*토템\)', name or '')
    return m.group(1) if m else ''

def compact_fx(fx):
    out = []
    for o in fx:
        rec = {'k': o['k'], 'v': o['v']}
        if o.get('t') and o['t'] != '토템 효과':
            rec['t'] = o['t']
        if o.get('v2'):
            rec['v2'] = o['v2']
        if o.get('d'):
            rec['d'] = o['d']
        if rec['k'] or rec['v'] or rec.get('t'):
            out.append(rec)
    return out

def norm_val(v):
    """6.000000 → 6, 0.50 → 0.5, 2% 는 % 유지."""
    s = (v if isinstance(v, str) else ('' if v is None else str(v))).strip()
    if not s:
        return ''
    pct = s.endswith('%')
    num = s[:-1].strip() if pct else s
    try:
        f = float(num)
    except ValueError:
        return s
    if f == int(f):
        out = str(int(f))
    else:
        out = ('%.10f' % f).rstrip('0').rstrip('.')
    return out + ('%' if pct else '')

def parse_fx(x):
    fx = []
    for t in x.get('item_option') or []:
        ty = t.get('option_type') or ''
        if ty not in KEEP_TYPES:
            # 나중에 생길 다른 토템 옵션도 버리지 않음
            if not ty.startswith('토템'):
                continue
        fx.append({
            't': ty,
            'k': t.get('option_sub_type') or '',
            'v': norm_val(t.get('option_value')),
            'v2': norm_val(t.get('option_value2')) if t.get('option_value2') not in (None, '') else '',
            'd': (t.get('option_desc') or '').strip(),
        })
    fx.sort(key=lambda o: (o['t'], o['k'], o['v'], o['v2'], o['d']))
    return fx

def parse_fx_all(x):
    """주화는 유형을 걸러내지 않고 item_option 전체를 유지(공식 API 순서)."""
    fx = []
    for t in x.get('item_option') or []:
        fx.append({
            't': t.get('option_type') or '',
            'k': t.get('option_sub_type') or '',
            'v': norm_val(t.get('option_value')),
            'v2': norm_val(t.get('option_value2')) if t.get('option_value2') not in (None, '') else '',
            'd': (t.get('option_desc') or '').strip(),
        })
    return fx

def fx_key(fx):
    return '/'.join('%s:%s=%s%s%s' % (
        o['t'], o['k'], o['v'],
        (':'+o['v2'] if o['v2'] else ''),
        ('@'+o['d'] if o['d'] else ''),
    ) for o in fx)

def row_key(name, fx):
    return name + '\t' + fx_key(fx)

def num_of(v):
    if not v:
        return None
    try:
        return float(str(v).rstrip('%'))
    except ValueError:
        return None

def walk(ep, pages):
    cur = None
    q0 = 'auction_item_category=' + urllib.parse.quote(CAT)
    for _ in range(pages):
        d = get(q0 + ('&cursor=' + urllib.parse.quote(cur) if cur else ''), ep)
        items = d.get('auction_item') if ep == 'list' else d.get('auction_history')
        yield from (items or [])
        cur = d.get('next_cursor')
        time.sleep(0.25)
        if not cur:
            break

os.makedirs(f'{H}/docs/auction', exist_ok=True)

agg, total = {}, 0
coins = []
coin_opt_type, coin_opt_sub, coin_lines, coin_kept = Counter(), Counter(), Counter(), Counter()
coin_sample = None
coin_raw_keys = Counter()
coin_display_diff = []
coin_raw_by_kind = {}
for x in walk('list', 100):
    name, p = x.get('item_name'), x.get('auction_price_per_unit')
    if not name or not p:
        continue
    if x.get('auction_item_category') not in (None, CAT):
        continue
    total += 1
    if is_coin(name):
        fx_all = parse_fx_all(x)
        fx_kept = parse_fx(x)
        coin_lines[len(fx_all)] += 1
        coin_kept[len(fx_kept)] += 1
        for o in (x.get('item_option') or []):
            coin_opt_type[o.get('option_type') or '(빈값)'] += 1
            coin_opt_sub[o.get('option_sub_type') or '(빈값)'] += 1
        rec = {
            'n': name,
            's': series(name),
            'c': coin_kind(name),
            'p': p,
            'fx': compact_fx(fx_all),
        }
        exp = x.get('date_auction_expire')
        if exp:
            rec['e'] = exp
        coins.append(rec)
        for k in x:
            coin_raw_keys[k] += 1
        dn = x.get('item_display_name') or ''
        if dn and dn != name:
            coin_display_diff.append({'name': name, 'display': dn, 'p': p})
        kind = rec['c'] or '?'
        # 종류별 1건 + 인게임 캡처와 같은 연금 2억4000만 매물이 있으면 그 원본을 남김
        want_raw = (kind not in coin_raw_by_kind) or (p == 240_000_000 and kind == '연금')
        if want_raw:
            coin_raw_by_kind[kind if p != 240_000_000 else '연금240M'] = {
                'keys': sorted(x.keys()),
                'item_name': name,
                'item_display_name': dn,
                'item_count': x.get('item_count'),
                'auction_item_category': x.get('auction_item_category'),
                'auction_price_per_unit': p,
                'date_auction_expire': exp,
                'item_option': x.get('item_option'),
                'other': {k: x.get(k) for k in x if k not in (
                    'item_name','item_display_name','item_count','auction_item_category',
                    'auction_price_per_unit','date_auction_expire','item_option')},
            }
        if coin_sample is None:
            coin_sample = {'name': name, 'display': dn, 'item_count': x.get('item_count'), 'options': [
                {k: o.get(k) for k in ('option_type', 'option_sub_type', 'option_value', 'option_value2', 'option_desc')}
                for o in (x.get('item_option') or [])
            ], 'date_auction_expire': exp}
        continue
    fx = parse_fx(x)
    k = row_key(name, fx)
    r = agg.get(k)
    if not r:
        r = agg[k] = {'name': name, 's': series(name), 'fx': fx, 'min': p, 'n': 0, 'L': []}
    r['L'].append(p)
    r['n'] += 1
    if p < r['min']:
        r['min'] = p

hp = f'{H}/docs/auction/totem_history.json'
try:
    hist = json.load(open(hp, encoding='utf-8'))
except Exception:
    hist = {}
seen = set(hist.get('ids') or [])
tr = hist.get('t') or {}
for x in walk('history', 40):
    name = x.get('item_name')
    bid, p, ts = x.get('auction_buy_id'), x.get('auction_price_per_unit'), x.get('date_auction_buy')
    if not name or not bid or bid in seen or not p or not ts:
        continue
    if x.get('auction_item_category') not in (None, CAT):
        continue
    seen.add(bid)
    k = row_key(name, parse_fx(x))
    tr.setdefault(k, []).append([ts[:16], p])

cut = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=30)).strftime('%Y-%m-%dT%H:%M')
tr = {k: v for k, v in ((k, sorted(x for x in vs if x[0] >= cut)) for k, vs in tr.items()) if v}

# 같은 이름끼리, 더 좋은(또는 같은) 효과인데 훨씬 싼 매물이 있으면 이상 고가로 표시
by_name = {}
for k, r in agg.items():
    by_name.setdefault(r['name'], []).append((k, r))
name_med = {}
name_hist_med = {}
for name, rs in by_name.items():
    ps = [p for _, r in rs for p in r.get('L') or []]
    if ps:
        name_med[name] = statistics.median(ps)
for k, hs in tr.items():
    name = k.split('\t', 1)[0]
    ps = [p for _, p in hs]
    if ps:
        name_hist_med.setdefault(name, []).extend(ps)
name_hist_med = {n: statistics.median(ps) for n, ps in name_hist_med.items() if ps}

def dominates(a, b):
    """a 효과가 b 이상을 모두 갖고, 비교 가능한 수치가 하나라도 있으면 True."""
    if not b:
        return bool(a)
    am = {}
    for o in a:
        if o['t'] != '토템 효과':
            continue
        nv = num_of(o['v'])
        am[(o['t'], o['k'])] = (nv, o['v'])
    compared = 0
    for o in b:
        if o['t'] != '토템 효과':
            continue
        nv = num_of(o['v'])
        key = (o['t'], o['k'])
        if key not in am:
            return False
        av, avs = am[key]
        if nv is not None and av is not None:
            if av + 1e-9 < nv:
                return False
            compared += 1
        elif avs != o['v']:
            return False
        else:
            compared += 1
    return compared > 0

def is_out(r, peers):
    p = r.get('min')
    if not p:
        return False
    if p >= 10_000_000_000:  # 100억 이상
        return True
    for _, q in peers:
        if q is r or not q.get('min'):
            continue
        if dominates(q['fx'], r['fx']) and q['min'] * 8 <= p:
            return True
    ref = name_med.get(r['name']) or name_hist_med.get(r['name'])
    if ref and p >= 1_000_000_000 and p >= 15 * ref and r['n'] <= 2:
        return True
    if ref and p >= 20 * ref and p >= 100_000_000:
        return True
    return False

now = datetime.datetime.now(KST).isoformat(timespec='seconds')
rows = []
for k in sorted(set(agg) | set(tr), key=lambda x: (x.split('\t', 1)[0], x)):
    name = k.split('\t', 1)[0]
    r0 = agg.get(k)
    if r0:
        r = {
            'name': r0['name'], 's': r0['s'],
            'fx': [{'t': o['t'], 'k': o['k'], 'v': o['v'], **({'v2': o['v2']} if o['v2'] else {}), **({'d': o['d']} if o['d'] else {})} for o in r0['fx']],
            'min': r0['min'], 'n': r0['n'],
            'L': sorted(r0['L'])[:40],
        }
        if is_out(r0, by_name.get(name, [])):
            r['out'] = 1
    else:
        # 체결만 있고 현재 매물이 없는 조합
        fx = []
        _, rest = k.split('\t', 1)
        # fx는 이력 키에서 복원하지 않고, 해당 키의 원본을 쓸 수 없으면 이름만
        r = {'name': name, 's': series(name), 'fx': fx, 'min': None, 'n': 0}
        # 키에서 효과 복원
        if rest:
            rec = []
            for part in rest.split('/'):
                if ':' not in part or '=' not in part:
                    continue
                t, kv = part.split(':', 1)
                kname, _, val = kv.partition('=')
                v2, d = '', ''
                if '@' in val:
                    val, d = val.split('@', 1)
                if ':' in val:
                    val, v2 = val.split(':', 1)
                rec.append({k: v for k, v in (('t', t), ('k', kname), ('v', val), ('v2', v2), ('d', d)) if v})
            r['fx'] = rec
    h = tr.get(k)
    if h:
        r['last'] = h[-1][1]
        rec = [p for _, p in h[-10:]]
        r['avg'] = round(sum(rec) / len(rec))
        r['t'] = len(h)
    if is_coin(name):
        # 주화 체결 이력은 유지하되, 일반 토템 표에는 넣지 않음
        continue
    rows.append(r)

kinds = sorted({o.get('k') for r in rows for o in (r.get('fx') or []) if o.get('k')}, key=lambda s: s)

coin_counts = {}
for rec in coins:
    coin_counts.setdefault(rec['s'], Counter())[rec['c'] or '?'] += 1
coin_counts = {s: dict(c) for s, c in coin_counts.items()}

json.dump({
    'updated': now,
    'listings': total,
    'kinds': kinds,
    'rows': rows,
    'coins': coins,
    'coinSlots': COIN_SLOTS,
    'coinCounts': coin_counts,
}, open(f'{H}/docs/auction/totem_data.json', 'w', encoding='utf-8'),
    ensure_ascii=False, separators=(',', ':'))
json.dump({'updated': now, 'ids': sorted(seen)[-30000:], 't': tr},
          open(hp, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('totem:', total, 'listings,', len(rows), 'rows,', len(coins), 'coins,', sum(map(len, tr.values())), 'trades,', sum(1 for r in rows if r.get('out')), 'outliers')
print('coin counts', coin_counts, file=sys.stderr)
print('coin option types', dict(coin_opt_type), file=sys.stderr)
print('coin option subtypes', dict(coin_opt_sub), file=sys.stderr)
print('coin option lines (all / keep-types)', dict(coin_lines), dict(coin_kept), file=sys.stderr)
if coin_sample:
    print('coin sample', json.dumps(coin_sample, ensure_ascii=False), file=sys.stderr)
print('coin raw keys', dict(coin_raw_keys), file=sys.stderr)
print('coin display_name != item_name', len(coin_display_diff), json.dumps(coin_display_diff[:5], ensure_ascii=False), file=sys.stderr)
print('coin raw by kind', json.dumps(coin_raw_by_kind, ensure_ascii=False), file=sys.stderr)
