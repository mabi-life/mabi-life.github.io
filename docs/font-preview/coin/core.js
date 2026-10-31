/* 코인/구슬 공용 데이터·파서 — /coin/ 과 /craft/ 가 공유 (출처는 coin/app.js 머리말 참조) */
(function(W){
var SHOPS={
 tala:{name:'탈라 가흐 구슬',items:[['희미하게 빛나는 명주실',3],['끈적이게 엉긴 식물 덩어리',3],['달아오른 광두정',3],['순도 높은 실리엔 섬유 다발',6],['순도 높은 힐웬 강판 조각',6],['순도 높은 힐웬 주괴 조각',6],['빛바랜 에너지 회로',35],['고리아스 동력원',200]].concat(
  ['비고러스 레더 헬멧','비고러스 아머(남성용)','비고러스 아머(여성용)','비고러스 글러브','비고러스 부츠','이지스 헬멧','이지스 가드(남성용)','이지스 가드(여성용)','이지스 건틀렛','이지스 그리브'].map(function(x){return['도면 - 더스크바운드 '+x,180]}),
  ['튜더 베레모','수트(남성용)','수트(여성용)','글러브','슈즈'].map(function(x){return['옷본 - 더스크바운드 에테리얼 '+x,180]}))},
 bri:{name:'브리 레흐 구슬',items:[['브리 레흐의 코어',100],['브리 레흐의 정수',100],['녹음이 깃든 마법사의 보석',1],['텅 빈 마력석',3],['깨어난 힘의 정수',5],['오묘한 가죽 조각',3],['순백의 가죽 조각',1],['순백의 깃털',1],['오묘한 마력석',3],['초록빛 기억의 조각',25],['녹음이 감도는 칼날 조각',1],['주황빛 기억의 조각',25],['단단한 늑대의 이빨',1],['금빛 기억의 조각',25],['녹음이 감도는 나무 장작',1],['순도 높은 마력의 결정',3],['빛바랜 자수실',3],['단단한 힐웬 광석 조각',1],['브리 레흐의 기운이 깃든 문장',3],['녹음이 감도는 광석 조각',1],['오피먼트',3],['무른 금속 파편',3],['오묘한 금속 조각',3],['아라고나이트',3],['마력석',1]]}
};
// ── 뿔피리 파서 ──
var KIND=[['tala',/탈라|가흐/],['bri',/브리|레흐/],['horn',/거뿔|거대한?\s*(외침의\s*)?뿔피리|거대\s*뿔/]];
function side(m){if(/구구|구매|삽니다|사요|삼\b|매입|ㅅㅅ|ㄱㄱ|구함|구해요/.test(m))return'buy';if(/ㅍㅍ|팜|팝니다|판매|팔아요|팔아|파는/.test(m))return'sell';return null}
function num(t,strict){var m=strict?t.match(/개당\s*(\d+(?:\.\d+)?)\s*(억|만|천|k|골|g|G)?|(\d+(?:\.\d+)?)\s*(억|만|천|k|골|g|G)/):t.match(/(\d+(?:\.\d+)?)\s*(억|만|천|k|골|g|G)?/);if(m&&strict)m=[0,m[1]||m[3],m[2]||m[4]];if(!m)return null;var v=parseFloat(m[1]),u=m[2]||'';
 if(u==='억')v*=1e8;else if(u==='만')v*=1e4;else if(u==='천'||u==='k')v*=1e3;else if(v<1000)v*=1e4;return v}
// 상점 분류: 탈라(탈라|가흐)·브리(브리|레흐) 중 하나만 명시된 글만 해당 상점. 둘 다/미표기 = 'any'(어느 상점 시세에도 쓰지 않음)
function kindOf(m){var t=/탈라|가흐/.test(m),b=/브리|레흐/.test(m);return t&&!b?'tala':b&&!t?'bri':'any'}
function parseHorn(msg){
 var m=String(msg||'').replace(/,/g,'').replace(/^[^:#]{1,20}:\s*/,'');
 // 파티 모집 뿔피리의 「구구25있」「구구있25」「구구 25」: 파티장이 구슬을 개당 N(만)에 구매 → 구구 바로 옆 숫자만 사용
 var g=m.match(/구구\s*(?:있|가능|ㅇ|o|O)?\s*[:=]?\s*(\d+(?:\.\d+)?)\s*(만|천|k)?(?!\s*(?:인|명|관|릴|채널|시|분|개))/);
 if(g){var v=num((g[1]||g[3])+(g[2]||g[4]||''));if(v>=1e4&&v<=1e8){var md=m.replace(/거뿔|거대한?\s*(외침의\s*)?뿔피리|거대\s*뿔/g,'');return[{k:kindOf(md),side:'buy',p:v}]}}
 if(/#\[채널|\[\d+\/\d+명\]/.test(m)&&!/개당/.test(m))return[]; // 파티 모집글: 구구 숫자 없으면 가격 아님
 var sd=side(m);if(!sd||!/구슬|구구|거뿔|뿔피리|거대/.test(m))return[];
 var hits=[];KIND.forEach(function(k){var r=new RegExp(k[1].source,'g'),x;while((x=r.exec(m)))hits.push({k:k[0],i:x.index,e:x.index+x[0].length})});
 if(!hits.length){var g=m.search(/구슬|구구/);if(g<0)return[];hits.push({k:'any',i:g,e:g+2})}
 hits.sort(function(a,b){return a.i-b.i});
 var out=[],seen={};hits.forEach(function(h,j){if(seen[h.k])return;var end=j+1<hits.length?hits[j+1].i:m.length;
  var seg=m.slice(h.e,end).replace(/\d+\s*(개|ea|EA|장|묶|시|분|채널|ch)/g,'');var v=num(seg,1);if(v==null&&/^\s*(구매|삽니다|매입|팝니다|판매|ㅍㅍ|구구)?\s*\d/.test(seg))v=num(seg);
  if(v==null&&j===0){v=num(m.slice(0,h.i).replace(/\d+\s*(개|ea|EA|장|묶|시|분|채널|ch)/g,''))}
  if(v!=null&&v>=1e4&&v<=1e8){seen[h.k]=1;out.push({k:h.k,side:sd,p:v})}});
 if(!out.length){var t=m.match(/(?:구매|삽니다|매입|팝니다|판매|ㅍㅍ|구구|사요|팜)\s*(\d+(?:\.\d+)?)\s*(만|천|k)?\s*$/)||m.match(/(?:구슬)\D{0,6}?(\d+(?:\.\d+)?)\s*(만|천|k)?\s*(?:에|씩)?\s*(?:구매|삽니다|매입|팝니다|판매|사요|팜)/);if(t){var v=num(t[1]+(t[2]||''));if(v>=1e4&&v<=1e8)out.push({k:kindOf(m),side:sd,p:v})}}
 return out}
function median(a){if(!a.length)return null;a=a.slice().sort(function(x,y){return x-y});var n=a.length,h=n>>1;return n%2?a[h]:(a[h-1]+a[h])/2}

// 공용 구슬 시세: rows=horn_beads.json rows, paste/ov = coin 페이지 localStorage(mabiCoin.v1) 값
function beadTable(rows,paste){var acc={};function add(r,src){parseHorn(r.m).forEach(function(q){var a=acc[q.k]=acc[q.k]||{buy:[],sell:[],all:[]};a[q.side].push(q.p);a.all.push(q.p)})}
 var dd={};(rows||[]).forEach(function(r){var key=(r.s||'')+(r.w||'')+r.m.replace(/\[\d+\/\d+명\]/,'');if(dd[key])return;dd[key]=1;add(r)});String(paste||'').split(/\n+/).forEach(function(l){if(l.trim())add({m:l})});
 var B={};Object.keys(acc).forEach(function(k){var a=acc[k];B[k]={buy:median(a.buy),sell:median(a.sell),med:median(a.all),n:a.all.length,_a:a.all}});return B}
// 역산 구슬 시세: 구슬 상점 재료의 경매 최저가 ÷ 교환 구슬 수 → 중앙값 (가격 없는 도면·옷본 제외, 중앙값의 0.5~2배 밖 이상치 제외)
// 탈라 가흐 구슬은 뿔피리 글이 드물어 이 값을 기준으로 사용 (IMPLIED 탭)
var IMPLIED={tala:1};
function impliedBead(P,tab){var sh=SHOPS[tab];if(!sh||!P)return null;var L=[];sh.items.forEach(function(x){var e=P[x[0]],v=e&&e.min>0?e.min:null;if(v)L.push({n:x[0],cost:x[1],p:v,u:v/x[1]})});
 if(!L.length)return null;var m0=median(L.map(function(x){return x.u}));var K=L.filter(function(x){return x.u>=m0*.5&&x.u<=m0*2});var m=median(K.map(function(x){return x.u}));
 return{p:m,n:K.length,out:L.length-K.length,list:L,src:'경매 재료 '+K.length+'종 역산 중앙값(경매가÷교환 구슬 수)'}}
function beadPick(B,tab,ov,P){var o=+(ov||{})[tab];if(o>0)return{p:o,src:'직접 입력'};if(IMPLIED[tab]&&P){var I=impliedBead(P,tab);if(I&&I.p)return I}var b=B[tab];if(!b)return null;var v=b.med;return v==null?null:{p:v,src:'뿔피리 '+b.n+'건 중앙값'}}
// 이름 → {tab, shop, cost}
var COST={};Object.keys(SHOPS).forEach(function(t){SHOPS[t].items.forEach(function(x){COST[x[0]]={tab:t,shop:SHOPS[t].name,cost:x[1]}})});
W.MabiCoin={impliedBead:impliedBead,IMPLIED:IMPLIED,COST:COST,beadTable:beadTable,beadPick:beadPick,SHOPS:SHOPS,parseHorn:parseHorn,median:median};
})(window);
