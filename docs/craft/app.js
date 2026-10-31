// 제작 재료 계산기 v0.3 test — 레시피 트리 (재귀, 최대 깊이 6)
// 노드: [이름, 개수, (제작 가능하면) {skill, out(1회 산출량), c:[하위]}]
let RECIPES=[{n:"소울 리버레이트 힐링 원드",skill:"매직 크래프트",tool:"벼락맞은 떡갈나무 지팡이 (소모 X)",fac:"마법의 가마솥",c:[["브리 레흐의 코어",5],["브리 레흐의 정수",10],["강렬한 기억의 결정",10,{"skill":"힐웬 공학","out":1,"c":[["초록빛 기억의 조각",3],["바리사이트",10],["마력이 깃든 융합제",5],["퓨어 젬스톤",2,{"skill":"매직 크래프트","out":1,"c":[["마력이 깃든 융합제",3],["젬스톤 파우더",30],["티어드롭 젬스톤",30],["순도 높은 강화제",10]]}]]}],["마력이 충만한 마력석",2,{"skill":"매직 크래프트","out":1,"c":[["브리 레흐의 기운이 깃든 문장",3],["오묘한 마력석",10],["마력이 깃든 융합제",3],["강화된 실리엔",3,{"skill":"매직 크래프트","out":1,"c":[["온전한 실리엔",70,{"skill":"매직 크래프트","out":1,"c":[["실리엔",1,{"skill":"매직 크래프트","out":1,"c":[["실리엔 결정",5]]}],["신비한 허브 가루",3,{"skill":"매직 크래프트","out":1,"c":[["블러디 허브",1],["마나 허브",1],["포이즌 허브",1]]}]],"alt":2}],["순도 높은 강화제",30],["각성된 힘의 가루",10]]}]]}],["순도 높은 융합의 실리엔",2,{"skill":"매직 크래프트","out":1,"c":[["순도 높은 마력의 결정",10],["순도 높은 힘의 결정",5,{"skill":"매직 크래프트","out":1,"c":[["마력이 깃든 융합제",3],["각성된 힘의 조각",10],["각성된 힘의 결정",10],["깨어난 힘의 정수",20],["각성된 힘의 가루",10]]}],["마력이 깃든 융합제",1],["온전한 실리엔",100,{"skill":"매직 크래프트","out":1,"c":[["실리엔",1,{"skill":"매직 크래프트","out":1,"c":[["실리엔 결정",5]]}],["신비한 허브 가루",3,{"skill":"매직 크래프트","out":1,"c":[["블러디 허브",1],["마나 허브",1],["포이즌 허브",1]]}]],"alt":2}]]}],["마력이 담긴 마력석",10,{"skill":"매직 크래프트","out":1,"c":[["텅 빈 마력석",5],["마력이 깃든 융합제",1],["퓨어 젬스톤",1,{"skill":"매직 크래프트","out":1,"c":[["마력이 깃든 융합제",3],["젬스톤 파우더",30],["티어드롭 젬스톤",30],["순도 높은 강화제",10]]}],["침식된 광물 조각",6]]}],["마력이 깃든 마법사의 보석",24,{"skill":"매직 크래프트","out":1,"c":[["녹음이 깃든 마법사의 보석",7],["마력석",20],["젬스톤 파우더",20],["각성된 힘의 가루",10]]}],["재생의 가루",100]]}];
const LS='mabiCraft.v0';const st=Object.assign({goal:0,qty:1,own:{}},JSON.parse(localStorage.getItem(LS)||'{}'));
const save=()=>{try{localStorage.setItem(LS,JSON.stringify(st))}catch(e){}};
// 저장된 goal 인덱스는 recipes.json(44개) 로드 전 내장 1개 레시피 기준으로 0으로 덮어쓰지 않음
const gi=()=>(st.goal>=0&&st.goal<RECIPES.length)?st.goal:0;
let P={},PT='',IC={},BP={};const MC=window.MabiCoin||{COST:{}};
// 구슬(코인) 상점 연동: /coin/ 과 같은 core.js 데이터 + 같은 localStorage(mabiCoin.v1) 구슬가 직접입력 공유
const coin=n=>{const c=MC.COST[n];if(!c)return null;const b=BP[c.tab];return Object.assign({bp:b?b.p:null,g:b?b.p*c.cost:null},c)};const f=x=>x.toLocaleString('ko-KR');const pr=n=>P[n]&&P[n].min;
const gpx=n=>{const x=P[n];const ts=x&&x.t?` <small style="opacity:.6">${x.t.slice(5,16).replace('T',' ')} 기준</small>`:'';return x&&x.min?`최저가 <b>${f(x.min)}G</b>${x.count?` <small style="opacity:.6">매물 ${f(x.count)}</small>`:''}${ts}`:x&&x.avg24?`<b style="color:#8f8aa8">매물 없음</b> · 최근 거래가 ${f(x.avg24)}G${ts}`:`<b style="color:#8f8aa8">매물 없음</b>`};
const $=id=>document.getElementById(id);
function nodeCost(c,mult){const [n,k,r]=c;const all=k*mult;const own=+st.own[n]||0;const need=Math.max(0,all-own);const p=pr(n);
 let sub=null;if(r){const runs=Math.ceil(need/(r.out||1));sub={runs,tot:0,miss:0};r.c.forEach(x=>{const z=nodeCost(x,runs);sub.tot+=z.best;sub.miss+=z.miss});}
 const cn=coin(n),cg=cn&&cn.g!=null?cn.g*need:null;
 let best,miss=0,via='';const opts=[];if(p)opts.push([p*need,'구매']);if(cg!=null)opts.push([cg,'코인']);if(sub&&!sub.miss)opts.push([sub.tot,'제작']);
 if(opts.length){opts.sort((a,b)=>a[0]-b[0]);best=opts[0][0];via=opts[0][1]}else if(sub){best=sub.tot;miss=sub.miss;via='제작'}else{best=0;miss=need?1:0}
 return {all,need,p,sub,best,miss,cn,cg,via}}
function bal(n,all,own,kind,extra,z){const ok=own>=all;const C={제작:['#e8c66a','⚒'],구매:['#7fb2ff','₲'],채집:['#7fd99a','✿'],코인:['#d59bff','⦿']}[kind];
 return `<span class="t">${IC[n]?`<img class="ic im" src="/assets/icons/2x/${IC[n].id}.png" alt="" loading="lazy" decoding="async">`:`<span class="ic" style="background:${C[0]}22;color:${C[0]}">${C[1]}</span>`}<b>${n}</b>${extra||''}</span><span class="t"><span class="tag" style="color:${C[0]};border-color:${C[0]}55">${kind}</span><span class="q${ok?' ok':''}"><input type="number" min="0" data-n="${n}" value="${own}" title="현재 보유 수량"><em>${f(Math.min(own,all))}</em>/${f(all)}</span></span>${z&&z.cn?`<a class="coin${z.via==='코인'?' best':''}" href="#coin-${z.cn.tab}" onclick="event.stopPropagation()" title="${z.cn.shop} 상점 · 코인 계산기에서 열기">⦿ 구슬 ${z.cn.cost}${z.cn.bp?` ≈${f(Math.round(z.cn.g))}G`:''}${z.p&&z.cn.g?(z.cn.g<z.p?' ✓':''):''}</a>`:''}`}
function rcTip(n,r){const o=r.out||1;return `<b>${n}</b> ${o}개 제작 · ${r.skill||''}<br>`+r.c.map(x=>`· ${x[0]} <b>×${f(x[1])}</b>${x[2]?' ⚒':''}`).join('<br>')}
function tip(c,z,kind,q){const [n,,r,fz,ps,S]=c;const own=+st.own[n]||0;const L=[`<b>${n}</b> <small>${kind}</small>`];
 if(ps)L.push(`공정 1회당 <b>×${f(ps)}</b> · <b>${S}회 공정</b>${q>1?` · ${q}개`:''} 기준 = <b>${f(z.all)}</b>`);
 else if(fz)L.push(`마감 1회분 <b>×${f(z.all/(q||1))}</b>${q>1?` × ${q}개`:''} (공정 횟수 무관)`);
 L.push(`필요 <b>${f(z.all)}</b> · 보유 ${f(own)} · 부족 <b>${f(z.need)}</b>`);
 L.push(`현재 경매가 ${z.p?`개당 <b>${f(z.p)}G</b>${z.need?` · ${f(z.need)}개 합계 ${f(z.p*z.need)}G`:''}`:'<span style="opacity:.6">시세 없음</span>'}`);
 if(z.cn)L.push(`구슬 ${z.cn.shop} 개당 ${z.cn.cost}개${z.cn.g!=null?` ≈ ${f(Math.round(z.cn.g))}G${z.need?` · ${f(z.need)}개 합계 ${f(Math.round(z.cg))}G`:''}`:''}`);
 if(z.sub)L.push(`직접 제작 ${z.sub.runs}회 ${z.sub.miss?`(하위 시세 ${z.sub.miss}종 없음)`:`≈ <b>${f(Math.round(z.sub.tot))}G</b>`}`);
 if(z.need&&z.via)L.push(`최저: <b style="color:#e8c66a">${z.via}</b> · 개당 <b>${f(Math.round(z.best/z.need))}G</b> · 필요분(${f(z.need)}개) 합계 <b>${f(Math.round(z.best))}G</b>`);
 if(r)L.push('<hr style="border:0;border-top:1px solid #fff2;margin:4px 0">'+rcTip(n,r)+'<br><small>클릭: 펼치기/접기</small>');
 return L.join('<br>')}
(()=>{const t=document.createElement('div');t.id='rcTip';t.style.cssText='position:fixed;z-index:9999;display:none;pointer-events:none;max-width:320px;background:#1b1f2a;color:#e8e8e8;border:1px solid #e8c66a66;border-radius:8px;padding:8px 10px;font-size:12px;line-height:1.55;box-shadow:0 6px 20px #0008';document.body.appendChild(t);
 document.addEventListener('mouseover',e=>{const b=e.target.closest&&e.target.closest('[data-rc]');if(!b){t.style.display='none';return}t.innerHTML=b.dataset.rc;t.style.display='block'});
 document.addEventListener('mousemove',e=>{if(t.style.display==='none')return;const w=t.offsetWidth,h=t.offsetHeight;t.style.left=Math.min(e.clientX+14,innerWidth-w-6)+'px';t.style.top=(e.clientY+h+20>innerHeight?e.clientY-h-10:e.clientY+16)+'px'})})();
const AVG=R=>Math.ceil(100/R.pct);const stepsOf=R=>R.pct?Math.max(1,+(st.steps||{})[R.n]||AVG(R)):1;
const matsOf=R=>{const s=stepsOf(R);return R.c.map(c=>[c[0],c[1]*s,c[2],0,R.pct?c[1]:0,s]).concat(((R.fin||[])[0]||[]).map(x=>[x[0],x[1],null,1]))};
function render(){const R=RECIPES[gi()],q=st.qty,M=matsOf(R),S=stepsOf(R);const root=$('root');
 const old={};root.querySelectorAll('.nd').forEach(e=>old[e.dataset.id]={x:parseFloat(e.style.left),y:parseFloat(e.style.top)});
 root.innerHTML='';st.open=st.open||{};
 let tot=0,miss=0;M.forEach(c=>{const z=nodeCost(c,q);tot+=z.best;miss+=z.miss});const gp=pr(R.n);
 const card=(id,cls,html,title)=>{const e=document.createElement('div');e.className='bal nd '+cls;e.dataset.id=id;e.innerHTML=html;if(title)e.title=title;root.appendChild(e);return e};
 const BC=['#4fc3f7','#ff8a65','#81c784','#ba68c8','#ffd54f','#f06292','#4db6ac','#9575cd','#aed581','#e57373'];
 const mk=(c,mult,pid,dep,bi)=>{const [n,k,r,fz,ps,S]=c;const kind=r?'제작':(z0=>z0.p?'구매':(z0.cn?'코인':'채집'))(nodeCost(c,mult));const z=nodeCost(c,mult);const id=pid+'/'+n;const open=!!(r&&st.open[id]);
  const el=card(id,(r?'craft':'')+(open?' open':'')+((+st.own[n]||0)>=z.all&&z.all>0?' done':''),bal(n,z.all,+st.own[n]||0,kind,(ps?`<small style="opacity:.65;margin-left:4px">${f(ps)}×${S}회</small>`:'')+(r?`<span class="chev">${open?'▾':'▸'}</span>`:'')+(fz?'<span class="tag" style="color:#ffb74d;border-color:#ffb74d55;margin-left:4px">마감재</span>':''),z),'');el.dataset.rc=tip(c,z,fz?'마감재':kind,mult);
  el.dataset.dep=dep;const nd={id,el,open,dep,craft:!!r,col:BC[bi%BC.length],kids:open?r.c.map(x=>mk(x,z.sub.runs,id,dep+1,bi)):null};
  if(r)el.onclick=()=>toggle(id,el);return nd};
 const g=card('G','goal craft'+((+st.own[R.n]||0)>=q&&q>0?' done':''),bal(R.n,q,+st.own[R.n]||0,'제작',`<small style="margin-left:8px;font-size:13px;color:${gp?'#f7d98b':'#8f8aa8'};white-space:nowrap" title="경매장 최저가">경매장 ${gp?f(gp)+'G':'매물 없음'}</small><span class="chev">${st.closed?'▸':'▾'}</span>`),'');g.dataset.rc=`<b>${R.n}</b> ×${q}<br>현재 경매가 ${gp?`<b>${f(gp)}G</b>`:'—'} · 최저 재료비 <b>${f(tot)}G</b>${R.pct?`<br><b>${S}회 공정</b> 기준 (1단계 재료 = 1회분 × ${S})`:''}<hr style="border:0;border-top:1px solid #fff2;margin:4px 0">`+rcTip(R.n,{skill:R.skill,out:1,c:R.c})+(R.pct?`<br><small>↑ 공정 1회분 수량</small>`:'');
 g.onclick=()=>{st.closed=!st.closed;save();render()};
 const kids=st.closed?[]:M.map((c,i)=>{const k=mk(c,q,'',1,i);return k});
 const paint=(n)=>{n.el.style.borderColor=n.col;n.el.style.boxShadow='inset 3px 0 0 '+n.col;n.el.style.setProperty('--ac',n.col);(n.kids||[]).forEach(paint)};kids.forEach(paint);
 const all=[...root.querySelectorAll('.nd')];all.forEach(e=>{e._w=e.offsetWidth;e._h=e.offsetHeight});
 const GAP=6,VG=22,RH=Math.max(...all.map(e=>e._h)),RY=RH+VG;
 // relative layout: node card centered at x=0 on row 0; prof[row]=[x1,x2]
 function shiftL(L,dx,dr){L.pos.forEach(p=>{p[1]+=dx;p[2]+=dr});L.lines.forEach(l=>{l[0]+=dx;l[2]+=dx;l[1]+=dr*RY;l[3]+=dr*RY});const P={};for(const r in L.prof)P[+r+dr]=[L.prof[r][0]+dx,L.prof[r][1]+dx];L.prof=P}
 function pack(Ls,row){let acc=null;Ls.forEach(L=>{shiftL(L,0,row);if(acc){let sh=-1e9;for(const r in L.prof)if(acc[r])sh=Math.max(sh,acc[r][1]+GAP-L.prof[r][0]);if(sh===-1e9)sh=0;shiftL(L,sh,0)}acc=acc||{};for(const r in L.prof)acc[r]=acc[r]?[Math.min(acc[r][0],L.prof[r][0]),Math.max(acc[r][1],L.prof[r][1])]:L.prof[r].slice()});
  const a=Ls[0].cx,b=Ls[Ls.length-1].cx;const m=(Ls[0].pos[0][1]+Ls[0].el._w/2+Ls[Ls.length-1].pos[0][1]+Ls[Ls.length-1].el._w/2)/2;Ls.forEach(L=>shiftL(L,-m,0))}
 function lay(nd,split){const w=nd.el._w;const L={col:nd.col,el:nd.el,pos:[[nd.el,-w/2,0]],lines:[],prof:{0:[-w/2,w/2]}};
  if(!(nd.open||nd===GN)||!nd.kids||!nd.kids.length)return L;
  const ks=nd.kids.map(k=>lay(k,true));const lc=nd.col||'#c9a24a';const lv=split?ks.filter((x,i)=>!nd.kids[i].craft):[],cr=split?ks.filter((x,i)=>nd.kids[i].craft):ks;
  const groups=[];if(lv.length)groups.push([lv,1]);if(cr.length)groups.push([cr,split&&lv.length?2:1]);
  groups.forEach(([g,row])=>{pack(g,row);const by=row*RY-VG/2;const cs=g.map(x=>x.pos[0][1]+x.el._w/2);
   const gc=nd===GN?g.map(x=>x.col):g.map(()=>lc);L.lines.push([0,by,0,by,lc],[Math.min(0,...cs),by,Math.max(0,...cs),by,lc]);cs.forEach((c,i)=>L.lines.push([c,by,c,row*RY,gc[i]]));
   g.forEach(x=>{L.pos.push(...x.pos);L.lines.push(...x.lines);for(const r in x.prof)L.prof[r]=L.prof[r]?[Math.min(L.prof[r][0],x.prof[r][0]),Math.max(L.prof[r][1],x.prof[r][1])]:x.prof[r]})});
  const deep=groups[groups.length-1][1];
  if(split&&lv.length&&cr.length){const CW=20;const l1=Math.min(...lv.map(x=>x.pos[0][1])),r1=Math.max(...lv.map(x=>x.pos[0][1]+x.el._w));
   // edge lane: trunk runs down the OUTSIDE of the leaf cluster (prefer left), lane kept empty via profile
   const tx=(-l1<=r1)?l1-CW:r1+CW;const y1=RY-VG/2,y2=2*RY-VG/2;
   L.lines=L.lines.filter(l=>!(l[1]===y1&&l[3]===y1&&l[0]!==l[2])&&!(l[1]===y2&&l[3]===y2&&l[0]!==l[2]));
   const c1=lv.map(x=>x.pos[0][1]+x.el._w/2),c2=cr.map(x=>x.pos[0][1]+x.el._w/2);
   L.lines.push([Math.min(0,tx,...c1),y1,Math.max(0,tx,...c1),y1,lc],[Math.min(tx,...c2),y2,Math.max(tx,...c2),y2,lc],[tx,y1,tx,y2,lc,2]);
   L.prof[1]=[Math.min(l1,tx-CW),Math.max(r1,tx+CW)]}
  L.lines.push([0,nd.el._h,0,(lv.length?1:deep)*RY-VG/2,lc]);return L}
 const GN={el:g,open:!st.closed,kids};const T=lay(GN,true);
 if(!window._gx)window._gx=Math.max(g._w/2,root.parentElement.parentElement.clientWidth/2);
 let minx=Math.min(...T.pos.map(p=>p[1]));const ox=Math.max(window._gx,-minx);
 const out={pos:T.pos.map(([e,x,r])=>[e,x+ox,r*RY]),lines:T.lines.map(l=>[l[0]+ox,l[1],l[2]+ox,l[3],l[4]||'#c9a24a',l[5]||1])};
 let mw=0,mh=0;out.pos.forEach(([e,x,y])=>{e.style.left=x+'px';e.style.top=y+'px';mw=Math.max(mw,x+e._w);mh=Math.max(mh,y+e._h)});
 root.style.width=mw+'px';root.style.height=mh+4+'px';
 const sv=document.createElementNS('http://www.w3.org/2000/svg','svg');sv.setAttribute('class','lines');sv.setAttribute('width',mw);sv.setAttribute('height',mh+4);
 {const bc={};out.lines.forEach(l=>{const k=l[4]+'|'+l[5];(bc[k]=bc[k]||[]).push(l)});sv.innerHTML=Object.entries(bc).map(([k,ls])=>{const [c,w]=k.split('|');const o=w>1?0:.5;return `<path d="${ls.map(l=>`M${Math.round(l[0])+o} ${Math.round(l[1])+o}L${Math.round(l[2])+o} ${Math.round(l[3])+o}`).join('')}" stroke="${c}" stroke-opacity="${w>1?.95:.85}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="square" fill="none"/>`}).join('')}root.prepend(sv);
 const A=window._act;window._act=null;
 if(A){let moved=0;sv.animate([{opacity:0},{opacity:0,offset:.55},{opacity:1}],{duration:620,easing:'ease-out'});
  out.pos.forEach(([e,x,y])=>{const o=old[e.dataset.id];if(e.dataset.id==='G')return;
   if(o){const dx=o.x-x,dy=o.y-y;if(Math.abs(dx)+Math.abs(dy)<.5)return;const me=e.dataset.id===A.id;
    e.animate(me?(A.open?[{transform:`translate(${dx}px,${dy}px) scale(.92)`,easing:'cubic-bezier(.5,0,.2,1)'},{transform:'translate(0,6px) scale(1.06,.95)',offset:.6,easing:'cubic-bezier(.3,1.6,.5,1)'},{transform:'translate(0,-2px) scale(.98,1.02)',offset:.82},{transform:'none'}]
     :[{transform:`translate(${dx}px,${dy}px)`,easing:'cubic-bezier(.5,0,.2,1)'},{transform:'translate(0,-5px) scale(1.04,.96)',offset:.65,easing:'cubic-bezier(.3,1.6,.5,1)'},{transform:'translate(0,1px)',offset:.85},{transform:'none'}])
     :[{transform:`translate(${dx}px,${dy}px)`},{transform:'none'}],{duration:me?(A.open?560:480):480,easing:me?undefined:'cubic-bezier(.34,1.3,.64,1)'})}
   else{const d=e.dataset.id.startsWith(A.id+'/')?(+e.dataset.dep-A.dep-1):0;e.animate([{opacity:0,transform:'translateY(-18px) scale(.94)'},{opacity:1,transform:'none'}],{duration:420,delay:280+d*90+(moved++%12)*18,fill:'backwards',easing:'cubic-bezier(.34,1.56,.64,1)'})}})}
 root.querySelectorAll('input[data-n]').forEach(i=>{i.onclick=e=>e.stopPropagation();i.onchange=()=>{st.own[i.dataset.n]=Math.max(0,+i.value||0);save();render();syncCoin()}});
 $('tot').innerHTML=`<span>목표 <b>${R.n}</b> ×${q}</span><span>1단계 재료 ${R.c.length}종${R.fin?` + 마감재 ${(R.fin[0]||[]).length}종`:''}</span>${R.pct?`<span>공정 횟수 <input id="stepsIn" type="number" min="1" value="${S}" style="width:4em" title="기본값 = ${AVG(R)}회 (공정 1회 성공 시 최대 ${R.pct}% 기준 이론 최소 횟수 · 실패 많으면 직접 늘려 입력)">회 <small>(1단계 재료 수량 = 1회분 × ${S}회 기준)</small></span>`:''}<span>최저 재료비 <b>${f(tot)}</b>${miss?` · 시세 없는 재료 ${miss}종 제외`:''}</span><span class="gmk">경매장 시세 ${gpx(R.n)}</span>`;
 $('cond').innerHTML=`제작 조건 · 스킬 <b>${R.skill}</b> · 도구 <b>${R.tool}</b> · 시설 <b>${R.fac}</b>${R.pct?` · 공정 1회당 최대 <b>${R.pct}%</b> (공정 성공 시 ${R.pct/2}~${R.pct}% · 대성공 시 최대 ${R.pct*1.5}% · 실패 시 0~${R.pct/2}% 랜덤) → 기본 <b>${AVG(R)}회</b> 기준 (공정 성공 시 최대 ${R.pct}% 기준 이론 최소 · 실패·대실패가 섞이면 더 늘어나므로 위 입력칸에서 조정), 대성공만 나면 최소 ${Math.ceil(100/(R.pct*1.5))}회 · 매 공정 재료 1세트 소모, 재료비 ×${S} 반영<br><small>공정률 증가: 해당 스킬 파티(풀파티일수록↑), 레인캐스팅(천옷)만 적용 · 월요일·풍년가·세공은 성공률/품질만</small>`:''}${R.fin?`<br>마감 재료 · ${R.fin.map((t,i)=>`[타입${i+1}] `+t.map(x=>`${x[0]} <b>×${x[1]}</b>`).join(', ')).join(' / ')} <small>(100% 완성 후 마감 1회 · 재료비 포함)</small>`:''} · 시세 ${PT||'—'}<br>구슬 시세 · ${Object.keys(MC.SHOPS||{}).map(t=>`<a href="#coin-${t}">${MC.SHOPS[t].name}</a> <b>${BP[t]?f(Math.round(BP[t].p))+'G':'—'}</b>`).join(' · ')} <small>(아래 정가 코인 섹션의 직접 입력값 공유 · 탈라 가흐는 교환 재료 경매가÷구슬 수 역산 중앙값 · 재료비는 경매/코인/제작 중 최저)</small>`}
$('tot').addEventListener('change',e=>{if(e.target.id!=='stepsIn')return;const R=RECIPES[gi()];st.steps=st.steps||{};st.steps[R.n]=Math.max(1,+e.target.value||1);save();render();syncCoin()});
let busy=0;
function toggle(id,el){if(busy)return;const root=$('root');const dep=+el.dataset.dep;
 if(st.open[id]){busy=1;const sub=[...root.querySelectorAll('.nd')].filter(e=>e.dataset.id.startsWith(id+'/'));
  sub.forEach(e=>e.animate([{opacity:1,transform:'none'},{opacity:0,transform:'translateY(-14px) scale(.96)'}],{duration:180,easing:'cubic-bezier(.5,0,.75,0)',fill:'forwards'}));
  const sv=root.querySelector('svg.lines');sv&&sv.animate([{opacity:1},{opacity:0}],{duration:180,fill:'forwards'});
  setTimeout(()=>{busy=0;Object.keys(st.open).forEach(k=>{if(k===id||k.startsWith(id+'/'))delete st.open[k]});window._act={id,open:0,dep};save();render()},180)}
 else{el.classList.add('press');busy=1;setTimeout(()=>{busy=0;st.open[id]=1;window._act={id,open:1,dep};save();render()},110)}}
function fillGoals(){const G=gi();const opt=re=>RECIPES.map((r,i)=>re.test(r.n)?`<option value="${i}">${r.n}</option>`:'').join('');
 const nb=opt(/^나이트브링어/),so=opt(/^소울/),du=opt(/^더스크/),E='<option value="">— 선택 —</option>';
 $('goalNav').innerHTML=E+nb;$('goalSoul').innerHTML=E+so;$('goalDusk').innerHTML=E+du;
 const n=(RECIPES[gi()]||{}).n||'',k=/^나이트브링어/.test(n)?'goalNav':/^소울/.test(n)?'goalSoul':/^더스크/.test(n)?'goalDusk':'';['goalNav','goalSoul','goalDusk'].forEach(x=>$(x).value=x===k?G:'');$('goalSel').innerHTML=nb+so+du;$('goalSel').value=G}
['goalNav','goalSoul','goalDusk'].forEach(k=>$(k).addEventListener('change',e=>{if(e.target.value==='')return;st.goal=+e.target.value;fillGoals();save();render();syncCoin()}));
// 제작 목표 ↔ 코인 탭 연동: 목표 재료 중 구슬 상점 재료의 (부족 수량 × 교환 코인) 합계
window.craftCoinNeed=function(){const R=RECIPES[gi()];if(!R)return null;const o={};
 matsOf(R).forEach(c=>{const cn=MC.COST[c[0]];if(!cn)return;const z=nodeCost(c,st.qty);const t=o[cn.tab]=o[cn.tab]||{total:0,list:[]};t.total+=z.need*cn.cost;t.list.push({n:c[0],qty:z.need,cost:cn.cost})});
 return {goal:R.n,qty:st.qty,tabs:o,tab:/^소울/.test(R.n)?'bri':/^더스크/.test(R.n)?'tala':(Object.keys(o)[0]||null)}};
function syncCoin(){const N=window.craftCoinNeed();if(N&&N.tab){const b=document.querySelector('#tabs button[data-k="'+N.tab+'"]');if(b&&!b.classList.contains('on'))b.click()}document.dispatchEvent(new Event('craftneed'))}fillGoals();$('goalQty').value=st.qty;
$('goalSel').onchange=e=>{st.goal=+e.target.value;save();render();syncCoin()};$('goalQty').onchange=e=>{st.qty=Math.max(1,+e.target.value||1);e.target.value=st.qty;save();render();syncCoin()};
$('resetBtn').onclick=()=>{st.own={};st.open={};save();render();syncCoin()};
render();
fetch('/prices.json?t='+Date.now()).then(r=>r.json()).then(j=>{P=j.prices||{};const t=Object.values(P).map(v=>v.t).filter(Boolean).sort().pop();PT=t?t.slice(0,16).replace('T',' '):'';reBeads();render()}).catch(()=>{});

fetch('/craft/recipes.json?t='+Date.now()).then(r=>r.json()).then(j=>{if(Array.isArray(j)&&j.length){RECIPES=j;fillGoals();render();syncCoin()}}).catch(()=>{});
let HRows=[];function reBeads(){if(!MC.beadTable)return;let cs={};try{cs=JSON.parse(localStorage.getItem('mabiCoin.v1')||'{}')}catch(e){}
 const B=MC.beadTable(HRows,cs.paste);BP={};Object.keys(MC.SHOPS).forEach(t=>{BP[t]=MC.beadPick(B,t,cs.beadOv,P)})}
fetch('/horn_beads.json?t='+Date.now()).then(r=>r.json()).then(d=>{HRows=d.rows||[];reBeads();render()}).catch(()=>{});
fetch('/assets/icons/icons.json').then(r=>r.json()).then(j=>{IC=j.icons||{};render()}).catch(()=>{});
document.fonts&&document.fonts.ready.then(()=>render());
