#!/usr/bin/env python3
"""인챈트 스크롤 / 전용 인챈트 스크롤 경매장 → docs/auction/enchant_data.json (+ enchant_history.json 누적).
키: (kind 일반|전용, affix 접두|접미, name, rank). 효과 텍스트는 API에 없음."""
import json, os, re, sys, time, datetime, urllib.request, urllib.parse
H = os.path.dirname(os.path.abspath(__file__))
KEY = os.environ.get('NEXON_API_KEY_SERVICE') or os.environ.get('NEXON_API_KEY') or sys.exit('NEXON_API_KEY 필요')
KST = datetime.timezone(datetime.timedelta(hours=9))
NAMES = {'인챈트 스크롤': '일반', '전용 인챈트 스크롤': '전용'}
RX = re.compile(r'^\s*(.+?)\s*\(\s*랭크\s*([0-9A-Za-z]+)\s*\)\s*$')
def get(q, ep='list'):
    for a in range(5):
        try:
            r = urllib.request.Request('https://open.api.nexon.com/mabinogi/v1/auction/' + ep + '?' + q, headers={'x-nxopen-api-key': KEY})
            return json.load(urllib.request.urlopen(r, timeout=30))
        except Exception as e:
            print('retry', ep, a, e, file=sys.stderr); time.sleep(2 * (a + 1))
    return {}
def keys(x, kind):
    out = []
    for o in x.get('item_option') or []:
        if o.get('option_type') != '인챈트 종류': continue
        m = RX.match(o.get('option_value') or '')
        if m: out.append(f"{kind}|{o.get('option_sub_type') or ''}|{m.group(1).strip()}|{m.group(2).upper()}")
    return out
agg, total, bad = {}, 0, 0
for n, kind in NAMES.items():
    cur = None
    for _ in range(400):
        d = get('item_name=' + urllib.parse.quote(n) + ('&cursor=' + cur if cur else ''))
        for x in d.get('auction_item') or []:
            if x.get('item_name') != n: continue
            p = x.get('auction_price_per_unit'); ks = keys(x, kind)
            if not p or not ks: bad += 1; continue
            total += 1
            for k in ks:
                a = agg.setdefault(k, [p, 0, []]); a[0] = min(a[0], p); a[1] += 1; a[2].append(p)
        cur = d.get('next_cursor'); time.sleep(0.25)
        if not cur: break
hp = f'{H}/docs/auction/enchant_history.json'
try: hist = json.load(open(hp, encoding='utf-8'))
except Exception: hist = {}
seen = set(hist.get('ids') or []); tr = hist.get('t') or {}
for n, kind in NAMES.items():
    cur = None
    for _ in range(40):
        d = get('item_name=' + urllib.parse.quote(n) + ('&cursor=' + cur if cur else ''), 'history')
        for x in d.get('auction_history') or []:
            bid, p, ts = x.get('auction_buy_id'), x.get('auction_price_per_unit'), x.get('date_auction_buy')
            if x.get('item_name') != n or not bid or bid in seen or not p or not ts: continue
            seen.add(bid)
            for k in keys(x, kind): tr.setdefault(k, []).append([ts[:16], p])
        cur = d.get('next_cursor'); time.sleep(0.25)
        if not cur: break
cut = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=30)).strftime('%Y-%m-%dT%H:%M')
tr = {k: sorted(v for v in vs if v[0] >= cut) for k, vs in tr.items()}
tr = {k: v for k, v in tr.items() if v}
now = datetime.datetime.now(KST).isoformat(timespec='seconds')
rows = []
for k in sorted(set(agg) | set(tr)):
    kind, affix, name, rank = k.split('|', 3)
    r = {'kind': kind, 'affix': affix, 'name': name, 'rank': rank}
    if k in agg: r['min'], r['n'], r['top'] = agg[k][0], agg[k][1], sorted(agg[k][2])[:3]
    else: r['min'], r['n'] = None, 0
    h = tr.get(k)
    if h:
        r['last'] = h[-1][1]; rec = [p for _, p in h[-10:]]; r['avg'] = round(sum(rec) / len(rec)); r['t'] = len(h)
    rows.append(r)
os.makedirs(f'{H}/docs/auction', exist_ok=True)
json.dump({'updated': now, 'listings': total, 'kinds': len(agg), 'rows': rows},
          open(f'{H}/docs/auction/enchant_data.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
json.dump({'updated': now, 'ids': sorted(seen)[-50000:], 't': tr}, open(hp, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('enchant:', total, 'listings,', len(agg), 'keys,', len(rows), 'rows,', sum(map(len, tr.values())), 'trades, unparsed', bad)
