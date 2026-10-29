/* 정가 코인 필요 수량 계산기 v1.0
 * 상점 목록·필요 구슬 수: Nexon Open API npcshop/list 는 포인셰·레넨을 지원하지 않음(OPENAPI00004, 2026-10-29 확인)
 *  → 탈라 가흐(포인셰): 마비노기 쉼플레이스 NPC 정보 https://mabinogi.shimplace.com/infocenter/npc/detail.php?n=25
 *  → 브리 레흐(레넨): 라바뉴 코인 계산기 https://mabi.labanyu.com/coin-calc/brie-lech (탈라 목록도 교차검증)
 * 시세: /prices.json (Nexon Open API auction/list 최저가 min, auction/history 24h 수량가중 평균 avg24)
 * 구슬 자체는 거래불가라 경매 시세 없음. */
(function(){
var SHOPS={
 tala:{name:'탈라 가흐 구슬',items:[['희미하게 빛나는 명주실',3],['끈적이게 엉긴 식물 덩어리',3],['달아오른 광두정',3],['순도 높은 실리엔 섬유 다발',6],['순도 높은 힐웬 강판 조각',6],['순도 높은 힐웬 주괴 조각',6],['빛바랜 에너지 회로',35],['고리아스 동력원',200]].concat(
  ['비고러스 레더 헬멧','비고러스 아머(남성용)','비고러스 아머(여성용)','비고러스 글러브','비고러스 부츠','이지스 헬멧','이지스 가드(남성용)','이지스 가드(여성용)','이지스 건틀렛','이지스 그리브'].map(function(x){return['도면 - 더스크바운드 '+x,180]}),
  ['튜더 베레모','수트(남성용)','수트(여성용)','글러브','슈즈'].map(function(x){return['옷본 - 더스크바운드 에테리얼 '+x,180]}))},
 bri:{name:'브리 레흐 구슬',items:[['브리 레흐의 코어',100],['브리 레흐의 정수',100],['녹음이 깃든 마법사의 보석',1],['텅 빈 마력석',3],['깨어난 힘의 정수',5],['오묘한 가죽 조각',3],['순백의 가죽 조각',1],['순백의 깃털',1],['오묘한 마력석',3],['초록빛 기억의 조각',25],['녹음이 감도는 칼날 조각',1],['주황빛 기억의 조각',25],['단단한 늑대의 이빨',1],['금빛 기억의 조각',25],['녹음이 감도는 나무 장작',1],['순도 높은 마력의 결정',3],['빛바랜 자수실',3],['단단한 힐웬 광석 조각',1],['브리 레흐의 기운이 깃든 문장',3],['녹음이 감도는 광석 조각',1],['오피먼트',3],['무른 금속 파편',3],['오묘한 금속 조각',3],['아라고나이트',3],['마력석',1]]}
};
var LS='mabiCoin.v1',st={tab:'tala',basis:'min',own:{},ign:{},sort:'ppc',dir:-1};
try{Object.assign(st,JSON.parse(localStorage.getItem(LS)||'{}'))}catch(e){}
function save(){try{localStorage.setItem(LS,JSON.stringify(st))}catch(e){}}
var P={},$=function(i){return document.getElementById(i)},fmt=function(n){return Math.round(n).toLocaleString('ko-KR')};
function price(n){var e=P[n];if(!e)return null;var v=st.basis==='avg24'?e.avg24:e.min;return v>0?v:null}
function render(){
 var sh=SHOPS[st.tab],ign=st.ign[st.tab]||{},own=+st.own[st.tab]||0;
 [].forEach.call($('tabs').children,function(b){b.className=b.dataset.k===st.tab?'on':''});
 $('cname').textContent='⦿ '+sh.name;$('own').value=own||'';$('basis').value=st.basis;
 var rows=sh.items.map(function(x){var p=price(x[0]);return{name:x[0],cost:x[1],p:p,ppc:p==null?null:p/x[1]}});
 rows.sort(function(a,b){if(st.sort==='name')return st.dir*a.name.localeCompare(b.name,'ko');
  var A=a[st.sort],B=b[st.sort];if(A==null&&B==null)return 0;if(A==null)return 1;if(B==null)return-1;return st.dir*(A-B)});
 var best=null;rows.forEach(function(r){if(!ign[r.name]&&r.ppc!=null&&(!best||r.ppc>best.ppc))best=r});
 var max=best?best.cost:200,pc=Math.min(100,Math.floor(own/max*100));
 $('pct').textContent='/'+max+' ('+pc+'%)';$('bar').style.width=pc+'%';
 $('sum').innerHTML=best?('최고 가성비: <b>'+best.name+'</b> · 코인당 <b>'+fmt(best.ppc)+'</b>골드'+(own?' · 보유 '+own+'개 → <b>'+Math.floor(own/best.cost)+'</b>개 구매 가능 (≈'+fmt(Math.floor(own/best.cost)*best.p)+'골드), '+(own>=best.cost?'<span class="ok">교환 가능</span>':(best.cost-own)+'개 더 필요'):'')):'시세 데이터가 없습니다.';
 $('tb').innerHTML=rows.map(function(r){var ig=!!ign[r.name];
  return '<tr class="'+(ig?'ign':'')+(r===best?' best':'')+'"><td>'+r.name+'</td><td>'+r.cost+'개<small>('+r.cost+' Coin × 1개)</small></td><td class="p">'+(r.ppc==null?'—':'<b>'+fmt(r.ppc)+'</b>골드<small>개당 '+fmt(r.p)+'</small>')+'</td><td><input type="checkbox" data-n="'+r.name.replace(/"/g,'&quot;')+'"'+(ig?' checked':'')+'></td></tr>'}).join('');
}
$('tabs').onclick=function(e){var k=e.target.closest('button');if(k){st.tab=k.dataset.k;save();render()}};
$('own').oninput=function(){st.own[st.tab]=Math.max(0,parseInt(this.value)||0);save();render();this.focus()};
$('basis').onchange=function(){st.basis=this.value;save();render()};
$('tb').onchange=function(e){var n=e.target.dataset.n;if(!n)return;var g=st.ign[st.tab]=st.ign[st.tab]||{};if(e.target.checked)g[n]=1;else delete g[n];save();render()};
document.querySelector('thead').onclick=function(e){var s=e.target.dataset.s;if(!s)return;if(st.sort===s)st.dir=-st.dir;else{st.sort=s;st.dir=s==='name'?1:-1}save();render()};
render();
fetch('/prices.json?t='+Date.now()).then(function(r){return r.json()}).then(function(d){P=d.prices||{};$('upd').textContent='시세 갱신: '+(d.updated||'').replace('T',' ').slice(0,16)+' (KST) · 시세 없는 항목은 — 로 표시';render()}).catch(function(){$('upd').textContent='시세를 불러오지 못했습니다.'});
})();
