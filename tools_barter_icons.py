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
json.dump(J,open(f'{D}/icons.json','w'),ensure_ascii=False,indent=0)
m=d['materials'];miss=[x for x in m if x not in ic]
print(len(m)-len(miss),'/',len(m),'materials; missing',len(miss),miss)
print('goods with icon',sum(g['name'] in ic for g in d['goods']),'/',len(d['goods']))
