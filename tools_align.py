# KR 레시피 트리(recipes.json) ↔ MabiBase(NA) 제작 레시피를 재료 순서·수량으로 정렬해 게임 item id 매핑
import re,os,json,time,urllib.request,html
TOP={"소울 리버레이트 리라":1080048,"소울 리버레이트 이터널 볼트":1420007,"소울 리버레이트 이터널 애로우":1420006,"소울 리버레이트 콜로서스 미니어처":1640004,"소울 리버레이트 피에로 미니어처":1640003,"소울 리버레이트 가드실린더":1440006,"소울 리버레이트 마도서":1430005,"소울 리버레이트 보우":1040054,"소울 리버레이트 사이드":1090010,"소울 리버레이트 스로잉 스타":1280018,"소울 리버레이트 스태프":1230039,"소울 리버레이트 실드":1400011,"소울 리버레이트 실린더":1060011,"소울 리버레이트 오브":1460003,"소울 리버레이트 원드":1050017,"소울 리버레이트 크로스보우":1040055,"소울 리버레이트 힐링 원드":1650001,"소울 리버레이트 너클":1260020,"소울 리버레이트 듀얼건":1270029,"소울 리버레이트 랜스":1250026,"소울 리버레이트 블레이드":1200043,"소울 리버레이트 소드":1000059,"소울 리버레이트 액스":1020004,"소울 리버레이트 워리어 실드":1400012,"소울 리버레이트 워리어 액스":1220018,"소울 리버레이트 워리어 해머":1210067,"소울 리버레이트 체인 블레이드":1290021,"소울 리버레이트 해머":1010070,"소울 리버레이트 핸들":1070014}
os.makedirs('/tmp/mb',exist_ok=True)
def rows(i):
  f=f'/tmp/mb/{i}'
  if not os.path.exists(f):
    open(f,'w').write(urllib.request.urlopen(urllib.request.Request(f'https://na.mabibase.com/item/{i}',headers={'User-Agent':'Mozilla/5.0'})).read().decode());time.sleep(.3)
  t=open(f).read();k=t.find('Production Details')
  if k<0:return []
  s=t[k:k+60000];out=[]
  for row in re.split(r'EXP',s)[:-1]:
    ids=[int(x) for x in re.findall(r'href="/item/(\d+)"',row)];qs=[int(x) for x in re.findall(r'×\s*(?:<[^>]+>\s*)*(\d+)',row.replace(',',''))]
    if ids and len(ids)==len(qs): out.append([(a,'',c) for a,c in zip(ids,qs)])
    m=0
  return out
ID={};EN={};CONF=[]
def put(kr,i,en=''):
  if kr in ID and ID[kr]!=i: CONF.append((kr,ID[kr],i))
  else: ID[kr]=i;EN[kr]=en
def walk(node,i):
  if len(node)<3:return
  rs=rows(i);kids=node[2]['c']
  sig=[k[1] for k in kids]
  r=next((r for r in rs if [x[2] for x in r]==sig),None) or next((r for r in rs if len(r)==len(kids)),None)
  if not r: print('NO MATCH',node[0],i,sig,[[x[2] for x in r] for r in rs]);return
  for k,(j,en,q) in zip(kids,r): put(k[0],j,en);walk(k,j)
R=json.load(open('docs/craft/recipes.json'))
for t in R:
  i=TOP[t['n']];put(t['n'],i);walk([t['n'],1,t],i)
json.dump({'id':ID,'en':EN},open('/tmp/align.json','w'),ensure_ascii=False,indent=0)
print(len(ID),'mapped; conflicts',CONF)
