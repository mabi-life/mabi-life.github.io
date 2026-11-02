/* 브리레흐 4관 신벌 헤일로 알람 — mabi-life 자체 제작 (WebAudio 합성음, 외부 음원 없음)
 * 전체 15분(900초) 잔여 시계를 두고, 그 안의 절대 등장 시각에 알림.
 * 참고 시각표: 잔여 14:53부터 63초마다 (경과 7 + 63n). 마비집 9+62n과 달리 밀림(+3초) 반영.
 */
(function(){
const K='halo4.cfg',FIGHT=900;
const raw=JSON.parse(localStorage.getItem(K)||'{}');
const cfg=Object.assign({interval:63,first:7,pre:10,vol:.6,voice:true,mute:false},raw);
if(!cfg.v2){cfg.pre=10;cfg.v2=1}
if(!cfg.v3){if(cfg.interval===60)cfg.interval=63;cfg.v3=1}
if(!cfg.v4){if(cfg.first===9)cfg.first=7;cfg.v4=1}
localStorage.setItem(K,JSON.stringify(cfg));
const save=()=>localStorage.setItem(K,JSON.stringify(cfg));
function buildSched(){const a=[],f=+cfg.first||0,iv=Math.max(10,+cfg.interval||63);for(let t=f;t<FIGHT;t+=iv)a.push(t);return a}
function fmt(sec){sec=Math.max(0,Math.ceil(sec));const m=(sec/60)|0,s=sec%60;return (m<10?'0':'')+m+':'+(s<10?'0':'')+s}
function remAt(elapsed){return FIGHT-elapsed}
const css=`#halo4{max-width:560px;margin:0 auto 14px;padding:10px 14px;border-radius:12px;background:linear-gradient(180deg,rgba(247,217,139,.06),rgba(255,255,255,.02));border:1px solid rgba(247,217,139,.28);box-shadow:inset 0 1px 0 rgba(247,217,139,.12)}
#halo4 .hd{display:flex;align-items:center;gap:10px;flex-wrap:wrap}#halo4 h2{font-size:13px;font-weight:700;letter-spacing:.02em;color:#f7d98b;margin:0;white-space:nowrap}#halo4 .s{font-size:11px;color:#8c85b8;line-height:1.35}
#halo4 .t{font-size:34px;line-height:1;font-weight:800;font-variant-numeric:tabular-nums;color:#fff3cf;min-width:92px;text-align:right;margin-left:auto;letter-spacing:.02em}
#halo4 .t.warn{color:#ff8a8a;animation:h4b .5s infinite alternate}@keyframes h4b{to{opacity:.45}}
#halo4 .n{font-size:11px;color:#a9a2d6;flex:1;min-width:120px}#halo4 .row{display:flex;gap:5px;align-items:center;flex-wrap:wrap;margin:6px 0 0}#halo4 .row .btn{padding:3px 9px;font-size:12px;min-height:0;line-height:1.5}#halo4 .sp{flex:1}
#halo4 .bar{position:relative;height:4px;border-radius:2px;background:rgba(255,255,255,.08);overflow:hidden;margin:7px 0 0}#halo4 .bar i{position:absolute;inset:0 auto 0 0;width:0;background:linear-gradient(90deg,#b8923e,#f7d98b)}#halo4 .bar.warn i{background:linear-gradient(90deg,#ff5a5a,#ffb36b)}#halo4 .bar b{position:absolute;top:0;bottom:0;width:2px;background:#ff8a8a;opacity:.85}
#halo4 label{font-size:11px;color:#cfc8f0;display:inline-flex;align-items:center;gap:3px}#halo4 input[type=number]{width:40px;background:rgba(0,0,0,.3);color:#fff;border:1px solid rgba(247,217,139,.25);border-radius:5px;padding:1px 3px;font-size:11px}#halo4 input[type=range]{width:60px;accent-color:#f7d98b}#halo4 details summary{cursor:pointer;font-size:11px;color:#8c85b8;margin-top:5px}
#halo4 .tbl{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:8px}#halo4 .tbl div{background:rgba(255,255,255,.04);border:1px solid rgba(247,217,139,.14);border-radius:8px;padding:6px 8px;text-align:center}#halo4 .tbl b{display:block;font-size:10px;color:#8c85b8;font-weight:500;margin-bottom:2px}#halo4 .tbl span{font-size:15px;font-weight:700;color:#f0b090;font-variant-numeric:tabular-nums}#halo4 .tbl div.on{border-color:rgba(247,217,139,.55);background:rgba(247,217,139,.1)}#halo4 .tbl div.done{opacity:.45}#halo4 .tbl div.done span{color:#8c85b8}`;
const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
const el=document.createElement('section');el.id='halo4';
el.innerHTML=`<div class="hd"><h2>🔔 4관 신벌 헤일로</h2><div class="n" id="h4n">대기 중 · 전체 15분 잔여 시계</div><div class="t" id="h4t">15:00</div></div>
<div class="bar" id="h4bar" title="15분 제한 진행"><i></i><b id="h4mk"></b></div>
<div class="row"><button class="btn gold" id="h4go">▶ 시작</button><button class="btn" id="h4sync" title="지금 헤일로가 떴다면 눌러서 타이머 재정렬">⟳ 보정</button><button class="btn" id="h4m">+1</button><button class="btn" id="h4p">−1</button><button class="btn danger" id="h4x">■</button><span class="sp"></span><button class="btn" id="h4mute">${cfg.mute?'🔇':'🔈'}</button><button class="btn" id="h4test" title="테스트">🔊</button></div>
<details open><summary>등장 시각표 · 설정</summary>
<div class="tbl" id="h4tbl"></div>
<div class="row"><label>간격<input type="number" id="h4i" min="10" max="300" value="${cfg.interval}">초</label><label>첫 등장(경과)<input type="number" id="h4f" min="0" max="120" value="${cfg.first}">초</label><label>미리<input type="number" id="h4pre" min="0" max="30" value="${cfg.pre}">초 전</label><label>볼륨<input type="range" id="h4v" min="0" max="1" step=".05" value="${cfg.vol}"></label><label><input type="checkbox" id="h4voice" ${cfg.voice?'checked':''}>음성</label></div>
<div class="s" style="margin-top:4px">전투 시작에 [시작]. <b>전체 15분 잔여 시계</b>를 두고, 표의 잔여 시각(기본 14:53부터 ${cfg.interval}초마다)에 맞춰 알립니다. 어긋나면 [보정]. 백그라운드 탭에선 소리가 늦을 수 있어요.</div></details>`;
const anchor=document.querySelector('.toolbar')||document.querySelector('header');
el.style.maxWidth='none';el.style.margin='10px 0 14px';anchor?anchor.after(el):document.body.prepend(el);
const $=id=>el.querySelector('#'+id);
let ac,t0=0,sched=[],idx=0,count=0,timer,beeped={},running=false;
function tone(f,d,at){if(cfg.mute)return;ac=ac||new (window.AudioContext||window.webkitAudioContext)();const o=ac.createOscillator(),g=ac.createGain(),t=ac.currentTime+(at||0);o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(cfg.vol,t+.01);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g).connect(ac.destination);o.start(t);o.stop(t+d)}
const tick=()=>tone(880,.12),alarm=()=>{[0,.18,.36].forEach((a,i)=>tone(i==2?1320:988,.25,a))};
let kv=null;function pickV(){if(!('speechSynthesis'in window))return;const all=speechSynthesis.getVoices(),v=all.filter(x=>/^ko/i.test(x.lang)||/korean|한국/i.test(x.name));const fem=/female|여성|여자|yuna|sora|heami|sunhi|seoyeon|jimin|seo-?hyeon|google 한국|유나|소라/i,male=/(^|[^e])male|남성|남자|injoon|hyunsu|minsu|bongjin|gookmin/i;const sc=x=>(fem.test(x.name)?10:0)-(male.test(x.name)?20:0)+(/google/i.test(x.name)?3:0)+(/natural|neural|online/i.test(x.name)?2:0)+(/^ko-?kr/i.test(x.lang)?1:0);kv=v.slice().sort((a,b)=>sc(b)-sc(a))[0]||null}
if('speechSynthesis'in window){pickV();speechSynthesis.onvoiceschanged=pickV}
const v10=new Audio('halo10.mp3?v=1');v10.preload='auto';function voice10(){if(cfg.mute||!cfg.voice)return;if(window.speechSynthesis)speechSynthesis.cancel();v10.volume=cfg.vol;v10.currentTime=0;v10.play().catch(()=>say('10초 뒤에 헤일로가 등장해요!'))}
function say(s){if(!cfg.mute&&cfg.voice&&'speechSynthesis'in window){const u=new SpeechSynthesisUtterance(s);u.lang='ko-KR';if(!kv)pickV();if(kv)u.voice=kv;u.pitch=1.1;u.rate=1.05;u.volume=cfg.vol;speechSynthesis.cancel();speechSynthesis.speak(u)}}
function paintTbl(){const box=$('h4tbl');if(!box)return;const cur=running?idx:-1;box.innerHTML=sched.map((elap,i)=>{const cls=i<cur?'done':(i===cur?'on':'');return `<div class="${cls}"><b>${i+1}회차</b><span>${fmt(remAt(elap))}</span></div>`}).join('')}
function stop(msg){running=false;clearInterval(timer);$('h4t').textContent='15:00';$('h4t').classList.remove('warn');$('h4bar').firstChild.style.width='0';$('h4n').textContent=msg||'정지됨 · 전체 15분 잔여 시계';paintTbl()}
function loop(){if(!running)return;const elapsed=(Date.now()-t0)/1000,left=FIGHT-elapsed;const t=$('h4t');t.textContent=fmt(left);const near=idx<sched.length&&(sched[idx]-elapsed)<=cfg.pre;t.classList.toggle('warn',near||left<=30);
const bar=$('h4bar');bar.firstChild.style.width=Math.min(100,Math.max(0,elapsed/FIGHT*100))+'%';bar.classList.toggle('warn',near);if(idx<sched.length){$('h4mk').style.left=(sched[idx]/FIGHT*100)+'%';$('h4mk').style.display='block'}else{$('h4mk').style.display='none'}
if(left<=0){alarm();stop('15분 종료');return}
if(idx>=sched.length){$('h4n').textContent='스케줄 끝 · 남은 제한 '+fmt(left);return}
const until=sched[idx]-elapsed,k=Math.ceil(until);
if(until<=cfg.pre&&k>0&&!beeped[idx+':'+k]){beeped[idx+':'+k]=1;if(k==cfg.pre)(k==10?voice10():say('헤일로 '+k+'초 전'));else if(k<=3)tick()}
if(until<=0){alarm();count=idx+1;$('h4n').textContent=count+'회차 등장! 다음 '+((idx+1<sched.length)?fmt(remAt(sched[idx+1])):'끝')+' · 제한 '+fmt(left);idx++;paintTbl();beeped={}}
else{$('h4n').textContent=(idx+1)+'회차까지 '+Math.max(0,k)+'초 (잔여 '+fmt(remAt(sched[idx]))+') · 제한 '+fmt(left)}}
function begin(){ac=ac||new (window.AudioContext||window.webkitAudioContext)();ac.resume();clearInterval(timer);beeped={};running=true;timer=setInterval(loop,100);loop()}
function refreshHelp(){const s=el.querySelector('details .s');if(s)s.innerHTML='전투 시작에 [시작]. <b>전체 15분 잔여 시계</b>를 두고, 표의 잔여 시각(기본 '+fmt(remAt(cfg.first))+'부터 '+cfg.interval+'초마다)에 맞춰 알립니다. 어긋나면 [보정]. 백그라운드 탭에선 소리가 늦을 수 있어요.'}
$('h4go').onclick=()=>{sched=buildSched();idx=0;count=0;t0=Date.now();paintTbl();$('h4n').textContent='시작 · 다음 '+fmt(remAt(sched[0]))+' ('+sched.length+'회/15분)';begin()};
$('h4sync').onclick=()=>{if(!sched.length)sched=buildSched();const i=Math.min(Math.max(0,idx),sched.length-1);const at=sched[i];t0=Date.now()-at*1000;count=i+1;idx=Math.min(i+1,sched.length);beeped={};paintTbl();$('h4n').textContent=count+'회차 기준 재정렬';begin()};
$('h4m').onclick=()=>{if(!running)return;t0+=1000};$('h4p').onclick=()=>{if(!running)return;t0-=1000};
$('h4x').onclick=()=>stop('정지됨 · 전체 15분 잔여 시계');
function rebuildIdle(){sched=buildSched();paintTbl();refreshHelp();if(!running)$('h4t').textContent='15:00'}
$('h4i').onchange=e=>{cfg.interval=Math.max(10,+e.target.value||63);save();rebuildIdle()};$('h4f').onchange=e=>{cfg.first=Math.max(0,+e.target.value||0);save();rebuildIdle()};$('h4pre').onchange=e=>{cfg.pre=Math.max(0,+e.target.value||0);save()};
$('h4v').oninput=e=>{cfg.vol=+e.target.value;save()};$('h4voice').onchange=e=>{cfg.voice=e.target.checked;save()};
$('h4mute').onclick=e=>{cfg.mute=!cfg.mute;save();e.target.textContent=cfg.mute?'🔇':'🔈';if(cfg.mute&&window.speechSynthesis)speechSynthesis.cancel()};$('h4test').onclick=()=>{alarm();setTimeout(()=>cfg.pre==10?voice10():say('헤일로 '+cfg.pre+'초 전'),700)};
document.addEventListener('keydown',e=>{if(e.target.tagName=='INPUT')return;if(e.key=='h'||e.key=='H')$('h4sync').click()});
sched=buildSched();paintTbl();refreshHelp();
})();
