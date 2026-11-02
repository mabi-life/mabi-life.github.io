#!/usr/bin/env python3
"""교역 보증서 경매장 → docs/auction/warranty_data.json (+ warranty_history.json 누적). keyword-search '보증서'."""
import json, os, re, sys, time, datetime, urllib.request, urllib.parse
H = os.path.dirname(os.path.abspath(__file__))
KEY = os.environ.get('NEXON_API_KEY_SERVICE') or os.environ.get('NEXON_API_KEY') or sys.exit('NEXON_API_KEY 필요')
KST = datetime.timezone(datetime.timedelta(hours=9))
def get(q, ep):
    for a in range(5):
        try:
            r = urllib.request.Request('https://open.api.nexon.com/mabinogi/v1/auction/' + ep + '?' + q, headers={'x-nxopen-api-key': KEY})
            return json.load(urllib.request.urlopen(r, timeout=30))
        except Exception as e:
            print('retry', ep, a, e, file=sys.stderr); time.sleep(2 * (a + 1))
    return {}
def ok(n): return n and '보증서' in n and ('교역' in n or '보증서' in n) and not any(w in n for w in ('갑옷',))
def parse(n):
    v = '거래 1회 가능' if '거래 1회' in n else '거래 가능' if '거래 가능' in n else ''
    base = re.sub(r'\s*\((거래[^)]*)\)\s*', '', n).strip()
    g = 'coupon' if '쿠폰' in n else 'etc' if '전용 해제' in n else 'w'
    return base, v, g
agg, total, cur = {}, 0, None
for _ in range(50):
    d = get('keyword=' + urllib.parse.quote('보증서') + ('&cursor=' + cur if cur else ''), 'keyword-search')
    for x in d.get('auction_item') or []:
        n, p = x.get('item_name'), x.get('auction_price_per_unit')
        if not ok(n) or not p: continue
        total += 1; a = agg.setdefault(n, [p, 0]); a[0] = min(a[0], p); a[1] += x.get('item_count') or 1
    cur = d.get('next_cursor'); time.sleep(0.25)
    if not cur: break
hp = f'{H}/docs/auction/warranty_history.json'
try: hist = json.load(open(hp, encoding='utf-8'))
except Exception: hist = {}
seen = set(hist.get('ids') or []); tr = hist.get('t') or {}
for n in sorted(set(agg) | set(tr)):
    cur = None
    for _ in range(10):
        d = get('item_name=' + urllib.parse.quote(n) + ('&cursor=' + cur if cur else ''), 'history')
        for x in d.get('auction_history') or []:
            bid, p, ts = x.get('auction_buy_id'), x.get('auction_price_per_unit'), x.get('date_auction_buy')
            if x.get('item_name') != n or not bid or bid in seen or not p or not ts: continue
            seen.add(bid); tr.setdefault(n, []).append([ts[:16], p])
        cur = d.get('next_cursor'); time.sleep(0.25)
        if not cur: break
cut = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=30)).strftime('%Y-%m-%dT%H:%M')
tr = {k: v for k, v in ((k, sorted(x for x in vs if x[0] >= cut)) for k, vs in tr.items()) if v}
now = datetime.datetime.now(KST).isoformat(timespec='seconds')
rows = []
for n in sorted(set(agg) | set(tr)):
    base, v, g = parse(n); r = {'item': n, 'base': base, 'var': v, 'group': g}
    r['min'], r['n'] = agg.get(n, [None, 0])
    h = tr.get(n)
    if h: r['last'] = h[-1][1]; rec = [p for _, p in h[-10:]]; r['avg'] = round(sum(rec) / len(rec)); r['t'] = len(h)
    rows.append(r)
json.dump({'updated': now, 'listings': total, 'kinds': len(agg), 'rows': rows},
          open(f'{H}/docs/auction/warranty_data.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
json.dump({'updated': now, 'ids': sorted(seen)[-20000:], 't': tr}, open(hp, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('warranty:', total, 'listings,', len(agg), 'items,', sum(map(len, tr.values())), 'trades')
