#!/usr/bin/env python3
"""거대한 외침의 뿔피리(world horn) 내역 → 구슬 관련 원문만 48시간 보관 (docs/horn_beads.json).
Nexon Open API horn-bugle-world/history 는 서버별 최근 1시간·최대 1,000건만 줌 → 10분마다 누적.
가격 파싱은 클라이언트(/coin/app.js)에서 함 (파서 개선 시 데이터 재수집 불필요).
개인정보 최소화: 캐릭터명은 저장하지 않고 해시 앞 8자리(중복 제거용)만 저장."""
import json, os, sys, time, hashlib, datetime, urllib.request, urllib.parse, urllib.error
H = os.path.dirname(os.path.abspath(__file__))
KEY = os.environ.get('NEXON_API_KEY') or sys.exit('NEXON_API_KEY 필요')
SERVERS = ['류트', '만돌린', '하프', '울프']
KEEP_H = 48
P = f'{H}/docs/horn_beads.json'
KW = ('구슬', '구구', '거뿔', '거대한 외침', '거대 뿔', '거대뿔')
try: db = json.load(open(P, encoding='utf-8'))
except Exception: db = {}
rows = {r['id']: r for r in db.get('rows', [])}
ok = 0
for s in SERVERS:
    u = 'https://open.api.nexon.com/mabinogi/v1/horn-bugle-world/history?server_name=' + urllib.parse.quote(s)
    try:
        d = json.load(urllib.request.urlopen(urllib.request.Request(u, headers={'x-nxopen-api-key': KEY}), timeout=25))
    except Exception as e:
        print('horn fail', s, type(e).__name__, getattr(e, 'code', ''), file=sys.stderr); continue
    ok += 1
    for x in d.get('horn_bugle_world_history') or []:
        m = (x.get('message') or '').strip()
        if not any(k in m for k in KW): continue
        who = hashlib.sha1((x.get('character_name') or '').encode()).hexdigest()[:8]
        t = x.get('date_send') or ''
        rid = hashlib.sha1(f'{s}|{who}|{t}|{m}'.encode()).hexdigest()[:12]
        rows.setdefault(rid, {'id': rid, 's': s, 'w': who, 't': t, 'm': m})
    time.sleep(0.2)
if ok == 0:
    print('horn: no server ok; unchanged'); sys.exit(0)
cut = datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=KEEP_H)
def ts(r):
    try: return datetime.datetime.fromisoformat(r['t'].replace('Z', '+00:00'))
    except Exception: return cut
keep = sorted((r for r in rows.values() if ts(r) >= cut), key=lambda r: r['t'])
KST = datetime.timezone(datetime.timedelta(hours=9))
json.dump({'updated': datetime.datetime.now(KST).isoformat(timespec='seconds'),
           'source': 'NEXON Open API horn-bugle-world/history (서버별 최근 1시간, 10분마다 누적, 48시간 보관)',
           'rows': keep}, open(P, 'w', encoding='utf-8'), ensure_ascii=False, separators=(',', ':'))
print(f'horn: servers ok {ok}, bead rows {len(keep)}')
