# 아이콘 패키징: 소스 MabiBase(api.na.mabibase.com/assets/item/icon/<itemId>, 게임 클라이언트 아이콘 RGBA PNG)
# 원본(orig/) + 2x 업스케일(2x/, premultiplied-alpha Lanczos, 투명도 보존). 키 = 게임 item id.
import json,os,urllib.request,time
from PIL import Image
M={"소울 리버레이트 힐링 원드":1650001,"브리 레흐의 코어":5100303,"브리 레흐의 정수":5100304,"강렬한 기억의 결정":5100276,"초록빛 기억의 조각":5100306,"바리사이트":5100314,"마력이 깃든 융합제":5100274,"퓨어 젬스톤":5100289,"젬스톤 파우더":5100273,"티어드롭 젬스톤":64114,"순도 높은 강화제":64639,"마력이 충만한 마력석":5100279,"브리 레흐의 기운이 깃든 문장":5100308,"오묘한 마력석":5100317,"강화된 실리엔":5100301,"온전한 실리엔":67209,"실리엔":67201,"실리엔 결정":67200,"신비한 허브 가루":67207,"블러디 허브":51101,"마나 허브":51102,"포이즌 허브":51109,"각성된 힘의 가루":64642,"순도 높은 융합의 실리엔":5100282,"순도 높은 마력의 결정":5100319,"순도 높은 힘의 결정":5100284,"각성된 힘의 조각":64643,"각성된 힘의 결정":64644,"깨어난 힘의 정수":64674,"마력이 담긴 마력석":5100288,"텅 빈 마력석":5100312,"침식된 광물 조각":64099,"마력이 깃든 마법사의 보석":5100298,"녹음이 깃든 마법사의 보석":5100328,"마력석":5100330,"재생의 가루":64640}
M.update(json.load(open('data/item_ids.json')))  # tools_align.py 결과 (쉼플레이스 KR ↔ MabiBase id)
D='docs/assets/icons';out={}
def up(im,s=2):
  im=im.convert('RGBA');p=im.convert('RGBa')
  p=p.resize((im.width*s,im.height*s),Image.LANCZOS)
  return p.convert('RGBA')
for n,i in M.items():
  o=f'{D}/orig/{i}.png'
  if not os.path.exists(o):
    urllib.request.urlretrieve(f'https://api.na.mabibase.com/assets/item/icon/{i}',o);time.sleep(.3)
  im=Image.open(o);assert im.format=='PNG'
  up(im).save(f'{D}/2x/{i}.png',optimize=True)
  out[n]={"id":i,"w":im.width,"h":im.height}
json.dump({"source":"MabiBase item icons (game client assets, ©NEXON)","upscale":"2x Lanczos, premultiplied alpha","icons":out},open(f'{D}/icons.json','w'),ensure_ascii=False,indent=0)
print(len(out))
