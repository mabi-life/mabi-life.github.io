# 쉼플레이스 제작 DB → craft RECIPES 트리 (재귀, 최대 깊이 6). 출력: docs/craft/recipes.json
import re,os,json,sys,time,urllib.request,html
B='https://mabinogi.shimplace.com/infocenter/'
def get(p):
  f='/tmp/spc/'+re.sub(r'\W','_',p)
  if not os.path.exists(f):
    t=urllib.request.urlopen(urllib.request.Request(B+p,headers={'User-Agent':'Mozilla/5.0 mabi-life'})).read().decode();open(f,'w').write(t);time.sleep(.4)
  return open(f).read()
def sec(t,a,b):
  i=t.find(a);j=t.find(b,i+1) if i>=0 else -1;return t[i:j] if i>=0 else ''
def items(s): return [(html.unescape(n.strip()),int(i),int(q)) for i,n,q in re.findall(r'item/detail\.php\?n=(\d+)">([^<]+)</a>\s*x(\d+)',s)]
def recipe(n):
  t=get(f'recipe/detail.php?n={n}')
  sk=re.search(r'<dt>생산 스킬</dt>\s*<dd>(.*?)</dd>',t,re.S);sk=re.sub(r'<[^>]+>|\s+',' ',sk.group(1)).strip() if sk else ''
  prod=items(sec(t,'<dt>생산품</dt>','</dl>'));mats=items(sec(t,'<dt>재료</dt>','</dl>'))
  def names(h):
    s=sec(t,f'<dt>{h}</dt>','</dl>');return [html.unescape(re.sub(r'<[^>]+>|\s+',' ',x).strip()) for x in re.findall(r'<li>(.*?)</li>',s,re.S) if re.sub(r'<[^>]+>','',x).strip()]
  return dict(skill=sk,prod=prod,mats=mats,tool=names('제작 시 필요한 도구'),fac=names('필요 시설/오브젝트'))
def item_recipes(i):
  t=get(f'item/detail.php?n={i}');s=sec(t,'comp-title1">제작법','재료로 쓰이는 제작법')
  return [int(x) for x in re.findall(r'recipe/detail\.php\?n=(\d+)',s)]
IDS={}
def node(name,i,q,dep,path):
  IDS[name]=i
  if dep>=6 or name in path: return [name,q]
  rs=item_recipes(i)
  if not rs: return [name,q]
  r=recipe(rs[0]);out=next((p[2] for p in r['prod'] if p[1]==i),1)
  d={"skill":r['skill'],"out":out,"c":[node(n,j,k,dep+1,path|{name}) for n,j,k in r['mats']]}
  if len(rs)>1:d["alt"]=len(rs)
  return [name,q,d]
def top(n):
  r=recipe(n);p=r['prod'][0];IDS[p[0]]=p[1]
  return dict(n=p[0],skill=r['skill'],tool=', '.join(r['tool']) or '-',fac=', '.join(r['fac']) or '-',src=n,c=[node(a,b,c,1,{p[0]}) for a,b,c in r['mats']])
R=[top(int(n)) for n in sys.argv[1:]]
json.dump(R,open('docs/craft/recipes.json','w'),ensure_ascii=False,separators=(',',':'))
json.dump(IDS,open('/tmp/spc_ids.json','w'),ensure_ascii=False)
print(len(R),'recipes',len(IDS),'items')
