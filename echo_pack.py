#!/usr/bin/env python3
"""에코스톤 경매장 → docs/auction/echo_data.json (+ echo_history.json 누적).
키: (색 레드|블루|옐로|실버|블랙, 각성 능력 이름, 각성 Lv). 각성 없는 매물은 능력 '' 로 묶음.
row: c 색, a 각성 능력, l 각성 Lv, v 효과 수치, min 최저가, n 매물, g30 30등급 매물 수, st 최저가 매물의 고유능력 수치, L 매물 [가격,고유수치,등급] 싼순 40개, last/avg/t 체결."""
import json, os, re, sys, time, datetime, urllib.request, urllib.parse
H = os.path.dirname(os.path.abspath(__file__))
KEY = os.environ.get('NEXON_API_KEY_SERVICE') or os.environ.get('NEXON_API_KEY') or sys.exit('NEXON_API_KEY 필요')
KST = datetime.timezone(datetime.timedelta(hours=9))
COLORS = ['레드', '블루', '옐로', '실버', '블랙']
RX = re.compile(r'^\s*(.+?)\s+(\d+)\s*레벨\s*(?:\(\s*([\d.]+)\s*\))?\s*$', re.S)
def get(q, ep='list'):
    for a in range(5):
        try:
            r = urllib.request.Request('https://open.api.nexon.com/mabinogi/v1/auction/' + ep + '?' + q, headers={'x-nxopen-api-key': KEY})
            return json.load(urllib.request.urlopen(r, timeout=30))
        except Exception as e:
            print('retry', ep, a, e, file=sys.stderr); time.sleep(2 * (a + 1))
    return {}
def parse(x):
    o = {}; ab = ('', 0, None)
    for t in x.get('item_option') or []:
        ty, v = t.get('option_type'), t.get('option_value') or ''
        if ty == '에코스톤 등급': o['g'] = int(v) if v.isdigit() else 0
        elif ty == '에코스톤 고유 능력': o['s'] = int(v) if v.isdigit() else 0; o['sn'] = t.get('option_sub_type') or ''
        elif ty == '에코스톤 각성 능력':
            m = RX.match(v.replace('\n', ' '))
            ab = (m.group(1).strip(), int(m.group(2)), float(m.group(3)) if m.group(3) else None) if m else (v.strip(), 0, None)
    return ab, o
agg, stat, total = {}, {}, 0
for c in COLORS:
    n = c + ' 에코스톤'; cur = None
    for _ in range(100):
        d = get('item_name=' + urllib.parse.quote(n) + ('&cursor=' + cur if cur else ''))
        for x in d.get('auction_item') or []:
            p = x.get('auction_price_per_unit')
            if x.get('item_name') != n or not p: continue
            (a, l, v), o = parse(x); total += 1
            stat.setdefault(c, o.get('sn', ''))
            k = f'{c}|{a}|{l}'; r = agg.get(k)
            if not r: r = agg[k] = {'min': p, 'n': 0, 'g30': 0, 'st': o.get('s'), 'v': v, 'L': []}
            r['L'].append([p, o.get('s') or 0, o.get('g') or 0])
            r['n'] += 1; r['g30'] += o.get('g') == 30
            if p < r['min']: r['min'] = p; r['st'] = o.get('s')
        cur = d.get('next_cursor'); time.sleep(0.25)
        if not cur: break
hp = f'{H}/docs/auction/echo_history.json'
try: hist = json.load(open(hp, encoding='utf-8'))
except Exception: hist = {}
seen = set(hist.get('ids') or []); tr = hist.get('t') or {}
for c in COLORS:
    n = c + ' 에코스톤'; cur = None
    for _ in range(20):
        d = get('item_name=' + urllib.parse.quote(n) + ('&cursor=' + cur if cur else ''), 'history')
        for x in d.get('auction_history') or []:
            bid, p, ts = x.get('auction_buy_id'), x.get('auction_price_per_unit'), x.get('date_auction_buy')
            if x.get('item_name') != n or not bid or bid in seen or not p or not ts: continue
            seen.add(bid); (a, l, v), _o = parse(x); tr.setdefault(f'{c}|{a}|{l}', []).append([ts[:16], p])
        cur = d.get('next_cursor'); time.sleep(0.25)
        if not cur: break
cut = (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(days=30)).strftime('%Y-%m-%dT%H:%M')
tr = {k: v for k, v in ((k, sorted(x for x in vs if x[0] >= cut)) for k, vs in tr.items()) if v}
now = datetime.datetime.now(KST).isoformat(timespec='seconds')
rows = []
for k in sorted(set(agg) | set(tr)):
    c, a, l = k.split('|'); r = {'c': c, 'a': a, 'l': int(l)}
    r.update(agg.get(k) or {'min': None, 'n': 0, 'g30': 0})
    if r.get('L'): r['L'] = sorted(r['L'])[:40]
    h = tr.get(k)
    if h: r['last'] = h[-1][1]; rec = [p for _, p in h[-10:]]; r['avg'] = round(sum(rec) / len(rec)); r['t'] = len(h)
    rows.append(r)
json.dump({'updated': now, 'listings': total, 'stat': stat, 'rows': rows},
          open(f'{H}/docs/auction/echo_data.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
json.dump({'updated': now, 'ids': sorted(seen)[-30000:], 't': tr}, open(hp, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('echo:', total, 'listings,', len(rows), 'rows,', sum(map(len, tr.values())), 'trades')
