// 서버별 거뿔(거대한 외침의 뿔피리) 내역 — /horn_history.json (캐릭터명 미저장). #horn / #horn-하프 로 바로가기
(function(){var D=null,S=localStorage.getItem('hornSrv')||'하프',L=document.getElementById('hList'),Q=document.getElementById('hQ'),LIM=300,C=localStorage.getItem('hornCat')||'';
var RX={r:/(딜|탱|힐|세|서|법|궁|냥|댄|전|알|석|수|도|힐러|딜러|탱커|세가|서폿|서포터|법사|궁수|음유|연주|바드|전사|격가|인형|체인|듀얼|암살|도적|마법사|전투|대검|석궁|장궁)\s*\d+(\s*[~\-]\s*\d+)?\s*(명\s*)?(구함|구해요|구합니다|구인|모집|급구|ㄱㅎ)/,p:/모집|구인|파티|파모|ㅁㅈ|구구|\d+\s*인/,b:/삽니다|사요|구합니다|구해요|구함|구매|매입|ㅅㅅ|삼니다|살게요|사봅니다/,s:/팝니다|팔아요|판매|ㅍㅍ|팜|팔게요|처분|떨이|ㅍㅁ/};
function cat(m){if(!C)return true;var r=RX.r.test(m),b=!r&&RX.b.test(m),s=RX.s.test(m);if(C==='b')return b;if(C==='s')return s;return r||RX.p.test(m)}
function esc(s){return s.replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function tm(t){var d=new Date(t);if(isNaN(d))return'';var k=new Date(d.getTime()+9*36e5),n=new Date(Date.now()+9*36e5),p=function(x){return('0'+x).slice(-2)};
 return(k.getUTCDate()!==n.getUTCDate()?(k.getUTCMonth()+1)+'/'+k.getUTCDate()+' ':'')+p(k.getUTCHours())+':'+p(k.getUTCMinutes())}
function draw(){document.querySelectorAll('#hSrv button').forEach(function(b){b.classList.toggle('on',b.dataset.s===S)});document.querySelectorAll('#hCat button').forEach(function(b){b.classList.toggle('on',b.dataset.c===C)});
 if(!D)return;var q=Q.value.trim(),r=D.rows.filter(function(x){return x.s===S&&cat(x.m)&&(!q||x.m.indexOf(q)>=0)}).sort(function(a,b){return a.t<b.t?1:-1});
 document.getElementById('hCnt').textContent=r.length+'건'+(r.length>LIM?' · 최신 '+LIM+'건만 표시':'');
 L.innerHTML=r.length?r.slice(0,LIM).map(function(x){return'<li><time datetime="'+esc(x.t)+'">'+tm(x.t)+'</time>'+(x.n?'<button class="nm" data-n="'+esc(x.n)+'" title="눌러서 복사">'+esc(x.n)+'</button>':'')+'<span>'+esc(x.m)+'</span></li>'}).join(''):'<li class="em">'+(q||C?'검색 결과가 없어요':'아직 모인 거뿔이 없어요')+'</li>'}
document.getElementById('hSrv').addEventListener('click',function(e){var t=e.target.closest('button'),s=t&&t.dataset.s;if(s){S=s;localStorage.setItem('hornSrv',s);L.scrollTop=0;draw()}});
Q.addEventListener('input',draw);
document.getElementById('hCat').addEventListener('click',function(e){var t=e.target.closest('button'),c=t?t.dataset.c:null;if(c!=null){C=c;localStorage.setItem('hornCat',c);L.scrollTop=0;draw()}});
var T=document.createElement('div');T.id='hToast';document.body.appendChild(T);var tt;
function toast(t){T.textContent=t;T.classList.add('on');clearTimeout(tt);tt=setTimeout(function(){T.classList.remove('on')},1400)}
L.addEventListener('click',function(e){var b=e.target.closest('.nm');if(!b)return;var n=b.dataset.n;
 var ok=function(){toast('「'+n+'」 복사했어요')},fb=function(){var a=document.createElement('textarea');a.value=n;document.body.appendChild(a);a.select();try{document.execCommand('copy');ok()}catch(_){toast('복사 실패 ㅠ')}a.remove()};
 navigator.clipboard&&navigator.clipboard.writeText?navigator.clipboard.writeText(n).then(ok,fb):fb()});
function go(){var h=decodeURIComponent(location.hash.slice(1));if(!/^horn/.test(h))return;var s=h.split('-')[1];if(s&&/^(류트|만돌린|하프|울프)$/.test(s)){S=s;draw()}
 setTimeout(function(){document.getElementById("vHorn").scrollIntoView({behavior:'smooth',block:'start'})},60)}
addEventListener('hashchange',go);
fetch('/horn_history.json?t='+Math.floor(Date.now()/6e5)).then(function(r){return r.json()}).then(function(d){D=d;
 document.getElementById('hUpd').textContent='갱신 '+(d.updated||'').replace('T',' ').slice(0,16)+' (KST) · 10분마다 자동 수집 · 아이디 누르면 복사돼요';draw()})
 .catch(function(){L.innerHTML='<li class="em">거뿔 내역을 못 불러왔어요. 잠시 후 다시 시도해 주세요</li>'});
draw();go()})();
