// 서버별 거뿔(거대한 외침의 뿔피리) 내역 — Worker mabi-horn (mabi-life.com 출처만 허용). #horn / #horn-하프 로 바로가기
(function(){var D=null,S=localStorage.getItem('hornSrv')||'하프',L=document.getElementById('hList'),Q=document.getElementById('hQ'),LIM=300,C=localStorage.getItem('hornCat')||'';
var RX={q:/(아르카나|엘리멘탈나이트|엘나|홀리아크|홀아|다크메이지|다메|알케믹|알케|스팅어|건슬링거|건슬|세바|세가|딜러|탱커|힐러|서폿|서포터|법사|궁수|음유|바드|전사|격가|도적|암살|마법사|대검|석궁|장궁|탱|딜|힐|딜탱|파티원|파티|팟원|팟)\s*(분\s*)?(구함|구해[요영욥욤용]|구합니다|구인|급구|ㄱㅎ)/,r:/(아르카나|엘리멘탈나이트|엘나|홀리아크|홀아|다크메이지|다메|알케믹|알케|스팅어|건슬링거|건슬|딜|탱|힐|세|서|법|궁|냥|댄|전|알|석|수|도|힐러|딜러|탱커|세가|서폿|서포터|법사|궁수|음유|연주|바드|전사|격가|인형|체인|듀얼|암살|도적|마법사|전투|대검|석궁|장궁)\s*\d+(\s*[~\-]\s*\d+)?\s*((명|릴|바퀴)\s*)?(구함|구해요|구합니다|구인|모집|급구|ㄱㅎ)/,p:/모집|구인|파티|파모|ㅁㅈ|구구|\d+\s*인|도실\s*분|돌\s*분/,d:/(항공교역|교역)[\s\S]*한\s*바퀴[\s\S]*출발|(크심|크롬바스\s*심연|크롬바스)[\s\S]*(구함|구해요|구합니다|구인|급구|ㄱㅎ|모집|\d+\s*릴|한\s*바퀴)|(한\s*바퀴|\d+\s*(릴|바퀴))\s*(갈\s*(분|사람)\s*)?(구함|구해요|구합니다|구인|급구|ㄱㅎ|모집)/,b:/삽니[다당닷]|사요|구합니다|구해요|구함|구매|매입|ㅅㅅ|삼니다|살게요|사봅니다/,t:/구해\s*봅니다|사실\s*분|삽니[다당닷]|사요|구매|매입|ㅅㅅ|삼니다|살게요|사봅니다|팝니[다당닷]|팔아[요여유]|판매|ㅍㅍ|팜|팔게요|처분|떨이|ㅍㅁ/,a:/#\s*\[채널|\[\d+\/\d+명\]|[\dNn]\s*릴|자유릴|모십니다|모셔요|가실\s*분|팟/,k:/구해\s*봅니다|삽니[다당닷]|사요|구매|매입|ㅅㅅ|삼니다|살게요|사봅니다/,s:/사실\s*분|팝니[다당닷]|팔아[요여유용]|판매|ㅍㅍ|팜|팔게요|처분|떨이|ㅍㅁ/};
function cat(m){if(!C)return true;var w=RX.p.test(m)||RX.a.test(m),r=RX.r.test(m)||RX.q.test(m)||RX.d.test(m)||(w&&!RX.t.test(m)),b=!r&&(RX.k.test(m)||(RX.b.test(m)&&!w)),s=RX.s.test(m);if(C==='b')return b;if(C==='s')return s;return r}
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
function hLoad(){fetch('https://mabi-horn.mabilife.workers.dev/horn_history.json?t='+Math.floor(Date.now()/6e4)).then(function(r){if(!r.ok)throw r.status;return r.json()}).then(function(d){D=d;
 document.getElementById('hUpd').textContent='갱신 '+(d.updated||'').replace('T',' ').slice(0,16)+' (KST) · 자동 수집 · 아이디 누르면 복사돼요';draw()})
 .catch(function(){L.innerHTML='<li class="em">거뿔 내역을 못 불러왔어요. 잠시 후 다시 시도해 주세요 <button type="button" class="hRetry" style="margin-left:8px;padding:3px 12px;border-radius:999px;background:#1a1530;border:1px solid #3a2f66;color:#f7d98b;font:inherit;font-size:13px;cursor:pointer">다시 시도</button></li>';var b=L.querySelector('.hRetry');if(b)b.onclick=function(){L.innerHTML='<li class="em">불러오는 중…</li>';hLoad()}})}
hLoad();
draw();go()})();
