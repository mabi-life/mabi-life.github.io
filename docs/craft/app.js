// 제작 재료 계산기 v0.1 test — 레시피는 수동 시드(Nexon Open API에 레시피 엔드포인트 없음)
const RECIPES=[{n:"소울 리버레이트 힐링 원드",skill:"매직 크래프트",tool:"벼락맞은 떡갈나무 지팡이 (소모 X)",fac:"마법의 가마솥",c:[
 ["브리 레흐의 코어",5],["브리 레흐의 정수",10],["강렬한 기억의 결정",10],["마력이 충만한 마력석",2],
 ["순도 높은 융합의 실리엔",2],["마력이 담긴 마력석",10],["마력이 깃든 마법사의 보석",24],["재생의 가루",100]]}];
const LS='mabiCraft.v0';const st=Object.assign({goal:0,qty:1,own:{}},JSON.parse(localStorage.getItem(LS)||'{}'));
const save=()=>localStorage.setItem(LS,JSON.stringify(st));
let P={},PT='';const f=x=>x.toLocaleString('ko-KR');const pr=n=>P[n]&&P[n].min;
const $=id=>document.getElementById(id);
function render(){const R=RECIPES[st.goal],q=st.qty;const root=$('root');root.innerHTML='';
 const b=document.createElement('div');b.className='branch';const g=document.createElement('div');g.className='node goal craft';
 let tot=0,miss=0,rows=[];R.c.forEach(([n,k])=>{const need=Math.max(0,k*q-(+st.own[n]||0));const p=pr(n);if(p)tot+=p*need;else if(need)miss++;rows.push([n,k*q,need,p])});
 const gp=pr(R.n);
 g.innerHTML=`<span class="chev">‹›</span><div class="name">${R.n}</div><div class="meta">×${q} · 부족 재료비 <b>${f(tot)}</b>${miss?` (+시세없음 ${miss}종)`:''}</div><div class="meta">경매장 최저가 <b>${gp?f(gp):'—'}</b></div><div class="hint">클릭해서 펼치기·접기</div>`;
 const kids=document.createElement('div');kids.className='kids'+(st.closed?' hide':'');
 rows.forEach(([n,all,need,p])=>{const d=document.createElement('div');d.className='branch';
  d.innerHTML=`<div class="node"><div class="name">${n}<span class="tag">구매</span></div><div class="meta">필요 ×${f(all)} · 부족 <b class="${need?'':'need0'}">${f(need)}</b></div><div class="meta">개당 ${p?f(p):'—'} · <b>${p?f(p*need):'—'}</b></div><label class="own">보유 <input type="number" min="0" value="${st.own[n]||0}" data-n="${n}"></label></div>`;kids.appendChild(d)});
 g.onclick=()=>{st.closed=!st.closed;save();kids.classList.toggle('hide');draw()};
 b.append(g,kids);root.appendChild(b);
 root.querySelectorAll('input[data-n]').forEach(i=>{i.onclick=e=>e.stopPropagation();i.onchange=()=>{st.own[i.dataset.n]=Math.max(0,+i.value||0);save();render()}});
 $('tot').innerHTML=`<span>목표 <b>${R.n}</b> ×${q}</span><span>재료 ${R.c.length}종</span><span>부족분 재료비 <b>${f(tot)}</b>${miss?` · 시세 없는 재료 ${miss}종 제외`:''}</span><span>경매장 완제품 <b>${gp?f(gp):'—'}</b></span>`;
 $('cond').innerHTML=`제작 조건 · 스킬 <b>${R.skill}</b> · 도구 <b>${R.tool}</b> · 시설 <b>${R.fac}</b> · 시세 ${PT||'—'} (사이트 시세 피드, 없는 품목은 —)`;
 draw()}
function draw(){const s=$('svg'),W=$('tree').getBoundingClientRect();let h='';
 document.querySelectorAll('.branch').forEach(b=>{const k=b.querySelector(':scope>.kids');if(!k||k.classList.contains('hide'))return;
  const p=b.querySelector(':scope>.node').getBoundingClientRect();const ks=[...k.children].map(c=>c.querySelector(':scope>.node').getBoundingClientRect());
  const x0=p.right-W.left,y0=p.top+p.height/2-W.top,xm=x0+28,ys=ks.map(r=>r.top+r.height/2-W.top);
  h+=`<path d="M${x0} ${y0}H${xm}"/><path d="M${xm} ${Math.min(...ys,y0)}V${Math.max(...ys,y0)}"/>`;ks.forEach((r,i)=>h+=`<path d="M${xm} ${ys[i]}H${r.left-W.left}"/>`)});
 s.innerHTML=`<g stroke="#f7d98b" stroke-width="2" fill="none" stroke-linecap="round">${h}</g>`}
$('goalSel').innerHTML=RECIPES.map((r,i)=>`<option value="${i}">${r.n}</option>`).join('');$('goalSel').value=st.goal;$('goalQty').value=st.qty;
$('goalSel').onchange=e=>{st.goal=+e.target.value;save();render()};$('goalQty').onchange=e=>{st.qty=Math.max(1,+e.target.value||1);e.target.value=st.qty;save();render()};
$('resetBtn').onclick=()=>{st.own={};save();render()};addEventListener('resize',draw);
render();
fetch('/prices.json?t='+Date.now()).then(r=>r.json()).then(j=>{P=j.prices||{};const t=Object.values(P).map(v=>v.t).filter(Boolean).sort().pop();PT=t?t.slice(0,16).replace('T',' '):'';render()}).catch(()=>{});
