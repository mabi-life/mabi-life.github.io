/* 홈 「이벤트 정보」 — events/events.json 의 기간으로 현재 이벤트만 표시. 공식 안내는 링크로. */
(function(){
"use strict";
var root=document.getElementById("events");
if(!root)return;

function kstNow(){return new Date(Date.now())}
function parseWhen(s){
 if(!s)return null;
 var t=Date.parse(s);
 return isNaN(t)?null:new Date(t);
}
function daysLeft(end){
 var ms=end.getTime()-Date.now();
 if(ms<=0)return 0;
 return Math.ceil(ms/864e5);
}
function esc(s){return String(s).replace(/[&<>"]/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]})}

function phaseOf(ev, now){
 var start=parseWhen(ev.start), end=parseWhen(ev.end), shop=parseWhen(ev.shop_end);
 if(start&&now<start)return null;
 if(end&&now<end)return "live";
 if(shop&&now<shop)return "shop";
 return null;
}

function remainText(ev, phase){
 var end=parseWhen(phase==="shop"?ev.shop_end:ev.end);
 if(!end)return "";
 var n=daysLeft(end);
 if(n<=0)return "";
 if(n===1)return "내일까지";
 return n+"일 남음";
}

function spotFig(s, i){
 var n=s.n||(i+1);
 var id=esc(String(s.id||n));
 var who=s.who?'<span>'+esc(s.who)+"</span>":"";
 var alt=esc((s.name||"")+(s.who?" — "+s.who:""));
 return '<figure class="evSpot" id="ev-spot-'+id+'">'+
  '<span class="evN" aria-hidden="true">'+esc(String(n))+"</span>"+
  (s.photo?'<img src="'+esc(s.photo)+'" alt="'+alt+'" width="800" height="800">':"")+
  "<figcaption><strong>"+esc(s.name||"")+"</strong>"+who+"</figcaption></figure>";
}

function spotsBlock(ev){
 var spots=Array.isArray(ev.spots)?ev.spots:[];
 var map=ev.map||{};
 if(!map.src&&!spots.length)return "";
 var mid=Math.ceil(spots.length/2);
 var left=spots.slice(0,mid);
 var right=spots.slice(mid);
 var pins="";
 if(spots.length&&map.src){
  pins='<ol class="evPins">'+spots.map(function(s,i){
   var n=s.n||(i+1);
   var id=esc(String(s.id||n));
   var title=esc(n+". "+(s.name||""));
   return '<li><a href="#ev-spot-'+id+'" style="left:'+Number(s.x)+'%;top:'+Number(s.y)+'%" title="'+title+'">'+esc(String(n))+"</a></li>";
  }).join("")+"</ol>";
 }
 var mapHtml="";
 if(map.src){
  var cap=map.caption?'<figcaption>'+esc(map.caption)+"</figcaption>":"";
  mapHtml='<figure class="evMap"><div class="evMapBox"><img src="'+esc(map.src)+'" alt="'+esc(map.alt||map.caption||"지도")+'" width="462" height="410">'+pins+"</div>"+cap+"</figure>";
 }
 if(!spots.length)return mapHtml;
 var L='<div class="evSpots evSpotsL">'+left.map(spotFig).join("")+"</div>";
 var R='<div class="evSpots evSpotsR">'+right.map(function(s,i){return spotFig(s,i+mid)}).join("")+"</div>";
 return '<div class="evGallery">'+L+mapHtml+R+"</div>";
}


function weekIndex(weeks, ev){
 var evEnd=parseWhen(ev&&ev.end);
 if(evEnd&&Date.now()>=evEnd.getTime())return -1;
 var cur=-1;
 for(var i=0;i<weeks.length;i++){
  var s=parseWhen(weeks[i].start);
  if(s&&Date.now()>=s.getTime())cur=i;
 }
 return cur;
}

function weekTable(ev){
 var w=ev.weekly;
 if(!w||!Array.isArray(w.weeks)||!w.weeks.length)return "";
 var weeks=w.weeks;
 var cur=weekIndex(weeks, ev);
 function headCls(i){return i===cur?' class="on"':""}
 function cellCls(i, extra){
  var c=(i===cur?"on":"")+(extra?" "+extra:"");
  return c?' class="'+c.trim()+'"':"";
 }
 var heads="<tr><th>구분</th>"+weeks.map(function(wk,i){
  var tag=i===cur?"<small>이번 주</small>":"";
  return "<th"+headCls(i)+">"+esc(wk.label||"")+tag+"</th>";
 }).join("")+"</tr>";
 function row(label, key, kind){
  return "<tr><th>"+esc(label)+"</th>"+weeks.map(function(wk,i){
   var v=wk[key]==null?"":String(wk[key]);
   var extra=kind==="num"?(v==="-"||v==="—"?"dash num":"num"):"";
   return "<td"+cellCls(i, extra)+">"+esc(v)+"</td>";
  }).join("")+"</tr>";
 }
 return '<div class="evWeek"><h4>'+esc(w.title||"주차별 모모 등장")+"</h4><table><thead>"+heads+"</thead><tbody>"+
  row("등장 일시","when")+
  row("등장 지역","where")+
  row("모모","momo","num")+
  row("복주머니 모모","pouch","num")+
  "</tbody></table></div>";
}

function card(ev, phase){
 var badge=phase==="shop"?"상점 연장":"진행 중";
 var badgeCls=phase==="shop"?"evBadge shop":"evBadge";
 var remain=remainText(ev, phase);
 var period=esc(ev.period_label||"");
 if(remain)period+=' · <b>'+esc(remain)+"</b>";
 var points=Array.isArray(ev.points)?ev.points:[];
 if(phase==="shop"&&ev.shop_note){
  points=[ev.shop_note].concat(points.filter(function(p){return p!==ev.shop_note}));
 }
 var pts=points.map(function(p){return "<li>"+esc(p)+"</li>"}).join("");
 var href=esc(ev.official||"");
 var go=href?'<a class="evGo" href="'+href+'" target="_blank" rel="noopener noreferrer">공식 이벤트 안내</a>':"";
 return '<li class="evCard">'+
  '<div class="evTop"><h3 class="evTitle">'+esc(ev.title||"")+'</h3><span class="'+badgeCls+'">'+badge+"</span></div>"+
  (period?'<p class="evPeriod">'+period+"</p>":"")+
  weekTable(ev)+
  (pts?'<ul class="evPoints">'+pts+"</ul>":"")+
  spotsBlock(ev)+
  '<div class="evFoot">'+go+'<p class="evSrc">넥슨 공식 안내 기준 · 이 사이트는 비공식 팬 도구입니다</p></div>'+
  "</li>";
}

function render(data){
 var now=kstNow();
 var list=(data&&data.events||[]).map(function(ev){
  var ph=phaseOf(ev, now);
  return ph?{ev:ev,ph:ph}:null;
 }).filter(Boolean);
 if(!list.length){
  root.innerHTML="";
  root.hidden=true;
  return;
 }
 root.innerHTML='<div class="evHd"><h2>이벤트 정보</h2><small class="evNote">한국 서버 · 기간이 끝나면 자동으로 내려갑니다</small></div>'+
  '<ul class="evList">'+list.map(function(x){return card(x.ev,x.ph)}).join("")+"</ul>";
 root.hidden=false;
}

fetch("/events/events.json",{cache:"no-store"}).then(function(r){return r.ok?r.json():null}).then(function(d){render(d)}).catch(function(){render(null)});
})();
