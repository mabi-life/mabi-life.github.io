# 물교(barter) 재료/교역품 아이콘을 기존 아이콘 DB(docs/assets/icons)에 병합.
# id는 na.mabibase.com/item/<id> 영문명으로 검증한 것만 추가(추측 금지). 나머지는 NA 미출시/미확인 → 아이콘 없음.
import json,os,re,time,urllib.request
from PIL import Image
D='docs/assets/icons'
B={"고급 실크":60013,"고급 옷감":60021,"고급 가죽끈":60029,"최고급 가죽끈":60030,"빤짝이 종이":64051,"밀가루":50022,"보릿가루":50023,"검은색 수정":64075}
ids=json.load(open('data/item_ids.json'));ids.update(B)
json.dump(dict(sorted(ids.items())),open('data/item_ids.json','w'),ensure_ascii=False,indent=0)
h=open('docs/barter/index.html').read()
d=json.loads(re.search(r'<script id="data" type="application/json">(.*?)</script>',h,re.S).group(1))
names=set(d['materials'])|{g['name'] for g in d['goods']}
J=json.load(open(f'{D}/icons.json'));ic=J['icons']
def up(im):
  im=im.convert('RGBA');return im.convert('RGBa').resize((im.width*2,im.height*2),Image.LANCZOS).convert('RGBA')
for n in sorted(names):
  if n in ic or n not in ids: continue
  i=ids[n];o=f'{D}/orig/{i}.png'
  if not os.path.exists(o):
    urllib.request.urlretrieve(f'https://api.na.mabibase.com/assets/item/icon/{i}',o);time.sleep(.5)
  im=Image.open(o);assert im.format=='PNG'
  if not os.path.exists(f'{D}/2x/{i}.png'): up(im).save(f'{D}/2x/{i}.png',optimize=True)
  ic[n]={"id":i,"w":im.width,"h":im.height};print('+',n,i)

# 마비쿠마(mabi.spkuma.com) 아이콘 CDN: icons.spkuma.com/maps/<sha256(분류)[:8]>.js → items[이름][0] = <hash>.webp
# KR 전용 아이템(정확한 이름 일치만). 키 'sk<hash>', webp → PNG 변환 후 저장.
SK={"건초 더미": "cc13c191ac59c3fa.webp", "끈끈이 풀": "46250f383d58ae49.webp", "남동판": "875a903ac3231357.webp", "루멘 시럽": "17066f49aae152fc.webp", "마나 500 포션": "9163ae72a50fe235.webp", "마력이 깃든 나무장작": "a1890591b3b2e14f.webp", "마리오네트 500 포션": "79099010349b21db.webp", "마법의 깃털펜": "1bf78b21b876ded2.webp", "마법의 양피지": "a9bf344050432b36.webp", "매듭끈": "441f051cdf034f76.webp", "뮤턴트": "7141cd23b52cc78f.webp", "발리스타용 독 묻은 와이번 볼트": "fee59607a02fc78e.webp", "백연판": "185007177eff8454.webp", "산딸기 크림 소스 박스": "492c8890815afed2.webp", "새우 조련 미끼": "2866773bb063e5fc.webp", "생명력 500 포션": "75cf6d8dd5642616.webp", "스태미나 500 포션": "bda6bb9c511b88fa.webp", "에너지 증폭 장치": "a86d342aa1fe98cf.webp", "에너지 컨버터": "70a3d299e9ef4f80.webp", "에메랄드 퓨즈": "f7aeab605b44cc21.webp", "월광 기어": "d53498576f7b8a6b.webp", "월광 여울 이삭빵 박스": "b3622a56c165cc25.webp", "인조 잔디": "a5f1fd410a304c38.webp", "적철판": "3da11d3e596f4277.webp", "정령의 리큐르": "dd68ba23ee37eb85.webp", "정화된 토끼의 발": "11f6913bfdb73310.webp", "조화의 코스모스 퍼퓸": "2bb46aada9f75995.webp", "최고급 바닐라 향초": "32cfdebae0419342.webp", "쿠션용 솜": "60d0f6c1a8e3d68a.webp", "탈틴 농장 강력 접착제": "6c7b3afce5dd11a8.webp", "탈틴 농장 강화 섬유": "f87ff2f70230e5f7.webp", "탈틴 농장 꽃무늬 원피스": "7ca65d3d48e1cc52.webp", "탈틴 농장 누름꽃 공예 함": "9a19b75f0e5f570c.webp", "탈틴 농장 달콤 케이크": "62d921cc277ae9fc.webp", "탈틴 농장 레드문 귀걸이": "930cf3969c69f96c.webp", "탈틴 농장 미드나잇 펄 페인트": "4001242ac35010ff.webp", "탈틴 농장 방수 원단": "7ed696ad12f51ac5.webp", "탈틴 농장 별무늬 샐러드": "74681e9b609356e0.webp", "탈틴 농장 붉은 배 잼": "e7e5de1bf5ad134f.webp", "탈틴 농장 블랙베리 주스": "4566840de3af7422.webp", "탈틴 농장 새벽의 활": "7c164ad73a4735c6.webp", "탈틴 농장 이브닝 드레스": "5b560f680c222026.webp", "탈틴 농장 자색 원단": "1c4b57d5b71dabcb.webp", "탈틴 농장 장식용 크리스탈 검": "dd77dde49760e8c1.webp", "탈틴 농장 재스민 향수": "ed01d2c1c2e7a28a.webp", "탈틴 농장 천연 고무": "fb2071d472d1e93b.webp", "탈틴 농장 퓨어 블러썸 머리핀": "255d3414d2c5707e.webp", "탈틴 농장 황혼의 류트": "2be19094e92e3933.webp", "튼튼한 고리": "7314fc1653e19dea.webp", "펫 놀이세트": "886231bc1c0fc4aa.webp", "희귀 버섯 볶음 박스": "f019d48f536f0f8a.webp"}
for n,f in SK.items():
  if n in ic: continue
  k='sk'+f.split('.')[0];o=f'{D}/orig/{k}.png'
  if not os.path.exists(o):
    import io
    b=urllib.request.urlopen(urllib.request.Request('https://icons.spkuma.com/'+f,headers={'User-Agent':'Mozilla/5.0','Referer':'https://mabi.spkuma.com/'})).read()
    Image.open(io.BytesIO(b)).convert('RGBA').save(o,optimize=True);time.sleep(.5)
  im=Image.open(o)
  if not os.path.exists(f'{D}/2x/{k}.png'): up(im).save(f'{D}/2x/{k}.png',optimize=True)
  ic[n]={"id":k,"w":im.width,"h":im.height,"src":"spkuma"};print('+',n,k)
if 'spkuma' not in J['source']: J['source']=J['source'].replace(';',' + spkuma(마비쿠마) icons (sk* ids);',1)

# Prilus 교역품 이미지(공개 CDN): mabires.pril.cc/barterimage/kr/<barter id>/<id>.png — goods[].id 가 Prilus 물교 id (데이터 출처 동일)
for g in d['goods']:
  n=g['name']
  if n in ic: continue
  k=f"pb{g['id']}";o=f'{D}/orig/{k}.png'
  if not os.path.exists(o):
    b=urllib.request.urlopen(urllib.request.Request(f"https://mabires.pril.cc/barterimage/kr/{g['id']}/{g['id']}.png",headers={'User-Agent':'Mozilla/5.0'})).read()
    open(o,'wb').write(b);time.sleep(.5)
  im=Image.open(o);assert im.format=='PNG'
  if not os.path.exists(f'{D}/2x/{k}.png'): up(im).save(f'{D}/2x/{k}.png',optimize=True)
  ic[n]={"id":k,"w":im.width,"h":im.height,"src":"prilus"};print('+',n,k)
if 'prilus' not in J['source']: J['source']=J['source'].replace(';',' + Prilus barter images (pb* ids);',1)
json.dump(J,open(f'{D}/icons.json','w'),ensure_ascii=False,indent=0)
m=d['materials'];miss=[x for x in m if x not in ic]
print(len(m)-len(miss),'/',len(m),'materials; missing',len(miss),miss)
print('goods with icon',sum(g['name'] in ic for g in d['goods']),'/',len(d['goods']))
