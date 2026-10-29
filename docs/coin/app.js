/* 정가 코인 필요 수량 계산기 v1.1 (구슬 뿔피리 시세)
 * 상점 목록·필요 구슬 수: Nexon Open API npcshop/list 는 포인셰·레넨을 지원하지 않음(OPENAPI00004, 2026-10-29 확인)
 *  → 탈라 가흐(포인셰): 마비노기 쉼플레이스 NPC 정보 https://mabinogi.shimplace.com/infocenter/npc/detail.php?n=25
 *  → 브리 레흐(레넨): 라바뉴 코인 계산기 https://mabi.labanyu.com/coin-calc/brie-lech (탈라 목록도 교차검증)
 * 시세: /prices.json (Nexon Open API auction/list 최저가 min, auction/history 24h 수량가중 평균 avg24)
 * 구슬 자체는 거래불가라 경매 시세 없음 → /horn_beads.json (Nexon Open API horn-bugle-world/history 누적)
 *  의 「구구 구슬구매 25」「ㅍㅍ 탈라구슬 30만」 같은 뿔피리 원문을 parseHorn()으로 파싱해 중앙값 사용.
 *  구구=삽니다(구매 희망), ㅍㅍ/팜=팝니다. 숫자 단위 없으면 1000 미만은 '만' 골드로 간주. */
(function(){
var SHOPS=MabiCoin.SHOPS,parseHorn=MabiCoin.parseHorn,median=MabiCoin.median;
var LS='mabiCoin.v1',st={paste:'',beadOv:{},tab:'tala',basis:'min',own:{},ign:{},sort:'ppc',dir:-1};
try{Object.assign(st,JSON.parse(localStorage.getItem(LS)||'{}'))}catch(e){}
(function(){var t=new URLSearchParams(location.search).get('tab');if(t&&SHOPS[t])st.tab=t})(); // /craft/ 딥링크
function save(){try{localStorage.setItem(LS,JSON.stringify(st))}catch(e){}}
var P={},$=function(i){return document.getElementById(i)},fmt=function(n){return Math.round(n).toLocaleString('ko-KR')};
function price(n){var e=P[n];if(!e)return null;var v=st.basis==='avg24'?e.avg24:e.min;return v>0?v:null}

var HR=[],BEAD={};
function beadStats(){var acc={};function add(r,src){parseHorn(r.m).forEach(function(q){var k=q.k==='any'?'any':q.k;var a=acc[k]=acc[k]||{buy:[],sell:[],ex:[]};a[q.side].push(q.p);if(a.ex.length<6)a.ex.push({m:r.m,s:r.s||src,p:q.p,side:q.side})})}
 var dd={};HR.forEach(function(r){var key=(r.s||'')+(r.w||'')+r.m.replace(/\[\d+\/\d+명\]/,'');if(dd[key])return;dd[key]=1;add(r)});String(st.paste||'').split(/\n+/).forEach(function(l){if(l.trim())add({m:l},'붙여넣기')});
 BEAD={};Object.keys(acc).forEach(function(k){var a=acc[k];BEAD[k]={buy:median(a.buy),sell:median(a.sell),nb:a.buy.length,ns:a.sell.length,ex:a.ex}})}
function beadPrice(tab){var o=+st.beadOv[tab];if(o>0)return{p:o,src:'직접 입력'};var b=BEAD[tab];if(!b)return null;
 var v=b.buy!=null&&b.sell!=null?(b.buy+b.sell)/2:(b.buy!=null?b.buy:b.sell);return{p:v,src:'뿔피리 구구 '+b.nb+'건·ㅍㅍ '+b.ns+'건 중앙값'}}
function esc(t){return String(t).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function pts(tab){var o=[],dd={};HR.forEach(function(r){var key=(r.s||'')+(r.w||'')+r.m.replace(/\[\d+\/\d+명\]/,'');if(dd[key])return;dd[key]=1;
 parseHorn(r.m).forEach(function(q){if(q.k===tab)o.push({t:Date.parse(r.t)||0,p:q.p,side:q.side})})});
 String(st.paste||'').split(/\n+/).forEach(function(l){if(l.trim())parseHorn(l).forEach(function(q){if(q.k===tab)o.push({t:Date.now(),p:q.p,side:q.side,paste:1})})});return o}
function chart(P,med,mean){if(!P.length)return'';var W=640,H=150,L=48,R=8,T=10,B=22;
 var t0=Math.min.apply(0,P.map(function(x){return x.t})),t1=Math.max.apply(0,P.map(function(x){return x.t}));if(t1-t0<36e5){t0-=18e5;t1+=18e5}
 var ps=P.map(function(x){return x.p}).concat([med]),lo=Math.min.apply(0,ps),hi=Math.max.apply(0,ps),pad=(hi-lo)*.15||lo*.1;lo-=pad;hi+=pad;
 var X=function(t){return L+(t-t0)/(t1-t0)*(W-L-R)},Y=function(p){return T+(hi-p)/(hi-lo)*(H-T-B)},man=function(v){return v>=1e4?(Math.round(v/1e3)/10)+'만':fmt(v)};
 var g='';[lo+pad,(lo+hi)/2,hi-pad].forEach(function(v){g+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="#ffffff14"/><text x="'+(L-4)+'" y="'+(Y(v)+4)+'" text-anchor="end">'+man(v)+'</text>'});
 var tf=function(t){var d=new Date(t);return (d.getMonth()+1)+'/'+d.getDate()+' '+String(d.getHours()).padStart(2,'0')+'시'};
 g+='<text x="'+L+'" y="'+(H-6)+'">'+tf(t0)+'</text><text x="'+(W-R)+'" y="'+(H-6)+'" text-anchor="end">'+tf(t1)+'</text>';
 g+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(med)+'" y2="'+Y(med)+'" stroke="#f7d98b" stroke-dasharray="5 4"/><text x="'+(W-R)+'" y="'+(Y(med)-5)+'" text-anchor="end" fill="#f7d98b">중앙값 '+man(med)+'</text>';
 if(mean!=null)g+='<line x1="'+L+'" x2="'+(W-R)+'" y1="'+Y(mean)+'" y2="'+Y(mean)+'" stroke="#9fd0ff66" stroke-dasharray="2 4"/>';
 P.forEach(function(x){g+='<circle cx="'+X(x.t).toFixed(1)+'" cy="'+Y(x.p).toFixed(1)+'" r="3.6" fill="'+(x.side==='buy'?'#7fd99a':'#ffa86b')+'" fill-opacity="'+(x.any?.45:.9)+'"/>'});
 return '<svg viewBox="0 0 '+W+' '+H+'" class="bchart">'+g+'</svg>'}
var BPN=null;
function renderBead(){var P=pts(st.tab),h=$('bead'),ps=P.map(function(x){return x.p});var med=median(ps),mean=ps.length?ps.reduce(function(a,b){return a+b},0)/ps.length:null;
 var ov=+st.beadOv[st.tab]||0;BPN=ov>0?{p:ov,src:'직접 입력'}:(med!=null?{p:med,src:'뿔피리 '+ps.length+'건 중앙값'}:null);
 var nb=P.filter(function(x){return x.side==='buy'}).length;
 h.innerHTML='🔮 구슬 시세(개당) <b>'+(BPN?fmt(BPN.p)+'골드':'—')+'</b> <small>'+(BPN?BPN.src:'최근 48시간 뿔피리에 '+SHOPS[st.tab].name+' 가격 글이 없습니다 (다른 구슬·미표기 시세는 쓰지 않음)')+(med!=null&&!ov?' · 평균 '+fmt(mean)+' · 구구 '+nb+'건 · ㅍㅍ '+(ps.length-nb)+'건':'')+'</small>'+
  chart(P,med!=null?med:0,mean)+(P.length?'<div class="leg"><i style="background:#7fd99a"></i>구구(삽니다) <i style="background:#ffa86b"></i>ㅍㅍ(팝니다) <span>해당 상점 구슬로 명시된 글만 · 종류 미표기/거뿔 글 제외 · 점선 = 중앙값(이상치에 강해 기준으로 사용)</span></div>':'');
 $('beadOv').value=st.beadOv[st.tab]||''}
function render(){
 beadStats();renderBead();
 var sh=SHOPS[st.tab],ign=st.ign[st.tab]||{},own=+st.own[st.tab]||0;
 [].forEach.call($('tabs').children,function(b){b.className=b.dataset.k===st.tab?'on':''});
 $('cname').textContent='⦿ '+sh.name;$('own').value=own||'';st.basis='min';var bp=BPN;
 var rows=sh.items.map(function(x){var p=price(x[0]);return{name:x[0],cost:x[1],p:p,ppc:p==null?null:p/x[1]}});
 rows.sort(function(a,b){if(st.sort==='name')return st.dir*a.name.localeCompare(b.name,'ko');
  var A=a[st.sort],B=b[st.sort];if(A==null&&B==null)return 0;if(A==null)return 1;if(B==null)return-1;return st.dir*(A-B)});
 rows.forEach(function(r){r.adv=!!(bp&&r.ppc!=null&&r.ppc>bp.p);r.gain=r.adv?r.p-r.cost*bp.p:0});
 var best=null;rows.forEach(function(r){if(!ign[r.name]&&r.adv&&(!best||r.ppc>best.ppc))best=r});
 var A=rows.filter(function(r){return r.adv&&!ign[r.name]}),need=A.reduce(function(a,r){return a+r.cost},0);
 var max=need||1,pc=need?Math.min(100,Math.floor(own/max*100)):0;
 $('pct').textContent=need?'/'+need+' ('+pc+'%)':'';$('bar').style.width=pc+'%';
 $('sum').innerHTML=!bp?'구슬 시세가 없어 판정할 수 없습니다. (뿔피리 수집 대기 또는 아래 직접 입력)':!A.length?'<span class="bad">현재 구슬 시세('+fmt(bp.p)+'골드)로는 코인 교환이 경매장 구매보다 유리한 아이템이 없습니다.</span> 경매장에서 사는 편이 싸요.':
  '<span class="ok">코인 교환이 유리한 아이템 <b>'+A.length+'</b>종</span> · 각 1개씩 교환에 필요한 코인 합계 <b>'+fmt(need)+'</b>개 (구슬값 ≈'+fmt(need*bp.p)+'골드 vs 경매가 합 '+fmt(A.reduce(function(a,r){return a+r.p},0))+'골드)'+
  '<br>👑 가장 유리: <b>'+best.name+'</b> · 코인 '+best.cost+'개 · 경매가보다 <b>'+fmt(best.gain)+'</b>골드 이득'+(own?' · 보유 '+own+'개 → '+(own>=need?'<span class="ok">전부 교환 가능</span>':'<b>'+(need-own)+'</b>개 더 필요'):'');
var showAll=!bp||!!(st.more||{})[st.tab],rest=bp?rows.filter(function(r){return !r.adv}):[],main=bp?rows.filter(function(r){return r.adv}):rows;
 var tog=rest.length?'<tr class="more"><td colspan="5"><button type="button" id="moreBtn" style="width:100%;padding:6px;cursor:pointer">'+(showAll?'▲ 나머지 접기':'▼ 나머지 '+rest.length+'종 보기')+' <small>(경매 구매가 유리·시세 없음)</small></button></td></tr>':'';
 $('tb').innerHTML=(main.length||!rest.length?'':'<tr><td colspan="5" class="mu">코인 교환이 유리한 아이템이 없습니다.</td></tr>')+(bp?main.concat(showAll?[]:[]):rows).map(ROW).join('')+(bp?tog+(showAll?rest.map(ROW).join(''):''):'');
 function ROW(r){var ig=!!ign[r.name];
  return '<tr class="'+(ig?'ign':'')+(r.adv||r.ppc==null?'':' nadv')+(r===best?' best':'')+'"><td>'+r.name+'</td><td>'+r.cost+'개<small>('+r.cost+' Coin × 1개)</small></td><td class="p">'+(r.ppc==null?'—':'<b>'+fmt(r.ppc)+'</b>골드<small>경매 '+fmt(r.p)+'</small>')+'</td><td class="v">'+(r.ppc==null||!bp?'—':r.adv?'<span class="ok">코인 유리</span><small>+'+fmt(r.gain)+'</small>':'<span class="mu">경매 구매</span>')+'</td><td><input type="checkbox" data-n="'+r.name.replace(/"/g,'&quot;')+'"'+(ig?' checked':'')+'></td></tr>'}
}
$('tabs').onclick=function(e){var k=e.target.closest('button');if(k){st.tab=k.dataset.k;save();render()}};
$('own').oninput=function(){st.own[st.tab]=Math.max(0,parseInt(this.value)||0);save();render();this.focus()};
$('tb').onclick=function(e){if(e.target.closest('#moreBtn')){st.more=st.more||{};st.more[st.tab]=!st.more[st.tab];save();render()}};
$('tb').onchange=function(e){var n=e.target.dataset.n;if(!n)return;var g=st.ign[st.tab]=st.ign[st.tab]||{};if(e.target.checked)g[n]=1;else delete g[n];save();render()};
document.querySelector('thead').onclick=function(e){var s=e.target.dataset.s;if(!s)return;if(st.sort===s)st.dir=-st.dir;else{st.sort=s;st.dir=s==='name'?1:-1}save();render()};
$('paste').value=st.paste||'';
$('paste').oninput=function(){st.paste=this.value;save();render()};
$('beadOv').oninput=function(){var v=parseFloat(this.value)||0;if(v>0&&v<1000)v*=1e4;if(v>0)st.beadOv[st.tab]=v;else delete st.beadOv[st.tab];save();render();this.focus()};
render();
fetch('/horn_beads.json?t='+Date.now()).then(function(r){return r.json()}).then(function(d){HR=d.rows||[];$('hupd').textContent='뿔피리 수집: '+(d.updated||'—').replace('T',' ').slice(0,16)+' (KST) · 최근 48시간 구슬 관련 '+HR.length+'건';render()}).catch(function(){$('hupd').textContent='뿔피리 데이터를 불러오지 못했습니다.'});
fetch('/prices.json?t='+Date.now()).then(function(r){return r.json()}).then(function(d){P=d.prices||{};$('upd').textContent='시세 갱신: '+(d.updated||'').replace('T',' ').slice(0,16)+' (KST) · 시세 없는 항목은 — 로 표시';render()}).catch(function(){$('upd').textContent='시세를 불러오지 못했습니다.'});
})();
