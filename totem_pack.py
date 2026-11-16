#!/usr/bin/env python3
"""토템 경매장 → docs/auction/totem_data.json (+ totem_history.json 누적).
auction/list·history 를 auction_item_category=토템 으로 커서 순회.
키: (item_name, 정규화한 효과 수치 묶음). 토템 효과·토템 추가 옵션을 모두 유지.
row: name 이름, s 시리즈, fx 효과[{t,k,v}], min 최저가, n 매물, L 싼순 40개,
     last/avg/t 체결, out 이상 고가(시세로 보지 말 것)."""
import json, os, re, sys, time, datetime, statistics, urllib.request, urllib.parse, urllib.error
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
for x in walk('list', 100):
    name, p = x.get('item_name'), x.get('auction_price_per_unit')
    if not name or not p:
        continue
    if x.get('auction_item_category') not in (None, CAT):
        continue
    fx = parse_fx(x)
    total += 1
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
    rows.append(r)

kinds = sorted({o.get('k') for r in rows for o in (r.get('fx') or []) if o.get('k')}, key=lambda s: s)

json.dump({'updated': now, 'listings': total, 'kinds': kinds, 'rows': rows},
          open(f'{H}/docs/auction/totem_data.json', 'w', encoding='utf-8'),
          ensure_ascii=False, separators=(',', ':'))
json.dump({'updated': now, 'ids': sorted(seen)[-30000:], 't': tr},
          open(hp, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('totem:', total, 'listings,', len(rows), 'rows,', sum(map(len, tr.values())), 'trades,', sum(1 for r in rows if r.get('out')), 'outliers')
