#!/usr/bin/env python3
"""무리아스의 유물 경매장 → docs/relics/data.json (스킬 → 옵션 → Lv1~10 최저가/매물수).
Lv = round(값 / 최대 * 10). 키는 NEXON_API_KEY 환경변수."""
import json, os, re, sys, time, datetime, urllib.request, urllib.parse, collections
H = os.path.dirname(os.path.abspath(__file__))
KEY = os.environ.get('NEXON_API_KEY') or sys.exit('NEXON_API_KEY 필요')
KST = datetime.timezone(datetime.timedelta(hours=9))
NAMES = ['무리아스의 유물', '무리아스의 유물(이데아)']
KW = ['대미지', '지속 시간', '회복량', '매초', '속성 에너지', '과열', '폭발', '캐릭터', '쿨타임', '재사용', '공격', '사거리', '범위', '최대', '치명타', '횟수', '소모', '획득', '효과', '확률', '이동']
def get(q):
    for a in range(4):
        try:
            r = urllib.request.Request('https://open.api.nexon.com/mabinogi/v1/auction/list?' + q, headers={'x-nxopen-api-key': KEY})
            return json.load(urllib.request.urlopen(r, timeout=30))
        except Exception:
            time.sleep(2 * (a + 1))
    return {}
rows = []
for n in NAMES:
    cur = None
    while True:
        d = get('item_name=' + urllib.parse.quote(n) + ('&cursor=' + cur if cur else ''))
        rows += [x for x in d.get('auction_item') or [] if x.get('item_name') == n]
        cur = d.get('next_cursor')
        if not cur: break
RX = re.compile(r'^(.*?)\s([\d.]+)(%|초)?\s(증가|추가|감소)\s\(최대\s([\d.]+)(%|초)?\)$')
def skill_of(head):
    best = len(head)
    for k in KW:
        i = head.find(' ' + k)
        if 0 < i < best: best = i
    return head[:best].strip(), head[best:].strip()
agg = {}
for x in rows:
    p = x.get('auction_price_per_unit')
    for o in x.get('item_option') or []:
        if o.get('option_type') != '무리아스 유물': continue
        m = RX.match(o.get('option_value') or '')
        if not m or not p: continue
        head, v, u, verb, mx = m.group(1), float(m.group(2)), m.group(3) or '', m.group(4), float(m.group(5))
        lv = max(1, min(10, round(v / mx * 10)))
        sk, opt = skill_of(head)
        key = (sk, opt or head, verb, u, mx)
        a = agg.setdefault(key, {})
        c = a.setdefault(lv, {'p': p, 'n': 0, 'v': v})
        c['n'] += 1; c['p'] = min(c['p'], p)
fmt = lambda f: ('%g' % f)
skills = collections.defaultdict(list)
for (sk, opt, verb, u, mx), lvs in agg.items():
    skills[sk].append({'name': opt, 'desc': f'{sk} {opt} {verb} · Lv당 +{fmt(mx / 10)}{u} (최대 {fmt(mx)}{u})',
                       'step': fmt(mx / 10) + u, 'max': fmt(mx) + u,
                       'lv': {str(l): [c['p'], c['n']] for l, c in sorted(lvs.items())}})
out = {'updated': datetime.datetime.now(KST).isoformat(timespec='seconds'), 'listings': len(rows),
       'skills': [{'name': k, 'options': sorted(v, key=lambda o: o['name'])} for k, v in sorted(skills.items())]}
os.makedirs(f'{H}/docs/relics', exist_ok=True)
json.dump(out, open(f'{H}/docs/relics/data.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('relics:', len(rows), 'listings,', len(skills), 'skills')
