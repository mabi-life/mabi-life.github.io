#!/usr/bin/env python3
"""무리아스의 유물 경매장 → docs/relics/data.json (아르카나 → 옵션 3종 → Lv1~10 최저가/매물수).
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
# 경매장 옵션엔 아르카나 필드가 없음 → 스킬명 접두어로 아르카나 매핑 (공식 공지/라바뉴 기준 아르카나당 3옵션)
ARC = [('엘레멘탈 나이트', ['파이어 리프 어택', '아이스 윈드밀', '라이트닝 스매시']),
       ('세인트 바드', ['구원의 메아리', '정화의 고동', '붕괴의 파동']),
       ('다크 메이지', ['익스플로전 런지', '라이트닝 체인', '스노우 스톰']),
       ('알케믹 스팅어', ['플레임 버스트', '하이드로 피어스', '트라이 어설트 피니시']),
       ('세이크리드 가드', ['희생의 응징', '심판의 일격', '고결한']),
       ('블래스트 랜서', ['임팩트 크러시', '오버 드라이브', '어나이얼레이션']),
       ('배리어블 거너', ['헤비 아틸러리', '데바스테이션 캐논', '페이탈 스코프']),
       ('포비든 알케미스트', ['케미컬 카니발', '스파이럴 이럽션', '서먼 나이트메어']),
       ('멜로딕 퍼피티어', ['인터루드 슬래시', '다운비트 악센트', '그랜드 피날레']),
       ('퓨리 파이터', ['익시드 : 체인 블로우', '익시드 : 임팩트 다이브', '익시드 : 포스 슬램'])]
def arc_of(sk):
    for a, ps in ARC:
        for i, p in enumerate(ps):
            if sk.startswith(p): return a, i
    return '기타', 9
skills = collections.defaultdict(list)
for (sk, opt, verb, u, mx), lvs in agg.items():
    arc, idx = arc_of(sk)
    skills[arc].append({'name': f'{sk} {opt}', 'i': idx, 'desc': f'{verb} · Lv당 +{fmt(mx / 10)}{u} (최대 {fmt(mx)}{u})',
                       'step': fmt(mx / 10) + u, 'max': fmt(mx) + u,
                       'lv': {str(l): [c['p'], c['n']] for l, c in sorted(lvs.items())}})
out = {'updated': datetime.datetime.now(KST).isoformat(timespec='seconds'), 'listings': len(rows),
       'skills': [{'name': a, 'options': sorted(skills[a], key=lambda o: (o['i'], o['name']))} for a in [x for x, _ in ARC] + ['기타'] if skills.get(a)]}
os.makedirs(f'{H}/docs/relics', exist_ok=True)
json.dump(out, open(f'{H}/docs/relics/data.json', 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print('relics:', len(rows), 'listings,', len(skills), 'skills')
