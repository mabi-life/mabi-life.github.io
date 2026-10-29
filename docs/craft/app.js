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
function render(){const R=RECIPES[st.goal],q=st.qty;const root=$('root');
 const old={};root.querySelectorAll('.nd').forEach(e=>old[e.dataset.id]={x:parseFloat(e.style.left),y:parseFloat(e.style.top)});
 root.innerHTML='';st.open=st.open||{};
 let tot=0,miss=0;R.c.forEach(c=>{const z=nodeCost(c,q);tot+=z.best;miss+=z.miss});const gp=pr(R.n);
 const card=(id,cls,html,title)=>{const e=document.createElement('div');e.className='bal nd '+cls;e.dataset.id=id;e.innerHTML=html;if(title)e.title=title;root.appendChild(e);return e};
 const BC=['#4fc3f7','#ff8a65','#81c784','#ba68c8','#ffd54f','#f06292','#4db6ac','#9575cd','#aed581','#e57373'];
 const mk=(c,mult,pid,dep,bi)=>{const [n,k,r]=c;const z=nodeCost(c,mult);const id=pid+'/'+n;const open=!!(r&&st.open[id]);
  const el=card(id,(r?'craft':'')+(open?' open':''),bal(n,z.all,+st.own[n]||0,r?'제작':(z.p?'구매':'채집'),r?`<span class="chev">${open?'▾':'▸'}</span>`:''),r?`${r.skill}${r.out>1?' ×'+r.out:''} · 클릭: 펼치기/접기`:'');
  el.dataset.dep=dep;const nd={id,el,open,dep,craft:!!r,col:BC[bi%BC.length],kids:open?r.c.map(x=>mk(x,z.sub.runs,id,dep+1,bi)):null};
  if(r)el.onclick=()=>toggle(id,el);return nd};
 const g=card('G','goal craft',bal(R.n,q,+st.own[R.n]||0,'제작',`<span class="chev">${st.closed?'▸':'▾'}</span>`),'클릭: 펼치기/접기');
 g.onclick=()=>{st.closed=!st.closed;save();render()};
 const kids=st.closed?[]:R.c.map((c,i)=>{const k=mk(c,q,'',1,i);return k});
 const paint=(n)=>{n.el.style.borderColor=n.col;n.el.style.boxShadow='inset 3px 0 0 '+n.col;(n.kids||[]).forEach(paint)};kids.forEach(paint);
 const all=[...root.querySelectorAll('.nd')];all.forEach(e=>{e._w=e.offsetWidth;e._h=e.offsetHeight});
 const GAP=6,VG=22,RH=Math.max(...all.map(e=>e._h)),RY=RH+VG;
 // relative layout: node card centered at x=0 on row 0; prof[row]=[x1,x2]
 function shiftL(L,dx,dr){L.pos.forEach(p=>{p[1]+=dx;p[2]+=dr});L.lines.forEach(l=>{l[0]+=dx;l[2]+=dx;l[1]+=dr*RY;l[3]+=dr*RY});const P={};for(const r in L.prof)P[+r+dr]=[L.prof[r][0]+dx,L.prof[r][1]+dx];L.prof=P}
 function pack(Ls,row){let acc=null;Ls.forEach(L=>{shiftL(L,0,row);if(acc){let sh=-1e9;for(const r in L.prof)if(acc[r])sh=Math.max(sh,acc[r][1]+GAP-L.prof[r][0]);if(sh===-1e9)sh=0;shiftL(L,sh,0)}acc=acc||{};for(const r in L.prof)acc[r]=acc[r]?[Math.min(acc[r][0],L.prof[r][0]),Math.max(acc[r][1],L.prof[r][1])]:L.prof[r].slice()});
  const a=Ls[0].cx,b=Ls[Ls.length-1].cx;const m=(Ls[0].pos[0][1]+Ls[0].el._w/2+Ls[Ls.length-1].pos[0][1]+Ls[Ls.length-1].el._w/2)/2;Ls.forEach(L=>shiftL(L,-m,0))}
 function lay(nd,split){const w=nd.el._w;const L={col:nd.col,el:nd.el,pos:[[nd.el,-w/2,0]],lines:[],prof:{0:[-w/2,w/2]}};
  if(!(nd.open||nd===GN)||!nd.kids||!nd.kids.length)return L;
  const ks=nd.kids.map(k=>lay(k,true));const lc=nd.col||'#c9a24a';const lv=split?ks.filter((x,i)=>!nd.kids[i].craft):[],cr=split?ks.filter((x,i)=>nd.kids[i].craft):ks;
  const groups=[];if(lv.length)groups.push([lv,1]);if(cr.length)groups.push([cr,split?2:1]);
  groups.forEach(([g,row])=>{pack(g,row);const by=row*RY-VG/2;const cs=g.map(x=>x.pos[0][1]+x.el._w/2);
   const gc=nd===GN?g.map(x=>x.col):g.map(()=>lc);L.lines.push([0,by,0,by,lc],[Math.min(0,...cs),by,Math.max(0,...cs),by,lc]);cs.forEach((c,i)=>L.lines.push([c,by,c,row*RY,gc[i]]));
   g.forEach(x=>{L.pos.push(...x.pos);L.lines.push(...x.lines);for(const r in x.prof)L.prof[r]=L.prof[r]?[Math.min(L.prof[r][0],x.prof[r][0]),Math.max(L.prof[r][1],x.prof[r][1])]:x.prof[r]})});
  const deep=groups[groups.length-1][1];L.lines.push([0,nd.el._h,0,deep*RY-VG/2,lc]);return L}
 const GN={el:g,open:!st.closed,kids};const T=lay(GN,true);
 if(!window._gx)window._gx=Math.max(g._w/2,root.parentElement.parentElement.clientWidth/2);
 let minx=Math.min(...T.pos.map(p=>p[1]));const ox=Math.max(window._gx,-minx);
 const out={pos:T.pos.map(([e,x,r])=>[e,x+ox,r*RY]),lines:T.lines.map(l=>[l[0]+ox,l[1],l[2]+ox,l[3],l[4]||'#c9a24a'])};
 let mw=0,mh=0;out.pos.forEach(([e,x,y])=>{e.style.left=x+'px';e.style.top=y+'px';mw=Math.max(mw,x+e._w);mh=Math.max(mh,y+e._h)});
 root.style.width=mw+'px';root.style.height=mh+4+'px';
 const sv=document.createElementNS('http://www.w3.org/2000/svg','svg');sv.setAttribute('class','lines');sv.setAttribute('width',mw);sv.setAttribute('height',mh+4);
 {const bc={};out.lines.forEach(l=>(bc[l[4]]=bc[l[4]]||[]).push(l));sv.innerHTML=Object.entries(bc).map(([c,ls])=>`<path d="${ls.map(l=>`M${Math.round(l[0])+.5} ${Math.round(l[1])+.5}L${Math.round(l[2])+.5} ${Math.round(l[3])+.5}`).join('')}" stroke="${c}" stroke-opacity=".85" stroke-width="1" fill="none"/>`).join('')}root.prepend(sv);
 const A=window._act;window._act=null;
 if(A){let moved=0;sv.animate([{opacity:0},{opacity:0,offset:.55},{opacity:1}],{duration:620,easing:'ease-out'});
  out.pos.forEach(([e,x,y])=>{const o=old[e.dataset.id];if(e.dataset.id==='G')return;
   if(o){const dx=o.x-x,dy=o.y-y;if(Math.abs(dx)+Math.abs(dy)<.5)return;const me=e.dataset.id===A.id;
    e.animate(me?(A.open?[{transform:`translate(${dx}px,${dy}px) scale(.92)`,easing:'cubic-bezier(.5,0,.2,1)'},{transform:'translate(0,6px) scale(1.06,.95)',offset:.6,easing:'cubic-bezier(.3,1.6,.5,1)'},{transform:'translate(0,-2px) scale(.98,1.02)',offset:.82},{transform:'none'}]
     :[{transform:`translate(${dx}px,${dy}px)`,easing:'cubic-bezier(.5,0,.2,1)'},{transform:'translate(0,-5px) scale(1.04,.96)',offset:.65,easing:'cubic-bezier(.3,1.6,.5,1)'},{transform:'translate(0,1px)',offset:.85},{transform:'none'}])
     :[{transform:`translate(${dx}px,${dy}px)`},{transform:'none'}],{duration:me?(A.open?560:480):480,easing:me?undefined:'cubic-bezier(.34,1.3,.64,1)'})}
   else{const d=e.dataset.id.startsWith(A.id+'/')?(+e.dataset.dep-A.dep-1):0;e.animate([{opacity:0,transform:'translateY(-18px) scale(.94)'},{opacity:1,transform:'none'}],{duration:420,delay:280+d*90+(moved++%12)*18,fill:'backwards',easing:'cubic-bezier(.34,1.56,.64,1)'})}})}
 root.querySelectorAll('input[data-n]').forEach(i=>{i.onclick=e=>e.stopPropagation();i.onchange=()=>{st.own[i.dataset.n]=Math.max(0,+i.value||0);save();render()}});
 $('tot').innerHTML=`<span>목표 <b>${R.n}</b> ×${q}</span><span>1단계 재료 ${R.c.length}종</span><span>최저 재료비 <b>${f(tot)}</b>${miss?` · 시세 없는 재료 ${miss}종 제외`:''}</span><span>경매장 완제품 <b>${gp?f(gp):'—'}</b></span>`;
 $('cond').innerHTML=`제작 조건 · 스킬 <b>${R.skill}</b> · 도구 <b>${R.tool}</b> · 시설 <b>${R.fac}</b> · 레시피 출처 mabinogi.shimplace.com · 시세 ${PT||'—'}`}
let busy=0;
function toggle(id,el){if(busy)return;const root=$('root');const dep=+el.dataset.dep;
 if(st.open[id]){busy=1;const sub=[...root.querySelectorAll('.nd')].filter(e=>e.dataset.id.startsWith(id+'/'));
  sub.forEach(e=>e.animate([{opacity:1,transform:'none'},{opacity:0,transform:'translateY(-14px) scale(.96)'}],{duration:180,easing:'cubic-bezier(.5,0,.75,0)',fill:'forwards'}));
  const sv=root.querySelector('svg.lines');sv&&sv.animate([{opacity:1},{opacity:0}],{duration:180,fill:'forwards'});
  setTimeout(()=>{busy=0;Object.keys(st.open).forEach(k=>{if(k===id||k.startsWith(id+'/'))delete st.open[k]});window._act={id,open:0,dep};save();render()},180)}
 else{el.classList.add('press');busy=1;setTimeout(()=>{busy=0;st.open[id]=1;window._act={id,open:1,dep};save();render()},110)}}
$('goalSel').innerHTML=RECIPES.map((r,i)=>`<option value="${i}">${r.n}</option>`).join('');$('goalSel').value=st.goal;$('goalQty').value=st.qty;
$('goalSel').onchange=e=>{st.goal=+e.target.value;save();render()};$('goalQty').onchange=e=>{st.qty=Math.max(1,+e.target.value||1);e.target.value=st.qty;save();render()};
$('resetBtn').onclick=()=>{st.own={};st.open={};save();render()};
render();
fetch('/prices.json?t='+Date.now()).then(r=>r.json()).then(j=>{P=j.prices||{};const t=Object.values(P).map(v=>v.t).filter(Boolean).sort().pop();PT=t?t.slice(0,16).replace('T',' '):'';render()}).catch(()=>{});

document.fonts&&document.fonts.ready.then(()=>render());
