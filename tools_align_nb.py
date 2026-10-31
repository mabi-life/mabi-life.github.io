import json
exec(open('tools_align.py').read().split('R=json.load')[0])
NB={'로그':1040013,'바이킹':1020011,'뱅가드':1400003,'뱅퀴셔':1270006,'버서커':1220000,'베가 오브':1460002,'베가본드':1260003,'세이비어':1650002,'스피어헤드':1250005,'아이리스 티어':1640007,'어설트':1000014,'엘리멘토':1050002,'옵저버 사이드':1090004,'워로드':1200007,'인퀴지터':1230010,'인포서':1010055,'인필트레이터':1280003,'테크니션':1060004,'트릭스터':1070002,'팬텀':1290008,'프레데터':1040010,'프로핏':1430002}
TOP={'나이트브링어 '+k:v for k,v in NB.items()}
R=json.load(open('docs/craft/recipes.json'))
for t in R:
  if t['n'] in TOP: i=TOP[t['n']];put(t['n'],i);walk([t['n'],1,t],i)
print(CONF)
IC=json.load(open('docs/assets/icons/icons.json'))['icons']
names=set()
def g(n):
  names.add(n[0] if isinstance(n,list) else n['n'])
  for c in (n[2]['c'] if isinstance(n,list) and len(n)>2 else n.get('c',[]) if isinstance(n,dict) else []): g(c)
for t in R: g(t)
miss=sorted(n for n in names if n not in IC)
for n in miss: print(n, ID.get(n))
json.dump(ID,open('/tmp/nbid.json','w'),ensure_ascii=False)
