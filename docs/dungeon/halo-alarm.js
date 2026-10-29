/* 브리레흐 4관 신벌 헤일로 알람 — mabi-life 자체 제작 (WebAudio 합성음, 외부 음원 없음) */
(function(){
const K='halo4.cfg',cfg=Object.assign({interval:60,pre:10,vol:.6,voice:true,mute:false},JSON.parse(localStorage.getItem(K)||'{}'));if(!cfg.v2){cfg.pre=10;cfg.v2=1;localStorage.setItem(K,JSON.stringify(cfg))}
const save=()=>localStorage.setItem(K,JSON.stringify(cfg));
const css=`#halo4{max-width:560px;margin:0 auto 14px;padding:10px 14px;border-radius:12px;background:linear-gradient(180deg,rgba(247,217,139,.06),rgba(255,255,255,.02));border:1px solid rgba(247,217,139,.28);box-shadow:inset 0 1px 0 rgba(247,217,139,.12)}
#halo4 .hd{display:flex;align-items:center;gap:10px}#halo4 h2{font-size:13px;font-weight:700;letter-spacing:.02em;color:#f7d98b;margin:0;white-space:nowrap}#halo4 .s{font-size:11px;color:#8c85b8;line-height:1.35}
#halo4 .t{font-size:30px;line-height:1;font-weight:800;font-variant-numeric:tabular-nums;color:#fff3cf;min-width:64px;text-align:right;margin-left:auto}
#halo4 .t.warn{color:#ff8a8a;animation:h4b .5s infinite alternate}@keyframes h4b{to{opacity:.45}}
#halo4 .n{font-size:11px;color:#a9a2d6}#halo4 .row{display:flex;gap:5px;align-items:center;flex-wrap:wrap;margin:6px 0 0}#halo4 .row .btn{padding:3px 9px;font-size:12px;min-height:0;line-height:1.5}#halo4 .sp{flex:1}
#halo4 .bar{position:relative;height:4px;border-radius:2px;background:rgba(255,255,255,.08);overflow:hidden;margin:7px 0 0}#halo4 .bar i{position:absolute;inset:0 auto 0 0;width:0;background:linear-gradient(90deg,#b8923e,#f7d98b)}#halo4 .bar.warn i{background:linear-gradient(90deg,#ff5a5a,#ffb36b)}#halo4 .bar b{position:absolute;top:0;bottom:0;width:2px;background:#ff8a8a}
#halo4 label{font-size:11px;color:#cfc8f0;display:inline-flex;align-items:center;gap:3px}#halo4 input[type=number]{width:40px;background:rgba(0,0,0,.3);color:#fff;border:1px solid rgba(247,217,139,.25);border-radius:5px;padding:1px 3px;font-size:11px}#halo4 input[type=range]{width:60px;accent-color:#f7d98b}#halo4 details summary{cursor:pointer;font-size:11px;color:#8c85b8;margin-top:5px}`;
const st=document.createElement('style');st.textContent=css;document.head.appendChild(st);
const el=document.createElement('section');el.id='halo4';
el.innerHTML=`<div class="hd"><h2>🔔 4관 신벌 헤일로</h2><div class="n" id="h4n">대기 중</div><div class="t" id="h4t">--</div></div>
<div class="bar" id="h4bar" title="헤일로까지 남은 시간"><i></i><b id="h4mk"></b></div>
<div class="row"><button class="btn gold" id="h4go">▶ 시작</button><button class="btn" id="h4sync" title="지금 헤일로가 떴다면 눌러서 타이머 재정렬">⟳ 보정</button><button class="btn" id="h4m">+1</button><button class="btn" id="h4p">−1</button><button class="btn danger" id="h4x">■</button><span class="sp"></span><button class="btn" id="h4mute">${cfg.mute?'🔇':'🔈'}</button><button class="btn" id="h4test" title="테스트">🔊</button></div>
<details><summary>설정 · 도움말</summary><div class="row"><label>간격<input type="number" id="h4i" min="10" max="300" value="${cfg.interval}">초</label><label>미리<input type="number" id="h4pre" min="0" max="30" value="${cfg.pre}">초 전</label><label>볼륨<input type="range" id="h4v" min="0" max="1" step=".05" value="${cfg.vol}"></label><label><input type="checkbox" id="h4voice" ${cfg.voice?'checked':''}>음성</label></div>
<div class="s" style="margin-top:4px">전투 시작 순간 [시작]. 헤일로는 시작 직후 + 약 ${cfg.interval}초 간격 (패턴 지연은 [보정]으로 맞추기). 백그라운드 탭에선 소리가 늦을 수 있어요.</div></details>`;
const anchor=document.querySelector('.toolbar')||document.querySelector('header');
el.style.maxWidth='none';el.style.margin='10px 0 14px';anchor?anchor.after(el):document.body.prepend(el);
const $=id=>el.querySelector('#'+id);let ac,next=0,count=0,timer,beeped={};
function tone(f,d,at){if(cfg.mute)return;ac=ac||new (window.AudioContext||window.webkitAudioContext)();const o=ac.createOscillator(),g=ac.createGain(),t=ac.currentTime+(at||0);o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(cfg.vol,t+.01);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g).connect(ac.destination);o.start(t);o.stop(t+d)}
const tick=()=>tone(880,.12),alarm=()=>{[0,.18,.36].forEach((a,i)=>tone(i==2?1320:988,.25,a))};
let kv=null;function pickV(){if(!('speechSynthesis'in window))return;const all=speechSynthesis.getVoices(),v=all.filter(x=>/^ko/i.test(x.lang)||/korean|한국/i.test(x.name));const fem=/female|여성|여자|yuna|sora|heami|sunhi|seoyeon|jimin|seo-?hyeon|google 한국|유나|소라/i,male=/(^|[^e])male|남성|남자|injoon|hyunsu|minsu|bongjin|gookmin/i;const sc=x=>(fem.test(x.name)?10:0)-(male.test(x.name)?20:0)+(/google/i.test(x.name)?3:0)+(/natural|neural|online/i.test(x.name)?2:0)+(/^ko-?kr/i.test(x.lang)?1:0);kv=v.slice().sort((a,b)=>sc(b)-sc(a))[0]||null}
if('speechSynthesis'in window){pickV();speechSynthesis.onvoiceschanged=pickV}
const v10=new Audio('halo10.mp3?v=1');v10.preload='auto';function voice10(){if(cfg.mute||!cfg.voice)return;if(window.speechSynthesis)speechSynthesis.cancel();v10.volume=cfg.vol;v10.currentTime=0;v10.play().catch(()=>say('10초 뒤에 헤일로가 등장해요!'))}
function say(s){if(!cfg.mute&&cfg.voice&&'speechSynthesis'in window){const u=new SpeechSynthesisUtterance(s);u.lang='ko-KR';if(!kv)pickV();if(kv)u.voice=kv;u.pitch=1.1;u.rate=1.05;u.volume=cfg.vol;speechSynthesis.cancel();speechSynthesis.speak(u)}}
function loop(){const r=(next-Date.now())/1000,t=$('h4t');t.textContent=Math.max(0,Math.ceil(r));t.classList.toggle('warn',r<=cfg.pre);
const f=Math.min(1,Math.max(0,1-r/cfg.interval)),bar=$('h4bar');bar.firstChild.style.width=f*100+'%';bar.classList.toggle('warn',r<=cfg.pre);$('h4mk').style.left=(100-cfg.pre/cfg.interval*100)+'%';const k=Math.ceil(r);if(r<=cfg.pre&&k>0&&!beeped[count+':'+k]){beeped[count+':'+k]=1;if(k==cfg.pre)(k==10?voice10():say('헤일로 '+k+'초 전'));else if(k<=3)tick()}if(r<=0&&cfg.voice){setTimeout(()=>say('헤일로'),600)}
if(r<=0){alarm();count++;$('h4n').textContent=count+'번째 헤일로 등장! 다음까지';next+=cfg.interval*1000}}
function start(first){ac=ac||new (window.AudioContext||window.webkitAudioContext)();ac.resume();clearInterval(timer);beeped={};next=Date.now()+(first?0:cfg.interval*1000);timer=setInterval(loop,100);loop()}
$('h4go').onclick=()=>{count=0;$('h4n').textContent='첫 헤일로 (시작 직후)';start(true)};
$('h4sync').onclick=()=>{count++;$('h4n').textContent=count+'번째 헤일로 기준 재정렬';start(false)};
$('h4m').onclick=()=>next+=1000;$('h4p').onclick=()=>next-=1000;
$('h4x').onclick=()=>{clearInterval(timer);$('h4t').textContent='--';$('h4t').classList.remove('warn');$('h4bar').firstChild.style.width='0';$('h4n').textContent='정지됨'};
$('h4i').onchange=e=>{cfg.interval=Math.max(10,+e.target.value||60);save()};$('h4pre').onchange=e=>{cfg.pre=Math.max(0,+e.target.value||0);save()};
$('h4v').oninput=e=>{cfg.vol=+e.target.value;save()};$('h4voice').onchange=e=>{cfg.voice=e.target.checked;save()};
$('h4mute').onclick=e=>{cfg.mute=!cfg.mute;save();e.target.textContent=cfg.mute?'🔇':'🔈';if(cfg.mute&&window.speechSynthesis)speechSynthesis.cancel()};$('h4test').onclick=()=>{alarm();setTimeout(()=>cfg.pre==10?voice10():say('헤일로 '+cfg.pre+'초 전'),700)};
document.addEventListener('keydown',e=>{if(e.target.tagName=='INPUT')return;if(e.key=='h'||e.key=='H'){$('h4sync').click()}});
})();
