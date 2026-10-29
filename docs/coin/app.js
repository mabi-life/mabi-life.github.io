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
function beadPrice(tab){var o=+st.beadOv[tab];if(o>0)return{p:o,src:'직접 입력'};var b=BEAD[tab]||BEAD.any;if(!b)return null;
 var v=b.buy!=null&&b.sell!=null?(b.buy+b.sell)/2:(b.buy!=null?b.buy:b.sell);return{p:v,src:'뿔피리 '+(BEAD[tab]?'':'(종류 미표기) ')+'구구 '+b.nb+'건·ㅍㅍ '+b.ns+'건 중앙값'}}
function esc(t){return String(t).replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function renderBead(){var b=BEAD[st.tab],bp=beadPrice(st.tab),h=$('bead');
 var line=function(lbl,x){return x?lbl+' 구구(삽니다) <b>'+(x.buy!=null?fmt(x.buy):'—')+'</b> ('+x.nb+'건) · ㅍㅍ(팝니다) <b>'+(x.sell!=null?fmt(x.sell):'—')+'</b> ('+x.ns+'건)':''};
 h.innerHTML='🔮 구슬 시세(개당): '+(bp?'<b>'+fmt(bp.p)+'</b>골드 <small>'+bp.src+'</small>':'최근 뿔피리에 해당 구슬 가격 글이 없습니다')+
  (b?'<br><small>'+line(SHOPS[st.tab].name,b)+'</small>':'')+(BEAD.any&&!b?'<br><small>'+line('종류 미표기 구슬',BEAD.any)+'</small>':'')+
  (BEAD.horn?'<br><small>📯 '+line('거대한 외침의 뿔피리',BEAD.horn)+'</small>':'')+
  ((b||BEAD.any)?'<details><summary>파싱된 원문 예시</summary>'+((b||BEAD.any).ex.map(function(e){return'<div>['+esc(e.s||'')+'] '+esc(e.m)+' → '+(e.side==='buy'?'구구 ':'ㅍㅍ ')+fmt(e.p)+'</div>'}).join(''))+'</details>':'');
 $('beadOv').value=st.beadOv[st.tab]||''}
function render(){
 beadStats();renderBead();var bp=beadPrice(st.tab);
 var sh=SHOPS[st.tab],ign=st.ign[st.tab]||{},own=+st.own[st.tab]||0;
 [].forEach.call($('tabs').children,function(b){b.className=b.dataset.k===st.tab?'on':''});
 $('cname').textContent='⦿ '+sh.name;$('own').value=own||'';$('basis').value=st.basis;
 var rows=sh.items.map(function(x){var p=price(x[0]);return{name:x[0],cost:x[1],p:p,ppc:p==null?null:p/x[1]}});
 rows.sort(function(a,b){if(st.sort==='name')return st.dir*a.name.localeCompare(b.name,'ko');
  var A=a[st.sort],B=b[st.sort];if(A==null&&B==null)return 0;if(A==null)return 1;if(B==null)return-1;return st.dir*(A-B)});
 var best=null;rows.forEach(function(r){if(!ign[r.name]&&r.ppc!=null&&(!best||r.ppc>best.ppc))best=r});
 var max=best?best.cost:200,pc=Math.min(100,Math.floor(own/max*100));
 $('pct').textContent='/'+max+' ('+pc+'%)';$('bar').style.width=pc+'%';
 $('sum').innerHTML=best?('최고 가성비: <b>'+best.name+'</b> · 코인당 <b>'+fmt(best.ppc)+'</b>골드'+(own?' · 보유 '+own+'개 → <b>'+Math.floor(own/best.cost)+'</b>개 구매 가능 (≈'+fmt(Math.floor(own/best.cost)*best.p)+'골드), '+(own>=best.cost?'<span class="ok">교환 가능</span>':(best.cost-own)+'개 더 필요'):'')+(bp?' · 구슬 1개 '+fmt(bp.p)+'골드 기준 '+(best.ppc>=bp.p?'<span class="ok">구슬 사서 교환 이득</span>':'<span class="bad">구슬 그대로 파는 게 이득</span>'):'')):'시세 데이터가 없습니다.';
 $('tb').innerHTML=rows.map(function(r){var ig=!!ign[r.name];
  return '<tr class="'+(ig?'ign':'')+(r===best?' best':'')+'"><td>'+r.name+'</td><td>'+r.cost+'개<small>('+r.cost+' Coin × 1개)</small></td><td class="p">'+(r.ppc==null?'—':'<b>'+fmt(r.ppc)+'</b>골드<small>개당 '+fmt(r.p)+'</small>')+'</td><td><input type="checkbox" data-n="'+r.name.replace(/"/g,'&quot;')+'"'+(ig?' checked':'')+'></td></tr>'}).join('');
}
$('tabs').onclick=function(e){var k=e.target.closest('button');if(k){st.tab=k.dataset.k;save();render()}};
$('own').oninput=function(){st.own[st.tab]=Math.max(0,parseInt(this.value)||0);save();render();this.focus()};
$('basis').onchange=function(){st.basis=this.value;save();render()};
$('tb').onchange=function(e){var n=e.target.dataset.n;if(!n)return;var g=st.ign[st.tab]=st.ign[st.tab]||{};if(e.target.checked)g[n]=1;else delete g[n];save();render()};
document.querySelector('thead').onclick=function(e){var s=e.target.dataset.s;if(!s)return;if(st.sort===s)st.dir=-st.dir;else{st.sort=s;st.dir=s==='name'?1:-1}save();render()};
$('paste').value=st.paste||'';
$('paste').oninput=function(){st.paste=this.value;save();render()};
$('beadOv').oninput=function(){var v=parseFloat(this.value)||0;if(v>0&&v<1000)v*=1e4;if(v>0)st.beadOv[st.tab]=v;else delete st.beadOv[st.tab];save();render();this.focus()};
render();
fetch('/horn_beads.json?t='+Date.now()).then(function(r){return r.json()}).then(function(d){HR=d.rows||[];$('hupd').textContent='뿔피리 수집: '+(d.updated||'—').replace('T',' ').slice(0,16)+' (KST) · 최근 48시간 구슬 관련 '+HR.length+'건';render()}).catch(function(){$('hupd').textContent='뿔피리 데이터를 불러오지 못했습니다.'});
fetch('/prices.json?t='+Date.now()).then(function(r){return r.json()}).then(function(d){P=d.prices||{};$('upd').textContent='시세 갱신: '+(d.updated||'').replace('T',' ').slice(0,16)+' (KST) · 시세 없는 항목은 — 로 표시';render()}).catch(function(){$('upd').textContent='시세를 불러오지 못했습니다.'});
})();
