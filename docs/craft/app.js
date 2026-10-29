// 제작 재료 계산기 v0.2 test — 레시피 트리: mabinogi.shimplace.com 제작 DB 기준 (재귀, 최대 깊이 6)
// 노드: [이름, 개수, (제작 가능하면) {skill, out(1회 산출량), c:[하위]}]
const RECIPES=[{n:"소울 리버레이트 힐링 원드",skill:"매직 크래프트",tool:"벼락맞은 떡갈나무 지팡이 (소모 X)",fac:"마법의 가마솥",c:[["브리 레흐의 코어",5],["브리 레흐의 정수",10],["강렬한 기억의 결정",10,{"skill":"힐웬 공학","out":1,"c":[["초록빛 기억의 조각",3],["바리사이트",10],["마력이 깃든 융합제",5],["퓨어 젬스톤",2,{"skill":"매직 크래프트","out":1,"c":[["마력이 깃든 융합제",3],["젬스톤 파우더",30],["티어드롭 젬스톤",30],["순도 높은 강화제",10]]}]]}],["마력이 충만한 마력석",2,{"skill":"매직 크래프트","out":1,"c":[["브리 레흐의 기운이 깃든 문장",3],["오묘한 마력석",10],["마력이 깃든 융합제",3],["강화된 실리엔",3,{"skill":"매직 크래프트","out":1,"c":[["온전한 실리엔",70,{"skill":"매직 크래프트","out":1,"c":[["실리엔",1,{"skill":"매직 크래프트","out":1,"c":[["실리엔 결정",5]]}],["신비한 허브 가루",3,{"skill":"매직 크래프트","out":1,"c":[["블러디 허브",1],["마나 허브",1],["포이즌 허브",1]]}]],"alt":2}],["순도 높은 강화제",30],["각성된 힘의 가루",10]]}]]}],["순도 높은 융합의 실리엔",2,{"skill":"매직 크래프트","out":1,"c":[["순도 높은 마력의 결정",10],["순도 높은 힘의 결정",5,{"skill":"매직 크래프트","out":1,"c":[["마력이 깃든 융합제",3],["각성된 힘의 조각",10],["각성된 힘의 결정",10],["깨어난 힘의 정수",20],["각성된 힘의 가루",10]]}],["마력이 깃든 융합제",1],["온전한 실리엔",100,{"skill":"매직 크래프트","out":1,"c":[["실리엔",1,{"skill":"매직 크래프트","out":1,"c":[["실리엔 결정",5]]}],["신비한 허브 가루",3,{"skill":"매직 크래프트","out":1,"c":[["블러디 허브",1],["마나 허브",1],["포이즌 허브",1]]}]],"alt":2}]]}],["마력이 담긴 마력석",10,{"skill":"매직 크래프트","out":1,"c":[["텅 빈 마력석",5],["마력이 깃든 융합제",1],["퓨어 젬스톤",1,{"skill":"매직 크래프트","out":1,"c":[["마력이 깃든 융합제",3],["젬스톤 파우더",30],["티어드롭 젬스톤",30],["순도 높은 강화제",10]]}],["침식된 광물 조각",6]]}],["마력이 깃든 마법사의 보석",24,{"skill":"매직 크래프트","out":1,"c":[["녹음이 깃든 마법사의 보석",7],["마력석",20],["젬스톤 파우더",20],["각성된 힘의 가루",10]]}],["재생의 가루",100]]}];
const LS='mabiCraft.v0';const st=Object.assign({goal:0,qty:1,own:{}},JSON.parse(localStorage.getItem(LS)||'{}'));
const save=()=>localStorage.setItem(LS,JSON.stringify(st));
let P={},PT='';const f=x=>x.toLocaleString('ko-KR');const pr=n=>P[n]&&P[n].min;
const $=id=>document.getElementById(id);
function nodeCost(c,mult){const [n,k,r]=c;const all=k*mult;const own=+st.own[n]||0;const need=Math.max(0,all-own);const p=pr(n);
 let sub=null;if(r){const runs=Math.ceil(need/(r.out||1));sub={runs,tot:0,miss:0};r.c.forEach(x=>{const z=nodeCost(x,runs);sub.tot+=z.best;sub.miss+=z.miss});}
 let best,miss=0;if(p&&(!sub||sub.miss||p*need<=sub.tot))best=p*need;else if(sub){best=sub.tot;miss=sub.miss}else{best=0;miss=need?1:0}
 return {all,need,p,sub,best,miss}}
function mk(c,mult,path){const [n,k,r]=c;const z=nodeCost(c,mult);const d=document.createElement('div');d.className='branch';
 const id=path+'/'+n;const open=st.open&&st.open[id];
 const nd=document.createElement('div');nd.className='node'+(r?' craft':'');
 nd.innerHTML=`${r?`<span class="chev">${open?'‹':'›'}</span>`:''}<div class="name">${n}<span class="tag" style="${r?'background:#4a3a1a;color:#f7d98b':''}">${r?r.skill+(r.out>1?' ×'+r.out:''):'구매/획득'}</span></div><div class="meta">필요 ×${f(z.all)} · 부족 <b class="${z.need?'':'need0'}">${f(z.need)}</b></div><div class="meta">개당 ${z.p?f(z.p):'—'} · 구매 <b>${z.p?f(z.p*z.need):'—'}</b>${z.sub?` · 제작 <b>${f(z.sub.tot)}</b>${z.sub.miss?'+?':''} (${f(z.sub.runs)}회)`:''}</div><label class="own">보유 <input type="number" min="0" value="${st.own[n]||0}" data-n="${n}"></label>${r?`<div class="hint">클릭: 하위 재료 ${open?'접기':'펼치기'}</div>`:''}`;
 d.appendChild(nd);
 if(r){const kids=document.createElement('div');kids.className='kids'+(open?'':' hide');
  if(open)r.c.forEach(x=>kids.appendChild(mk(x,z.sub.runs,id)));d.appendChild(kids);
  nd.onclick=()=>{st.open=st.open||{};st.open[id]=!open;save();render()}}
 return d}
function render(){const R=RECIPES[st.goal],q=st.qty;const root=$('root');root.innerHTML='';
 const b=document.createElement('div');b.className='branch';const g=document.createElement('div');g.className='node goal craft';
 let tot=0,miss=0;R.c.forEach(c=>{const z=nodeCost(c,q);tot+=z.best;miss+=z.miss});
 const gp=pr(R.n);
 g.innerHTML=`<span class="chev">‹›</span><div class="name">${R.n}</div><div class="meta">×${q} · 최저 재료비(구매/제작 중 싼 쪽) <b>${f(tot)}</b>${miss?` (+시세없음 ${miss}종)`:''}</div><div class="meta">경매장 최저가 <b>${gp?f(gp):'—'}</b></div><div class="hint">클릭: 펼치기·접기 · 하위 노드도 클릭해 깊이 탐색</div>`;
 const kids=document.createElement('div');kids.className='kids'+(st.closed?' hide':'');
 R.c.forEach(c=>kids.appendChild(mk(c,q,'')));
 g.onclick=()=>{st.closed=!st.closed;save();kids.classList.toggle('hide');draw()};
 b.append(g,kids);root.appendChild(b);
 root.querySelectorAll('input[data-n]').forEach(i=>{i.onclick=e=>e.stopPropagation();i.onchange=()=>{st.own[i.dataset.n]=Math.max(0,+i.value||0);save();render()}});
 $('tot').innerHTML=`<span>목표 <b>${R.n}</b> ×${q}</span><span>1단계 재료 ${R.c.length}종</span><span>최저 재료비 <b>${f(tot)}</b>${miss?` · 시세 없는 재료 ${miss}종 제외`:''}</span><span>경매장 완제품 <b>${gp?f(gp):'—'}</b></span>`;
 $('cond').innerHTML=`제작 조건 · 스킬 <b>${R.skill}</b> · 도구 <b>${R.tool}</b> · 시설 <b>${R.fac}</b> · 레시피 출처 mabinogi.shimplace.com · 시세 ${PT||'—'}`;
 draw()}
function draw(){const s=$('svg'),W=$('tree').getBoundingClientRect();let h='';
 document.querySelectorAll('.branch').forEach(b=>{const k=b.querySelector(':scope>.kids');if(!k||k.classList.contains('hide'))return;
  const p=b.querySelector(':scope>.node').getBoundingClientRect();const ks=[...k.children].map(c=>c.querySelector(':scope>.node').getBoundingClientRect());
  const x0=p.right-W.left,y0=p.top+p.height/2-W.top,xm=x0+28,ys=ks.map(r=>r.top+r.height/2-W.top);
  h+=`<path d="M${x0} ${y0}H${xm}"/><path d="M${xm} ${Math.min(...ys,y0)}V${Math.max(...ys,y0)}"/>`;ks.forEach((r,i)=>h+=`<path d="M${xm} ${ys[i]}H${r.left-W.left}"/>`)});
 s.innerHTML=`<g stroke="#f7d98b" stroke-width="2" fill="none" stroke-linecap="round">${h}</g>`}
$('goalSel').innerHTML=RECIPES.map((r,i)=>`<option value="${i}">${r.n}</option>`).join('');$('goalSel').value=st.goal;$('goalQty').value=st.qty;
$('goalSel').onchange=e=>{st.goal=+e.target.value;save();render()};$('goalQty').onchange=e=>{st.qty=Math.max(1,+e.target.value||1);e.target.value=st.qty;save();render()};
$('resetBtn').onclick=()=>{st.own={};st.open={};save();render()};addEventListener('resize',draw);
render();
fetch('/prices.json?t='+Date.now()).then(r=>r.json()).then(j=>{P=j.prices||{};const t=Object.values(P).map(v=>v.t).filter(Boolean).sort().pop();PT=t?t.slice(0,16).replace('T',' '):'';render()}).catch(()=>{});
