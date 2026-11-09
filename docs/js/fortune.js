/* 홈 「오늘의 운세」 — 평일 오하아사 순위(있으면) / 없으면 KST 시드 셔플, 채널은 날짜+서버+별자리 (재미용) */
(function(){
"use strict";
var root=document.getElementById("fortune");if(!root)return;
var SIGNS=[["양자리","♈","3.21~4.19"],["황소자리","♉","4.20~5.20"],["쌍둥이자리","♊","5.21~6.21"],["게자리","♋","6.22~7.22"],["사자자리","♌","7.23~8.22"],["처녀자리","♍","8.23~9.22"],["천칭자리","♎","9.23~10.22"],["전갈자리","♏","10.23~11.22"],["사수자리","♐","11.23~12.21"],["염소자리","♑","12.22~1.19"],["물병자리","♒","1.20~2.18"],["물고기자리","♓","2.19~3.20"]];
var ITEMS=["거미줄","나무장작","중급 나무장작","양털","고급 양털","밀가루","밀랍","마나 허브","블러디 허브","포이즌 허브","고급 수제 붕대","생명력 300 포션","마나 300 포션","스태미나 300 포션","철광석 조각","동광석 조각","은광석 조각","금광석 조각","아연광석 조각","철판","동봉","대못","종이학","싱싱한 풀","마법가루","부드러운 양피지","아라트의 열매","별미 미끼통","중형 미끼통","육각 볼트","펫 에센셜 오일","고급 라벤더 향초","고급 체리 향초","캠프 키트","건초 더미","매듭끈","가는 실뭉치","굵은 실뭉치"];
var MSG={top:["오늘의 1등! 미뤄 둔 도전을 시작하기 좋은 날이에요.","무엇을 해도 술술 풀리는 날. 자신 있게 가 보세요!","반짝이는 기운이 가득해요. 오늘은 내가 주인공!"],
hi:["좋은 흐름이 이어져요. 파티원과 호흡이 잘 맞을 거예요.","작은 행운이 연달아 찾아올 것 같아요.","평소보다 손이 빠른 날. 밀린 일을 정리해 보세요.","기분 좋은 소식이 들려올지도 몰라요."],
mid:["무난한 하루. 꾸준히 하던 일을 이어가면 좋아요.","천천히 가도 괜찮아요. 오늘은 준비하는 날.","가볍게 산책하듯 에린을 둘러보면 좋은 일이 있을지도.","친구에게 먼저 인사하면 기운이 올라가요."],
lo:["살짝 쉬어 가는 날. 무리하지 말고 포션을 챙기세요.","서두르면 실수가 생길 수 있어요. 한 번 더 확인!","오늘은 욕심을 줄이면 마음이 편해요."],
last:["오늘은 조금 아쉬운 날. 하지만 럭키 아이템이 지켜 줄 거예요!","12위여도 괜찮아요. 내일은 다시 올라갈 차례!"]};
/* 최근 거뿔 수집 기록(11.07~11.09)에서 실제로 언급된 채널 번호 */
var CH={"류트":[1,3,4,5,6,8,9,10,12,13,14,15,16,17,18,19,22,23,24,25,26,27,28,30,31,32,33,34,35,36,37,38],"하프":[1,2,3,4,5,6,7,8,9,10,12,13,14,15,16,17,18,19,20,21,22],"만돌린":[1,2,3,4,5,6,7,8,9,10,12,13,14],"울프":[1,2,3,4,5,6,7,8,9,10,12,13,14]};
var SRV=["류트","하프","만돌린","울프"];
/* 하우징 채널: 모든 서버의 11채널은 하우징 채널이라 추천에서 항상 제외 (위 데이터와 무관한 고정 규칙) */
var HOUSING_CHANNEL=11;
Object.keys(CH).forEach(function(k){CH[k]=CH[k].filter(function(n){return n!==HOUSING_CHANNEL})});
function h32(s){var h=2166136261>>>0;for(var i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0}return h>>>0}
function rng(seed){var a=seed>>>0;return function(){a=(a+0x6D2B79F5)>>>0;var t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}}
function kst(){var d=new Date(Date.now()+9*3600e3);return{y:d.getUTCFullYear(),m:d.getUTCMonth()+1,d:d.getUTCDate(),w:d.getUTCDay(),key:d.toISOString().slice(0,10)}}
var WD=["일","월","화","수","목","금","토"];
function ls(k,v){try{if(v===undefined)return localStorage.getItem(k);localStorage.setItem(k,v)}catch(e){return null}}
var today,rank,ohaasa=null,rankSrc="fallback";
function signIndex(name){for(var i=0;i<SIGNS.length;i++)if(SIGNS[i][0]===name)return i;return -1}
function orderFromOhaasa(data){
 if(!data||data.date!==today.key||!Array.isArray(data.signs)||data.signs.length!==12)return null;
 var idx=[],seen={};
 for(var i=0;i<data.signs.length;i++){var si=signIndex(data.signs[i]);if(si<0||seen[si])return null;seen[si]=1;idx.push(si)}
 return idx.length===12?idx:null}
function compute(){today=kst();var r=rng(h32("mabi-fortune|"+today.key)),idx=orderFromOhaasa(ohaasa);
 rankSrc=idx?"ohaasa":"fallback";
 if(!idx){idx=SIGNS.map(function(_,i){return i});for(var i=idx.length-1;i>0;i--){var j=Math.floor(r()*(i+1)),t=idx[i];idx[i]=idx[j];idx[j]=t}}
 var items=ITEMS.slice();for(var i=items.length-1;i>0;i--){var j=Math.floor(r()*(i+1)),t=items[i];items[i]=items[j];items[j]=t}
 rank=idx.map(function(si,k){var band=k===0?"top":k<=3?"hi":k<=7?"mid":k<=10?"lo":"last",pool=MSG[band];return{si:si,rank:k+1,item:items[k],msg:pool[Math.floor(r()*pool.length)]}})}
function channelFor(srv,key,sign){var list=CH[srv].filter(function(n){return n!==HOUSING_CHANNEL});if(!list.length)return null;
 var seed="mabi-channel|"+key+"|"+srv+(sign!=null&&sign!==""?"|"+sign:"");
 var r=rng(h32(seed));return list[Math.floor(r()*list.length)]}
function channel(srv,sign){return channelFor(srv,today.key,sign)}
window.mabiFortune={channelFor:channelFor,HOUSING_CHANNEL:HOUSING_CHANNEL,SIGNS:SIGNS,CH:CH};
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}
function render(){compute();var my=ls("mabi-fortune-sign"),srv=ls("mabi-fortune-server");if(SRV.indexOf(srv)<0)srv="";
 var mine=my!=null&&my!==""?rank.filter(function(x){return x.si===+my})[0]:null;
 var chMsg;
 if(!srv){chMsg='<p class="ftCh mu">서버를 고르면 오늘의 추천 채널을 알려 드려요.</p>'}
 else if(!mine){chMsg='<p class="ftCh mu">별자리를 고르면 <b>'+srv+'</b> 서버의 오늘 추천 채널을 알려 드려요.</p>'}
 else{chMsg='<p class="ftCh">오늘 <b>'+SIGNS[mine.si][0]+'</b> · <b>'+srv+'</b> 서버는 <b class="n">'+channel(srv,mine.si)+'채널</b>에서 득템하실 수 있어 보여요!</p>'}
 var srcNote=rankSrc==='ohaasa'?'순위 출처: 오하아사(ABC おはよう朝日です)':'오늘은 오하아사 발표가 없어 사이트 자체 순위예요';
 var html='<div class="ftHd"><h2>🔮 오늘의 운세 <span class="ftDate">'+today.m+'월 '+today.d+'일 ('+WD[today.w]+')</span></h2><small class="ftNote">재미로 보는 운세예요 · 실제 드롭 확률과 무관</small><small class="ftSrc">'+srcNote+'</small></div>'+
 '<div class="ftBody"><ol class="ftRank">'+rank.map(function(x){var s=SIGNS[x.si];return '<li role="button" tabindex="0" data-sign="'+x.si+'" class="'+(x.rank===1?"r1 ":x.rank<=3?"r3 ":"")+(mine&&mine.si===x.si?"me":"")+'" aria-pressed="'+(mine&&mine.si===x.si?"true":"false")+'"><b class="no">'+x.rank+'</b><span class="sg"><i aria-hidden="true">'+s[1]+'</i>'+s[0]+'</span><span class="it">'+esc(x.item)+'</span></li>'}).join("")+'</ol>'+
 '<div class="ftSide"><label class="ftMy">내 별자리 <select id="ftSign"><option value="">선택</option>'+SIGNS.map(function(s,i){return '<option value="'+i+'"'+(mine&&mine.si===i?" selected":"")+'>'+s[1]+" "+s[0]+" ("+s[2]+")</option>"}).join("")+'</select></label>'+
 (mine?'<p class="ftMsg"><b>'+SIGNS[mine.si][0]+' '+mine.rank+'위</b> '+esc(mine.msg)+'<br><span>럭키 아이템 · '+esc(mine.item)+'</span></p>':'<p class="ftMsg mu">별자리를 고르면 오늘의 한마디를 알려 드려요. 1위는 <b>'+SIGNS[rank[0].si][0]+'</b>!</p>')+
 '<div class="ftSrv" role="group" aria-label="서버 선택">'+SRV.map(function(s){return '<button type="button" data-srv="'+s+'"'+(s===srv?' class="on" aria-pressed="true"':' aria-pressed="false"')+'>'+s+'</button>'}).join("")+'</div>'+
 chMsg+'</div></div>';
 root.innerHTML=html;
 root.querySelector("#ftSign").addEventListener("change",function(){ls("mabi-fortune-sign",this.value);render()});
 root.querySelectorAll("[data-srv]").forEach(function(b){b.addEventListener("click",function(){ls("mabi-fortune-server",b.dataset.srv);render()})});
 root.querySelectorAll("[data-sign]").forEach(function(li){function pick(){ls("mabi-fortune-sign",li.dataset.sign);render()}
  li.addEventListener("click",pick);li.addEventListener("keydown",function(e){if(e.key==="Enter"||e.key===" "){e.preventDefault();pick()}})})}
function boot(){
 fetch("/fortune/ohaasa.json",{cache:"no-store"}).then(function(r){return r.ok?r.json():null}).then(function(d){ohaasa=d;render()}).catch(function(){ohaasa=null;render()});
}
boot();
/* 자정(KST) 넘어가면 새로 · 오하아사 JSON도 다시 받음 */
setInterval(function(){if(kst().key!==today.key)boot()},60e3);
})();
