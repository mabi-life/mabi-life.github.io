# 유물 아이콘 패키징 (tools_icons.py 방식): 소스 라바뉴 labanyu.com/arcana/<1-10>, /skill/<id> → tacask-cdn webp(게임 클라 아이콘, ©NEXON)
# 아르카나 엠블럼 = arcana 페이지 헤더 아이콘, 스킬 아이콘 = skill 페이지 제목 옆 아이콘.
# docs/relics/icons/orig/*.png 원본 + 2x/*.png (premultiplied-alpha Lanczos 2x) + icons.json. 이름은 relics_pack.py ARC 표.
import re,os,ast,json,io,time,urllib.request
from PIL import Image
H=os.path.dirname(os.path.abspath(__file__));D=f'{H}/docs/relics/icons'
src=open(f'{H}/relics_pack.py',encoding='utf-8').read()
ARC=ast.literal_eval(re.search(r'^ARC = (\[.*?\])$',src,re.S|re.M)[1])
ALIAS={'고결한':'고결한 서약','트라이 어설트 피니시':'트라이 어설트'}
U=lambda u:urllib.request.urlopen(urllib.request.Request(u,headers={'User-Agent':'Mozilla/5.0'})).read()
def up(im,s=2):
  im=im.convert('RGBA');return im.convert('RGBa').resize((im.width*s,im.height*s),Image.LANCZOS).convert('RGBA')
def pack(key,url):
  o=f'{D}/orig/{key}.png'
  if not os.path.exists(o): Image.open(io.BytesIO(U(url))).convert('RGBA').save(o,optimize=True);time.sleep(.3)
  im=Image.open(o);up(im).save(f'{D}/2x/{key}.png',optimize=True);return {'w':im.width,'h':im.height,'src':url}
os.makedirs(f'{D}/orig',exist_ok=True);os.makedirs(f'{D}/2x',exist_ok=True)
want={a:ps for a,ps in ARC};arc_out={};sk_out={}
for n in range(1,11):
  h=U(f'https://labanyu.com/arcana/{n}').decode()
  emb=re.search(r'<img class="vertical-align-middle mr-1" src="([^"]+)"',h)[1]
  sk={}
  for i in sorted(set(re.findall(r'/skill/(\d+)',h)),key=int):
    s=U(f'https://labanyu.com/skill/{i}').decode()
    t=re.search(r'<title>\[아르카나 \(([^)]*)\)\] (.*?) - 라바뉴',s)
    if t: sk[t[2]]=(t[1],i,re.search(r'<img class="vertical-align-middle mr-1" src="([^"]+)"/>',s)[1])
  arc=next(iter(sk.values()))[0];assert arc in want,arc
  arc_out[arc]=dict(key=f'a{n}',**pack(f'a{n}',emb))
  for p in want[arc]:
    _,i,u=sk[ALIAS.get(p,p)];sk_out[p]=dict(key=f's{i}',**pack(f's{i}',u))
assert len(arc_out)==10 and len(sk_out)==30
json.dump({'source':'labanyu.com (tacask-cdn) arcana/skill icons, game client assets ©NEXON','upscale':'2x Lanczos, premultiplied alpha','arcana':arc_out,'skills':sk_out},open(f'{D}/icons.json','w'),ensure_ascii=False,indent=0)
print(len(arc_out),'arcana,',len(sk_out),'skills')
