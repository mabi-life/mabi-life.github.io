# barter-preview 하위 재료(REC) 아이콘: KR id = mrgrin.kr /api/item-library 정확 이름 일치, 아이콘 = MabiBase(api.na.mabibase.com)
import json,os,re,time,urllib.request,urllib.parse
from PIL import Image
D='docs/assets/icons'
s=open('docs/barter-preview/index.html').read()
R=json.loads(re.search(r'const REC=(\{.*?\});',s).group(1))
J=json.load(open(f'{D}/icons.json'));ic=J['icons']
need=sorted({n for v in R.values() for n,_ in v['c'] if n not in ic})
H={'User-Agent':'Mozilla/5.0'}
def up(im):return im.convert('RGBa').resize((im.width*2,im.height*2),Image.LANCZOS).convert('RGBA')
miss=[]
for n in need:
  try:
    j=json.load(urllib.request.urlopen(urllib.request.Request('https://mrgrin.kr/api/item-library?q='+urllib.parse.quote(n),headers=H),timeout=15))
    i=next((x['id'] for x in j.get('suggestions',[]) if x['name']==n and x.get('kind')=='item'),None)
    if not i: miss.append(n+'(id)');continue
    o=f'{D}/orig/{i}.png'
    if not os.path.exists(o):
      b=urllib.request.urlopen(urllib.request.Request(f'https://api.na.mabibase.com/assets/item/icon/{i}',headers=H),timeout=15).read();open(o,'wb').write(b)
    im=Image.open(o)
    if im.format!='PNG': os.remove(o);miss.append(n+'(fmt)');continue
    if not os.path.exists(f'{D}/2x/{i}.png'): up(im).save(f'{D}/2x/{i}.png',optimize=True)
    ic[n]={"id":i,"w":im.width,"h":im.height};print('+',n,i)
  except Exception as e: miss.append(f'{n}({str(e)[:30]})')
  time.sleep(.4)
json.dump(J,open(f'{D}/icons.json','w'),ensure_ascii=False,indent=0)
print('MISS',miss)
