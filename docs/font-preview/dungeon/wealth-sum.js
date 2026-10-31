/* 전재산 합계 내역 (v1.4.2) — c.wh 기록에서 합계 시계열을 재구성. 저장소 키 추가 없음. */
(function(){
/* index.html 본체는 IIFE 안이라 state/fmtWealth/modal 이 전역이 아님 → __passTracker 로 접근 */
var PT=window.__passTracker||{};
var modal=document.getElementById('modal'), mask=document.getElementById('mask');
function fmtWealth(g){ return PT.fmtWealth?PT.fmtWealth(g):Math.round(g).toLocaleString('ko-KR'); }
var state={get chars(){ var s=PT.getState&&PT.getState(); return (s&&s.chars)||[]; }};
var wsRange='1m', UID=0;
function sumSeries(cs){
  var ts=[]; cs.forEach(function(c){ (c.wh||[]).forEach(function(e){ ts.push(e.t); }); });
  ts=ts.sort(function(a,b){return a-b;}).filter(function(t,i,a){ return i===0||a[i-1]!==t; });
  return ts.map(function(t){
    var s=0, any=false;
    cs.forEach(function(c){
      var wh=c.wh||[], v=null, i;
      if(!wh.length) v=c.wealth;
      else { for(i=wh.length-1;i>=0;i--) if(wh[i].t<=t){ v=wh[i].n; break; } if(i<0) v=wh[0].o; }
      if(v!=null){ s+=v; any=true; }
    });
    return {t:t, v:any?s:null};
  }).filter(function(p){ return p.v!=null; });
}
window.sumSeries=sumSeries;
/* 그래프용: 마지막 기록 이후 '지금' 시점까지 현재 합계로 이어서, 기록 1개여도 선이 보이게 */
function withNow(S){
  var cur=0,set=0; state.chars.forEach(function(c){ if(c.wealth!=null){ cur+=c.wealth; set++; } });
  if(!set) return S;
  var now=Date.now(), L=S[S.length-1];
  if(!L) return [{t:now-864e5,v:cur},{t:now,v:cur}];
  if(L.t<now-6e4) return S.concat([{t:now,v:cur}]);
  if(S.length<2) return [{t:L.t-864e5,v:L.v}].concat(S);
  return S;
}
function fm(v){ return fmtWealth(Math.round(v)); }
function md2(t){ var d=new Date(t); return (d.getMonth()+1)+'/'+d.getDate(); }
function chart(pts,W,H,mini){
  if(pts.length<2) return '';
  var p=mini?2:28, xs=pts.map(function(q){return q.t;}), vs=pts.map(function(q){return q.v;});
  var x0=Math.min.apply(0,xs), x1=Math.max.apply(0,xs), lo=Math.min.apply(0,vs), hi=Math.max.apply(0,vs);
  var pad=(hi-lo)*0.08 || Math.max(1,hi*0.02), y0=lo-pad, y1=hi+pad;
  function X(t){ return p+(x1===x0?0.5:(t-x0)/(x1-x0))*(W-p*2); }
  function Y(v){ return H-p-(v-y0)/(y1-y0)*(H-p*2); }
  var line=pts.map(function(q,i){ return (i?'L':'M')+X(q.t).toFixed(1)+' '+Y(q.v).toFixed(1); }).join(' ');
  var area=line+' L'+X(x1).toFixed(1)+' '+(H-p)+' L'+X(x0).toFixed(1)+' '+(H-p)+'Z';
  var g='', id='wsg'+(++UID);
  if(!mini){
    for(var k=0;k<4;k++){ var v=y0+(y1-y0)*k/3; g+='<line x1="'+p+'" x2="'+(W-p)+'" y1="'+Y(v)+'" y2="'+Y(v)+'" stroke="rgba(255,255,255,.08)"/><text x="'+(W-p)+'" y="'+(Y(v)-4)+'" fill="#8c85b8" font-size="11" text-anchor="end">'+fm(v)+'</text>'; }
    [x0,(x0+x1)/2,x1].forEach(function(t,j){ g+='<text x="'+X(t)+'" y="'+(H-8)+'" fill="#8c85b8" font-size="11" text-anchor="'+(j===0?'start':j===2?'end':'middle')+'">'+md2(t)+'</text>'; });
    g+=pts.map(function(q){ return '<circle cx="'+X(q.t)+'" cy="'+Y(q.v)+'" r="2.5" fill="#1b1636" stroke="#f7d98b" stroke-width="1.5"/>'; }).join('');
  }
  var L=pts[pts.length-1];
  return '<svg viewBox="0 0 '+W+' '+H+'" width="'+W+'" height="'+H+'" preserveAspectRatio="none"><defs><linearGradient id="'+id+'" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7d98b" stop-opacity=".28"/><stop offset="1" stop-color="#f7d98b" stop-opacity="0"/></linearGradient></defs>'+g+'<path d="'+area+'" fill="url(#'+id+')"/><path d="'+line+'" fill="none" stroke="#f7d98b" stroke-width="'+(mini?1.5:2)+'" vector-effect="non-scaling-stroke"/><circle cx="'+X(L.t)+'" cy="'+Y(L.v)+'" r="'+(mini?2.2:4.5)+'" fill="#f7d98b"/></svg>';
}
var css=document.createElement('style');
css.textContent='#wealthLine.wsc{cursor:pointer;border-radius:8px;display:inline-flex;align-items:center;gap:6px;flex-wrap:wrap;justify-content:center}#wealthLine.wsc:hover{background:rgba(247,217,139,.08)}#wsSpark{display:inline-block;vertical-align:middle;line-height:0}#wsSpark{display:inline-flex;align-items:center;gap:4px;padding:2px 6px;border-radius:6px;background:rgba(247,217,139,.08);border:1px solid rgba(247,217,139,.22)}#wsSpark svg{display:block}#wsSpark .wsMore{font-size:12px;line-height:1}'+
'.wsBig{font-size:26px;font-weight:800;color:#f7d98b;margin:2px 0 4px}.wsBig small{display:block;font-size:13px;font-weight:700;margin-top:2px}'+
'.wsTg{display:flex;gap:6px;margin:10px 0 6px}.wsTg button{padding:5px 12px;border-radius:999px;border:1px solid rgba(255,255,255,.18);background:transparent;color:#b9b2e0;font:inherit;font-size:13px;cursor:pointer}.wsTg button.on{background:rgba(247,217,139,.18);border-color:rgba(247,217,139,.6);color:#ffe7a3;font-weight:700}'+
'#wsCh{border-radius:10px;background:rgba(0,0,0,.25);padding:4px 0;min-height:60px}#wsCh svg{display:block;width:100%;height:220px}#wsCh .em{padding:30px 10px;text-align:center;color:#9f98c9;font-size:13px}'+
'.wsl li{grid-template-columns:70px 1fr auto}';
document.head.appendChild(css);

window.wsSpark=function(){
  var wl=document.getElementById('wealthLine'); if(!wl) return;
  wl.classList.add('wsc'); wl.setAttribute('data-act','wsOpen'); wl.setAttribute('title','전재산 합계 내역 보기'); wl.setAttribute('role','button');
  var G=withNow(sumSeries(state.chars)), sp=document.createElement('span'); sp.id='wsSpark';
  sp.innerHTML=G.length>=2?chart(G,64,20,true):'<svg viewBox="0 0 64 20" width="64" height="20"><path d="M2 10 H62" stroke="#f7d98b" stroke-opacity=".45" stroke-width="1.5" stroke-dasharray="3 3"/></svg>';
  sp.insertAdjacentHTML('beforeend','<span class="wsMore">📈</span>');
  wl.appendChild(sp);
};
function filt(S){
  if(wsRange==='all' || !S.length) return S;
  var cut=Date.now()-(wsRange==='1w'?7:30)*864e5;
  var out=S.filter(function(p){ return p.t>=cut; });
  var prev=null; for(var i=S.length-1;i>=0;i--) if(S[i].t<cut){ prev=S[i]; break; }
  if(prev) out.unshift({t:cut, v:prev.v});   // 구간 시작값 이어붙이기
  return out;
}
function render(){
  var S=sumSeries(state.chars), F=filt(withNow(S));
  var cur=0, set=0, unset=[]; state.chars.forEach(function(c){ if(c.wealth!=null){ cur+=c.wealth; set++; } else unset.push(c.name); });
  var h='<h3>💰 전재산 합계 내역</h3>';
  h+='<div class="wsBig">'+(set?fm(cur)+' G':'—');
  if(S.length>=2){ var d=S[S.length-1].v-S[0].v; h+='<small style="color:'+(d>=0?'#7fd69a':'#ff8a8a')+'">'+(d>=0?'▲ +':'▼ −')+fm(Math.abs(d))+' G <span style="color:#9f98c9;font-weight:400">(기록 시작 '+md2(S[0].t)+' 대비)</span></small>'; }
  h+='</div><div class="wsTg">'+[['1w','1주'],['1m','1달'],['all','전체']].map(function(r){ return '<button type="button" data-ws-r="'+r[0]+'"'+(r[0]===wsRange?' class="on"':'')+'>'+r[1]+'</button>'; }).join('')+'</div>';
  h+='<div id="wsCh">'+(F.length>=2?chart(F,600,220,false):'<div class="em">'+(S.length<1?'캐릭터 카드에서 전재산을 입력하면 그래프가 나타나요':'이 기간에는 변경 기록이 없어요')+'</div>')+'</div>';
  h+='<p class="note">입력된 캐릭터 '+set+'명 합계'+(unset.length?' · '+unset.join(', ')+'은(는) 전재산 미입력이라 제외':'')+' · 각 캐릭터의 📜 내역으로 계산해요</p>';
  if(S.length>=2){
    h+='<ul class="whl wsl">';
    for(var i=S.length-1;i>0&&i>S.length-6;i--){ var dd=S[i].v-S[i-1].v; h+='<li><span class="wt">'+md2(S[i].t)+'</span><b class="wd" style="color:'+(dd>=0?'#7fd69a':'#ff8a8a')+'">'+(dd>=0?'+':'−')+fm(Math.abs(dd))+'</b><span class="wn">'+fm(S[i].v)+' G</span></li>'; }
    h+='</ul>';
  }
  h+='<div class="acts"><button type="button" class="btn gold" data-m="close">닫기</button></div>';
  modal.innerHTML=h;
}
window.wsOpen=function(){ mask.hidden=false; render(); };
document.addEventListener('click', function(e){
  var r=e.target.closest('[data-ws-r]'); if(r && modal.contains(r)){ wsRange=r.getAttribute('data-ws-r'); render(); return; }
  var w=e.target.closest('#wealthLine'); if(w){ e.stopPropagation(); window.wsOpen(); }
}, true);
if(PT.render) try{ PT.render(); }catch(e){ console.error(e); }
})();
