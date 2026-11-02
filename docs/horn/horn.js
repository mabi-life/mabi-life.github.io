// 서버별 거뿔(거대한 외침의 뿔피리) 내역 — /horn_history.json (캐릭터명 미저장). #horn / #horn-하프 로 바로가기
(function(){var D=null,S=localStorage.getItem('hornSrv')||'하프',L=document.getElementById('hList'),Q=document.getElementById('hQ'),LIM=300;
function esc(s){return s.replace(/[&<>"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]})}
function tm(t){var d=new Date(t);if(isNaN(d))return'';var k=new Date(d.getTime()+9*36e5),n=new Date(Date.now()+9*36e5),p=function(x){return('0'+x).slice(-2)};
 return(k.getUTCDate()!==n.getUTCDate()?(k.getUTCMonth()+1)+'/'+k.getUTCDate()+' ':'')+p(k.getUTCHours())+':'+p(k.getUTCMinutes())}
function draw(){document.querySelectorAll('#hSrv button').forEach(function(b){b.classList.toggle('on',b.dataset.s===S)});
 if(!D)return;var q=Q.value.trim(),r=D.rows.filter(function(x){return x.s===S&&(!q||x.m.indexOf(q)>=0)}).sort(function(a,b){return a.t<b.t?1:-1});
 document.getElementById('hCnt').textContent=r.length+'건'+(r.length>LIM?' · 최신 '+LIM+'건만 표시':'');
 L.innerHTML=r.length?r.slice(0,LIM).map(function(x){return'<li><time datetime="'+esc(x.t)+'">'+tm(x.t)+'</time><span>'+esc(x.m)+'</span></li>'}).join(''):'<li class="em">'+(q?'검색 결과가 없어요':'아직 모인 거뿔이 없어요')+'</li>'}
document.getElementById('hSrv').addEventListener('click',function(e){var s=e.target.dataset&&e.target.dataset.s;if(s){S=s;localStorage.setItem('hornSrv',s);L.scrollTop=0;draw()}});
Q.addEventListener('input',draw);
function go(){var h=decodeURIComponent(location.hash.slice(1));if(!/^horn/.test(h))return;var s=h.split('-')[1];if(s&&/^(류트|만돌린|하프|울프)$/.test(s)){S=s;draw()}
 setTimeout(function(){document.getElementById("vHorn").scrollIntoView({behavior:'smooth',block:'start'})},60)}
addEventListener('hashchange',go);
fetch('/horn_history.json?t='+Math.floor(Date.now()/6e5)).then(function(r){return r.json()}).then(function(d){D=d;
 document.getElementById('hUpd').textContent='갱신 '+(d.updated||'').replace('T',' ').slice(0,16)+' (KST) · 10분마다 자동 수집 · 캐릭터명은 저장 안 해요';draw()})
 .catch(function(){L.innerHTML='<li class="em">거뿔 내역을 못 불러왔어요. 잠시 후 다시 시도해 주세요</li>'});
draw();go()})();
