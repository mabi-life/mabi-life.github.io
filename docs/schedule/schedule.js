/* 마비노기 파티 스케줄 — localStorage 전용, 시간은 모두 KST */
(function(){
"use strict";
var KEY="mabi-schedule-v1",H9=9*3600e3,DAY=86400e3,WD=["일","월","화","수","목","금","토"],SRV=["류트","하프","만돌린","울프"];
var $=function(id){return document.getElementById(id)};
function load(){try{var d=JSON.parse(localStorage.getItem(KEY)||"null");if(d&&Array.isArray(d.items))return{items:d.items,st:d.st||{},noti:d.noti||{on:false,min:10}}}catch(e){}return{items:[],st:{},noti:{on:false,min:10}}}
var S=load();
function save(){try{localStorage.setItem(KEY,JSON.stringify(S))}catch(e){toast("저장 공간이 부족해요")}}
/* KST helpers: 'kst day number' = floor((utc+9h)/DAY) */
function kday(ms){return Math.floor((ms+H9)/DAY)}
function ymd(dn){var d=new Date(dn*DAY);return d.toISOString().slice(0,10)}
function dnOf(s){var p=s.split("-");return Math.floor(Date.UTC(+p[0],p[1]-1,+p[2])/DAY)}
function wdOf(dn){return new Date(dn*DAY).getUTCDay()}
function at(dn,hm){var p=hm.split(":");return dn*DAY-H9+(+p[0])*3600e3+(+p[1])*60e3}
function md(dn){var d=new Date(dn*DAY);return(d.getUTCMonth()+1)+"."+String(d.getUTCDate()).padStart(2,"0")}
function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]})}
function uid(){return Date.now().toString(36)+Math.random().toString(36).slice(2,7)}
function left(ms){var m=Math.round(ms/60e3);if(m<1)return"곧 시작";if(m<60)return m+"분 남음";var h=Math.floor(m/60);m%=60;if(h<24)return h+"시간 "+(m?m+"분 ":"")+"남음";var d=Math.floor(h/24);h%=24;return d+"일 "+(h?h+"시간 ":"")+"남음"}
/* occurrences in [dn0, dn1) */
function occ(dn0,dn1){var out=[];S.items.forEach(function(it){
 if(it.kind==="once"){if(!it.date)return;var dn=dnOf(it.date);if(dn>=dn0&&dn<dn1)out.push(mk(it,dn));return}
 var from=it.since?dnOf(it.since):-1e9;
 for(var dn=dn0;dn<dn1;dn++){if(dn>=from&&(it.days||[]).indexOf(wdOf(dn))>=0)out.push(mk(it,dn))}});
 return out.sort(function(a,b){return a.t-b.t})}
function mk(it,dn){var k=it.id+"|"+ymd(dn);return{it:it,dn:dn,t:at(dn,it.time||"00:00"),k:k,st:S.st[k]||""}}
function tags(it){return '<span class="tag '+(it.kind==="once"?"one\">일회성":"fix\">고정")+'</span>'+(it.server?'<span class="tag s-'+esc(it.server)+'">'+esc(it.server)+'</span>':"")}
/* ---------- render ---------- */
var wOff=0,mOff=0,upAll=false,VIEW_KEY="mabi-schedule-view",MAX_M=3;
var viewMode=(function(){try{return localStorage.getItem(VIEW_KEY)==="month"?"month":"week"}catch(e){return"week"}})();
function setView(m){viewMode=m==="month"?"month":"week";try{localStorage.setItem(VIEW_KEY,viewMode)}catch(e){}syncView();render()}
function syncView(){var week=viewMode==="week";$("vWeek").classList.toggle("on",week);$("vMonth").classList.toggle("on",!week);$("vWeek").setAttribute("aria-pressed",week?"true":"false");$("vMonth").setAttribute("aria-pressed",week?"false":"true");$("scWeekWrap").hidden=!week;$("scMonthWrap").hidden=week}
function moStart(dn){var d=new Date(dn*DAY);return Math.floor(Date.UTC(d.getUTCFullYear(),d.getUTCMonth(),1)/DAY)}
function addMo(dn,n){var d=new Date(dn*DAY);return Math.floor(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+n,1)/DAY)}
function moLabel(dn){var d=new Date(dn*DAY);return d.getUTCFullYear()+"년 "+(d.getUTCMonth()+1)+"월"}

function render(){var now=Date.now(),td=kday(now);
 /* upcoming 14 days (현재 진행 중 2시간 이내도 포함) */
 var up=occ(td-1,td+15).filter(function(o){return o.t>=now-2*3600e3});
 var nx=up.filter(function(o){return o.t>=now&&!o.st})[0];
 $("scNext").innerHTML=nx?'<span class="mu">다음 일정</span> <b>'+left(nx.t-now)+'</b><span>'+esc(nx.it.title)+' · '+md(nx.dn)+"("+WD[wdOf(nx.dn)]+") "+esc(nx.it.time)+'</span>'+tags(nx.it):'<span class="mu">'+(S.items.length?"14일 안에 남은 일정이 없어요":"아직 일정이 없어요. 「＋ 일정 추가」로 파티 약속을 적어 보세요.")+'</span>';
 var LIM=8,upShow=upAll?up.slice(0,40):up.slice(0,LIM);
 $("scUp").innerHTML=up.length?upShow.map(function(o){var past=o.t<now;
  return '<li class="'+o.st+'" data-k="'+o.k+'" data-id="'+o.it.id+'"><div><span class="t">'+esc(o.it.title)+'</span>'+tags(o.it)+'<div class="w">'+md(o.dn)+" ("+WD[wdOf(o.dn)]+") "+esc(o.it.time)+(o.dn===td?" · 오늘":o.dn===td+1?" · 내일":"")+'</div></div><div class="left">'+(o.st==="done"?"완료":o.st==="skip"?"불참":past?"진행 중":left(o.t-now))+'</div>'+
  (o.it.memo?'<div class="memo">'+esc(o.it.memo)+'</div>':"")+
  '<div class="acts"><button type="button" class="scBtn sm'+(o.st==="done"?" on":"")+'" data-act="done">✓ 완료</button><button type="button" class="scBtn sm'+(o.st==="skip"?" on no":"")+'" data-act="skip">✕ 불참</button><button type="button" class="scBtn sm" data-act="edit">수정</button></div></li>'}).join(""):'<li class="em">다가오는 일정이 없어요</li>';
 /* week (월~일) */
 var mon=td-((wdOf(td)+6)%7)+wOff*7,wk=occ(mon,mon+7);
 $("scWkT").textContent=wOff===0?"이번 주":md(mon)+" ~ "+md(mon+6);
 var h="";for(var i=0;i<7;i++){var dn=mon+i,evs=wk.filter(function(o){return o.dn===dn});
  h+='<div class="scDay'+(dn===td?" today":dn<td?" past":"")+'"><h3><b>'+WD[wdOf(dn)]+'</b><span>'+md(dn)+'</span></h3>'+evs.map(function(o){return '<div class="scEv '+(o.it.kind==="once"?"one ":"")+o.st+'" data-id="'+o.it.id+'" title="'+esc(o.it.memo||"")+'"><i>'+esc(o.it.time)+(o.it.server?" · "+esc(o.it.server):"")+'</i>'+esc(o.it.title)+'</div>'}).join("")+'</div>'}
 $("scWeek").innerHTML=h;
 /* month */
 var m0=addMo(moStart(td),mOff),m1=addMo(m0,1),g0=m0-wdOf(m0),g1=g0+42,mevs=occ(g0,g1);
 $("scMoT").textContent=mOff===0?"이번 달 · "+moLabel(m0):moLabel(m0);
 var mh="";for(var mi=0;mi<42;mi++){var mdn=g0+mi,out=mdn<m0||mdn>=m1,wd=wdOf(mdn),evs=mevs.filter(function(o){return o.dn===mdn}),show=evs.slice(0,MAX_M),more=evs.length-show.length;
  var dcls=wd===0?"sun":wd===6?"sat":"";
  mh+='<div class="scMDay'+(mdn===td?" today":"")+(out?" out":"")+'" data-dn="'+mdn+'" role="button" tabindex="0" aria-label="'+ymd(mdn)+'"><div class="d"><span class="'+dcls+'">'+new Date(mdn*DAY).getUTCDate()+'</span>'+(mdn===td?'<span class="badge">오늘</span>':"")+'</div>';
  mh+=show.map(function(o){return '<div class="scEv '+(o.it.kind==="once"?"one ":"")+o.st+'" data-id="'+o.it.id+'" title="'+esc(o.it.memo||"")+'"><i>'+esc(o.it.time)+'</i>'+esc(o.it.title)+'</div>'}).join("");
  if(more>0)mh+='<div class="scMore">+'+more+'</div>';
  mh+='</div>'}
 $("scMonth").innerHTML=mh;
 /* all */
 $("scCnt").textContent=S.items.length?S.items.length+"개":"";
 $("scAll").innerHTML=S.items.length?S.items.slice().sort(function(a,b){return(a.kind>b.kind?-1:a.kind<b.kind?1:0)||(a.time>b.time?1:-1)}).map(function(it){
  var when=it.kind==="once"?(it.date?md(dnOf(it.date))+" ("+WD[wdOf(dnOf(it.date))]+")":"날짜 없음"):"매주 "+(it.days||[]).slice().sort(function(a,b){return((a+6)%7)-((b+6)%7)}).map(function(d){return WD[d]}).join("·");
  return '<li><div class="r"><b>'+esc(it.title)+'</b><button type="button" class="scBtn sm" data-edit="'+it.id+'">수정</button></div><div>'+tags(it)+'</div><div class="w">'+when+" "+esc(it.time)+' KST</div>'+(it.memo?'<div class="memo">'+esc(it.memo)+'</div>':"")+'</li>'}).join(""):'<li class="em">등록한 일정이 없어요</li>';
}
/* ---------- form ---------- */
var editId=null;
$("fDays").innerHTML=[1,2,3,4,5,6,0].map(function(d){return '<label><input type="checkbox" value="'+d+'"> '+WD[d]+'</label>'}).join("");
function kindSync(){var once=document.querySelector('input[name=fKind]:checked').value==="once";$("fDaysBox").hidden=once;$("fDateBox").hidden=!once}
document.querySelectorAll("input[name=fKind]").forEach(function(r){r.addEventListener("change",kindSync)});
function openForm(it,prefDn){editId=it?it.id:null;$("scForm").hidden=false;$("scFormT").textContent=it?"일정 수정":"일정 추가";$("fDel").hidden=!it;
 $("fTitle").value=it?it.title:"";$("fSrv").value=it?it.server||"":(localStorage.getItem("mabi-schedule-srv")||"");$("fTime").value=it?it.time:"21:00";$("fMemo").value=it?it.memo||"":"";
 var td=kday(Date.now()),useDn=prefDn!=null?prefDn:td;
 var kind=it?it.kind:(prefDn!=null?"once":"weekly");document.querySelector('input[name=fKind][value='+kind+']').checked=true;
 $("fDate").value=it&&it.date?it.date:ymd(useDn);
 var days=it&&it.days?it.days:[wdOf(useDn)];$("fDays").querySelectorAll("input").forEach(function(c){c.checked=days.indexOf(+c.value)>=0});
 kindSync();$("scForm").scrollIntoView({block:"nearest",behavior:"smooth"});$("fTitle").focus()}
function openForDate(dn){openForm(null,dn)}
function closeForm(){$("scForm").hidden=true;editId=null}
$("scAdd").onclick=function(){openForm(null)};$("fCancel").onclick=closeForm;
$("scForm").addEventListener("submit",function(e){e.preventDefault();
 var kind=document.querySelector('input[name=fKind]:checked').value,days=[].map.call($("fDays").querySelectorAll("input:checked"),function(c){return +c.value});
 var title=$("fTitle").value.trim();if(!title){$("fTitle").focus();return}
 if(kind==="weekly"&&!days.length){toast("요일을 하나 이상 골라 주세요");return}
 if(kind==="once"&&!$("fDate").value){toast("날짜를 골라 주세요");return}
var wasEdit=!!editId; var it=editId?S.items.filter(function(x){return x.id===editId})[0]:null;
 if(!it){it={id:uid(),since:ymd(kday(Date.now()))};S.items.push(it)}
 it.title=title;it.server=$("fSrv").value;it.time=$("fTime").value||"21:00";it.memo=$("fMemo").value.trim();it.kind=kind;
 if(kind==="once"){it.date=$("fDate").value;delete it.days}else{it.days=days;delete it.date}
 if(it.server)try{localStorage.setItem("mabi-schedule-srv",it.server)}catch(e){}
 save();closeForm();render();toast(wasEdit?"수정했어요":"추가했어요")});
$("fDel").onclick=function(){if(!editId)return;var it=S.items.filter(function(x){return x.id===editId})[0];
 if(!confirm("「"+(it?it.title:"")+"」 일정을 삭제할까요?"+(it&&it.kind==="weekly"?"\n(고정 일정은 모든 회차가 함께 지워져요)":"")))return;
 S.items=S.items.filter(function(x){return x.id!==editId});Object.keys(S.st).forEach(function(k){if(k.indexOf(editId+"|")===0)delete S.st[k]});save();closeForm();render();toast("삭제했어요")};
function byId(id){return S.items.filter(function(x){return x.id===id})[0]}
document.addEventListener("click",function(e){if(e.target.id==="upMore"){upAll=!upAll;render();return}
 var day=e.target.closest(".scMDay");if(day&&!e.target.closest(".scEv")){openForDate(+day.dataset.dn);return}
 var b=e.target.closest("[data-act],[data-edit],.scEv");if(!b)return;
 if(b.dataset.edit){openForm(byId(b.dataset.edit));return}
 if(b.classList.contains("scEv")){openForm(byId(b.dataset.id));return}
 var li=b.closest("li[data-k]");if(!li)return;var k=li.dataset.k,a=b.dataset.act;
 if(a==="edit"){openForm(byId(li.dataset.id));return}
 if(S.st[k]===a)delete S.st[k];else S.st[k]=a;save();render()});
document.addEventListener("keydown",function(e){if(e.key!=="Enter"&&e.key!==" ")return;var day=e.target.closest&&e.target.closest(".scMDay");if(!day)return;e.preventDefault();openForDate(+day.dataset.dn)});
$("wPrev").onclick=function(){wOff--;render()};$("wNext").onclick=function(){wOff++;render()};$("wNow").onclick=function(){wOff=0;render()};
$("mPrev").onclick=function(){mOff--;render()};$("mNext").onclick=function(){mOff++;render()};$("mNow").onclick=function(){mOff=0;render()};
$("vWeek").onclick=function(){setView("week")};$("vMonth").onclick=function(){setView("month")};
/* ---------- backup ---------- */
$("scExport").onclick=function(){var blob=new Blob([JSON.stringify({app:"mabi-life-schedule",v:1,at:new Date().toISOString(),items:S.items,st:S.st},null,1)],{type:"application/json"});
 var a=document.createElement("a");a.href=URL.createObjectURL(blob);a.download="mabi-schedule-"+ymd(kday(Date.now()))+".json";document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},500)};
$("scImport").addEventListener("change",function(){var f=this.files[0];this.value="";if(!f)return;var r=new FileReader();
 r.onload=function(){try{var d=JSON.parse(r.result);if(!d||!Array.isArray(d.items))throw 0;
  var ok=d.items.filter(function(x){return x&&x.id&&x.title&&(x.kind==="once"||x.kind==="weekly")}).map(function(x){return{id:String(x.id),title:String(x.title).slice(0,40),server:SRV.indexOf(x.server)>=0?x.server:"",time:/^\d\d:\d\d$/.test(x.time)?x.time:"21:00",memo:String(x.memo||"").slice(0,120),kind:x.kind,date:x.kind==="once"?String(x.date||""):undefined,days:x.kind==="weekly"?(x.days||[]).map(Number).filter(function(n){return n>=0&&n<7}):undefined,since:x.since}});
  if(!confirm("백업의 일정 "+ok.length+"개로 지금 일정 "+S.items.length+"개를 바꿀까요?"))return;
  S.items=ok;S.st=d.st&&typeof d.st==="object"?d.st:{};save();render();toast("불러왔어요")}catch(e){toast("백업 파일을 읽지 못했어요")}};r.readAsText(f)});
/* ---------- notification (탭이 열려 있을 때만) ---------- */
$("scNoti").checked=!!S.noti.on&&"Notification"in window&&Notification.permission==="granted";$("scNotiMin").value=String(S.noti.min||10);
$("scNoti").addEventListener("change",function(){var c=this;if(!c.checked){S.noti.on=false;save();return}
 if(!("Notification"in window)){c.checked=false;toast("이 브라우저는 알림을 지원하지 않아요");return}
 Notification.requestPermission().then(function(p){if(p==="granted"){S.noti.on=true;save();toast("탭이 열려 있으면 "+S.noti.min+"분 전에 알려 드려요")}else{c.checked=false;S.noti.on=false;save();toast("브라우저에서 알림이 차단됐어요")}})});
$("scNotiMin").addEventListener("change",function(){S.noti.min=+this.value;save()});
function tick(){render();if(!S.noti.on||!("Notification"in window)||Notification.permission!=="granted")return;
 var now=Date.now(),win=(S.noti.min||10)*60e3,sent;try{sent=JSON.parse(localStorage.getItem("mabi-schedule-sent")||"{}")}catch(e){sent={}}
 occ(kday(now)-1,kday(now)+2).forEach(function(o){if(o.st||sent[o.k])return;var d=o.t-now;if(d>0&&d<=win){sent[o.k]=now;
  try{new Notification("마비노기 스케줄 · "+o.it.title,{body:o.it.time+" 시작 ("+left(d)+")"+(o.it.server?" · "+o.it.server:"")+(o.it.memo?"\n"+o.it.memo:""),tag:o.k})}catch(e){}}});
 Object.keys(sent).forEach(function(k){if(now-sent[k]>3*DAY)delete sent[k]});try{localStorage.setItem("mabi-schedule-sent",JSON.stringify(sent))}catch(e){}}
var tt;function toast(m){var t=$("scToast");t.textContent=m;t.classList.add("on");clearTimeout(tt);tt=setTimeout(function(){t.classList.remove("on")},1800)}
syncView();render();setInterval(tick,30e3);document.addEventListener("visibilitychange",function(){if(!document.hidden)render()});
/* 시간·날짜 칸 아무 곳이나 클릭하면 피커 열기 */
["fTime","fDate"].forEach(function(id){var el=$(id);if(!el)return;el.addEventListener("click",function(){if(typeof el.showPicker!=="function")return;try{el.showPicker()}catch(e){}})});
})();
