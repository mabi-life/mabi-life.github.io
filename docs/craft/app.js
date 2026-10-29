// 제작 재료 계산기 v0.3 test — 레시피 트리: mabinogi.shimplace.com 제작 DB 기준 (재귀, 최대 깊이 6)
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
function bal(n,all,own,kind,extra){const ok=own>=all;const C={제작:['#e8c66a','⚒'],구매:['#7fb2ff','₲'],채집:['#7fd99a','✿']}[kind];
 return `<span class="t"><span class="ic" style="background:${C[0]}22;color:${C[0]}">${C[1]}</span><b>${n}</b>${extra||''}</span><span class="t"><span class="tag" style="color:${C[0]};border-color:${C[0]}55">${kind}</span><span class="q${ok?' ok':''}"><input type="number" min="0" data-n="${n}" value="${own}" title="현재 보유 수량"><em>${f(Math.min(own,all))}</em>/${f(all)}</span></span>`}
function render(){const R=RECIPES[st.goal],q=st.qty;const root=$('root');root.innerHTML='';
 let tot=0,miss=0;R.c.forEach(c=>{const z=nodeCost(c,q);tot+=z.best;miss+=z.miss});const gp=pr(R.n);
 st.path=st.path||[];
 const row=(items)=>{const d=document.createElement('div');d.className='row';items.forEach(x=>d.appendChild(x));root.appendChild(d);return d};
 const g=document.createElement('div');g.className='bal goal craft';
 g.innerHTML=bal(R.n,q,+st.own[R.n]||0,'제작',`<span class="chev">${st.closed?'▸':'▾'}</span>`);g.title='클릭: 펼치기/접기';
 g.onclick=()=>{st.closed=!st.closed;save();render()};let prev=g;row([g]);
 let list=st.closed?null:R.c,mult=q,d=0;
 while(list){let nx=null,nm=0,pn=null;const els=list.map(c=>{const [n,k,r]=c;const z=nodeCost(c,mult);const open=r&&st.path[d]===n;
   const nd=document.createElement('div');nd.className='bal'+(r?' craft':'')+(open?' open':'');nd.dataset.nm=n;nd.dataset.d=d;nd.title=r?`${r.skill}${r.out>1?' ×'+r.out:''} · 클릭: 펼치기/접기`:'';
   nd.innerHTML=bal(n,z.all,+st.own[n]||0,r?'제작':(z.p?'구매':'채집'),r?`<span class="chev">${open?'▾':'▸'}</span>`:'');
   if(r){const dd=d;nd.onclick=()=>{if(window._busy)return;const cur=st.path[dd];if(cur&&cur!==n){const oc=[...root.querySelectorAll('.bal:not(.ph)')].find(e=>e.dataset.nm===cur&&e.dataset.d==dd&&e.parentElement.classList.contains('drop'));
     if(oc){window._busy=1;oc.onclick();setTimeout(()=>{window._busy=0;const nc=[...root.querySelectorAll('.bal:not(.ph)')].find(e=>e.dataset.nm===n&&e.dataset.d==dd);nc&&nc.onclick()},520);return}}
    const old=nd.getBoundingClientRect();if(st.path[dd]!==n)nd.classList.add('press');
     if(st.path[dd]===n){const rows=[...root.querySelectorAll('.row')];const i=rows.indexOf(nd.parentElement);const ph=rows[i-1]&&rows[i-1].querySelector('.ph');
      rows.slice(i+1).forEach(x=>{x.style.transition='opacity .2s cubic-bezier(.5,0,.75,0),transform .2s cubic-bezier(.5,0,.75,0)';x.style.opacity=0;x.style.transform='translateY(-14px) scale(.96)'});
      setTimeout(()=>{st.path.length=dd;save();window._flip={n,old:nd.getBoundingClientRect(),d:dd};render()},180)}
     else setTimeout(()=>{st.path.length=dd;st.path[dd]=n;window._flip={n,old,d:dd,open:1};save();render()},110)}}
   if(open){nx=r.c;nm=z.sub.runs;pn=nd;const ph=nd.cloneNode(true);ph.querySelectorAll('input').forEach(i=>i.disabled=true);ph.setAttribute('aria-hidden','true');ph.className+=' ph';ph._real=nd;return ph}return nd});
  const rw=row(els.filter(e=>e!==pn));rw._p=prev;if(!nx){st.path.length=d;break}const dr=row([pn]);dr.classList.add('drop');dr._p=rw.querySelector('.ph');prev=pn;list=nx;mult=nm;d++}
 window._lay=()=>{root.querySelectorAll(".ln").forEach(e=>e.remove());const G=root.firstChild;if(!window._gx){const sc=root.parentElement.parentElement;window._gx=Math.max(0,sc.clientWidth/2)}G.style.marginLeft=Math.max(0,window._gx-G.offsetWidth/2)+'px';let maxW=0;root.querySelectorAll('.row').forEach(rw=>{if(!rw._p)return;const pr_=rw._p.getBoundingClientRect(),rr=root.getBoundingClientRect();
   const cx=pr_.left+pr_.width/2-rr.left;let L=cx-rw.offsetWidth/2;if(L<0)L=0;rw.style.marginLeft=L+'px';rw.style.setProperty('--px',(cx-L)+'px');maxW=Math.max(maxW,L+rw.offsetWidth);
   if(!rw.classList.contains('drop')){const px=cx-L,cs=[...rw.children].filter(e=>!e.classList.contains('ln')).map(e=>e.offsetLeft+e.offsetWidth/2);const add=(st_)=>{const k=document.createElement('i');k.className='ln';k.style.cssText=st_;rw.appendChild(k)};
    const a=Math.min(px,...cs),b=Math.max(px,...cs);add(`left:${px}px;top:0;height:11px;width:0`);if(b-a>1)add(`left:${a}px;top:11px;width:${b-a}px;height:0`);cs.forEach(x=>add(`left:${x}px;top:11px;height:11px;width:0`));const ph=rw.querySelector('.ph');if(ph){const x=ph.offsetLeft+ph.offsetWidth/2;add(`left:${x}px;top:11px;height:${rw.offsetHeight-11+12}px;width:0`)}}});root.style.minWidth=maxW+'px';};window._lay();{
  const F=window._flip;window._flip=null;
  if(F){const rows=[...root.querySelectorAll('.row')];const card=[...root.querySelectorAll('.bal:not(.ph)')].find(e=>e.dataset.nm===F.n&&e.dataset.d==F.d);
   if(card){const nw=card.getBoundingClientRect();const dx=F.old.left-nw.left,dy=F.old.top-nw.top;
    card.animate(F.open?[{transform:`translate(${dx}px,${dy}px) scale(.92)`,easing:'cubic-bezier(.5,0,.2,1)'},{transform:'translate(0,6px) scale(1.06,.95)',offset:.6,easing:'cubic-bezier(.3,1.6,.5,1)'},{transform:'translate(0,-2px) scale(.98,1.02)',offset:.82},{transform:'none'}]:[{transform:`translate(${dx}px,${dy}px)`,easing:'cubic-bezier(.5,0,.2,1)'},{transform:'translate(0,-5px) scale(1.04,.96)',offset:.65,easing:'cubic-bezier(.3,1.6,.5,1)'},{transform:'translate(0,1px)',offset:.85},{transform:'none'}],{duration:F.open?560:480});
    if(F.open){const dr=card.parentElement;dr.animate([{'--h':'0px',opacity:.3},{opacity:1}],{duration:300});
     rows.slice(rows.indexOf(dr)+1).forEach((x,j)=>x.animate([{opacity:0,transform:'translateY(-18px) scale(.94)'},{opacity:1,transform:'none'}],{duration:420,delay:280+j*80,fill:'backwards',easing:'cubic-bezier(.34,1.56,.64,1)'}))}}}}
 root.querySelectorAll('input[data-n]').forEach(i=>{i.onclick=e=>e.stopPropagation();i.onchange=()=>{st.own[i.dataset.n]=Math.max(0,+i.value||0);save();render()}});
 $('tot').innerHTML=`<span>목표 <b>${R.n}</b> ×${q}</span><span>1단계 재료 ${R.c.length}종</span><span>최저 재료비 <b>${f(tot)}</b>${miss?` · 시세 없는 재료 ${miss}종 제외`:''}</span><span>경매장 완제품 <b>${gp?f(gp):'—'}</b></span>`;
 $('cond').innerHTML=`제작 조건 · 스킬 <b>${R.skill}</b> · 도구 <b>${R.tool}</b> · 시설 <b>${R.fac}</b> · 레시피 출처 mabinogi.shimplace.com · 시세 ${PT||'—'}`;
 const sc=document.querySelector('.scroll');if(!render.c){render.c=1;requestAnimationFrame(()=>sc.scrollLeft=(sc.scrollWidth-sc.clientWidth)/2)}}
$('goalSel').innerHTML=RECIPES.map((r,i)=>`<option value="${i}">${r.n}</option>`).join('');$('goalSel').value=st.goal;$('goalQty').value=st.qty;
$('goalSel').onchange=e=>{st.goal=+e.target.value;save();render()};$('goalQty').onchange=e=>{st.qty=Math.max(1,+e.target.value||1);e.target.value=st.qty;save();render()};
$('resetBtn').onclick=()=>{st.own={};st.open={};save();render()};
render();
fetch('/prices.json?t='+Date.now()).then(r=>r.json()).then(j=>{P=j.prices||{};const t=Object.values(P).map(v=>v.t).filter(Boolean).sort().pop();PT=t?t.slice(0,16).replace('T',' '):'';render()}).catch(()=>{});
document.fonts&&document.fonts.ready.then(()=>window._lay&&window._lay());addEventListener('resize',()=>window._lay&&window._lay());
