/* 분배 도우미 v1.8 */
(function(){
var KEY='mabi.bunbae.v1',$=function(id){return document.getElementById(id)};
var posts=[],filt='all',names=[],items=[],queue=[],zIdx=-1,big='',bigBlob=null,imgId='',dist=null,thumb='',editIdx=-1,titleEdited=false,worker=null,busy=0;
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
/* 고화질 원본 저장: IndexedDB(용량 넉넉) · 원본 파일 그대로(≤15MB) 저장, 너무 크면 긴 변 2560px WebP 0.95로 재인코딩. 목록 썸네일만 360px JPEG 0.85를 localStorage에 둠 */
var IDB=null;function db(){if(!IDB)IDB=new Promise(function(res,rej){var r=indexedDB.open('mabi-bunbae',1);r.onupgradeneeded=function(){r.result.createObjectStore('img')};r.onsuccess=function(){res(r.result)};r.onerror=function(){rej(r.error)}});return IDB}
function idb(mode,fn){return db().then(function(d){return new Promise(function(res,rej){var tx=d.transaction('img',mode),st=tx.objectStore('img'),q=fn(st);tx.oncomplete=function(){res(q&&q.result)};tx.onerror=function(){rej(tx.error)}})})}
function imgPut(id,b){return idb('readwrite',function(s){return s.put(b,id)})}function imgGet(id){return idb('readonly',function(s){return s.get(id)})}function imgDel(id){return idb('readwrite',function(s){return s.delete(id)}).catch(function(){})}
var curURL='';function showBig(el,p,fallback){if(curURL){URL.revokeObjectURL(curURL);curURL=''}el.src=fallback||'';if(p&&p.imgId)imgGet(p.imgId).then(function(b){if(b){curURL=URL.createObjectURL(b);el.src=curURL}}).catch(function(){})}
function load(){try{posts=JSON.parse(localStorage.getItem(KEY)||'[]')||[]}catch(e){posts=[]}}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(posts))}catch(e){alert('저장 공간이 부족해요. 오래된 기록을 지워 주세요.')}}
function today(){var d=new Date();return d.getFullYear()+'.'+String(d.getMonth()+1).padStart(2,'0')+'.'+String(d.getDate()).padStart(2,'0')}
function render(){var L=posts.map(function(p,i){return [p,i]}).filter(function(x){return filt==='all'||(filt==='done')===!!x[0].done});
 $('cnt').textContent='진행중 '+posts.filter(function(p){return !p.done}).length+' · 완료 '+posts.filter(function(p){return p.done}).length;
 $('list').innerHTML=L.map(function(x){var p=x[0],i=x[1];return '<div class="post'+(p.done?' isdone':'')+'"><div class="thumb" data-z="'+i+'"'+(p.thumb?' style="background-image:url('+p.thumb+')"':'')+'>'+(p.thumb?'':'🎁')+'</div><div class="grow" data-z="'+i+'" style="cursor:zoom-in"><div class="t"><span class="tag '+(p.done?'done':'open')+'">'+(p.done?'완료':'진행중')+'</span>'+esc(p.title)+'</div><div class="m">'+(p.members||[]).map(function(n){return '<span class="at">@'+esc(n)+'</span>'}).join('')+'<br>분배자 <span class="dist">'+(p.dist?'👑 '+esc(p.dist):'-')+'</span></div></div><div class="acts">'+(p.done?'<button class="btn sm ghost" data-re="'+i+'">되돌리기</button>':'<button class="btn sm gold" data-fin="'+i+'">완료</button>')+'<button class="btn sm ghost" data-ed="'+i+'">수정</button><button class="btn sm ghost" data-sh="'+i+'">🔗 공유</button><button class="btn sm ghost" data-fee="'+(p.members||[]).length+'">💰 수수료</button></div></div>'}).join('')||'<div class="empty">아직 기록이 없어요. 「＋ 새 분배」를 누르거나 바로 <b>Ctrl+V</b>로 스크린샷을 붙여넣어 보세요.<div style="margin-top:14px"><img src="capture-example.webp?v=2" loading="lazy" style="width:240px;border-radius:8px;border:1px solid rgba(247,217,139,.25)" alt="캡처 예시"><div class="hint">캡처 예시 · 「보상 분배」 창만 보이게 캡처하면 인식이 더 정확해요</div></div></div>'}
function chips(){$('chips').innerHTML=names.map(function(n,i){return '<span class="chip'+(n===dist?' sel':'')+'" data-pick="'+i+'">'+(n===dist?'👑 ':'')+esc(n)+'<span class="x" data-edn="'+i+'" title="수정">✎</span><span class="x" data-rm="'+i+'" title="삭제">✕</span></span>'}).join('')||'<span class="hint">스크린샷을 넣으면 이름이 여기 나와요. 직접 추가도 돼요.</span>';
 $('dhint').innerHTML=dist?'분배자: <b style="color:var(--gold)">👑 '+esc(dist)+'</b>':'위 이름 중 한 명을 눌러 주세요.'}
function status(t,c){var s=$('status');s.textContent=t;s.className='status'+(c?' '+c:'')}
function prog(v){var p=$('prog');if(v==null){p.style.display='none';return}p.style.display='block';p.firstChild.style.width=Math.round(v*100)+'%'}
function ichips(){$('ichips').innerHTML=items.map(function(o,i){return '<span class="chip it '+(o.on?'on':'off')+'" data-it="'+i+'">'+(o.on?'✓ ':'')+esc(o.n)+'<span class="x" data-irm="'+i+'" title="삭제">✕</span></span>'}).join('')||'<span class="hint">스크린샷을 넣으면 보상 리스트 맨 위 아이템이 여기 나와요.</span>';nextBtn()}
function autoTitle(){if(titleEdited)return;var on=items.filter(function(o){return o.on}).map(function(o){return o.n});$('title').value=today()+' - '+(on.length?on.join(' · '):'')}
function setItems(list){list.forEach(function(n){if(!items.some(function(o){return o.n===n}))items.push({n:n,on:true})});queue=queue.filter(function(n){return !items.some(function(o){return o.n===n})});ichips();autoTitle()}
function nextBtn(){var b=$('nextBtn');if(queue.length){b.style.display='';b.textContent='＋ 다음 아이템 추가: '+queue[0]}else b.style.display='none'}
function openModal(i){editIdx=i;var p=i>=0?posts[i]:null;names=p?(p.members||[]).slice():[];items=p?(p.items||[]).map(function(n){return {n:n,on:true}}):[];dist=p?p.dist:null;thumb=p?p.thumb||'':'';big=p?p.big||p.thumb||'':'';bigBlob=null;imgId=p&&p.imgId||'';queue=[];titleEdited=!!p;
 $('title').value=p?p.title:today()+' - ';$('mTitle').textContent=p?'분배 수정':'새 분배';$('delBtn').style.display=p?'':'none';
 $('prev').style.display=thumb?'block':'none';showBig($('prev'),p,big||thumb||'');$('dropMsg').style.display=thumb?'none':'';status('');prog(null);chips();ichips();$('ov').classList.add('show')}
function closeModal(){$('ov').classList.remove('show')}
function save(done){var t=$('title').value.trim()||today()+' - 분배';var rec={title:t,items:items.filter(function(o){return o.on}).map(function(o){return o.n}),members:names.slice(),dist:dist,done:done,thumb:thumb,ts:Date.now()};if(imgId)rec.imgId=imgId;else if(big)rec.big=big;
 if(bigBlob){var nid=imgId||('i'+Date.now()+Math.random().toString(36).slice(2,6));rec.imgId=nid;delete rec.big;imgPut(nid,bigBlob).catch(function(){alert('고화질 이미지 저장에 실패했어요 (저장 공간 부족). 썸네일만 저장돼요.')})}
 BunbaeNames.learn(names);if(editIdx>=0){rec.ts=posts[editIdx].ts;posts[editIdx]=rec}else posts.unshift(rec);persist();closeModal();render()}
function addNames(v){v.split(/[,\s]+/).map(function(s){return s.trim()}).filter(Boolean).forEach(function(n){if(names.indexOf(n)<0)names.push(n)});chips()}
function getWorker(){if(!worker)worker=Tesseract.createWorker('kor',1,{logger:function(m){if(m.status&&/load|init/.test(m.status)&&busy)status('인식 엔진 준비 중… (처음 한 번만 몇 초 걸려요)')}}).then(function(w){return w.setParameters({tessedit_pageseg_mode:'6'}).then(function(){return w})});return worker}
function handleFile(file){if(!file||!/^image\//.test(file.type))return;var url=URL.createObjectURL(file),img=new Image();img.onload=function(){
 // thumbnail
 var tw=Math.min(360,img.width),th=Math.round(img.height*tw/img.width),tc=document.createElement('canvas');tc.width=tw;tc.height=th;var tx=tc.getContext('2d');tx.imageSmoothingQuality='high';tx.drawImage(img,0,0,tw,th);thumb=tc.toDataURL('image/jpeg',.85);big='';imgId=editIdx>=0&&posts[editIdx].imgId||'';
 var MAX=2560;if(file.size<=15e6&&Math.max(img.width,img.height)<=4096){bigBlob=file}else{var k2=Math.min(1,MAX/Math.max(img.width,img.height)),bc=document.createElement('canvas');bc.width=Math.round(img.width*k2);bc.height=Math.round(img.height*k2);var bx=bc.getContext('2d');bx.imageSmoothingQuality='high';bx.drawImage(img,0,0,bc.width,bc.height);bc.toBlob(function(b){bigBlob=b},'image/webp',.95)}
 $('prev').src=url;$('prev').style.display='block';$('dropMsg').style.display='none';
 var k=Math.min(1,3000/Math.max(img.width,img.height)),W=Math.round(img.width*k),H=Math.round(img.height*k),c=document.createElement('canvas');c.width=W;c.height=H;var x=c.getContext('2d');x.imageSmoothingQuality='high';x.drawImage(img,0,0,W,H);
 ocr(x.getImageData(0,0,W,H))};img.src=url}
function toInput(d){var c=document.createElement('canvas');c.width=d.width;c.height=d.height;c.getContext('2d').putImageData(new ImageData(d.data,d.width,d.height),0,0);return c}
function ocr(data){if(typeof Tesseract==='undefined'){status('인식 실패 · 직접 입력해 주세요 (인식 엔진을 불러오지 못했어요)','err');return}
 busy++;var my=busy;status('글자 인식 중…');prog(0.02);
 getWorker().then(function(w){return BunbaeOCR.runAny(w,data,toInput,prog)}).then(function(r){if(my!==busy)return;prog(null);
  var il=(r.items&&r.items.length)?r.items:(r.item?[r.item]:[]);if(il.length){queue=il.slice(1);setItems([il[0]])}var cf=BunbaeNames.correctAll(r.names);r.names=cf.names;r.fixes=cf.fixes;var added=0;r.names.forEach(function(n){if(names.indexOf(n)<0){names.push(n);added++}});chips();
  if(!r.item&&!r.names.length)status('인식 실패 · 「보상 분배」 창 부분만 잘라서 다시 넣거나 직접 입력해 주세요','err');
  else status('인식 완료 · 아이템 '+il.length+'개 · 이름 '+r.names.length+'명. 틀린 글자는 ✎로 고쳐 주세요.'+(r.fixes.length?' · 보정: '+r.fixes.join(', '):'')+(r.names.length?'':' (이름 인식 실패 · 직접 입력해 주세요)'),'ok')})
 .catch(function(e){console.error(e);prog(null);status('인식 실패 · 직접 입력해 주세요','err')})}
// events
document.addEventListener('click',function(e){var t=e.target,a;
 if(t.closest('[data-f]')){filt=t.closest('[data-f]').dataset.f;document.querySelectorAll('[data-f]').forEach(function(b){b.classList.toggle('on',b.dataset.f===filt)});render();return}
 if((a=t.closest('[data-fin]'))){posts[+a.dataset.fin].done=true;persist();render();return}
 if((a=t.closest('[data-re]'))){posts[+a.dataset.re].done=false;persist();render();return}
 if((a=t.closest('[data-sh]'))){share(+a.dataset.sh);return}
 if((a=t.closest('[data-ed]'))){openModal(+a.dataset.ed);return}
 if((a=t.closest('[data-z]'))){var p=posts[+a.dataset.z];if(p)openZoom(+a.dataset.z);return}
 if((a=t.closest('[data-rm]'))){var i=+a.dataset.rm;if(names[i]===dist)dist=null;names.splice(i,1);chips();return}
 if((a=t.closest('[data-edn]'))){var j=+a.dataset.edn,v=prompt('이름 수정',names[j]);if(v&&v.trim()){if(names[j]===dist)dist=v.trim();names[j]=v.trim();BunbaeNames.learn([names[j]]);chips()}return}
 if((a=t.closest('[data-irm]'))){items.splice(+a.dataset.irm,1);ichips();autoTitle();return}
 if((a=t.closest('[data-it]'))){var o=items[+a.dataset.it];o.on=!o.on;ichips();autoTitle();return}
 if((a=t.closest('[data-pick]'))){var n=names[+a.dataset.pick];dist=dist===n?null:n;chips();return}
});
$('newBtn').onclick=function(){openModal(-1)};$('cancelBtn').onclick=closeModal;$('saveBtn').onclick=function(){save(false)};$('doneBtn').onclick=function(){save(true)};
$('delBtn').onclick=function(){if(editIdx>=0&&confirm('이 기록을 삭제할까요?')){if(posts[editIdx].imgId)imgDel(posts[editIdx].imgId);posts.splice(editIdx,1);persist();closeModal();render()}};
function openZoom(i){var p=posts[i];zIdx=i;showBig($('zimg'),p,p.big||p.thumb||'');$('zimg').style.display=(p.big||p.thumb)?'':'none';$('zt').textContent=p.title;$('zm').innerHTML=((p.members||[]).length?'파티원 '+p.members.map(function(n){return '<span class="at">@'+esc(n)+'</span>'}).join(''):'')+'<br>👑 분배자 <span class="dist">'+(p.dist?esc(p.dist):'-')+'</span>';$('zDel').style.display=$('zEdit').style.display=$('zShare').style.display=$('zShareImg').style.display=i>=0?'':'none';$('zoom').classList.add('show')}
function closeZoom(){$('zoom').classList.remove('show')}
$('zoom').onclick=function(e){if(e.target===this)closeZoom()};$('zClose').onclick=closeZoom;
$('zEdit').onclick=function(){closeZoom();openModal(zIdx)};
$('zDel').onclick=function(){if(zIdx>=0&&confirm('이 분배 기록을 삭제할까요?')){if(posts[zIdx].imgId)imgDel(posts[zIdx].imgId);posts.splice(zIdx,1);persist();closeZoom();render()}};
$('nextBtn').onclick=function(){if(queue.length)setItems([queue[0]])};
$('prev').addEventListener('click',function(e){e.stopPropagation();zIdx=-1;$('zimg').src=this.src;$('zimg').style.display='';$('zt').textContent='';$('zm').innerHTML='';$('zDel').style.display=$('zEdit').style.display=$('zShare').style.display=$('zShareImg').style.display='none';$('zoom').classList.add('show')});
$('addBtn').onclick=function(){addNames($('addn').value);$('addn').value=''};$('addn').onkeydown=function(e){if(e.key==='Enter'&&!e.isComposing){addNames(this.value);this.value=''}};
$('addiBtn').onclick=function(){var v=$('addi').value.trim();if(v)setItems([v]);$('addi').value=''};$('addi').onkeydown=function(e){if(e.key==='Enter'&&!e.isComposing){$('addiBtn').click()}};
$('title').oninput=function(){titleEdited=true};
$('drop').onclick=function(){$('file').click()};$('file').onchange=function(){handleFile(this.files[0]);this.value=''};
var dz=$('drop');dz.ondragover=function(e){e.preventDefault();dz.classList.add('hover')};dz.ondragleave=function(){dz.classList.remove('hover')};dz.ondrop=function(e){e.preventDefault();dz.classList.remove('hover');handleFile(e.dataTransfer.files[0])};
document.addEventListener('paste',function(e){var it=[].slice.call((e.clipboardData||{}).items||[]).filter(function(x){return x.type.indexOf('image')===0})[0];if(!it)return;e.preventDefault();if(!$('ov').classList.contains('show'))openModal(-1);handleFile(it.getAsFile())});
document.addEventListener('keydown',function(e){if(e.key==='Escape'){closeZoom();}});
/* 공유 링크 v1: 한 건을 JSON → deflate-raw(CompressionStream) → base64url 로 #s= 뒤에 넣음. 서버 없음.
   썸네일은 URL이 너무 길지 않게(목표 ≤ 7000자) 240→180→120px WebP로 줄여 넣고, 그래도 크면 글자만 공유 */
function toast(t){var e=$('toast');e.textContent=t;e.style.display='block';clearTimeout(e._t);e._t=setTimeout(function(){e.style.display='none'},2200)}
function b64u(u8){var s='';for(var i=0;i<u8.length;i+=8192)s+=String.fromCharCode.apply(null,u8.subarray(i,i+8192));return btoa(s).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}
function unb64u(s){s=s.replace(/-/g,'+').replace(/_/g,'/');while(s.length%4)s+='=';var b=atob(s),u=new Uint8Array(b.length);for(var i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u}
function pipe(u8,T){return new Response(new Blob([u8]).stream().pipeThrough(T)).arrayBuffer().then(function(b){return new Uint8Array(b)})}
function enc(obj){var u=new TextEncoder().encode(JSON.stringify(obj));return typeof CompressionStream!=='undefined'?pipe(u,new CompressionStream('deflate-raw')).then(function(z){return 'z'+b64u(z)}):Promise.resolve('j'+b64u(u))}
function dec(s){var u=unb64u(s.slice(1));return (s[0]==='z'?pipe(u,new DecompressionStream('deflate-raw')):Promise.resolve(u)).then(function(b){return JSON.parse(new TextDecoder().decode(b))})}
function shrink(src,w,q){return new Promise(function(res){if(!src)return res('');var im=new Image();im.onload=function(){var k=Math.min(1,w/im.width),c=document.createElement('canvas');c.width=Math.round(im.width*k);c.height=Math.round(im.height*k);c.getContext('2d').drawImage(im,0,0,c.width,c.height);var d=c.toDataURL('image/webp',q);if(d.indexOf('data:image/webp')!==0)d=c.toDataURL('image/jpeg',q);res(d)};im.onerror=function(){res('')};im.src=src})}
var LIMIT=7000;
function copyText(url,n){function fb(){try{var ta=document.createElement('textarea');ta.value=url;ta.setAttribute('readonly','');ta.style.cssText='position:fixed;top:-1000px;opacity:0';document.body.appendChild(ta);ta.select();ta.setSelectionRange(0,url.length);var ok=document.execCommand('copy');ta.remove();return ok}catch(e){return false}}
 function fail(){toast('자동 복사 실패 · 링크를 직접 복사해 주세요');prompt('아래 링크를 복사하세요',url)}
 function ok(){toast('✅ 링크 복사됨'+(n||'')+' · '+url.length+'자')}
 if(navigator.clipboard&&window.isSecureContext)navigator.clipboard.writeText(url).then(ok,function(){fb()?ok():fail()});else fb()?ok():fail()}
/* 공유 v2: [2,제목,파티원[],분배자 인덱스(없으면 -1, 목록 밖이면 이름),완료0/1,ts(초,36진),제목에 없는 아이템[],썸네일?]
   → JSON → deflate-raw와 원본 중 짧은 쪽 → base64url. 기본은 글자만(보통 200~400자), 「이미지 포함」은 7000자 이내 축소 썸네일 */
function pack(p,th){var m=p.members||[],di=p.dist?m.indexOf(p.dist):-1,t=p.title||'';var it=(p.items||[]).filter(function(x){return t.indexOf(x)<0});
 var a=[2,t,m,di<0&&p.dist?p.dist:di,p.done?1:0,Math.floor((p.ts||Date.now())/1000).toString(36),it];if(th)a.push(th);else if(!it.length)a.pop();return a}
function encBest(o){var u=new TextEncoder().encode(JSON.stringify(o)),raw='j'+b64u(u);if(typeof CompressionStream==='undefined')return Promise.resolve(raw);
 return pipe(u,new CompressionStream('deflate-raw')).then(function(z){var zs='z'+b64u(z);return zs.length<raw.length?zs:raw})}
function share(i,withImg){var p=posts[i],base=location.origin+location.pathname+'#s=',sb=location.origin+'/font-preview/b/#';
 if(!withImg||!p.thumb)return enc3(p).then(function(s){var u=sb+s;copyText(u,(withImg?' (이미지 없음 · 글자만)':'')+(u.length>180?' · 쪽지엔 길 수 있어요':''))});
 var tries=[[240,.6],[180,.5],[120,.45]];
 (function next(k){if(k>=tries.length)return enc3(p).then(function(s){copyText(sb+s,' (이미지가 커서 글자만)')});
  shrink(p.thumb,tries[k][0],tries[k][1]).then(function(th){return encBest(pack(p,th))}).then(function(s){if((base+s).length<=LIMIT)copyText(base+s,' (이미지 포함)');else next(k+1)})})(0)}
function unpack(o){if(!Array.isArray(o))return o;var m=o[2]||[];return {t:o[1],m:m,d:typeof o[3]==='number'?(m[o[3]]||''):o[3],o:o[4],ts:parseInt(o[5],36)*1000,i:(o[6]||[]).length?o[6]:[],th:o[7]||''}}
/* 공유 v3 (짧은 링크, /b/#코드): 필드를 \0 으로 이어 붙임 → [플래그+ts36, 제목(날짜 접두어 생략), 분배자(인덱스|=이름), 아이템(\1 구분), 파티원...]
   플래그: 1=완료, 2=제목 앞 'YYYY.MM.DD - ' 생략. 코드 접두어 Z(deflate)/J(원본)/U(유니코드 글자 그대로) 중 가장 짧은 것 */
function kstDay(ts){var d=new Date(ts+9*3600e3);return d.getUTCFullYear()+'.'+('0'+(d.getUTCMonth()+1)).slice(-2)+'.'+('0'+d.getUTCDate()).slice(-2)}
/* 첫 필드: KST 'YYYYMMDD-HHMM'+플래그(2면 생략) — 예 U20261031-1718~제목~… (구형 플래그+ts36도 해독) */
function kstStamp(ts){var d=new Date(ts+9*3600e3),z=function(n){return ('0'+n).slice(-2)};return d.getUTCFullYear()+z(d.getUTCMonth()+1)+z(d.getUTCDate())+'-'+z(d.getUTCHours())+z(d.getUTCMinutes())}
function pack3(p){var m=p.members||[],t=p.title||'',ts=p.ts||Date.now(),f=p.done?1:0,pre=kstDay(ts)+' - ';if(t.indexOf(pre)===0){t=t.slice(pre.length);f|=2}
 var it=(p.items||[]).filter(function(x){return t.indexOf(x)<0}),di=p.dist?m.indexOf(p.dist):-1,d=p.dist?(di<0?'='+p.dist:String(di)):'';
 return [kstStamp(ts)+(f===2?'':f),t,d,it.join('\x01')].concat(m).join('\0')}
function unpack3(s){var a=s.split('\0'),q=/^(\d{4})(\d\d)(\d\d)-(\d\d)(\d\d)(\d?)$/.exec(a[0]),f=q?(q[6]===''?2:+q[6]):+a[0][0],ts=q?Date.UTC(+q[1],q[2]-1,+q[3],q[4]-9,+q[5]):parseInt(a[0].slice(1),36)*1000,m=a.slice(4),d=a[2]||'';
 d=d?(d[0]==='='?d.slice(1):(m[+d]||'')):'';return {t:(f&2?kstDay(ts)+' - ':'')+a[1],m:m,d:d,o:f&1?1:0,ts:ts,i:a[3]?a[3].split('\x01'):[],th:''}}
function uEsc(x){return x.replace(/[\x00-\x7f]/g,function(c){return c===' '?'_':/[A-Za-z0-9.\-]/.test(c)?c:'%'+('0'+c.charCodeAt(0).toString(16).toUpperCase()).slice(-2)})}
function uUnesc(x){return decodeURIComponent(x.replace(/_/g,' '))}
function enc3(p){var s=pack3(p),u=new TextEncoder().encode(s),c=['J'+b64u(u),'U'+s.split('\0').map(uEsc).join('~')];
 var done=function(){return c.reduce(function(a,b){return b.length<a.length?b:a})};
 if(typeof CompressionStream==='undefined')return Promise.resolve(done());
 return pipe(u,new CompressionStream('deflate-raw')).then(function(z){c.push('Z'+b64u(z));return done()})}
function dec3(s){if(s[0]==='U')return Promise.resolve(s.slice(1).split('~').map(uUnesc).join('\0'));var u=unb64u(s.slice(1));
 return (s[0]==='Z'?pipe(u,new DecompressionStream('deflate-raw')):Promise.resolve(u)).then(function(b){return new TextDecoder().decode(b)})}
function decAny(s){return /^[ZJU]/.test(s)?dec3(s).then(unpack3):dec(s).then(unpack)}
var shared=null;
function openShared(){var m=location.hash.match(/^#s=(.+)$/);if(!m)return;decAny(m[1]).then(function(o){if(!o.i||!o.i.length){var mm=(o.t||'').match(/^\d{4}\.\d\d\.\d\d\s*-\s*(.+)$/);o.i=mm?mm[1].split(' · '):[]}shared=o;
  $('simg').style.display=o.th?'':'none';$('simg').src=o.th||'';$('st').innerHTML='<span class="tag '+(o.o?'done':'open')+'">'+(o.o?'완료':'진행중')+'</span>'+esc(o.t||'');
  $('sm').innerHTML=(o.m&&o.m.length?'파티원 '+o.m.map(function(n){return '<span class="at">@'+esc(n)+'</span>'}).join(''):'')+'<br>👑 분배자 <span class="dist">'+(o.d?esc(o.d):'-')+'</span>';
  $('snote').textContent=o.th?'공유 링크에는 작은 미리보기 이미지만 들어 있어요.':'';
  var dup=posts.some(function(p){return p.ts===o.ts&&p.title===o.t});$('sImport').textContent=dup?'이미 내 목록에 있어요':'＋ 내 목록에 추가';$('sImport').disabled=dup;
  $('sv').classList.add('show')}).catch(function(){toast('공유 링크를 읽지 못했어요')})}
function closeShared(){$('sv').classList.remove('show');history.replaceState(null,'',location.pathname+location.search)}
$('sClose').onclick=closeShared;$('sv').onclick=function(e){if(e.target===this)closeShared()};
$('sImport').onclick=function(){if(!shared||this.disabled)return;posts.unshift({title:shared.t,items:shared.i||[],members:shared.m||[],dist:shared.d||null,done:!!shared.o,thumb:shared.th||'',big:shared.th||'',ts:shared.ts||Date.now()});persist();render();closeShared();toast('내 목록에 추가했어요')};
$('zShare').onclick=function(){if(zIdx>=0)share(zIdx)};$('zShareImg').onclick=function(){if(zIdx>=0)share(zIdx,true)};
window.addEventListener('hashchange',openShared);
load();render();if(!localStorage.getItem(BunbaeNames.KEY)){var all=[];posts.forEach(function(p){all=all.concat(p.members||[])});BunbaeNames.learn(all)}openShared();
})();
