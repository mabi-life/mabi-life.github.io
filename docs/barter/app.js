const D=JSON.parse(document.getElementById('data').textContent),SNAP=JSON.parse(document.getElementById('snap').textContent||'null');
const LS='mabiBarter.v1',$=s=>document.querySelector(s),G=Object.fromEntries(D.goods.map(g=>[g.id,g]));
const CARRIERS=[{n:'그랜마 상인+알파카 마차',w:1200,s:11},{n:'직접 입력',w:null,s:null}];
const fmt=n=>n==null||isNaN(n)?'-':Math.round(n).toLocaleString('ko-KR');
/* HOT: 체결물량 기준 (listing count 아님). prices.json volume24(없으면 volume).
   history API는 ~1h만 제공 → 피드가 auction_buy_id로 24h 근사 누적. hotMinVolume=피드 p80.
   history 실패 시 volume 없음 → 🔥만 끄고 최저가(min)는 유지. */
let HOT_MIN=300; // feed hotMinVolume 없을 때 fallback (재료 ~1h p80 근방)
let feedHotMin=null;
const hotMetric=e=>{
  if(!e)return null;
  if(e.volume24!=null)return{v:e.volume24,label:'24시간'};
  if(e.volume!=null)return{v:e.volume,label:'최근'};
  return null;
};
const hotIcon=src=>{
  const m=(src&&typeof src==='object')?hotMetric(src):(src!=null&&src!==''?{v:+src,label:'최근'}:null);
  if(!m||!(m.v>=(feedHotMin??HOT_MIN)))return '';
  return `<span class="hot" title="거래 활발 · ${m.label} 체결 ${fmt(m.v)}개">🔥</span>`;
};
const hotMat=m=>hotIcon(S.prices[m]);
const gk=n=>{if(n==null||isNaN(n))return '-';const a=Math.abs(n),s=n<0?'-':'';if(a>=1e8)return s+(a/1e8).toFixed(2).replace(/\.?0+$/,'')+'억';if(a>=1e4)return s+Math.round(a/1e4).toLocaleString('ko-KR')+'만';return s+Math.round(a).toLocaleString('ko-KR')};
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
function weekKey(now=Date.now()){const k=new Date(now+9*3600e3);let d=k.getUTCDay(),h=k.getUTCHours();let back=(d-4+7)%7;if(back===0&&h<7)back=7;return new Date(Date.UTC(k.getUTCFullYear(),k.getUTCMonth(),k.getUTCDate()-back,7)-9*3600e3).toISOString()}
function def(){const p={};const sp=SNAP&&SNAP.prices||{};for(const m of D.materials){if(sp[m]!=null)p[m]={p:sp[m],src:'snap'};else if(D.pricesFallback.prices[m]!=null)p[m]={p:D.pricesFallback.prices[m],src:'pril'}}
 const act={};for(const ps of D.posts){const c=D.goods.filter(g=>g.post===ps&&g.tier===6);if(c.length)act[ps]=(D.default6&&D.default6[ps]&&G[D.default6[ps]])?D.default6[ps]:c[0].id}
 return{v:2,chars:[{name:'캐릭터 1',done:{},owned:{}}],cur:0,route:'pk',routes:['pk','ko'],act6v:D.version,carrier:0,cw:1200,cs:11,drate:0,qty:{},active6:act,prices:p,sale:{},week:weekKey(),snapT:SNAP&&SNAP.t||null}}
function migrate(o){const d=def();if(!o||!Array.isArray(o.chars))return d;o=Object.assign(d,o);for(const c of o.chars){c.done=c.done||{};c.owned=c.owned||{}}o.active6=o.act6v===D.version?Object.assign(d.active6,o.active6):d.active6;o.act6v=D.version;if(!Array.isArray(o.routes)||!o.routes.length)o.routes=[o.route==='ko'?'ko':'pk'];o.v=2;if(o.cur>=o.chars.length)o.cur=0;return o}
let S;try{S=JSON.parse(localStorage.getItem(LS))}catch(e){}S=migrate(S);
if(SNAP&&SNAP.t&&S.snapT!==SNAP.t){for(const[m,v]of Object.entries(SNAP.prices))if(!S.prices[m]||S.prices[m].src!=='manual')S.prices[m]={p:v,src:'snap'};S.snapT=SNAP.t}
let open=null,layer=null,dOpen=null;const hist=[];
function save(){localStorage.setItem(LS,JSON.stringify(S))}
function renderMats(){const L=document.querySelector('#x-mats .mleft');if(!L)return renderDash();const pv=$('#paste2')?$('#paste2').value:'',ae=document.activeElement,am=ae&&ae.dataset&&ae.dataset.a==='own'?ae.dataset.m:null;L.innerHTML=matsLeft();if($('#paste2'))$('#paste2').value=pv;if(am){const e=L.querySelector(`input[data-a=own][data-m="${am}"]`);if(e)e.focus()}}
let svT;function saveSoon(){clearTimeout(svT);svT=setTimeout(save,300)}
function mutMats(f,msg){hist.push(JSON.stringify(S));if(hist.length>100)hist.shift();f();saveSoon();renderMats();renderWeek();if(msg)toast(msg)}
function mut(f,msg){clearTimeout(svT);hist.push(JSON.stringify(S));if(hist.length>100)hist.shift();f();save();render();if(msg)toast(msg)}
function undo(){if(!hist.length)return toast('되돌릴 내용 없음');S=JSON.parse(hist.pop());save();render();toast('되돌렸습니다')}
function toast(m){const t=$('#toast');t.textContent=m;t.style.display='block';clearTimeout(toast.h);toast.h=setTimeout(()=>t.style.display='none',1700)}
function checkReset(){const w=weekKey();if(S.week!==w){for(const c of S.chars)c.done={};S.week=w;save();toast('주간 교환 기록 초기화 (목 07:00)')}}
const C=()=>S.chars[S.cur];
const pIdx=ps=>{for(const r of D.routes){const i=r.posts.indexOf(ps);if(i>=0)return i}return 9};const byPost=L=>[...L].sort((a,b)=>pIdx(a.g.post)-pIdx(b.g.post)||(b.g.tier||0)-(a.g.tier||0));
const activeGoods=ps=>D.goods.filter(g=>g.post===ps&&(g.tier!==6||S.active6[ps]===g.id));
const qtyOf=g=>S.qty[g.id]!=null?Math.min(S.qty[g.id],g.limit):g.limit, doneOf=g=>C().done[g.id]||0, remOf=g=>Math.max(0,qtyOf(g)-doneOf(g));
const price=m=>S.prices[m]?S.prices[m].p:null;
const unitCost=g=>{let s=0,u=0;for(const[m,q]of g.mats){const p=price(m);if(p==null)u++;else s+=p*q}return{s,u}};
const hasSale=g=>{const s=S.sale[g.id];return !!(s&&(+s.d||+s.g))};
const rev=(g,q)=>{const s=S.sale[g.id]||{};return((+s.d||0)*(+S.drate||0)+(+s.g||0))*q};
function need(goods,useRem=true){const n={};for(const g of goods){const q=useRem?remOf(g):qtyOf(g);for(const[m,k]of g.mats)n[m]=(n[m]||0)+k*q}return n}
const routeGoods=r=>r.posts.flatMap(activeGoods);
const shortOf=g=>g.mats.filter(([m,k])=>(C().owned[m]||0)<k*remOf(g)).length;
function plan(r){const W=+S.cw||0,SL=+S.cs||0;const goods=routeGoods(r).map(g=>({g,left:qtyOf(g)})).filter(x=>x.left>0);const runs=[];
 const order=[...goods].sort((a,b)=>(b.g.tier||0)-(a.g.tier||0)||r.posts.indexOf(a.g.post)-r.posts.indexOf(b.g.post));
 for(let run=0;run<4&&goods.some(x=>x.left);run++){let w=0,s=0;const L=[];
  const pass=(fl,trim)=>{for(const x of order){if(!x.left||!fl(x.g))continue;const ps=x.g.perSlot||1,wt=x.g.weight||0;let q=Math.min(x.left,wt?Math.floor((W-w)/wt):x.left,(SL-s)*ps);
   if(trim&&q>ps&&q%ps&&q<x.left)q-=q%ps;if(q<=0)continue;x.left-=q;w+=q*wt;s+=Math.ceil(q/ps);L.push({g:x.g,q})}};
  if(run===0){pass(g=>(g.tier||0)>=3,true);pass(()=>true)}else pass(()=>true);if(!L.length)break;runs.push({L,w,s})}
 const off={};for(const ru of runs)for(const x of ru.L){const o=off[x.g.id]||0;x.off=o;x.dn=Math.max(0,Math.min(x.q,doneOf(x.g)-o));x.fin=x.dn>=x.q?1:0;off[x.g.id]=o+x.q}
 return{runs,W,SL}}
function unexTo(g,n){const c=C();const cur=c.done[g.id]||0;if(n>=cur)return;mut(()=>{c.done[g.id]=n;for(const[m,k]of g.mats)c.owned[m]=(c.owned[m]||0)+k*(cur-n)},`${g.name} 완료 해제 · 재료 복원`)}
function unexchange(g){const c=C();const cur=c.done[g.id]||0;if(!cur)return;mut(()=>{c.done[g.id]=0;for(const[m,k]of g.mats)c.owned[m]=(c.owned[m]||0)+k*cur},`${g.name} 완료 해제 · 재료 복원`)}
function exchange(g,n){const c=C();n=Math.max(0,Math.min(n,qtyOf(g)));const cur=c.done[g.id]||0;if(n===cur)return;const delta=n-cur;
 mut(()=>{c.done[g.id]=n;if(delta>0)for(const[m,k]of g.mats)c.owned[m]=Math.max(0,(c.owned[m]||0)-k*delta)},delta>0?`${g.name} +${delta} · 재료 차감`:`${g.name} ${n}개로 수정`)}
function parsePaste(t){const o={};for(const l of t.split(/\n/)){const m=l.trim().match(/^(.+?)[\s:=x×,\t]+([\d,]+)\s*개?$/);if(m)o[m[1].trim()]=+m[2].replace(/,/g,'')}return o}
function rowHtml(g){const q=qtyOf(g),dn=doneOf(g),sh=remOf(g)?shortOf(g):0,six=g.tier===6;
 const dots=q<=30?`<span class="dots">${Array.from({length:q},(_,i)=>`<i class="${i<dn?'on':''}" data-a="dot" data-g="${g.id}" data-i="${i}"></i>`).join('')}</span>`:`<span><button class="sm" title="Shift ×10 · Ctrl ×100" data-a="dec" data-g="${g.id}">−</button> <button class="sm" title="Shift ×10 · Ctrl ×100" data-a="inc" data-g="${g.id}">＋</button> <small class="mut" style="font-size:10px">Shift +10 · Ctrl +100</small></span>`;
 let h=`<div class="row ${dn>=q&&q?'full':''}" data-a="row" data-g="${g.id}"><span class="t t${g.tier||0}">${g.tier?'T'+g.tier:'—'}</span>
 <span class="nm">${g.name}${six?` <button class="ghost sm" data-a="pick6" data-p="${g.post}">▾</button>`:''}</span>
 <span style="display:flex;align-items:center;gap:8px">${dots}<span class="cnt">${dn}/${q}</span></span>
 <span class="st">${!remOf(g)?'<span class="pos">완료</span>':sh?`<span class="neg">❗ 부족 ${sh}종</span>`:'<span class="pos">✅ 준비</span>'}</span></div>`;
 if(open===g.id){const c=C(),rm=remOf(g),uc=unitCost(g),s=S.sale[g.id]||{};
  h+=`<div class="det"><table>${g.mats.map(([m,k])=>{const o=c.owned[m]||0,n=k*rm;return`<tr><td>${m}${hotMat(m)} <span class="mut">×${k}</span></td><td class="r ${o<n?'neg':'pos'}">${fmt(o)} / ${fmt(n)}</td><td class="r"><input class="n" data-a="price" data-m="${m}" value="${price(m)??''}" placeholder="가격?"> G</td></tr>`}).join('')}</table>
  <div style="display:flex;gap:14px;align-items:center;margin-top:8px;flex-wrap:wrap"><span>재료비/개 <b class="neg">${gk(uc.s)}</b>${uc.u?'<span class="warn">+?</span>':''}</span>
  <span>판매가/개 <input class="n" data-a="sale" data-k="d" data-g="${g.id}" value="${s.d||''}" placeholder="두카트"> <input class="n" data-a="sale" data-k="g" data-g="${g.id}" value="${s.g||''}" placeholder="골드"></span>
  <span>수량 <input class="n" style="width:50px" data-a="qty" data-g="${g.id}" value="${q}"></span>
  <span class="mut">무게 ${g.weight} · 슬롯당 ${g.perSlot}</span><button class="sm" data-a="ex" data-g="${g.id}">남은 ${rm}개 완료</button></div></div>`}
 return h}
// ---- 상세 기능 (접이식 섹션, 펼침 상태 기억 · 데이터는 상세 버전과 같은 저장소)
const UIK='mabiBarter.ui';let UI={};try{UI=JSON.parse(localStorage.getItem(UIK))||{}}catch(e){}
const route=()=>D.routes.find(r=>r.id===S.route)||D.routes[0];
const selRoutes=()=>{let ids=(Array.isArray(S.routes)?S.routes:[S.route]).filter(id=>id==='pk'||id==='ko');if(!ids.length)ids=['pk','ko'];return D.routes.filter(r=>ids.includes(r.id))};
const selGoods=()=>selRoutes().flatMap(routeGoods),selName=()=>selRoutes().length>1?'두 루트 합산':selRoutes()[0].name;
const SECS=[['sk','스카하','']];
function xMap(){return '<img src="../img/iria-barter-map.png" alt="이리아 물교 지도" style="width:100%;max-width:900px;display:block;margin:8px auto 0">'}
function xSk(){return D.routes.find(r=>r.id==='sk').posts.flatMap(activeGoods).map(rowHtml).join('')}
const skProg=()=>{const g=routeGoods(D.routes.find(r=>r.id==='sk'));return g.reduce((a,x)=>a+Math.min(doneOf(x),qtyOf(x)),0)+'/'+g.reduce((a,x)=>a+qtyOf(x),0)};
const tabLabel=r=>{const port=r.name.split('→').pop().trim();return esc(r.posts.join('→')+'→'+port.replace(/\s*항구$/,''))+` <small>⛵ ${esc(port)}</small>`};
function xGoods(){const c=C(),r=route();let h=`<div style="display:flex;gap:12px;align-items:center;margin:6px 0"><label>경로 <select id="route">${D.routes.map(x=>`<option value="${x.id}" ${x.id===r.id?'selected':''}>${x.name}</option>`).join('')}</select></label><span class="mut" style="font-size:13.5px">수량 기본값 = 주간 제한</span></div>`;let RT={cost:0,rev:0,unk:0,cnt:0,doneCnt:0};
 for(const ps of r.posts){const six=D.goods.filter(g=>g.post===ps&&g.tier===6);
  h+=`<h4>🏪 ${ps} ${six.length?`<span class="mut" style="font-size:13.5px;font-weight:400">6티어 이번 시즌: <select data-a="act6" data-p="${ps}">${six.map(g=>`<option value="${g.id}" ${S.active6[ps]===g.id?'selected':''}>${g.name}</option>`).join('')}</select></span>`:''}</h4>`;
  h+=`<table class="dt"><tr><th>티어</th><th>교역품</th><th class="r">제한</th><th class="r">수량</th><th class="r">무게/슬롯당</th><th>재료 (개당 → 필요)</th><th class="r">재료비</th><th class="r">판매가/개 (두카트 · 골드)</th><th class="r">손익</th><th>${esc(c.name)} 교환</th></tr>`;let P={cost:0,rev:0,unk:0};
  for(const g of activeGoods(ps)){const q=qtyOf(g),dn=doneOf(g),uc=unitCost(g),cost=uc.s*q,rv=rev(g,q),pf=rv-cost;P.cost+=cost;P.rev+=rv;P.unk+=uc.u;RT.cnt+=q;RT.doneCnt+=Math.min(dn,q);
   h+=`<tr class="${dn>=q&&q>0?'done':''}"><td><span class="t t${g.tier||0}">${g.tier?'T'+g.tier:'—'}</span></td><td class="gnm" title="${esc(g.name)}">${iconHtml(g.name)}<b>${g.name}</b></td><td class="r">${g.limit}</td><td class="r"><input class="n" style="width:56px" data-a="qty" data-g="${g.id}" value="${q}"></td><td class="r">${g.weight}/${g.perSlot}</td>
   <td class="mats">${g.mats.map(([m,k])=>`<div>${m}${hotMat(m)} ×${k} → <b>${fmt(k*q)}</b> <span class="coin" title="경매장 단가">${price(m)==null?'<span class="warn">가격?</span>':'<img src="/assets/icons/2x/2000.png" alt="G" style="width:1.1em;height:1.1em;vertical-align:-.2em;margin-right:1px">'+gk(price(m))}</span></div>`).join('')}</td>
   <td class="r neg">${gk(cost)}${uc.u?' <span class="warn">+?</span>':''}<div class="mut">개당 <img src="/assets/icons/2x/2000.png" alt="G" style="width:1.1em;height:1.1em;vertical-align:-.2em;margin-right:1px">${gk(uc.s)}</div></td>
   <td class="r"><input class="p" data-a="sale" data-k="d" data-g="${g.id}" value="${(S.sale[g.id]||{}).d||''}" placeholder="두카트"> <input class="p" data-a="sale" data-k="g" data-g="${g.id}" value="${(S.sale[g.id]||{}).g||''}" placeholder="골드"></td>
   <td class="r ${hasSale(g)?(pf>=0?'pos':'neg'):'mut'}">${hasSale(g)?(pf>=0?'+':'')+gk(pf):'판매가 미입력'}</td>
   <td style="white-space:nowrap"><input class="n" style="width:44px" data-a="done" data-g="${g.id}" data-off="${x.off}" value="${x.dn}">/${x.q} <button class="sm" data-a="ex" data-g="${g.id}" data-n="${x.off+x.q}" title="남은 수량 교환완료 + 보유재료 차감">✔ 완료</button></td></tr>`}
  h+=`<tr><td></td><td colspan="5" class="tot">${ps} 합계</td><td class="r neg tot">${gk(P.cost)}${P.unk?'<span class="warn">+?</span>':''}</td><td class="r pos tot">${P.rev?gk(P.rev):'-'}</td><td class="r tot ${P.rev-P.cost>=0?'pos':'neg'}">${P.rev?''+gk(P.rev-P.cost):'-'}</td><td></td></tr></table>`;RT.cost+=P.cost;RT.rev+=P.rev;RT.unk+=P.unk}
 h+=`<div class="tot" style="margin-top:8px">🧾 ${r.name} 총계: 재료비 <span class="neg">${gk(RT.cost)}</span> · 매출 <span class="pos">${gk(RT.rev)}</span> · 순이익 <span class="${RT.rev-RT.cost>=0?'pos':'neg'}">${gk(RT.rev-RT.cost)}</span> · ${esc(c.name)} 진행 ${RT.doneCnt}/${RT.cnt}${RT.unk?' <span class="warn">(가격 모르는 재료 있음)</span>':''} <span class="mut" style="font-weight:400;font-size:13.5px">· 판매가의 두카트는 ⚙ 두카트→골드 환산값 사용</span></div>`;
 h+=`<div class="mut" style="margin-top:4px;font-size:13.5px">진행 요약 (전체 경로): ${S.chars.map(ch=>{let a=0,b=0;for(const g of D.routes.flatMap(x=>x.posts).flatMap(activeGoods)){b+=qtyOf(g);a+=Math.min(ch.done[g.id]||0,qtyOf(g))}return esc(ch.name)+' '+a+'/'+b}).join(' · ')}</div>`;return h}
function faceHtml(r,ru,n,pl){const port=r.name.split('→').pop().trim().replace(/\s*항구$/,''),rt=esc(r.posts.join(' → ')+' → '+port);
 let h=`<span class="hint">클릭 → 상세표</span><h2>${rt}<span class="rtag">${n}회차</span></h2>`;
 if(!ru)return h+`<div class="pos" style="margin-top:20px">${n}회차 남은 교환 없음 🎉</div>`;
 let cost=0,rv=0,unk=0,sale=false;for(const x of ru.L){if(x.fin)continue;const u=unitCost(x.g);cost+=u.s*x.q;unk+=u.u;rv+=rev(x.g,x.q);if(hasSale(x.g))sale=true}
 const rows=byPost(ru.L).map(x=>`<tr${x.fin?' class="done fin"':''}><td><span class="t t${x.g.tier||0}">T${x.g.tier||'—'}</span></td><td>${x.g.post}</td><td>${iconHtml(x.g.name)}${x.g.name}${x.fin?' <span class="dbadge">완료</span>':''}${!x.fin&&x.g.mats.some(([m,k])=>(C().owned[m]||0)<k*x.q)?' <span class="neg" title="재료 부족">❗</span>':''}</td><td class="r">${x.q}</td><td class="r mut">${x.q*x.g.weight}</td><td class="r mut">${Math.ceil(x.q/x.g.perSlot)}</td></tr>`).join('');
 return h+`<table class="rt" style="margin-top:10px"><tr><th>티어</th><th>교역소</th><th>품목</th><th class="r">수량</th><th class="r">무게</th><th class="r">슬롯</th></tr>${rows}</table>
 <div class="esum"><span>무게 <b class="${ru.w>pl.W?'neg':''}">${fmt(ru.w)} / ${fmt(pl.W)}</b></span><span>슬롯 <b class="${ru.s>pl.SL?'neg':''}">${ru.s} / ${pl.SL}</b></span><span>재료비 <b class="neg">${gk(cost)}</b>${unk?'<span class="warn">+?</span>':''}</span><span>예상 ${sale?`<b class="${rv-cost>=0?'pos':'neg'}">${rv-cost>=0?'+':''}${gk(rv-cost)}</b>`:'<span class="mut">판매가 미입력</span>'}</span></div>
 ${pl.runs.length>2&&n===2?'<div class="footnote warn">⚠ 2회차 안에 다 못 실음 (추가 '+(pl.runs.length-2)+'회차)</div>':''}`}
function cardHtml(r){const pl=plan(r),on=!!UI['flip_'+r.id],n=on?2:1;
 return `<div class="flip ${on?'on':''}" data-r="${r.id}"><div class="card face" data-a="detail" data-r="${r.id}" role="button" tabindex="0" title="클릭하면 상세표 팝업">${faceHtml(r,pl.runs[n-1],n,pl)}</div><button type="button" class="peek" data-a="flip" data-r="${r.id}" aria-label="${on?1:2}회차로 전환" title="${on?1:2}회차로 전환">${on?1:2}회차 ⇄</button></div>`}
function detailHtml(r){const pl=plan(r),n=UI['flip_'+r.id]?2:1,ru=pl.runs[n-1],c=C();
 let h=`<div class="dhd"><h2>${esc(r.name)} <span class="rtag">${n}회차</span></h2><button class="ghost" data-a="dclose" aria-label="닫기">✕</button></div>`;
 if(!ru)return h+`<div class="pos">${n}회차 남은 교환 없음 🎉</div>`;
 let tc=0,unk=0;const rows=byPost(ru.L).map(x=>{const g=x.g,u=unitCost(g),q=qtyOf(g),dn=doneOf(g),sl=S.sale[g.id]||{},pf=rev(g,x.q)-u.s*x.q;if(!x.fin){tc+=u.s*x.q;unk+=u.u}
  const mats=g.mats.map(([m,k])=>{const nd=k*x.q,o=c.owned[m]||0,p=price(m);return `<div${o<nd?' class="neg"':''}>${iconHtml(m)}${esc(m)} ×${k} → ${fmt(nd)}${p!=null?` <span class="coin" title="경매장 단가"><img src="/assets/icons/2x/2000.png" alt="G" style="width:1.1em;height:1.1em;vertical-align:-.2em;margin-right:1px">${fmt(p)}</span>`:''}${o<nd?` <span class="mut">(보유 ${fmt(o)})</span>`:''}</div>`}).join('');
  if(x.fin)return `<tr class="done fin cmp"><td><span class="t t${g.tier||0}">T${g.tier||'—'}</span></td><td>${g.post}</td><td class="gnm" title="${esc(g.name)}">${iconHtml(g.name)}${esc(g.name)} <span class="dbadge">완료</span></td><td class="r mut" style="white-space:nowrap">${x.q} / <span title="주간 교환 한도">${g.limit}</span></td><td class="r mut">${g.weight}/${g.perSlot}</td><td class="r mut">${x.q*g.weight}</td><td class="r mut">${Math.ceil(x.q/g.perSlot)}</td><td style="font-size:13.5px;opacity:.85">${mats}</td><td class="r mut">${gk(u.s*x.q)}${u.u?'<span class="warn">+?</span>':''}<div class="mut" style="font-size:12.5px">개당 <img src="/assets/icons/2x/2000.png" alt="G" style="width:1.1em;height:1.1em;vertical-align:-.2em;margin-right:1px">${gk(u.s)}</div></td><td class="r mut" style="white-space:nowrap">${hasSale(g)?((pf>=0?'+':'')+gk(pf)):'판매가 미입력'}</td><td style="white-space:nowrap"><button class="sm dong" data-a="unex" data-g="${g.id}" data-n="${x.off}" title="다시 누르면 완료 해제 + 재료 복원">✔ 완료</button></td></tr>`;
  return `<tr><td><span class="t t${g.tier||0}">T${g.tier||'—'}</span></td><td>${g.post}</td><td class="gnm" title="${esc(g.name)}">${iconHtml(g.name)}${esc(g.name)}</td><td class="r" style="white-space:nowrap"><input class="n" style="width:50px" data-a="rq" data-g="${g.id}" data-o="${q-x.q}" value="${x.q}" title="이번 회차 적재 수량"> / <span class="mut" title="주간 교환 한도">${g.limit}</span></td><td class="r mut">${g.weight}/${g.perSlot}</td><td class="r mut">${x.q*g.weight}</td><td class="r mut">${Math.ceil(x.q/g.perSlot)}</td><td style="font-size:13.5px">${mats}</td><td class="r neg">${gk(u.s*x.q)}${u.u?'<span class="warn">+?</span>':''}<div class="mut" style="font-size:12.5px">개당 <img src="/assets/icons/2x/2000.png" alt="G" style="width:1.1em;height:1.1em;vertical-align:-.2em;margin-right:1px">${gk(u.s)}</div></td>
  <td class="r" style="white-space:nowrap"><input class="p" data-a="sale" data-k="d" data-g="${g.id}" value="${sl.d||''}" placeholder="두카트"> <input class="p" data-a="sale" data-k="g" data-g="${g.id}" value="${sl.g||''}" placeholder="골드"><div class="${hasSale(g)?(pf>=0?'pos':'neg'):'mut'}" style="font-size:12.5px">${hasSale(g)?(pf>=0?'+':'')+gk(pf):'판매가 미입력'}</div></td>
  <td style="white-space:nowrap"><input class="n" style="width:44px" data-a="done" data-g="${g.id}" data-off="${x.off}" value="${x.dn}">/${x.q} <button class="sm" data-a="ex" data-g="${g.id}" data-n="${x.off+x.q}" title="남은 수량 교환완료 + 보유재료 차감">✔ 완료</button></td></tr>`}).join('');
 const six6=r.posts.filter(ps=>D.goods.some(g=>g.post===ps&&g.tier===6));if(six6.length)h+=`<div style="display:flex;gap:14px;flex-wrap:wrap;margin:4px 0 8px;font-size:14px">${six6.map(ps=>`<label class="mut">${ps} 6티어 이번 시즌 <select data-a="act6" data-p="${ps}">${D.goods.filter(g=>g.post===ps&&g.tier===6).map(g=>`<option value="${g.id}" ${S.active6[ps]===g.id?'selected':''}>${g.name}</option>`).join('')}</select></label>`).join('')}</div>`;
 return h+`<div style="overflow-x:auto"><table class="rt"><tr><th>티어</th><th>교역소</th><th>품목</th><th class="r" style="white-space:nowrap">이번회차 / 주간수량</th><th class="r">무게/슬롯당</th><th class="r">무게</th><th class="r">슬롯</th><th>재료 (개당 → 필요)</th><th class="r">재료비</th><th class="r">판매가/개 · 손익</th><th>${esc(c.name)} 교환</th></tr>${rows}</table></div>
 <div class="esum"><span>무게 <b class="${ru.w>pl.W?'neg':''}">${fmt(ru.w)} / ${fmt(pl.W)}</b></span><span>슬롯 <b>${ru.s} / ${pl.SL}</b></span><span>재료비 <b class="neg">${gk(tc)}</b>${unk?'<span class="warn">+?</span>':''}</span></div>`}
function renderDetail(){let el=$('#dmodal');if(!el){el=document.createElement('div');el.id='dmodal';document.body.appendChild(el)}
 const r=dOpen&&D.routes.find(x=>x.id===dOpen);el.innerHTML=r?`<div class="dbk" data-a="dclose"></div><div class="dbox" role="dialog" aria-modal="true">${detailHtml(r)}</div>`:''}
let ICONS={};
function iconHtml(n){const i=ICONS[n];return i?`<img class="ico" src="/assets/icons/${i.w<=24?'2x':'orig'}/${i.id}.png" alt="" width="20" height="20" loading="lazy">`:''}
fetch('/assets/icons/icons.json').then(r=>r.ok?r.json():null).then(j=>{if(j&&j.icons){ICONS=j.icons;render();if(typeof renderDetail==='function')renderDetail()}}).catch(()=>{});
const REC={"새우 조련 미끼":{"o":1,"c":[["새우",1],["설탕",1],["마늘",1]]},"실리엔":{"o":1,"c":[["실리엔 결정",5]]},"마력이 깃든 나무장작":{"o":1,"c":[["실리엔",1],["힐웬",1],["중급 나무장작",1]]},"정화된 토끼의 발":{"o":1,"c":[["실리엔",1],["돌연변이 토끼의 발",1]]},"끈끈이 풀":{"o":1,"c":[["실리엔",1],["돌연변이 식물의 점액질",1]]},"신비한 허브 가루":{"o":1,"c":[["블러디 허브",1],["마나 허브",1],["포이즌 허브",1]]},"뮤턴트":{"o":1,"c":[["돌연변이 토끼의 발",10],["돌연변이 식물의 점액질",5],["사스콰치의 심장",3]]},"마법의 양피지":{"o":1,"c":[["부드러운 양피지",1],["마나 허브",10],["선라이트 허브",10]]},"마법의 깃털펜":{"o":1,"c":[["생기 있는 깃털",1],["마나 허브",10],["골드 허브",10]]},"질긴 끈":{"o":1,"c":[["굵은 실뭉치",5]]},"튼튼한 고리":{"o":1,"c":[["매듭끈",1],["어둠이 깃든 칼날 조각",1]]},"매듭끈":{"o":1,"c":[["굵은 실뭉치",1],["가는 실뭉치",1]]},"최고급 가죽끈":{"o":1,"c":[["최고급 가죽",1]]},"질긴 실":{"o":1,"c":[["가는 실뭉치",5]]},"고급 가죽끈":{"o":1,"c":[["고급 가죽",1]]},"힐웬 합금":{"o":1,"c":[["힐웬",1],["니켈광석 조각",1],["아연광석 조각",1],["주석광석 조각",1],["에메랄드 코어",1]]},"스핀 기어":{"o":1,"c":[["힐웬",2],["육각 볼트",5],["육각 너트",5]]},"에너지 증폭 장치":{"o":1,"c":[["에메랄드 코어",3],["에너지 컨버터",3]]},"에너지 컨버터":{"o":1,"c":[["힐웬",1],["실리엔",1]]},"에메랄드 퓨즈":{"o":1,"c":[["에메랄드 코어",1]]},"월광 기어":{"o":1,"c":[["월광 당근",40],["힐웬 광정",15]]},"중급 나무장작":{"o":1,"c":[["나무장작",3]]},"고급 나무장작":{"o":1,"c":[["중급 나무장작",3]]},"최고급 나무장작":{"o":1,"c":[["고급 나무장작",3]]},"특급 나무장작":{"o":1,"c":[["최고급 나무장작",1],["순도 높은 강화제",1]]},"스태미나 500 포션":{"o":1,"c":[["네잎 클로버",1],["스태미나 300 포션",1],["물이 든 병",1]]},"마나 500 포션":{"o":1,"c":[["네잎 클로버",1],["마나 300 포션",1],["물이 든 병",1]]},"마리오네트 500 포션":{"o":1,"c":[["골드 허브",1],["베이스 포션",1],["주석광석 조각",1],["아연광석 조각",1],["니켈광석 조각",1]]},"생명력 500 포션":{"o":1,"c":[["네잎 클로버",1],["생명력 300 포션",1],["물이 든 병",1]]},"정령의 리큐르":{"o":1,"c":[["화이트 허브",1],["고대 정령의 화석 조각",1],["엘레멘탈 리무버",2]]},"루멘 시럽":{"o":1,"c":[["설련화",25],["루멘 플랜트",25],["베이스 허브",20]]},"쿠션용 솜":{"o":1,"c":[["고급 양털",20],["가는 실뭉치",5]]},"건초 더미":{"o":1,"c":[["못쓰게 된 밀 이파리",20],["최고급 가죽끈",1]]},"최고급 바닐라 향초":{"o":1,"c":[["고급 바닐라 향초",1],["정제된 촉매제",1]]},"인조 잔디":{"o":1,"c":[["싱싱한 풀",20],["꽃뭉치",5]]},"발리스타용 독 묻은 와이번 볼트":{"o":1,"c":[["나무장작",1],["와이번의 발톱",1],["포이즌 포션",1]]},"월광 여울 이삭빵 박스":{"o":1,"c":[["월광 당근",30],["여울 이삭",20],["종이",20]]},"산딸기 크림 소스 박스":{"o":1,"c":[["산딸기",40],["브리움 우유",5],["종이",20]]},"희귀 버섯 볶음 박스":{"o":1,"c":[["노랑망태버섯",25],["악마의 손가락",25],["종이",20]]},"은판":{"o":1,"c":[["은괴",1]]},"미스릴 대못":{"o":1,"c":[["미스릴괴",20]]},"동판":{"o":1,"c":[["동괴",1]]},"미스릴판":{"o":1,"c":[["미스릴괴",1]]},"금판":{"o":1,"c":[["금괴",1]]},"남동판":{"o":1,"c":[["남동괴",10]]},"백연판":{"o":1,"c":[["백연괴",10]]},"적철판":{"o":1,"c":[["적철괴",10]]},"펫 놀이세트":{"o":1,"c":[["펫이 좋아하는 잡동사니",1],["나무판",1]]},"조화의 코스모스 퍼퓸":{"o":1,"c":[["빈 병",1],["마법가루",10],["베이스 허브",10],["코스모스 추출액",1]]},"빤짝이 종이":{"o":1,"c":[["종이",10],["작은 녹색구슬",1],["작은 빨간구슬",1],["작은 파란구슬",1],["작은 은색구슬",1]]},"고급 옷감":{"o":1,"c":[["굵은 실뭉치",5]]},"최고급 옷감":{"o":1,"c":[["굵은 실뭉치",6]]},"고급 실크":{"o":1,"c":[["가는 실뭉치",5]]},"최고급 실크":{"o":1,"c":[["가는 실뭉치",6]]},"밀가루":{"o":1,"c":[["밀",10]]},"보릿가루":{"o":1,"c":[["보리",10]]}};
const POSTI={"페라": "fera", "칼리다": "kalida", "오아시스": "oasis", "카루숲": "karu", "스카하": "scathach"};
const SKILL={"새우 조련 미끼": "요리", "실리엔": "매직 크래프트", "마력이 깃든 나무장작": "매직 크래프트", "정화된 토끼의 발": "매직 크래프트", "끈끈이 풀": "매직 크래프트", "신비한 허브 가루": "매직 크래프트", "뮤턴트": "매직 크래프트", "마법의 양피지": "필기구 크래프트", "마법의 깃털펜": "필기구 크래프트", "질긴 끈": "방직", "고급 실크": "방직", "튼튼한 고리": "방직", "매듭끈": "방직", "최고급 실크": "방직", "최고급 가죽끈": "방직", "질긴 실": "방직", "고급 옷감": "방직", "고급 가죽끈": "방직", "최고급 옷감": "방직", "힐웬 합금": "힐웬 공학", "스핀 기어": "힐웬 공학", "에너지 증폭 장치": "힐웬 공학", "에너지 컨버터": "힐웬 공학", "에메랄드 퓨즈": "힐웬 공학", "월광 기어": "힐웬 공학", "밀가루": "제분", "보릿가루": "제분", "중급 나무장작": "목공", "고급 나무장작": "목공", "최고급 나무장작": "목공", "특급 나무장작": "목공", "스태미나 500 포션": "포션 조제", "마나 500 포션": "포션 조제", "마리오네트 500 포션": "포션 조제", "생명력 500 포션": "포션 조제", "정령의 리큐르": "포션 조제", "루멘 시럽": "포션 조제", "쿠션용 솜": "핸디크래프트", "건초 더미": "핸디크래프트", "최고급 바닐라 향초": "핸디크래프트", "인조 잔디": "핸디크래프트", "발리스타용 독 묻은 와이번 볼트": "핸디크래프트", "월광 여울 이삭빵 박스": "핸디크래프트", "산딸기 크림 소스 박스": "핸디크래프트", "희귀 버섯 볶음 박스": "핸디크래프트", "은판": "제련", "미스릴 대못": "제련", "동판": "제련", "미스릴판": "제련", "금판": "제련", "남동판": "제련", "백연판": "제련", "적철판": "제련", "펫 놀이세트": "핀즈 크래프트", "조화의 코스모스 퍼퓸": "핀즈 크래프트", "빤짝이 종이": "합성", "길쭉한 수정": "스카하", "심해어": "스카하", "반짝거리는 가죽": "스카하", "끈적거리는 무거운 물": "스카하", "하얀색 수정": "스카하", "검은색 수정": "스카하", "단단한 목재": "스카하", "장식용 해산물": "스카하", "탈틴 농장 블랙베리 주스": "탈틴농장", "탈틴 농장 꽃무늬 원피스": "탈틴농장", "탈틴 농장 강력 접착제": "탈틴농장", "탈틴 농장 달콤 케이크": "탈틴농장", "탈틴 농장 레드문 귀걸이": "탈틴농장", "탈틴 농장 천연 고무": "탈틴농장", "탈틴 농장 붉은 배 잼": "탈틴농장", "탈틴 농장 자색 원단": "탈틴농장", "탈틴 농장 퓨어 블러썸 머리핀": "탈틴농장", "탈틴 농장 누름꽃 공예 함": "탈틴농장", "탈틴 농장 방수 원단": "탈틴농장", "탈틴 농장 별무늬 샐러드": "탈틴농장", "탈틴 농장 이브닝 드레스": "탈틴농장", "탈틴 농장 미드나잇 펄 페인트": "탈틴농장", "탈틴 농장 새벽의 활": "탈틴농장", "탈틴 농장 재스민 향수": "탈틴농장", "탈틴 농장 장식용 크리스탈 검": "탈틴농장", "탈틴 농장 강화 섬유": "탈틴농장", "탈틴 농장 황혼의 류트": "탈틴농장"};const SKO=["매직 크래프트", "목공", "방직", "요리", "제련", "제분", "탈틴농장", "포션 조제", "핀즈 크래프트", "필기구 크래프트", "합성", "핸디크래프트", "힐웬 공학", "스카하", "기타"];const skOf=m=>SKILL[m]||"기타";

function matNeed(){return need(D.routes.slice(0,2).flatMap(r=>routeGoods(r)),true)}
function subHtml(m,sh){const r=REC[m],k=Math.ceil(sh/r.o);return `<div class="sub">${sh?`<span class="mut">${fmt(k)}회 제작${r.o>1?` (×${r.o})`:''}:</span> `:'<span class="mut">하위재료:</span> '}${r.c.map(([n,q])=>`<span class="si">${iconHtml(n)}${esc(n)} <b>${sh?fmt(q*k):q}</b></span>`).join('')}</div>`}
let MORD=null;function matsLeft(){const U={};for(const g of D.routes.slice(0,2).flatMap(r=>routeGoods(r)))for(const[m,k]of g.mats)(U[m]=U[m]||[]).push(`<div class=tl><span class=tt><img src=/assets/posts/${POSTI[g.post]||'x'}.png width=18 height=18 alt=''>${g.post} T${g.tier}</span> ${iconHtml(g.name)}${g.name} <b>×${k}</b>${remOf(g)>0?` <span class=mut>남은 ${remOf(g)}</span>`:' <span class=pos>✓</span>'}</div>`);const c=C(),nd=matNeed(),all=Object.keys(nd).filter(m=>nd[m]>0),sks=SKO.filter(k=>all.some(m=>skOf(m)===k)),sf=sks.includes(UI.skf)?UI.skf:'',sh=m=>Math.max(0,nd[m]-(c.owned[m]||0)),okS=new Set(all.filter(m=>sh(m)<=0)),okK=[...okS].sort().join('|');if(!MORD||MORD.k!==okK){MORD={k:okK,r:{}};[...all].sort((x,y)=>sh(y)-sh(x)||x.localeCompare(y,'ko')).forEach((m,i)=>MORD.r[m]=i)}const ms=all.filter(m=>!sf||skOf(m)===sf).sort((x,y)=>(okS.has(x)-okS.has(y))||((MORD.r[x]??1e9)-(MORD.r[y]??1e9))||x.localeCompare(y,'ko'));let tc=0,unk=0;
 const rows=ms.map(m=>{const n=nd[m],o=c.owned[m]||0,sh=Math.max(0,n-o),p=price(m);if(sh){if(p==null)unk++;else tc+=sh*p}
  return `<div class="er"><span class="nm" data-tip="${esc('<div class=th>'+m+'</div>'+(U[m]?U[m].join(''):'<div class=mut>사용처 없음</div>'))}">${iconHtml(m)}${m}</span><span class="r">${fmt(n)}</span><span style="white-space:nowrap"><button class="sm" title="Shift ×10 · Ctrl ×100" data-a="om" data-m="${m}">−</button> <input class="n" style="width:64px" data-a="own" data-m="${m}" value="${o}"> <button class="sm" title="Shift ×10 · Ctrl ×100" data-a="op" data-m="${m}">＋</button></span><span class="r ${sh?'short':'pos'}">${sh?fmt(sh):'✓'}</span></div>`+(sf&&REC[m]?subHtml(m,sh):'')});
 const hd='<div class="er h"><span>재료</span><span class="r">필요</span><span>보유 <small class="mut" style="font-size:10px;font-weight:normal">Shift +10 · Ctrl +100</small></span><span class="r">부족</span></div>',half=Math.ceil(rows.length/2);
 return `<div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px;flex-wrap:wrap"><div><h3 style="display:flex;align-items:center;gap:10px;flex-wrap:wrap">🎒 재료 체크 <button data-a="inv" title="인벤토리 캡처 → 재료 보유 수량 자동 입력 (확인 후 적용)" style="font-size:14px;padding:4px 12px;background:#9fd3f7;color:#1b1d24;border:0;border-radius:6px;font-weight:700;cursor:pointer">📦 재고체크</button><button class="sm ghost" data-a="matClear" title="이 캐릭터의 재료 보유 수량 전부 0">🧹 재료 비우기</button></h3><div class="cap">${esc(c.name)} · 두 루트 남은 교환 · ${sf?esc(sf):'전체 기술'}</div><div class="skrow" style="display:flex;gap:3px;flex-wrap:wrap;margin-top:4px"><button class="sm ${sf?'ghost':''}" data-a="skf" data-k="">전체 ${all.length}</button>${sks.map(k=>`${k==='핸디크래프트'?'<span class="skbr" style="flex-basis:100%;height:0"></span>':''}<button class="sm ${sf===k?'':'ghost'}" data-a="skf" data-k="${esc(k)}">${esc(k)} ${all.filter(m=>skOf(m)===k).length}</button>`).join('')}</div></div><div style="display:flex;gap:4px;align-items:stretch;width:300px;max-width:50%"><textarea id="paste2" rows="2" style="flex:1;min-width:0;font-size:13.5px" placeholder="일괄 붙여넣기: 금판 50 / 동판 30"></textarea><div style="display:flex;flex-direction:column;gap:3px"><button class="sm" data-a="pasteSet" data-src="paste2">덮어쓰기</button><button class="sm" data-a="pasteAdd" data-src="paste2">더하기</button></div></div></div>
 ${ms.length?((()=>{const c1=rows.slice(0,half),c2=rows.slice(half);return c2.length?`<div class="egrid egrid2"><div>${hd}${c1.join('')}</div><div>${hd}${c2.join('')}</div></div>`:`<div class="egrid egrid1"><div>${hd}${c1.join('')}</div></div>`})()):(all.length?'<div class="mut">이 기술 재료 없음</div>':'<div class="pos">남은 교환 없음 🎉</div>')}
 <div class="tot" style="margin-top:8px">부족분 구매비 <span class="neg">${gk(tc)}</span>${unk?` <span class="warn">+가격 모름 ${unk}종</span>`:''}</div>
 `}
function xMats(){return `<div class="emat mwrap" id="x-mats"><div class="mleft">${matsLeft()}</div><div class="mright"><h4 style="margin:0 0 4px;display:flex;align-items:center;gap:8px;flex-wrap:wrap">🗺️ 교역 경로 <button data-a="tq" title="인게임 시세창 캡처 → 어디에 팔지 추천" style="font-size:13px;padding:3px 10px;background:#f7d98b;color:#1b1d24;border:0;border-radius:6px;font-weight:700;cursor:pointer">📷 어디에 팔까</button></h4>${xMap()}${shipHtml()}</div></div>`}
const SHIP_R=[['케안↔셀라/콘누스',[0,4.5,9,13.5,18]],['카브↔켈라',[1,5.5,10,14.5,19]]];
const shipMin=()=>((Math.floor(Date.now()/1500)%1440)+1440)%1440;
const hm=m=>{m=((Math.round(m)%1440)+1440)%1440;return Math.floor(m/60)+':'+String(m%60).padStart(2,'0')};
const realDur=em=>{const s=Math.round(em*1.5);return s>=60?Math.floor(s/60)+'분 '+(s%60)+'초':s+'초'};
function shipBar(){const P=h=>(h/24*100).toFixed(2)+'%';
 const row=([n,b],ri)=>`<div style="display:flex;align-items:center;gap:6px;margin-top:4px"><span style="width:96px;font-size:12.5px;white-space:nowrap">${n}</span><div style="position:relative;flex:1;height:14px;background:#262a36;border-radius:3px">${b.map((t,wi)=>`<span class="shipWin" id="shipWin${ri}_${wi}" title="탑승 ${hm(t*60)} → 출항 ${hm(t*60+120)}" style="position:absolute;left:${P(t)};width:${P(2)};top:2px;bottom:2px;background:rgba(247,217,139,.35);border-left:2px solid #7fd18b;border-right:2px solid #f7d98b"></span>`).join('')}<span class="shipNeedle" style="position:absolute;top:-3px;bottom:-3px;width:2px;margin-left:-1px;background:#ff4d4d;box-shadow:0 0 4px #f7d98b;left:0"></span></div></div>`;
 return `<style>.shipWin.on{background:rgba(127,209,139,.75)!important;box-shadow:0 0 6px #7fd18b}</style><div style="margin-top:6px">${SHIP_R.map(row).join('')}<div style="display:flex;gap:6px"><span style="width:96px"></span><div style="position:relative;flex:1;height:14px;font-size:11.5px;color:#8a90a0">${[0,3,6,9,12,15,18,21,24].map(h=>`<span style="position:absolute;left:${P(h)};transform:translateX(-50%)">${h}</span>`).join('')}</div></div><div id="shipStatus" style="font-size:13.5px;margin-top:3px;line-height:1.5"></div><div class="mut" style="font-size:12px"><span style="color:#7fd18b">▌</span>탑승 시작 · <span style="color:#f7d98b">▌</span>출항 · <span style="color:#ff4d4d">┃</span>지금 위치 · 에린 시계 실시간 (에린 1분 = 실제 1.5초)</div></div>`}
function tickShip(){const m=shipMin();const ck=document.getElementById('shipErinClock');if(ck)ck.textContent='🕒 에린 '+hm(m);
 document.querySelectorAll('.shipNeedle').forEach(e=>e.style.left=(m/1440*100).toFixed(3)+'%');
 const lines=SHIP_R.map(([n,b],ri)=>{let act=-1;b.forEach((t,wi)=>{const s=t*60,on=m>=s&&m<s+120;if(on)act=wi;const w=document.getElementById('shipWin'+ri+'_'+wi);if(w)w.classList.toggle('on',on)});
  if(act>=0){const left=b[act]*60+120-m;return `<b>${n}</b>: <span style="color:#7fd18b">탑승 중</span> · 출항까지 에린 ${left}분 (실제 약 ${realDur(left)})`}
  const nx=b.map(t=>t*60).find(s=>s>m)??b[0]*60+1440;const d=nx-m;return `<b>${n}</b>: 다음 탑승 ${hm(nx)} · 에린 ${Math.floor(d/60)}시간 ${d%60}분 뒤 (실제 약 ${realDur(d)})`});
 const st=document.getElementById('shipStatus');if(st)st.innerHTML=lines.join('<br>')}
if(window.__shipIv)clearInterval(window.__shipIv);window.__shipIv=setInterval(tickShip,1000);
function shipHtml(){const T=(n,b,d)=>`<tr><td>${n}</td><td class="mut">${b.join(' · ')}</td><td><b>${d.join(' · ')}</b></td></tr>`;
 return `<h4 style="margin:12px 0 4px">⛵ 배 시간 <span class="mut" style="font-size:12.5px;font-weight:400">(에린 시간)</span> <span id="shipErinClock" style="color:#f7d98b;font-size:13.5px;margin-left:6px"></span></h4><table class="dt ship" style="width:100%;font-size:13.5px"><tr><th>항로</th><th>탑승</th><th>출항</th></tr>${T('케안 ↔ 셀라 / 콘누스',['0:00','4:30','9:00','13:30','18:00'],['2:00','6:30','11:00','15:30','20:00'])}${T('카브 ↔ 켈라',['1:00','5:30','10:00','14:30','19:00'],['3:00','7:30','12:00','16:30','21:00'])}</table>${shipBar()}<div class="mut" style="font-size:12.5px;margin-top:4px">양방향 동일 시간 · 출항 후 약 3분45초(실시간) 뒤 도착, 총 약 6분45초.<br>밀항 티켓: 셀라/콘누스에서 20:00~05:00 즉시 케안 이동(전 교역소 신용도 −20,000).<br>출처: <a href="https://wiki.mabinogiworld.com/view/Sailing" target="_blank" rel="noopener">Mabinogi World Wiki – Sailing</a>, 출항시간 교차확인 <a href="https://mabinogi.begchi.com/%EA%B5%90%EC%97%AD-%EB%B0%B0-%EC%8B%9C%EA%B0%84%ED%91%9C" target="_blank" rel="noopener">비공식센터</a> (2026-10-31 확인)</div>`}
function renderWeek(){const c=C(),pl=plan(D.routes[0]);
 const all=[...routeGoods(D.routes[0]),...routeGoods(D.routes[1])];
 let dn=0,tot=0,buy=0,unk=0,rv=0,cost=0,anySale=false;
 for(const g of all){tot+=qtyOf(g);dn+=Math.min(doneOf(g),qtyOf(g));cost+=unitCost(g).s*qtyOf(g);rv+=rev(g,qtyOf(g));if(hasSale(g))anySale=true}
 const nd=need(all,true);for(const[m,n]of Object.entries(nd)){const sh=Math.max(0,n-(c.owned[m]||0));if(sh){const p=price(m);if(p==null)unk++;else buy+=sh*p}}
 $('#week').innerHTML=`<span class="mut">주간</span><span>진행 <b>${dn}/${tot}</b></span><span>부족 구매비 <b class="neg">${gk(buy)}</b>${unk?'<span class="warn">+?</span>':''}</span><span>예상 수익 ${anySale?`<b class="${rv-cost>=0?'pos':'neg'}">${rv-cost>=0?'+':''}${gk(rv-cost)}</b>`:'<span class="mut">판매가 미입력</span>'}</span><span>운송 <b>${fmt(pl.W)} / ${pl.SL}</b> <span class="mut">${esc(CARRIERS[S.carrier]?.n||'')}</span></span>`+t6Guide();
 }
function t6Guide(){const d=D.default6||{};const L=Object.entries(d).filter(([p,id])=>G[id]).map(([p,id])=>`${p} <b>${G[id].name}</b>`);return L.length?`<span style="flex-basis:100%;font-size:13.5px"><span class="t t6">T6</span> <span class="mut">${D.seasonLabel||'이번 달'} 6티어:</span> ${L.join(' · ')} <span class="mut">(매달 첫 목요일 07:00 KST 품목 변경 · 카드의 「6티어 이번 시즌」에서 바꿀 수 있어요)</span></span>`:''}
function renderDash(){const pv=$('#paste2')?$('#paste2').value:'';renderWeek();$('#dash').className='';$('#dash').innerHTML=`<div class="ecards">${D.routes.filter(x=>x.id!=='sk').map(cardHtml).join('')}</div>`+xMats();if($('#paste2'))$('#paste2').value=pv}
function renderX(){const f={sk:xSk};
 $('#xtra').innerHTML=SECS.map(([k,n,d])=>`<div class="xs" id="x-${k}"><h3 data-a="sec" data-s="${k}">${UI[k]?'▾':'▸'} ${n} <span class="mut">${k==='sk'?skProg():d}</span></h3>${UI[k]?`<div class="xb">${f[k]()}</div>`:''}</div>`).join('')}
function render(){checkReset();const c=C();
 $('#chars').innerHTML=S.chars.map((x,i)=>`<button class="${i===S.cur?'on':''}" data-a="char" data-i="${i}" title="우클릭/더블클릭: 이름 변경">${esc(x.name)}${S.chars.length>1?`<i class="cx" data-a="delChar" data-i="${i}" title="삭제">✕</i>`:''}</button>`).join('');
 $('#reset').textContent='초기화 '+new Date(Date.parse(S.week)+7*864e5).toLocaleString('ko-KR',{timeZone:'Asia/Seoul',month:'numeric',day:'numeric',weekday:'short',hour:'2-digit',minute:'2-digit'})+' KST';
 renderDash();
 renderX();renderLayer();renderDetail();tickShip()}
// ---- 팝오버/모달
function renderLayer(){const el=$('#layer');if(!layer){el.innerHTML='';return}let h='';const c=C();
 if(layer.t==='settings'){h=`<div class="pop" style="top:54px;right:24px;width:360px">
  <label>시세 <button id="priceBtn">💹 시세 불러오기</button></label>
  <label>운송 <select id="carrier">${CARRIERS.map((x,i)=>`<option value="${i}" ${i==S.carrier?'selected':''}>${x.n}</option>`).join('')}</select></label>
  <label>무게 / 슬롯 <span><input class="n" id="cw" value="${S.cw}" ${CARRIERS[S.carrier].w?'disabled':''}> <input class="n" style="width:50px" id="cs" value="${S.cs}" ${CARRIERS[S.carrier].w?'disabled':''}></span></label>
  <label>두카트→골드 <span><input class="n" id="drate" value="${S.drate||''}"> G</span></label>
  <label>캐릭터 <span><button class="sm" data-a="renChar">이름변경</button> <button class="sm" data-a="delChar">삭제</button></span></label>
  <label>데이터 <span><button class="sm" id="expBtn">내보내기</button> <button class="sm" id="impBtn">가져오기</button></span></label>
  <div class="mut" style="font-size:12.5px;margin-top:6px">데이터 ${esc(D.source.fetched)} (Prilus) · 시세 ${SNAP&&SNAP.t?new Date(SNAP.t).toLocaleString('ko-KR',{timeZone:'Asia/Seoul'})+' KST':'기본값'}</div></div>`}
 if(layer.t==='pick6'){const six=D.goods.filter(g=>g.post===layer.p&&g.tier===6);h=`<div class="pop" style="top:${layer.y}px;left:${layer.x}px"><div class="mut" style="font-size:13.5px;margin-bottom:6px">${layer.p} 6티어 (이번 시즌)</div>${six.map(g=>`<div><button class="ghost ${S.active6[layer.p]===g.id?'pos':''}" data-a="set6" data-g="${g.id}">${g.name}</button></div>`).join('')}</div>`}
 el.innerHTML='<div class="mask" data-a="close"></div>'+h}
function setLayer(l){layer=l;renderLayer()}
document.addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(!b||/INPUT|SELECT|TEXTAREA/.test(b.tagName))return;const a=b.dataset.a,c=C(),st=e.ctrlKey?100:e.shiftKey?10:1;
 if(a==='close')setLayer(null);
 if(a==='settings')setLayer(layer&&layer.t==='settings'?null:{t:'settings'});
 if(a==='char'&&+b.dataset.i!==S.cur)mut(()=>S.cur=+b.dataset.i);
 if(a==='addChar'){const n=(prompt('캐릭터 이름')||'').trim();if(n)mut(()=>{S.chars.push({name:n,done:{},owned:{}});S.cur=S.chars.length-1})}
 if(a==='renChar')renChar(b.dataset.i!=null?+b.dataset.i:S.cur);
 if(a==='delChar'){e.stopPropagation();delChar(b.dataset.i!=null?+b.dataset.i:S.cur);return}
 if(a==='row'){if(e.target.closest('button,i'))return;const id=+b.dataset.g;open=open===id?null:id;render()}
 if(a==='dot'){const g=G[b.dataset.g],i=+b.dataset.i;exchange(g,doneOf(g)===i+1?i:i+1)}
 if(a==='inc'||a==='dec'){const g=G[b.dataset.g];exchange(g,doneOf(g)+(a==='inc'?st:-st))}
 if(a==='unex'){const g=G[b.dataset.g];if(b.dataset.n!=null)unexTo(g,+b.dataset.n);else unexchange(g)}
 if(a==='ex'){const g=G[b.dataset.g];exchange(g,b.dataset.n!=null?+b.dataset.n:qtyOf(g))}
 if(a==='pick6'){const r=b.getBoundingClientRect();setLayer({t:'pick6',p:b.dataset.p,x:r.left,y:r.bottom+4})}
 if(a==='set6'){const g=G[b.dataset.g];layer=null;mut(()=>S.active6[g.post]=g.id,`${g.post} 6티어: ${g.name}`)}

 if(a==='detail'){dOpen=b.dataset.r;renderDetail();return}
 if(a==='dclose'){dOpen=null;renderDetail();return}
 if(a==='flip'){e.stopPropagation();const k='flip_'+b.dataset.r;UI[k]=!UI[k];try{localStorage.setItem(UIK,JSON.stringify(UI))}catch(x){}const r=D.routes.find(x=>x.id===b.dataset.r);b.closest('.flip').outerHTML=cardHtml(r);return}
 if(a==='pasteT'){UI.paste=!UI.paste;try{localStorage.setItem(UIK,JSON.stringify(UI))}catch(x){}return}
 if(a==='tq'){tqOpen();return}
 if(a==='inv'){invOpen();return}
 if(a==='skf'){UI.skf=b.dataset.k;try{localStorage.setItem(UIK,JSON.stringify(UI))}catch(x){}renderMats();return}
 if(a==='sec'){const k=b.dataset.s;UI[k]=!UI[k];try{localStorage.setItem(UIK,JSON.stringify(UI))}catch(x){}renderX();return}
 if(a==='rtab'){const id=b.dataset.r,cur=selRoutes().map(x=>x.id);if(cur.includes(id)&&cur.length<2)return toast('최소 한 루트는 켜져 있어야 합니다');mut(()=>{S.routes=cur.includes(id)?cur.filter(x=>x!==id):[...cur,id];S.route=S.routes[0]});return}
 if(a==='mchk'){const m=b.dataset.m,n=+b.dataset.n||0;mut(()=>c.owned[m]=Math.max(c.owned[m]||0,n),`${m} ${fmt(n)}`);return}
 if(a==='op'||a==='om'){const m=b.dataset.m;mutMats(()=>c.owned[m]=Math.max(0,(c.owned[m]||0)+(a==='op'?st:-st)))}
 if(a==='ofill'){const m=b.dataset.m,nd=need(b.dataset.r?selGoods():[...routeGoods(D.routes[0]),...routeGoods(D.routes[1])]);mut(()=>c.owned[m]=Math.max(c.owned[m]||0,nd[m]||0))}
 if(a==='matClear'){if(!confirm('재료 보유 수량을 전부 비울까요?'))return;mutMats(()=>{c.owned={}},'재료 비움');save();return}
 if(a==='pasteSet'||a==='pasteAdd'){const mut=mutMats;const pe=$('#'+(b.dataset.src||'paste')),o=parsePaste(pe.value),ks=Object.keys(o);if(!ks.length)return toast('인식된 줄 없음');const unk=ks.filter(k=>!D.materials.includes(k));
  mut(()=>{for(const k of ks)c.owned[k]=(a==='pasteAdd'?(c.owned[k]||0):0)+o[k]},`${ks.length}종 입력${unk.length?' (모르는 이름: '+unk.join(', ')+')':''}`);if(b.dataset.src&&$('#'+b.dataset.src))$('#'+b.dataset.src).value=''}
 if(b.id==='expBtn'){}
});
document.addEventListener('click',e=>{const id=e.target.id;
 if(id==='expBtn'){const bl=new Blob([JSON.stringify(S,null,1)],{type:'application/json'});const a=document.createElement('a');a.href=URL.createObjectURL(bl);a.download='물교도우미_'+new Date().toISOString().slice(0,10)+'.json';a.click()}
 if(id==='impBtn')$('#impFile').click();if(id==='priceBtn')loadPrices()});
document.addEventListener('change',e=>{const t=e.target,a=t.dataset.a,c=C(),v=t.value.replace(/,/g,'');
 if(t.id==='carrier')mut(()=>{S.carrier=+t.value;const k=CARRIERS[S.carrier];if(k.w){S.cw=k.w;S.cs=k.s}});
 if(t.id==='cw')mut(()=>S.cw=+v||0);if(t.id==='cs')mut(()=>S.cs=+v||0);if(t.id==='drate')mut(()=>S.drate=+v||0);
 
 if(t.id==='route')mut(()=>S.route=t.value);
 if(a==='act6')mut(()=>S.active6[t.dataset.p]=+t.value);
 if(a==='done')exchange(G[t.dataset.g],(+t.dataset.off||0)+(+v||0));
 if(a==='qty')mut(()=>S.qty[t.dataset.g]=Math.min(G[t.dataset.g].limit,Math.max(0,+v||0)));
 if(a==='rq')mut(()=>S.qty[t.dataset.g]=Math.min(G[t.dataset.g].limit,Math.max(0,(+t.dataset.o||0)+(+v||0))));
 if(a==='sale')mut(()=>{(S.sale[t.dataset.g]=S.sale[t.dataset.g]||{})[t.dataset.k]=v===''?'':+v});
 if(a==='own')mutMats(()=>c.owned[t.dataset.m]=Math.max(0,+v||0));
 if(a==='price')mut(()=>{if(v==='')delete S.prices[t.dataset.m];else S.prices[t.dataset.m]={p:+v,src:'manual'}});
});
document.addEventListener('keydown',e=>{if(e.key==='Escape'){if(dOpen){dOpen=null;renderDetail()}else setLayer(null)}if(e.key==='Enter'&&document.activeElement?.dataset?.a==='detail'){dOpen=document.activeElement.dataset.r;renderDetail()}if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==='z'&&!/INPUT|TEXTAREA/.test(document.activeElement.tagName)){e.preventDefault();undo()}});

// ---- 교역 시세 · 어디에 팔까: 품목별 시세창 캡처 1장씩 OCR → 누적 → 마을 추천
const TQK='mabiBarter.tq2',TOWNS=['티르 코네일','던바튼','반호르','이멘 마하','탈틴','타라','카브','벨바스트','켈라','필리아','코르','발레스'];
let TQ={};try{TQ=JSON.parse(localStorage.getItem(TQK))||{}}catch(e){}
const tqSave=()=>{try{localStorage.setItem(TQK,JSON.stringify(TQ))}catch(e){}};
function tqRoutes(){return D.routes.filter(x=>x.id!=='sk')}
function tqSel(){const R=tqRoutes();let r=R.find(x=>x.id===TQ._r)||R[0];let n=TQ._n||(UI['flip_'+r.id]?2:1);const pl=plan(r);if(n>pl.runs.length)n=Math.max(1,pl.runs.length);return{r,n,pl,ru:pl.runs[n-1]}}
function tqGoods(){const{ru}=tqSel();return{L:(ru?ru.L:[]).filter(x=>x.q>0),ld:0}}
let TQW=null;function tqWLoad(){if(TQW)return;TQW={e:[],p:{}};const t=Date.now();Promise.all([fetch('../auction/warranty_effects.json?t='+t).then(r=>r.json()),fetch('https://mabi-data.mabilife.workers.dev/auction/warranty_data.json?t='+t).then(r=>r.json()).catch(()=>({rows:[]}))]).then(([f,d])=>{TQW.e=(f.items||[]).filter(x=>x.barter!=null).sort((a,b)=>b.barter-a.barter);for(const r of d.rows||[])if(r.group==='w'&&r.min&&(!TQW.p[r.base]||r.min<TQW.p[r.base]))TQW.p[r.base]=r.min;const b=$('#tqBody');if(b)b.innerHTML=tqBody()}).catch(()=>{TQW=null})}
const tqWSel=()=>TQW&&TQW.e.find(x=>x.name===TQ._w)||null;
const tqU=()=>TQ._u==='g'?'g':'d';
function tqBody(){const{r,n,pl}=tqSel(),{L}=tqGoods(),u=tqU(),dr=+S.drate||0,tot={},cnt={},tc={};
 for(const{g,q}of L){const p=TQ[g.id]||{},uc=unitCost(g);for(const t of TOWNS){const v=+p[t]||0;if(v){tot[t]=(tot[t]||0)+v*q;cnt[t]=(cnt[t]||0)+1;tc[t]=(tc[t]||0)+uc.s*q}}}
 const W=tqWSel(),bPct=W&&W.barter!=null?+W.barter:null,wm=(bPct!=null&&u==='d')?1+bPct/100:1,adj={};for(const t in tot)adj[t]=Math.round(tot[t]*wm);
 const rk=Object.entries(adj).sort((x,y)=>y[1]-x[1]),md=['🥇','🥈','🥉'],gold=v=>u==='g'?v:(dr?v*dr:null);
 const done=L.filter(({g})=>TQ[g.id]&&Object.keys(TQ[g.id]).length).length;
 const T=TOWNS.includes(TQ._t)?TQ._t:(rk[0]?rk[0][0]:TOWNS[0]);
 const chips=`<div class="tqchips"><span class="mut">루트</span>${tqRoutes().map(x=>`<button class="sm${x.id===r.id?'':' ghost'}" data-tqr="${x.id}">${esc(x.name)}</button>`).join('')}<span class="mut" style="margin-left:8px">회차</span>${[1,2].map(k=>`<button class="sm${k===n?'':' ghost'}" data-tqn="${k}"${k>pl.runs.length?' disabled':''}>${k}회차</button>`).join('')}
  <span style="margin-left:auto" class="mut">단위</span><button class="sm${u==='d'?'':' ghost'}" data-tqu="d">두카트</button><button class="sm${u==='g'?'':' ghost'}" data-tqu="g">골드</button>${u==='d'?`<label class="mut">1두카트=<input id="tqRate" class="n" style="width:56px" value="${dr||''}" placeholder="?">G</label>`:''}</div>`;
 const rec=rk.length?`<div class="tqrk">${rk.slice(0,3).map(([t,v],i)=>{const gv=gold(v),pf=gv!=null?gv-tc[t]:null;return `<button class="tqcard${i?'':' b1'}" data-tqt="${esc(t)}">${md[i]} <b>${esc(t)}</b> <span class="mut">${cnt[t]}/${L.length}</span><br>${fmt(v)}${u==='g'?'G':'두카트'}${W?` <small class="mut">(기본 ${fmt(tot[t])})</small>`:''}${pf!=null?` · <b class="${pf>=0?'pos':'neg'}">${pf>=0?'+':''}${gk(pf)}</b>`:''}</button>`}).join('')}</div>`:'<div class="mut" style="margin:6px 0">교역품 시세창을 하나씩 캡처해 올리면, 담긴 품목 기준으로 가장 많이 받는 마을을 추천해 드려요.</div>';
 const wsel=`<div class="tqchips"><span class="mut">🧾 보증서</span><select id="tqW"><option value="">사용 안 함 (+0%)</option>${TQW&&TQW.e.length?TQW.e.map(x=>`<option value="${esc(x.name)}"${W&&W.name===x.name?' selected':''}>${esc(x.name)} · 물교 교역품 판매 +${x.barter}%${TQW.p[x.name]?` · 참고 ${gk(TQW.p[x.name])}G`:''}</option>`).join(''):(TQ._w?`<option selected>${esc(TQ._w)} (불러오는 중)</option>`:'')}</select>${W?`<b class="pos">${esc(W.name)} 물교 판매 +${W.barter}% 적용</b>${u==='g'?` <span class="mut">(골드 단위·골드 차익에는 미적용)</span>`:''}`:'<span class="mut">물교 교역품 두카트 판매액 기준 · 골드 제외</span>'}</div>`;
 const prog=L.length?`<div style="margin:4px 0;font-size:14px">📋 시세 담은 품목 <b>${done}/${L.length}</b>${done<L.length?` <span class="mut">— 남은 품목: ${L.filter(({g})=>!TQ[g.id]).map(({g})=>esc(g.name)).join(', ')}</span>`:' <b class="pos">· 전부 입력 완료! 🥇 마을이 가장 효율적이에요</b>'}</div>`:'';
 const towns=`<div class="tqchips">${TOWNS.map(t=>`<button class="sm${t===T?'':' ghost'}${tot[t]?' has':''}" data-tqt="${t}">${t}${tot[t]?` <small>${gk(adj[t])}</small>`:''}</button>`).join('')}</div>`;
 const rows=L.map(({g,q})=>{const p=TQ[g.id]||{},vals=TOWNS.map(t=>+p[t]||0),mx=Math.max(...vals),v=+p[T]||0;return `<div class="tqrow"><span class="nm">${iconHtml(g.name)}<span class="mut">${esc(g.post)} T${g.tier}</span> ${esc(g.name)} <b>×${q}</b></span><input class="n tqc${v&&v===mx?' best':''}" inputmode="numeric" data-g="${g.id}" data-t="${T}" value="${v?fmt(v):''}" placeholder="${esc(T)}"><span class="r">${v?fmt(v*q):''}</span><span>${mx?`<span class="mut">최고 ${esc(TOWNS[vals.indexOf(mx)])}</span> <button class="sm ghost" data-tqa="${g.id}" data-v="${mx}">적용</button>`:''}</span></div>`}).join('');
 return (done?'<i class="tqHas" hidden></i>':'')+chips+prog+wsel+rec+towns+(L.length?`<div class="tqlist">${rows}</div>${rk.length?`<div style="text-align:right;margin-top:6px"><button class="sm" data-tqall="${esc(rk[0][0])}">🥇 ${esc(rk[0][0])} 시세 일괄 적용…</button></div>`:''}`:`<div class="mut" style="margin:8px 0">${esc(r.name)} ${n}회차에 실을 교역품이 없어요.</div>`)}

let TQO=null;
function tqLoadT(){return window.Tesseract?Promise.resolve():new Promise((ok,no)=>{const sc=document.createElement('script');sc.src='https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js';sc.onload=ok;sc.onerror=no;document.head.appendChild(sc)})}
const tqN=x=>x.replace(/[^가-힣A-Za-z0-9]/g,'');
function tqLev(a,b){const m=a.length,n=b.length,d=Array.from({length:m+1},(_,i)=>[i]);for(let j=1;j<=n;j++)d[0][j]=j;for(let i=1;i<=m;i++)for(let j=1;j<=n;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));return d[m][n]}
function tqFind(t,k){if(t.includes(k))return true;if(k.length<3)return false;for(let i=0;i+k.length<=t.length;i++)if(tqLev(t.substr(i,k.length),k)<=Math.floor(k.length/4))return true;return false}
// 시세창 1장 = 교역품 1종의 마을별 시세. 품목명 + (마을명, 숫자) 줄을 뽑아 확인 후 누적
// 시세창 숫자: 게임 비트맵 글꼴(흰 글자+검은 테두리) 템플릿 매칭 → 실패 시 Tesseract 보조
const TQ_TPL={"0":[7,"vvvvvvvsj749opa9qyl995uh4hu54y4j5y44z4q4z34z4q4z33z4q4z54z4i4z64th5hs5datzq8eue558jpvvvuuuu"],"1":[5,"vvvvo449vhaz7vdtz7v9az7vc4z7vd4z7ve4z7ui4z7up4z7uk4z7um949uquuuuu"],"2":[7,"uuuuuuutf449pqgcuyl9j6p99ydaa7h7yichuu5y9fju7iq5nlh9y9hnm8qc9up6qq449gazzzzm7844449luuuuuuu"],"3":[7,"uuuuuuu94449up3yzyl9j7449tg7puu9zm6p94apain7zzt5il94atm8muucyq87559ui69zzyicj95558upuuuuuuu"],"4":[7,"vvvvvvvtvv949rpvedz4nmu4tz4lncgtz4oj9t4z4p7md4z4o8t44z48azzzzze6544z45ruu4z4muuu948ouuuuuuu"],"5":[7,"vvvvvvvf55558k4tzzzl43te558a5td48mi6tyyl8db748ql5ivvjdy5iuueeu66449uh74yzyk9f94449lmuuuuuuu"],"6":[7,"uuuuuuuu9447is9gzzq7kgzb47igzd47iuizlzq9iizh4lq7iz4n9z4jy4n9y4lth4lq7g8uyq9jke447iuquuuuuuu"],"7":[7,"vvvvvvv944447gazzzzq56444qh8mvq9z9jpv9iq8nrv5zdhmnm9z4unn9lq7uon4ydhuiqdy4uumu949uupuuuuuuu"],"8":[7,"vvvvvvvse555jr79uyq9f3yh5hy57y9edy93ql9hq599yyu6a7yh9hy8ct5i8z98zd5iy37dtyt89tf557isuuuuuuu"],"9":[7,"uuuuuuurg858gk69qyq8d3yd5dy39y5i5z38y5i9z34yd5dz369uyqz5je44hq8644dy984zzud8e9444guhuuuuuuu"],"만":[11,"c20002e46mv2uzzzs2nl6t0zc0ex0nl6n0xceex0nl6h0zceex0nl040zc0ex0nzz02szzzs2nl06c200024nl6uu2sgau4nl6uu2sgauk46miu2sg000006iu4nzzzzzz0iui40000006u"]},TQ_TH=13;
function tqImgData(fl,f){return new Promise((ok,no)=>{const u=URL.createObjectURL(fl),im=new Image();im.onload=()=>{const c=document.createElement('canvas');c.width=Math.round(im.width*(f||1));c.height=Math.round(im.height*(f||1));const x=c.getContext('2d');x.imageSmoothingQuality='high';x.drawImage(im,0,0,c.width,c.height);URL.revokeObjectURL(u);ok({c,A:x.getImageData(0,0,c.width,c.height).data,W:c.width,H:c.height})};im.onerror=no;im.src=u})}
function tqDigits(A,W,H){const L=(x,y)=>{if(x<0||y<0||x>=W||y>=H)return 0.9;const i=(y*W+x)*4;return(A[i]+A[i+1]+A[i+2])/765};
 const wh=(x,y)=>{const i=(y*W+x)*4;return Math.min(A[i],A[i+1],A[i+2])>=222},dk=(x,y)=>L(x,y)<0.5;
 const m=new Uint8Array(W*H);for(let y=1;y<H-1;y++)for(let x=1;x<W-1;x++)if(wh(x,y)&&(dk(x-1,y)||dk(x+1,y)||dk(x,y-1)||dk(x,y+1)))m[y*W+x]=1;
 const ch=new Float32Array(W);for(let y=0;y<H;y++)for(let x=0;x<W;x++)ch[x]+=m[y*W+x];
 const WW=50;let best=[-1,0];for(let a=0;a+WW<W;a+=2){let s=0;for(let x=a;x<a+WW;x++)s+=ch[x];if(s>best[0])best=[s,a]}
 const a=best[1],xs=Math.max(0,a-25),xe=Math.min(W,a+WW+25),T={};for(const k in TQ_TPL){const[w,s]=TQ_TPL[k];T[k]={w,t:[...s].map(c=>parseInt(c,36)/35)}}
 const rb=[];let s=-1,g=0;for(let y=0;y<H;y++){let c=0;for(let x=a;x<a+WW;x++)c+=m[y*W+x];if(c>0){if(s<0)s=y;g=y}else if(s>=0&&y-g>2){if(g-s>=5)rb.push([s,g]);s=-1}}
 const out=[];for(const[y0,y1]of rb){let R=-1;for(let y=y0;y<=y1;y++)for(let x=xs;x<xe;x++)if(m[y*W+x])R=Math.max(R,x);if(R<0)continue;
  const col=x=>{for(let y=y0;y<=y1;y++)if(dk(x,y))return true;return false};while(R+1<W&&col(R+1))R++;
  let cy=Math.round((y0+y1)/2),r=R+1,str='';for(let k=0;k<9;k++){let bs=[1e9];for(const c in T){const{w,t}=T[c];for(let dx=-3;dx<=3;dx++)for(let dy=-2;dy<=2;dy++){const rr=r-1+dx;let e=0;for(let y=0;y<TQ_TH;y++)for(let x=0;x<w;x++)e+=(L(rr-w+1+x,cy+dy-6+y)-t[y*w+x])**2;e/=w*TQ_TH;if(e<bs[0])bs=[e,c,rr,cy+dy]}}
   if(bs[0]>0.045)break;str=bs[1]+str;r=bs[2]-T[bs[1]].w+2;cy=bs[3];if(r<xs)break}
  out.push({y:Math.round((y0+y1)/2),str,price:str?tqPrice(str):null})}return out}
// "1만1683" / "만 53" / "4454" / OCR 잡음(시즌 두카트, 루카트…) → 숫자. 만이 없으면 1만을 붙이지 않음
function tqPrice(l){let s=String(l).replace(/[시사]\s*[즌존준].*$/,'').replace(/[두루주투무]\s*[카키가]\s*[트드토].*$/,'');
 s=s.replace(/[Oo]/g,'0').replace(/[Il|]/g,'1').replace(/(\d)[,.](\d)/g,'$1$2');
 const m=s.match(/(\d{0,2})\s*[만민많말]\s*(\d{1,4})?/);if(m&&(m[1]||m[2])){const v=(m[1]?+m[1]:1)*10000+(m[2]?+m[2]:0);return v>=1000&&v<=999999?v:null}
 const ns=(s.match(/\d{4,5}/g)||[]).map(Number).filter(v=>v>=1000&&v<=99999);return ns.length?ns[ns.length-1]:null}
const TQ_AL=[['티르코네일',0],['코네일',0],['코네밀',0],['코네',0],['티르',0],['던바튼',1],['바튼',1],['던바',1],['반호르',2],['호르',2],['이멘마하',3],['멘마하',3],['이멘',3],['마하',3],['탈틴',4],['탈딘',4],['타라',5],['카브',6],['벨바스트',7],['바스트',7],['벨바',7],['켈라',8],['렐라',8],['필리아',9],['리아',9],['필리',9],['코르',10],['발레스',11],['발리스',11],['레스',11]].sort((a,b)=>b[0].length-a[0].length);
function tqTown(l){const t=tqN(String(l).replace(/\d.*$/,''));if(!t)return null;for(const[k,i]of TQ_AL)if(t.includes(k))return TOWNS[i];
 for(const[k,i]of TQ_AL)if(k.length>=3)for(let j=0;j+k.length<=t.length;j++)if(tqLev(t.substr(j,k.length),k)<=1)return TOWNS[i];return null}
function tqPrepCanvas(src,f,thr){const c=document.createElement('canvas');c.width=Math.round(src.width*f);c.height=Math.round(src.height*f);const x=c.getContext('2d');x.imageSmoothingQuality='high';x.drawImage(src,0,0,c.width,c.height);
 const d=x.getImageData(0,0,c.width,c.height),A=d.data;for(let i=0;i<A.length;i+=4){let v=0.3*A[i]+0.59*A[i+1]+0.11*A[i+2];v=thr?(v<thr?0:255):Math.max(0,Math.min(255,(v-128)*1.6+128));A[i]=A[i+1]=A[i+2]=v}x.putImageData(d,0,0);return c}
async function tqOcr(fl){const st=$('#tqOcr');try{
 let I=await tqImgData(fl),rows=tqDigits(I.A,I.W,I.H),ok=rows.filter(r=>r.price).length;
 if(ok<10){const ys=rows.map(r=>r.y),d=[];for(let i=1;i<ys.length;i++)d.push(ys[i]-ys[i-1]);d.sort((a,b)=>a-b);const p=d[d.length>>1]||16;
  for(const f of[...new Set([16/p,0.5,2/3,0.8,1.25,1.5,2])]){if(!(f>0.3&&f<3)||Math.abs(f-1)<0.05)continue;const J=await tqImgData(fl,f),r2=tqDigits(J.A,J.W,J.H),o2=r2.filter(r=>r.price).length;if(o2>ok){ok=o2;rows=r2;I=J}if(ok>=10)break}}
 const pr={},pl=rows.filter(r=>r.price);let how='';
 if(pl.length>=12){pl.slice(-12).forEach((r,i)=>pr[TOWNS[i]]=r.price);how='숫자 '+12+'줄'}
 await tqLoadT();const{data}=await Tesseract.recognize(tqPrepCanvas(I.c,2.5,0),'kor+eng');const lines=(data.lines||[]).map(l=>({t:l.text.trim(),y:(l.bbox.y0+l.bbox.y1)/5}));const tl=lines.length?lines.map(l=>l.t):data.text.split(/\n/).map(l=>l.trim());
 if(pl.length<12){// 마을 이름 줄 y와 숫자 줄 y 매칭 → 남은 칸은 순서대로
  for(const l of lines){const tw=tqTown(l.t);if(!tw||pr[tw])continue;let b=null;for(const r of pl)if(Math.abs(r.y-l.y)<7&&(!b||Math.abs(r.y-l.y)<Math.abs(b.y-l.y)))b=r;const v=b?b.price:tqPrice(l.t.replace(/^[^\d만]*/,''));if(v)pr[tw]=v}
  if(pl.length>=10&&Object.keys(pr).length<pl.length){const sh={};pl.forEach((r,i)=>{for(const t in pr)if(pr[t]===r.price){const k=TOWNS.indexOf(t)-i;sh[k]=(sh[k]||0)+1}});const o=+(Object.entries(sh).sort((a,b)=>b[1]-a[1])[0]||[0])[0];pl.forEach((r,i)=>{const t=TOWNS[i+o];if(t&&!pr[t])pr[t]=r.price})}
  how=pl.length?'숫자 '+pl.length+'줄 + 글자 인식':'글자 인식'}
 const rg=new Set(tqGoods().L.map(x=>x.g.id)),gs=[...D.goods].sort((x,y)=>(rg.has(y.id)-rg.has(x.id))||(y.name.length-x.name.length));let gid=null;
 for(const l of tl){const t=tqN(l);if(t.length<2)continue;const g=gs.find(g=>tqFind(t,tqN(g.name)));if(g){gid=g.id;break}}
 TQO={gid:gid||(TQ._last&&tqGoods().L.find(x=>!TQ[x.g.id])||{g:{}}).g.id||null,pr,how,raw:tl.filter(Boolean).join(' / ')+(pl.length?' ‖ 숫자: '+pl.map(r=>r.str).join(', '):'')};tqOcrShow()}catch(e){if(st)st.innerHTML='⚠ 자동 인식 실패 — 아래 표에 직접 입력해도 돼요. ('+esc(String(e.message||e))+')'}}
function tqOcrShow(){const st=$('#tqOcr');if(!st||!TQO)return;const{gid,pr}=TQO,L=tqGoods().L,opts=[...L.map(x=>x.g),...D.goods.filter(g=>!L.some(x=>x.g.id===g.id))];
 st.innerHTML=`<div style="border:1px solid #4a3b6b;border-radius:8px;padding:8px;margin-top:4px;color:inherit;text-align:left"><b>🔎 인식 결과</b> — 품목과 숫자를 확인하고 담아 주세요<div style="margin:6px 0">품목 <select id="tqoG">${opts.map(g=>`<option value="${g.id}"${g.id===gid?' selected':''}>${esc(g.name)}${TQ[g.id]?' ✓':''}</option>`).join('')}</select></div>
 <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:4px">${TOWNS.map(t=>`<label style="white-space:nowrap">${esc(t)} <input class="n tqop" data-t="${esc(t)}" inputmode="numeric" style="width:70px" value="${pr[t]?pr[t]:''}"></label>`).join('')}</div>
 <div style="margin-top:6px"><button class="sm" data-tqocr="1">✅ 이 품목 시세 담기</button> <span class="mut">${Object.keys(pr).length}/12개 마을 시세 인식${TQO.how?' ('+esc(TQO.how)+')':''}</span></div><details style="margin-top:4px"><summary class="mut">인식 원문</summary><div class="mut" style="font-size:12.5px;max-height:90px;overflow:auto">${esc(TQO.raw)}</div></details></div>`}
// ---- 재고체크: 인벤토리 캡처 → 아이콘 매칭 + 수량 숫자 인식, 확인 후 적용
// INV_S=24: 슬롯 피치(~24px)에 맞춘 매칭 해상도. 고해상도에선 서브픽셀 어긋남으로 평균차가 약간 커져 컷오프 24→26 (sure<=20 유지)
const INV_LS='mabiBarter.invIconLearn.v1',INV_S=24;let INV_T=null,INV_TS=0;
const INV_DG={'.#.##..#..#.###':1,'####.##.##.####':0,'###..#####..###':2,'###..####..####':3,'..#.###.####..#':4,'####..###..####':5,'####..####.####':6,'####.#..#..#..#':7,'####.#####.####':8,'####.####..####':9};
function invLearnGet(){try{return JSON.parse(localStorage.getItem(INV_LS)||'[]')}catch(e){return[]}}
function invLearn(sig,cw,ch,n){if(!sig)return;const a=invLearnGet().filter(x=>!(x.cw===cw&&x.ch===ch&&invSigD(x.s,sig)<=0.6));a.push({s:sig,cw,ch,n});while(a.length>400)a.shift();localStorage.setItem(INV_LS,JSON.stringify(a))}
function invSigD(a,b){let d=0;for(let i=0;i<64;i++)d+=Math.abs(parseInt(a[i],16)-parseInt(b[i],16));return d/64}
function invCv(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;return c}
function invImgLoad(src){return new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=no;i.src=src})}
async function invTemplates(st){if(INV_T&&INV_TS===INV_S)return INV_T;const T=[];const ns=D.materials.filter(m=>ICONS[m]);let k=0;
 await Promise.all(ns.map(async nm=>{const i=ICONS[nm];let im;try{im=await invImgLoad(`/assets/icons/orig/${i.id}.png`)}catch(e){return}
  const fps=typeof i.id==='number'?[[Math.max(1,Math.round(i.w/24)),Math.max(1,Math.round(i.h/24))]]:[[1,1],[2,2],[1,2],[2,1]];
  for(const[cw,ch]of fps){const c=invCv(INV_S*cw,INV_S*ch),x=c.getContext('2d');x.drawImage(im,0,0,c.width,c.height);T.push({nm,cw,ch,d:x.getImageData(0,0,c.width,c.height).data})}
  if(st)st(`아이콘 불러오는 중… ${++k}/${ns.length}`)}));INV_TS=INV_S;return INV_T=T}
// 빈 칸이 없어도: 칸 사이 밝은 파란 격자선(gutter)으로 칸 위치 찾기. 가방 창이 여러 개면 창마다 따로.
function invGutterGrid(A,W,H,ec){
 const L=p=>A[p*4]+A[p*4+1]+A[p*4+2],bl=p=>{const i=p*4,r=A[i],g=A[i+1],b=A[i+2];return g>r+25&&b>r+35&&b>g-15};
 const lineX=(p,x)=>x>0&&x<W-1&&bl(p)&&L(p)>L(p-1)+30&&L(p)>L(p+1)+30,lineY=(p,y)=>y>0&&y<H-1&&bl(p)&&L(p)>L(p-W)+30&&L(p)>L(p+W)+30;
 const peaks=(prof,thr)=>{const o=[];for(let i=0;i<prof.length;i++)if(prof[i]>=thr&&prof[i]>=(prof[i-1]||0)&&prof[i]>(prof[i+1]||0))o.push(i);return o};
 const runs=(ls,P)=>{const R=[];let c=[];for(const x of ls){const l=c[c.length-1],d=x-l,k=Math.round(d/P);if(c.length&&k>=1&&k<=3&&Math.abs(d-k*P)<=k){for(let i=1;i<k;i++)c.push(l+Math.round(d*i/k));c.push(x)}else if(!c.length||d>P+1){if(c.length>=2)R.push(c);c=[x]}}if(c.length>=2)R.push(c);return R};
 const vc=(xs,y0)=>{let s=0;for(const x of xs)for(let y=y0;y<y0+P-1;y++)s+=y>=0&&y<H&&lineX(y*W+x,x);return s/(xs.length*(P-1))},hc=(ys,x0)=>{let s=0;for(const y of ys)for(let x=x0;x<x0+P-1;x++)s+=x>=0&&x<W&&lineY(y*W+x,y);return s/(ys.length*(P-1))};
 const near=(p)=>{const i=p*4;return Math.abs(A[i]-ec[0])<20&&Math.abs(A[i+1]-ec[1])<20&&Math.abs(A[i+2]-ec[2])<20};
 const bgFrac=(x0,y0,w,h)=>{if(x0<0||y0<0||x0+w>W||y0+h>H)return 0;let s=0;for(let y=y0;y<y0+h;y++)for(let x=x0;x<x0+w;x++)s+=near(y*W+x);return s/(w*h)};
 const cx=new Float32Array(W);for(let y=0;y<H;y++)for(let x=1;x<W-1;x++)if(lineX(y*W+x,x))cx[x]++;
 const lx=peaks(cx,Math.max(6,H*0.12));const dd={};for(let i=1;i<lx.length;i++){const d=lx[i]-lx[i-1];if(d>=12&&d<=90)for(const e of[d-1,d,d+1])dd[e]=(dd[e]||0)+(e===d?2:1)}
 const top=Object.entries(dd).sort((a,b)=>b[1]-a[1])[0];if(!top)return null;const P=+top[0],out=[];
 const XR=runs(lx,P);let prevEnd=0;for(const xr of XR){const xa=xr[0],xb=xr[xr.length-1],cy=new Float32Array(H);
  for(let y=1;y<H-1;y++)for(let x=xa;x<=xb;x++)if(lineY(y*W+x,y))cy[y]++;
  const ly=peaks(cy,Math.max(6,(xb-xa)*0.15)),yrs=runs(ly,P);if(!yrs.length)continue;
  const xs=[...xr];// 바깥쪽 한 줄씩은 테두리 선이 달라서 안 잡힘 → 칸 배경이 보이면 한 칸 확장
  const k=XR.indexOf(xr),lo=Math.max(prevEnd+4,k>0?XR[k-1][XR[k-1].length-1]+P+4:0),hi=k+1<XR.length?XR[k+1][0]-P-4:W;
  for(const yr of yrs){const ys=[...yr],X=[...xs];
   const th=Math.max(0.08,0.4*bgFrac(X[0]+1,ys[0]+1,X[X.length-1]-X[0]-1,ys[ys.length-1]-ys[0]-1));
   for(let n=0;n<2;n++){const ya=ys[0],yb=ys[ys.length-1],hh=yb-ya,xw=X[X.length-1]-X[0];
    if(X[0]-P>=lo&&(bgFrac(X[0]-P+1,ya,P-1,hh)>th||hc(ys,X[0]-P+1)>0.4))X.unshift(X[0]-P);
    if(X[X.length-1]+P<=hi&&(bgFrac(X[X.length-1]+1,ya,P-1,hh)>th||hc(ys,X[X.length-1]+1)>0.4))X.push(X[X.length-1]+P);
    if(ya-P>=-1&&(bgFrac(X[0]+1,ya-P+1,xw,P-1)>th||vc(X.slice(1,-1),ya-P+1)>0.4))ys.unshift(ya-P);
    if(yb+P<=H&&(bgFrac(X[0]+1,yb+1,xw,P-1)>th||vc(X.slice(1,-1),yb+1)>0.4))ys.push(yb+P)}
   const cells=[];for(let j=0;j+1<ys.length;j++)for(let i=0;i+1<X.length;i++){const x=X[i]+1,y=ys[j]+1;if(x>=0&&y>=0&&x+P-1<=W&&y+P-1<=H)cells.push([x,y])}
   if(cells.length>=4){prevEnd=Math.max(prevEnd,X[X.length-1]);out.push({x:X[0],y:ys[0],cols:X.length-1,rows:ys.length-1,cells})}}}
 return out.length?{P,bags:out}:null}
async function invRecognize(file,st,alive){
 const bm=await invImgLoad(URL.createObjectURL(file)),W=bm.naturalWidth,H=bm.naturalHeight,cv=invCv(W,H),cx=cv.getContext('2d');cx.drawImage(bm,0,0);const A=cx.getImageData(0,0,W,H).data;
 const T=await invTemplates(st);if(!alive())return null;st('칸 찾는 중…');
 // 빈 칸 색 = 가장 흔한 파란 계열 색
 const hist={};for(let i=0;i<A.length;i+=16){const r=A[i],g=A[i+1],b=A[i+2];if(b>g-10&&g>r+30&&b>r+40){const k=(r>>2)+','+(g>>2)+','+(b>>2);hist[k]=(hist[k]||0)+1}}
 const top=Object.entries(hist).sort((a,b)=>b[1]-a[1])[0];if(!top)return{items:[],why:'인벤토리 칸(파란 격자)을 못 찾았어요'};const ec=top[0].split(',').map(v=>v*4+2);
 const E=new Uint8Array(W*H);for(let p=0;p<W*H;p++){const i=p*4;if(Math.abs(A[i]-ec[0])<8&&Math.abs(A[i+1]-ec[1])<8&&Math.abs(A[i+2]-ec[2])<8)E[p]=1}
 // 빈 칸 = 정사각 연결 영역
 const seen=new Uint8Array(W*H),cells=[];
 for(let p=0;p<W*H;p++){if(!E[p]||seen[p])continue;let x0=1e9,y0=1e9,x1=-1,y1=-1,cnt=0;const q=[p];seen[p]=1;
  while(q.length){const c=q.pop(),x=c%W,y=(c-x)/W;cnt++;if(x<x0)x0=x;if(x>x1)x1=x;if(y<y0)y0=y;if(y>y1)y1=y;for(const n of[c-1,c+1,c-W,c+W]){if(n>=0&&n<W*H&&E[n]&&!seen[n]&&Math.abs(n%W-x)<=1){seen[n]=1;q.push(n)}}}
  const w=x1-x0+1,h=y1-y0+1;if(w>=10&&w<=90&&Math.abs(w-h)<=2&&cnt>w*h*0.8)cells.push([x0,y0,w])}
 // 빈 칸이 3개 이상이면 빈 칸 간격으로, 아니면(꽉 찬 가방) 칸 사이 격자선으로 찾기
 const key=(x,y)=>x+','+y,grid=new Set();let P,IN,K,empty;
 if(cells.length>=3){
 const dx={};for(const a of cells)for(const b of cells){const d=b[0]-a[0];if(Math.abs(b[1]-a[1])<=1&&d>0&&d<120)dx[d]=(dx[d]||0)+1}
 P=+Object.entries(dx).sort((a,b)=>b[1]-a[1])[0][0];IN=Math.round(P*20/24);K=P/24;
 const par=cells.map((_,i)=>i),f=i=>{while(par[i]!==i)i=par[i]=par[par[i]];return i},m=d=>{const r=((d%P)+P)%P;return Math.min(r,P-r)<=1};
 cells.forEach((a,i)=>cells.forEach((b,j)=>{if(m(b[0]-a[0])&&m(b[1]-a[1])&&Math.abs(b[0]-a[0])<=3*P&&Math.abs(b[1]-a[1])<=3*P)par[f(i)]=f(j)}));
 const G={};cells.forEach((c,i)=>(G[f(i)]=G[f(i)]||[]).push(c));
 empty=new Set(cells.map(c=>key(c[0],c[1])));
 for(const g of Object.values(G)){if(g.length<3)continue;const xs=g.map(c=>c[0]),ys=g.map(c=>c[1]);
  for(let x=Math.min(...xs)-2*P;x<=Math.max(...xs)+2*P;x+=P)for(let y=Math.min(...ys)-2*P;y<=Math.max(...ys)+2*P;y+=P)if(x>=0&&y>=0&&x+IN<=W&&y+IN<=H)grid.add(key(x,y))}
 }
 if(!grid.size){const GG=invGutterGrid(A,W,H,ec);if(!GG)return{items:[],why:'칸 격자를 못 찾았어요 — 가방 창이 다른 UI에 가리지 않게, 가방 창 전체가 보이도록 캡처해 주세요(가방 하나만 크게 찍으면 더 잘 돼요)'};
  P=GG.P;IN=Math.round(P*20/24);K=P/24;empty=new Set();for(const b of GG.bags)for(const[x,y]of b.cells)grid.add(key(x,y))}
 const snap=(x,y)=>{if(grid.has(key(x,y)))return key(x,y);for(const[a,b]of[[1,0],[-1,0],[0,1],[0,-1]])if(grid.has(key(x+a,y+b)))return key(x+a,y+b);return null};
 const isOcc=(x,y)=>{const k=snap(x,y);if(!k||empty.has(k))return false;[x,y]=k.split(',').map(Number);let s=0;for(let j=0;j<IN;j++)for(let i=0;i<IN;i++)s+=E[(y+j)*W+x+i];return s<IN*IN*0.6};
 const occ=[...grid].map(k=>k.split(',').map(Number)).filter(([x,y])=>isOcc(x,y));
 const crop=(x,y,w,h,ow,oh)=>{const c=invCv(ow,oh),t=c.getContext('2d');t.drawImage(cv,x,y,w,h,0,0,ow,oh);return t.getImageData(0,0,ow,oh).data};
 const sigOf=(x,y,cw,ch)=>{const d=crop(x,y,P*cw-(P-IN),P*ch-(P-IN),8,8);let s='';for(let i=0;i<64;i++){const v=(d[i*4]+d[i*4+1]+d[i*4+2])/3;s+=Math.min(15,v>>4).toString(16)}return s};
 const LR=invLearnGet(),cand=[];let n=0;
 for(const[x,y]of occ){if(!alive())return null;if(++n%15===0){st(`아이콘 비교 중… ${n}/${occ.length}`);await new Promise(r=>setTimeout(r,0))}
  const fits=(cw,ch)=>{for(let i=0;i<cw;i++)for(let j=0;j<ch;j++)if(!isOcc(x+i*P,y+j*P))return false;return true};const cc={};
  for(const l of LR){if(!fits(l.cw,l.ch))continue;const sg=sigOf(x,y,l.cw,l.ch),dd=invSigD(sg,l.s);if(dd<=1.0)cand.push({d:dd,x,y,nm:l.n,cw:l.cw,ch:l.ch,lr:1})}
  for(const t of T){if(!fits(t.cw,t.ch))continue;const fk=t.cw+'x'+t.ch,w=INV_S*t.cw,h=INV_S*t.ch,c=cc[fk]||(cc[fk]=crop(x,y,P*t.cw-(P-IN),P*t.ch-(P-IN),w,h));
   let s=0,ws=0;for(let j=0;j<h;j++)for(let i=0;i<w;i++){if(j<INV_S/2&&i<INV_S*0.8)continue;const o=(j*w+i)*4,al=t.d[o+3]/255;if(al<0.05)continue;s+=al*(Math.abs(c[o]-t.d[o])+Math.abs(c[o+1]-t.d[o+1])+Math.abs(c[o+2]-t.d[o+2]))/3;ws+=al}
   if(ws<w*h*0.15)continue;cand.push({d:s/ws,x,y,nm:t.nm,cw:t.cw,ch:t.ch})}}
 cand.sort((a,b)=>a.d-b.d);const used=new Set(),hits=[];
 for(const c of cand){if(!c.lr&&c.d>26)break;const ks=[];for(let i=0;i<c.cw;i++)for(let j=0;j<c.ch;j++)ks.push(key(c.x+i*P,c.y+j*P));if(ks.some(k=>used.has(k)))continue;ks.forEach(k=>used.add(k));
  c.q=invQty(cx,c.x,c.y,K);c.sig=sigOf(c.x,c.y,c.cw,c.ch);c.sure=c.lr||c.d<=20;hits.push(c)}
 return{items:hits,why:hits.length?'':occ.length?`칸 ${occ.length}개는 찾았지만 아는 재료 아이콘이 없어요(재료가 아닌 물건이거나 다른 UI에 가려졌을 수 있어요)`:'칸은 찾았지만 찬 칸이 없어요 — 재료가 든 칸이 보이게 캡처해 주세요'}}
function invQty(cx,x,y,K){const w=Math.round(20*K),h=Math.round(8*K),X=Math.round(x-2*K),Y=Math.round(y-2*K);if(X<0||Y<0)return 1;
 let d;if(Math.abs(K-1)<0.05)d=cx.getImageData(X,Y,20,8).data;else{const c=invCv(20,8),t=c.getContext('2d');t.imageSmoothingEnabled=false;t.drawImage(cx.canvas,X,Y,w,h,0,0,20,8);d=t.getImageData(0,0,20,8).data}
 const M=(i,j)=>{const o=(j*20+i)*4,r=d[o],g=d[o+1],b=d[o+2];return Math.min(r,g,b)>170||(r>200&&g>170&&b<140)};
 let y0=-1,x0=-1;for(let j=0;j<4&&y0<0;j++)for(let i=0;i<5;i++)if(M(i,j)){y0=j;break}if(y0<0)return 1;
 for(let i=0;i<5&&x0<0;i++)for(let j=y0;j<y0+5;j++)if(M(i,j)){x0=i;break}if(x0<0)return 1;
 let s='';for(let gx=x0;gx+3<=20;gx+=4){let p='';for(let j=0;j<5;j++)for(let i=0;i<3;i++)p+=M(gx+i,y0+j)?'#':'.';
  let best=null,bd=9;for(const k in INV_DG){let e=0;for(let q=0;q<15;q++)if(k[q]!==p[q])e++;if(e<bd){bd=e;best=INV_DG[k]}}if(bd>1)break;s+=best}
 return s?+s:1}
function invOpen(){let el=$('#invPop');if(!el){el=document.createElement('div');el.id='invPop';document.body.appendChild(el)}let run=0;
 el.innerHTML=`<div id="invMask" style="position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:59"></div><div class="pop" style="position:fixed;top:50%;left:50%;right:auto;transform:translate(-50%,-50%);width:min(520px,94vw);max-height:88vh;overflow:auto;z-index:60">
 <div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><h3 style="margin:0">📦 재고체크 </h3><button class="sm ghost" id="invX">✕</button></div>
 <div class="mut" style="font-size:13px;margin-top:4px">인벤토리 캡처를 넣으면 <b>아이콘</b>으로 재료를 찾고 칸 왼쪽 위 숫자로 수량을 읽어요. 이름이 틀리면 바꿔 주세요 — 다음부터 그 아이콘을 기억해요. 보유 수량엔 <b>확인 후</b> 적용.<br>💡 가방 창 전체가 다른 UI에 가리지 않게 찍어 주세요. 여러 가방을 한 번에 찍어도 되지만, 안 잡히면 가방 하나씩 크게 캡처하면 더 잘 돼요.</div>
 <style>.smp{pointer-events:none;margin-top:6px}.smp img{max-width:100%;max-height:200px;opacity:.85;border-radius:6px}.smp div{font-size:12px;color:#999}#invImg:not(:empty)~.smp,#invPop:has(#invList:not(:empty)) .smp,#tqImg:not(:empty)~.smp,#tqPop:has(.tqHas) .smp{display:none}</style><div id="invDrop" style="margin:6px 0;border:1px dashed #555;border-radius:8px;padding:8px;text-align:center;font-size:13px;cursor:pointer">📷 <b>인벤토리(가방)</b> 캡처를 <b>Ctrl+V</b> 또는 클릭해서 올리기<input type="file" id="invFile" accept="image/*" hidden><div id="invImg"></div><div class="smp"><div>예시 · 이런 가방 화면을 올려 주세요</div><img src="sample-inv.png?v=1" alt="인벤토리 캡처 예시"></div></div>
 <div style="display:flex;gap:4px;margin:4px 0"><input id="invNm" list="invDl" placeholder="재료 이름 (수동 추가)" style="flex:1;min-width:0"><datalist id="invDl">${D.materials.map(m=>`<option value="${esc(m)}">`).join('')}</datalist><input id="invQ" inputmode="numeric" placeholder="수량" style="width:70px"><button class="sm" id="invAdd">추가</button></div>
 <div id="invList" style="max-height:260px;overflow:auto"></div>
 <div style="display:flex;justify-content:flex-end;gap:6px;margin-top:6px"><button class="sm" id="invOk">확인 후 적용</button></div></div>`;
 let R=[];const opts=n=>D.materials.map(m=>`<option${m===n?' selected':''}>${esc(m)}</option>`).join('');
 const draw=()=>{$('#invList').innerHTML=R.length?R.map((r,i)=>`<div style="display:flex;align-items:center;gap:6px;font-size:14px;margin:2px 0"><input type="checkbox" class="invc" data-i="${i}" ${r.ck?'checked':''}>${iconHtml(r.n)}<select class="invs" data-i="${i}" style="flex:1;min-width:0">${opts(r.n)}</select>${r.sure===false?'<span title="확신 낮음" style="color:#e9b44c">?</span>':''}<span class="mut" style="font-size:12px;white-space:nowrap">현재 ${C().owned[r.n]||0} →</span><input class="invq" data-i="${i}" value="${r.q}" style="width:64px"></div>`).join(''):'<div class="mut" style="font-size:13px">아직 항목 없음</div>'};draw();
 el.oninput=e=>{const t=e.target,r=R[t.dataset.i];if(!r)return;if(t.classList.contains('invq'))r.q=+t.value.replace(/[^\d]/g,'')||0;if(t.classList.contains('invc'))r.ck=t.checked};
 el.onchange=e=>{const t=e.target;if(!t.classList.contains('invs'))return;const r=R[t.dataset.i];r.n=t.value;r.sure=true;r.ck=true;for(const s of r.sigs||[])invLearn(s.sig,s.cw,s.ch,r.n);if(r.sigs&&r.sigs.length)toast('아이콘 기억함: '+r.n);draw()};
 const img=async fl=>{if(!fl)return;const my=++run;$('#invImg').innerHTML=`<img src="${URL.createObjectURL(fl)}" style="max-width:100%;max-height:160px;margin-top:6px;border-radius:6px"><div id="invSt" class="mut" style="font-size:13px">🔎 준비 중… (처음엔 몇 초)</div>`;
  const st=s=>{const e=$('#invSt');if(e&&run===my)e.textContent='🔎 '+s};
  try{const out=await invRecognize(fl,st,()=>run===my&&!!$('#invList'));if(!out)return;const g={};
   for(const h of out.items){const r=g[h.nm]||(g[h.nm]={n:h.nm,q:0,ck:true,sure:true,sigs:[]});r.q+=h.q;r.sure=r.sure&&h.sure;r.sigs.push({sig:h.sig,cw:h.cw,ch:h.ch})}
   for(const r of Object.values(g)){r.ck=r.sure;const o=R.find(x=>x.n===r.n&&!x.sigs);if(o)Object.assign(o,r);else R.push(r)}
   const e=$('#invSt');if(e)e.textContent=out.items.length?`아이콘 매칭으로 ${Object.keys(g).length}종(${out.items.length}칸) 찾음 — ?표시는 확인 필요. 이름·수량 확인 후 적용`:(out.why||'아이콘 매칭으로 찾은 재료가 없어요')+' — 아래에서 직접 추가해 주세요.';draw()}
  catch(er){console.error(er);const e=$('#invSt');if(e)e.textContent='인식 실패 — 수동으로 추가해 주세요.'}};
 $('#invX').onclick=$('#invMask').onclick=()=>{run++;el.innerHTML=''};
 $('#invDrop').onclick=e=>{const ii=$('#invImg');if(!e.target.isConnected||(ii&&ii.childElementCount)||e.target.id==='invFile'||e.target.closest('#invImg,input,select,textarea,button,label,a,[data-tqu],[data-tqocr]'))return;$('#invFile').click()};$('#invFile').onchange=e=>img(e.target.files[0]);
 el.onpaste=e=>{const it=[...(e.clipboardData?.items||[])].find(x=>x.type.startsWith('image/'));if(it){e.preventDefault();img(it.getAsFile())}};
 $('#invAdd').onclick=()=>{const n=$('#invNm').value.trim();if(!n)return;if(!D.materials.includes(n))return toast('모르는 재료 이름');const q=+$('#invQ').value.replace(/[^\d]/g,'')||0,o=R.find(x=>x.n===n);if(o){o.q=q;o.ck=true}else R.push({n,q,ck:true});$('#invNm').value=$('#invQ').value='';draw()};
 $('#invOk').onclick=()=>{const L={};for(const r of R)if(r.ck)L[r.n]=(L[r.n]||0)+r.q;const ck=Object.keys(L);if(!ck.length)return toast('선택된 항목 없음');
  if(!confirm(`보유 수량 ${ck.length}종을 덮어쓸까요?`))return;
  mutMats(()=>{const c=C();for(const n of ck)c.owned[n]=L[n]},`재고 ${ck.length}종 적용`);run++;el.innerHTML=''};
}
function tqOpen(){tqWLoad();let el=$('#tqPop');if(!el){el=document.createElement('div');el.id='tqPop';document.body.appendChild(el)}
 el.innerHTML=`<style>.smp{pointer-events:none;margin-top:6px}.smp img{max-width:100%;max-height:200px;opacity:.85;border-radius:6px}.smp div{font-size:12px;color:#999}#invImg:not(:empty)~.smp,#invPop:has(#invList:not(:empty)) .smp,#tqImg:not(:empty)~.smp,#tqPop:has(.tqHas) .smp{display:none}</style><style>.tqg td,.tqg th{padding:3px 4px;text-align:center}.tqg input{width:64px;font-size:13px}.tqg{font-size:14.5px}.tqg input{width:70px;font-size:14px}.tqrk{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0}.tqchips{display:flex;gap:5px;flex-wrap:wrap;align-items:center;margin:6px 0}.tqchips .has small{color:#7fd18b}.tqlist{display:grid;gap:4px}.tqrow{display:grid;grid-template-columns:minmax(0,1fr) 90px 80px 150px;gap:8px;align-items:center;font-size:15px}.tqrow .nm{white-space:normal;overflow:visible;text-overflow:clip;overflow-wrap:anywhere;word-break:keep-all;line-height:1.3}.tqrow input{width:90px}.tqrow .r{text-align:right;color:#a9a2d6}.tqcard{flex:1;min-width:150px;text-align:left;color:inherit;font:inherit;cursor:pointer;border:1px solid #3a3550;border-radius:10px;padding:8px 12px;background:rgba(255,255,255,.03);font-size:15px;line-height:1.6}.tqcard.b1{border-color:#7fd18b;background:rgba(127,209,139,.10)}.tqg input.best{border-color:#7fd18b;background:rgba(127,209,139,.15)}</style><div id="tqMask" style="position:fixed;inset:0;background:rgba(0,0,0,.55);z-index:59"></div><div class="pop" style="position:fixed;top:50%;left:50%;right:auto;transform:translate(-50%,-50%);width:min(760px,96vw);max-height:92vh;overflow:auto;z-index:60">
 <div style="display:flex;justify-content:space-between;align-items:center;gap:8px"><h3 style="margin:0">📷 교역 시세 · 어디에 팔까 </h3><span style="display:flex;gap:6px"><button class="sm ghost" id="tqClr">시세 비우기</button><button class="sm ghost" id="tqX">✕</button></span></div>
 <div class="mut" style="font-size:13px;margin-top:4px">① 마차 인벤토리에서 교역품 하나를 눌러 마을별 시세창을 열고 ② 캡처해 아래에 올리면 그 품목 시세가 담겨요. ③ 품목마다 반복하면 담긴 품목 합계로 가장 많이 받는 마을을 🥇~🥉로 추천해요. (마을 칩을 눌러 직접 입력·수정도 가능, 저장은 이 브라우저)</div>
 <div id="tqDrop" style="margin:6px 0;border:1px dashed #555;border-radius:8px;padding:8px;text-align:center;font-size:13px;cursor:pointer">📷 교역품 <b>1종</b>의 시세창 캡처를 <b>Ctrl+V</b> 또는 클릭해서 올리기<input type="file" id="tqFile" accept="image/*" hidden><div id="tqImg"></div><div class="smp"><div>예시 · 이런 시세창을 올려 주세요</div><img src="howto-trade-price.png?v=1" alt="마을별 시세창 예시"></div></div>
 <div id="tqBody">${tqBody()}</div></div>`;
 const img=fl=>{if(!fl)return;$('#tqImg').innerHTML=`<img src="${URL.createObjectURL(fl)}" style="max-width:100%;max-height:200px;margin-top:6px;border-radius:6px"><div id="tqOcr" class="mut" style="font-size:14px;margin-top:4px">🔎 인식 중… (처음엔 언어 데이터 받느라 10~20초)</div>`;tqOcr(fl)};
 $('#tqX').onclick=$('#tqMask').onclick=()=>el.innerHTML='';
 $('#tqClr').onclick=()=>{if(confirm('입력한 마을별 시세를 모두 비울까요?')){TQ={};tqSave();$('#tqBody').innerHTML=tqBody()}};
 $('#tqDrop').onclick=e=>{const ti=$('#tqImg');if(!e.target.isConnected||(ti&&ti.childElementCount)||e.target.id==='tqFile'||e.target.closest('#tqImg,input,select,textarea,button,label,a,[data-tqu],[data-tqocr]'))return;$('#tqFile').click()};$('#tqFile').onchange=e=>img(e.target.files[0]);
 el.onpaste=e=>{const it=[...(e.clipboardData?.items||[])].find(x=>x.type.startsWith('image/'));if(it){e.preventDefault();img(it.getAsFile())}};
 el.onchange=e=>{const t=e.target;if(!t.classList.contains('tqc'))return;const v=+t.value.replace(/[^\d]/g,'')||0,o=TQ[t.dataset.g]=TQ[t.dataset.g]||{};if(v)o[t.dataset.t]=v;else delete o[t.dataset.t];tqSave();const k=[t.dataset.g,t.dataset.t];$('#tqBody').innerHTML=tqBody();const n=document.querySelector(`.tqc[data-g="${k[0]}"][data-t="${k[1]}"]`);const all=[...document.querySelectorAll('.tqc')],i=all.indexOf(n);if(all[i+1])all[i+1].focus()};
 el.onclick=e=>{const R=()=>$('#tqBody').innerHTML=tqBody();const ch=e.target.closest('[data-tqr],[data-tqn],[data-tqt]');if(ch){const d=ch.dataset;if(d.tqr){TQ._r=d.tqr;delete TQ._n}if(d.tqn)TQ._n=+d.tqn;if(d.tqt)TQ._t=d.tqt;tqSave();R();const i=document.querySelector('.tqc');if(i&&d.tqt)i.focus();return}
 const oc=e.target.closest('[data-tqocr]');if(oc){const g=$('#tqoG').value,o={};document.querySelectorAll('.tqop').forEach(x=>{const v=+x.value.replace(/[^\d]/g,'')||0;if(v)o[x.dataset.t]=v});if(!Object.keys(o).length)return toast('시세 숫자가 비어 있어요');TQ[g]=o;TQ._last=g;delete TQ._t;tqSave();TQO=null;$('#tqImg').innerHTML='';$('#tqFile').value='';R();toast((D.goods.find(x=>x.id===g)||{}).name+' 시세 담음 — 다음 품목을 캡처하세요');return}const uu=e.target.closest('[data-tqu]');if(uu){TQ._u=uu.dataset.tqu;tqSave();return R()}
 const ap=(L)=>{if(!L.length)return;const k=tqU()==='g'?'g':'d',nm=k==='g'?'골드':'두카트';if(!confirm(`판매가(${nm}) ${L.length}종을 덮어쓸까요?`))return;mut(()=>{for(const[id,v]of L)(S.sale[id]=S.sale[id]||{})[k]=v},'판매가 '+L.length+'종 적용');R()};
 const b=e.target.closest('[data-tqa]');if(b)return ap([[b.dataset.tqa,+b.dataset.v]]);
 const al=e.target.closest('[data-tqall]');if(al){const t=al.dataset.tqall;return ap(tqGoods().L.map(({g})=>[g.id,+(TQ[g.id]||{})[t]||0]).filter(x=>x[1]))}};
 el.addEventListener('change',e=>{if(e.target.id==='tqW'){if(e.target.value)TQ._w=e.target.value;else delete TQ._w;tqSave();$('#tqBody').innerHTML=tqBody();return}if(e.target.id==='tqRate'){const v=+e.target.value.replace(/[^\d.]/g,'')||0;if(v!==(+S.drate||0))mut(()=>S.drate=v);$('#tqBody').innerHTML=tqBody()}})}
$('#undoBtn').onclick=undo;addEventListener('pagehide',()=>{clearTimeout(svT);save()});
function renChar(i){const x=S.chars[i];if(!x)return;const n=(prompt('캐릭터 이름 변경',x.name)||'').trim();if(n&&n!==x.name)mut(()=>S.chars[i].name=n,'이름 변경됨')}
function delChar(i){const x=S.chars[i];if(!x)return;if(S.chars.length<2)return toast('마지막 캐릭터는 삭제할 수 없습니다');mut(()=>{S.chars.splice(i,1);if(S.cur>i||S.cur>=S.chars.length)S.cur=Math.max(0,S.cur-1)},`'${x.name}' 삭제됨 (Ctrl+Z로 되돌리기)`)}
$('#chars').addEventListener('contextmenu',e=>{const b=e.target.closest('[data-a=char]');if(!b)return;e.preventDefault();renChar(+b.dataset.i)});
$('#chars').addEventListener('dblclick',e=>{const b=e.target.closest('[data-a=char]');if(b&&!e.target.closest('.cx'))renChar(+b.dataset.i)});
const tipEl=document.createElement('div');tipEl.id='tip';document.body.appendChild(tipEl);
document.addEventListener('mouseover',e=>{const t=e.target.closest('[data-tip]');if(!t){tipEl.style.display='none';return}tipEl.innerHTML=t.dataset.tip;tipEl.style.display='block';const r=t.getBoundingClientRect(),h=tipEl.offsetHeight,w=tipEl.offsetWidth;let y=r.bottom+10,dn=true;if(y+h>innerHeight-8){y=r.top-h-10;dn=false}const x=Math.max(8,Math.min(r.left,innerWidth-w-8));tipEl.className=dn?'dn':'up';tipEl.style.top=Math.max(8,y)+'px';tipEl.style.left=x+'px';tipEl.style.setProperty('--ax',Math.max(10,Math.min(w-20,r.left+14-x))+'px')});
$('#impFile').onchange=async e=>{try{const o=JSON.parse(await e.target.files[0].text());if(!o.chars)throw 0;mut(()=>S=migrate(o),'가져오기 완료')}catch(x){toast('잘못된 파일')}e.target.value=''};
const FEED='https://mabi-data.mabilife.workers.dev/prices.json';
async function loadFeed(){const r=await fetch(FEED+'?t='+Date.now(),{cache:'no-store'});if(!r.ok)throw new Error(r.status);const j=await r.json();if(!j.prices)throw new Error('bad');return j}
const feedTime=u=>{const d=new Date(u);return isNaN(d)?'?':d.toLocaleString('ko-KR',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit',hour12:false})};
async function loadPrices(){const ms0=Object.keys(need([...routeGoods(D.routes[0]),...routeGoods(D.routes[1])],false));
 try{const j=await loadFeed();const res={};for(const m of ms0){const e=j.prices[m];if(e&&e.min!=null)res[m]={p:e.min,count:e.count,volume:e.volume,volume24:e.volume24,trades:e.trades,trades24:e.trades24}}if(!Object.keys(res).length)throw new Error('empty');const t=Date.parse(j.updated)||Date.now();if(j.hotMinVolume!=null)feedHotMin=j.hotMinVolume;
  return mut(()=>{for(const[m,v]of Object.entries(res))S.prices[m]={p:v.p,src:'feed',t,count:v.count,volume:v.volume,volume24:v.volume24,trades:v.trades,trades24:v.trades24}},`공유 시세 ${Object.keys(res).length}종 (${feedTime(j.updated)} 기준)`)}catch(x){return toast('공유 시세를 불러오지 못했습니다 · 잠시 후 다시 시도하세요')}}
window.__barter={get S(){return S},plan,weekKey,render,exchange,parsePaste,migrate,setOpen:id=>{open=id;render()},setLayer,route,get UI(){return UI},HOT_MIN,get feedHotMin(){return feedHotMin},hotIcon,hotMat,hotMetric};
render();
