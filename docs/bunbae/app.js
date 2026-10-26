/* 분배 도우미 v1.4 */
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
 $('list').innerHTML=L.map(function(x){var p=x[0],i=x[1];return '<div class="post'+(p.done?' isdone':'')+'"><div class="thumb" data-z="'+i+'"'+(p.thumb?' style="background-image:url('+p.thumb+')"':'')+'>'+(p.thumb?'':'🎁')+'</div><div class="grow" data-z="'+i+'" style="cursor:zoom-in"><div class="t"><span class="tag '+(p.done?'done':'open')+'">'+(p.done?'완료':'진행중')+'</span>'+esc(p.title)+'</div><div class="m">'+(p.members||[]).map(function(n){return '<span class="at">@'+esc(n)+'</span>'}).join('')+'<br>분배자 <span class="dist">'+(p.dist?'👑 '+esc(p.dist):'-')+'</span></div></div><div class="acts">'+(p.done?'<button class="btn sm ghost" data-re="'+i+'">되돌리기</button>':'<button class="btn sm gold" data-fin="'+i+'">완료</button>')+'<button class="btn sm ghost" data-ed="'+i+'">수정</button></div></div>'}).join('')||'<div class="empty">아직 기록이 없어요. 「＋ 새 분배」로 시작해 보세요.</div>'}
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
 if(editIdx>=0){rec.ts=posts[editIdx].ts;posts[editIdx]=rec}else posts.unshift(rec);persist();closeModal();render()}
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
  var il=(r.items&&r.items.length)?r.items:(r.item?[r.item]:[]);if(il.length){queue=il.slice(1);setItems([il[0]])}var added=0;r.names.forEach(function(n){if(names.indexOf(n)<0){names.push(n);added++}});chips();
  if(!r.item&&!r.names.length)status('인식 실패 · 「보상 분배」 창 부분만 잘라서 다시 넣거나 직접 입력해 주세요','err');
  else status('인식 완료 · 아이템 '+il.length+'개 · 이름 '+r.names.length+'명. 틀린 글자는 ✎로 고쳐 주세요.'+(r.names.length?'':' (이름 인식 실패 · 직접 입력해 주세요)'),'ok')})
 .catch(function(e){console.error(e);prog(null);status('인식 실패 · 직접 입력해 주세요','err')})}
// events
document.addEventListener('click',function(e){var t=e.target,a;
 if(t.closest('[data-f]')){filt=t.closest('[data-f]').dataset.f;document.querySelectorAll('[data-f]').forEach(function(b){b.classList.toggle('on',b.dataset.f===filt)});render();return}
 if((a=t.closest('[data-fin]'))){posts[+a.dataset.fin].done=true;persist();render();return}
 if((a=t.closest('[data-re]'))){posts[+a.dataset.re].done=false;persist();render();return}
 if((a=t.closest('[data-ed]'))){openModal(+a.dataset.ed);return}
 if((a=t.closest('[data-z]'))){var p=posts[+a.dataset.z];if(p)openZoom(+a.dataset.z);return}
 if((a=t.closest('[data-rm]'))){var i=+a.dataset.rm;if(names[i]===dist)dist=null;names.splice(i,1);chips();return}
 if((a=t.closest('[data-edn]'))){var j=+a.dataset.edn,v=prompt('이름 수정',names[j]);if(v&&v.trim()){if(names[j]===dist)dist=v.trim();names[j]=v.trim();chips()}return}
 if((a=t.closest('[data-irm]'))){items.splice(+a.dataset.irm,1);ichips();autoTitle();return}
 if((a=t.closest('[data-it]'))){var o=items[+a.dataset.it];o.on=!o.on;ichips();autoTitle();return}
 if((a=t.closest('[data-pick]'))){var n=names[+a.dataset.pick];dist=dist===n?null:n;chips();return}
});
$('newBtn').onclick=function(){openModal(-1)};$('cancelBtn').onclick=closeModal;$('saveBtn').onclick=function(){save(false)};$('doneBtn').onclick=function(){save(true)};
$('delBtn').onclick=function(){if(editIdx>=0&&confirm('이 기록을 삭제할까요?')){if(posts[editIdx].imgId)imgDel(posts[editIdx].imgId);posts.splice(editIdx,1);persist();closeModal();render()}};
function openZoom(i){var p=posts[i];zIdx=i;showBig($('zimg'),p,p.big||p.thumb||'');$('zimg').style.display=(p.big||p.thumb)?'':'none';$('zt').textContent=p.title;$('zm').innerHTML=((p.members||[]).length?'파티원 '+p.members.map(function(n){return '<span class="at">@'+esc(n)+'</span>'}).join(''):'')+'<br>👑 분배자 <span class="dist">'+(p.dist?esc(p.dist):'-')+'</span>';$('zDel').style.display=$('zEdit').style.display=i>=0?'':'none';$('zoom').classList.add('show')}
function closeZoom(){$('zoom').classList.remove('show')}
$('zoom').onclick=function(e){if(e.target===this)closeZoom()};$('zClose').onclick=closeZoom;
$('zEdit').onclick=function(){closeZoom();openModal(zIdx)};
$('zDel').onclick=function(){if(zIdx>=0&&confirm('이 분배 기록을 삭제할까요?')){if(posts[zIdx].imgId)imgDel(posts[zIdx].imgId);posts.splice(zIdx,1);persist();closeZoom();render()}};
$('nextBtn').onclick=function(){if(queue.length)setItems([queue[0]])};
$('prev').addEventListener('click',function(e){e.stopPropagation();zIdx=-1;$('zimg').src=this.src;$('zimg').style.display='';$('zt').textContent='';$('zm').innerHTML='';$('zDel').style.display=$('zEdit').style.display='none';$('zoom').classList.add('show')});
$('addBtn').onclick=function(){addNames($('addn').value);$('addn').value=''};$('addn').onkeydown=function(e){if(e.key==='Enter'&&!e.isComposing){addNames(this.value);this.value=''}};
$('addiBtn').onclick=function(){var v=$('addi').value.trim();if(v)setItems([v]);$('addi').value=''};$('addi').onkeydown=function(e){if(e.key==='Enter'&&!e.isComposing){$('addiBtn').click()}};
$('title').oninput=function(){titleEdited=true};
$('drop').onclick=function(){$('file').click()};$('file').onchange=function(){handleFile(this.files[0]);this.value=''};
var dz=$('drop');dz.ondragover=function(e){e.preventDefault();dz.classList.add('hover')};dz.ondragleave=function(){dz.classList.remove('hover')};dz.ondrop=function(e){e.preventDefault();dz.classList.remove('hover');handleFile(e.dataTransfer.files[0])};
document.addEventListener('paste',function(e){var it=[].slice.call((e.clipboardData||{}).items||[]).filter(function(x){return x.type.indexOf('image')===0})[0];if(!it)return;e.preventDefault();if(!$('ov').classList.contains('show'))openModal(-1);handleFile(it.getAsFile())});
document.addEventListener('keydown',function(e){if(e.key==='Escape'){closeZoom();}});
load();render();
})();
