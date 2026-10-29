# 아이콘 패키징: 소스 MabiBase(api.na.mabibase.com/assets/item/icon/<itemId>, 게임 클라이언트 아이콘 RGBA PNG)
# 원본(orig/) + 2x 업스케일(2x/, premultiplied-alpha Lanczos, 투명도 보존). 키 = 게임 item id.
import json,os,urllib.request,time
from PIL import Image
M={"소울 리버레이트 힐링 원드":1650001,"브리 레흐의 코어":5100303,"브리 레흐의 정수":5100304,"강렬한 기억의 결정":5100276,"초록빛 기억의 조각":5100306,"바리사이트":5100314,"마력이 깃든 융합제":5100274,"퓨어 젬스톤":5100289,"젬스톤 파우더":5100273,"티어드롭 젬스톤":64114,"순도 높은 강화제":64639,"마력이 충만한 마력석":5100279,"브리 레흐의 기운이 깃든 문장":5100308,"오묘한 마력석":5100317,"강화된 실리엔":5100301,"온전한 실리엔":67209,"실리엔":67201,"실리엔 결정":67200,"신비한 허브 가루":67207,"블러디 허브":51101,"마나 허브":51102,"포이즌 허브":51109,"각성된 힘의 가루":64642,"순도 높은 융합의 실리엔":5100282,"순도 높은 마력의 결정":5100319,"순도 높은 힘의 결정":5100284,"각성된 힘의 조각":64643,"각성된 힘의 결정":64644,"깨어난 힘의 정수":64674,"마력이 담긴 마력석":5100288,"텅 빈 마력석":5100312,"침식된 광물 조각":64099,"마력이 깃든 마법사의 보석":5100298,"녹음이 깃든 마법사의 보석":5100328,"마력석":5100330,"재생의 가루":64640}
M.update(json.load(open('data/item_ids.json')))  # tools_align.py 결과 (쉼플레이스 KR ↔ MabiBase id)
# 더스크바운드(v0.10) 구 재료: MabiBase(NA) id 직접 확인
M.update({"가는 실뭉치":60007,"거미줄":60008,"질긴 실":60050,"최고급 실크":60014,"최고급 옷감":60022,"미스릴 대못":64301})
# 탈라 가흐/더스크바운드 신규 아이템: NA 미출시 → 라바뉴 썸네일(tacask-cdn, 48x48 RGBA). 키 'lb<라바뉴 id>'
# 라바뉴 id = labanyu.com/item/<base64('4'+id)> 페이지의 og:image item-<id>.png 로 확인
LB={"더스크바운드 에테리얼 튜더 베레모":44462,"더스크바운드 에테리얼 수트(남성용)":44463,"더스크바운드 에테리얼 수트(여성용)":44464,"더스크바운드 비고러스 레더 헬멧":44465,"더스크바운드 이지스 헬멧":44466,"더스크바운드 이지스 가드(남성용)":44467,"더스크바운드 이지스 가드(여성용)":44468,"더스크바운드 비고러스 아머(남성용)":44469,"더스크바운드 비고러스 아머(여성용)":44470,"더스크바운드 에테리얼 글러브":44471,"더스크바운드 비고러스 글러브":44472,"더스크바운드 이지스 건틀렛":44473,"더스크바운드 에테리얼 슈즈":44474,"더스크바운드 비고러스 부츠":44475,"더스크바운드 이지스 그리브":44476,
"고리아스 동력원":44610,"빛바랜 에너지 회로":44611,"순도 높은 실리엔 섬유 다발":44612,"순도 높은 힐웬 강판 조각":44613,"순도 높은 힐웬 주괴 조각":44614,"희미하게 빛나는 명주실":44615,"끈적이게 엉긴 식물 덩어리":44616,"달아오른 광두정":44617,"희미한 에너지 조각":44618,"탈라 가흐 실타래":44619}
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
for n,i in LB.items():
  k=f'lb{i}';o=f'{D}/orig/{k}.png'
  if not os.path.exists(o):
    open(o,'wb').write(urllib.request.urlopen(urllib.request.Request(f'https://tacask-cdn.com/mabi-labanyu/item-base-data/thumbnail/item-{i}.png',headers={'User-Agent':'Mozilla/5.0'})).read());time.sleep(.3)
  im=Image.open(o);assert im.format=='PNG' and im.mode=='RGBA'
  up(im).save(f'{D}/2x/{k}.png',optimize=True)
  out[n]={"id":k,"w":im.width,"h":im.height,"src":"labanyu"}
json.dump({"source":"MabiBase item icons + labanyu thumbnails (lb* ids; game client assets, ©NEXON)","upscale":"2x Lanczos, premultiplied alpha","icons":out},open(f'{D}/icons.json','w'),ensure_ascii=False,indent=0)
print(len(out))
