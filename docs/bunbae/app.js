/* 분배 도우미 v1.0 */
(function(){
var KEY='mabi.bunbae.v1',$=function(id){return document.getElementById(id)};
var posts=[],filt='all',names=[],dist=null,thumb='',editIdx=-1,titleEdited=false,worker=null,busy=0;
function esc(s){return String(s).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function load(){try{posts=JSON.parse(localStorage.getItem(KEY)||'[]')||[]}catch(e){posts=[]}}
function persist(){try{localStorage.setItem(KEY,JSON.stringify(posts))}catch(e){alert('저장 공간이 부족해요. 오래된 기록을 지워 주세요.')}}
function today(){var d=new Date();return d.getFullYear()+'.'+String(d.getMonth()+1).padStart(2,'0')+'.'+String(d.getDate()).padStart(2,'0')}
function render(){var L=posts.map(function(p,i){return [p,i]}).filter(function(x){return filt==='all'||(filt==='done')===!!x[0].done});
 $('cnt').textContent='진행중 '+posts.filter(function(p){return !p.done}).length+' · [완] '+posts.filter(function(p){return p.done}).length;
 $('list').innerHTML=L.map(function(x){var p=x[0],i=x[1];return '<div class="post'+(p.done?' isdone':'')+'"><div class="thumb" data-z="'+i+'"'+(p.thumb?' style="background-image:url('+p.thumb+')"':'')+'>'+(p.thumb?'':'🎁')+'</div><div class="grow"><div class="t"><span class="tag '+(p.done?'done':'open')+'">'+(p.done?'[완]':'진행중')+'</span>'+esc(p.title)+'</div><div class="m">'+(p.members||[]).map(function(n){return '<span class="at">@'+esc(n)+'</span>'}).join('')+'<br>분배자 <span class="dist">'+(p.dist?'👑 '+esc(p.dist):'-')+'</span></div></div><div class="acts">'+(p.done?'<button class="btn sm ghost" data-re="'+i+'">되돌리기</button>':'<button class="btn sm gold" data-fin="'+i+'">완료</button>')+'<button class="btn sm ghost" data-ed="'+i+'">수정</button></div></div>'}).join('')||'<div class="empty">아직 기록이 없어요. 「＋ 새 분배」로 시작해 보세요.</div>'}
function chips(){$('chips').innerHTML=names.map(function(n,i){return '<span class="chip'+(n===dist?' sel':'')+'" data-pick="'+i+'">'+(n===dist?'👑 ':'')+esc(n)+'<span class="x" data-edn="'+i+'" title="수정">✎</span><span class="x" data-rm="'+i+'" title="삭제">✕</span></span>'}).join('')||'<span class="hint">스크린샷을 넣으면 이름이 여기 나와요. 직접 추가도 돼요.</span>';
 $('dhint').innerHTML=dist?'분배자: <b style="color:var(--gold)">👑 '+esc(dist)+'</b>':'위 이름 중 한 명을 눌러 주세요.'}
function status(t,c){var s=$('status');s.textContent=t;s.className='status'+(c?' '+c:'')}
function prog(v){var p=$('prog');if(v==null){p.style.display='none';return}p.style.display='block';p.firstChild.style.width=Math.round(v*100)+'%'}
function setItem(it){var l=$('itemlbl');l.style.display='';l.innerHTML='🔍 인식: <b style="color:var(--gold)">'+esc(it)+'</b>';if(!titleEdited)$('title').value=today()+' - '+it}
function openModal(i){editIdx=i;var p=i>=0?posts[i]:null;names=p?(p.members||[]).slice():[];dist=p?p.dist:null;thumb=p?p.thumb||'':'';titleEdited=!!p;
 $('title').value=p?p.title:today()+' - ';$('itemlbl').style.display='none';$('mTitle').textContent=p?'분배 수정':'새 분배';$('delBtn').style.display=p?'':'none';
 $('prev').style.display=thumb?'block':'none';$('prev').src=thumb||'';$('dropMsg').style.display=thumb?'none':'';status('');prog(null);chips();$('ov').classList.add('show')}
function closeModal(){$('ov').classList.remove('show')}
function save(done){var t=$('title').value.trim()||today()+' - 분배';var rec={title:t,members:names.slice(),dist:dist,done:done,thumb:thumb,ts:Date.now()};
 if(editIdx>=0){rec.ts=posts[editIdx].ts;posts[editIdx]=rec}else posts.unshift(rec);persist();closeModal();render()}
function addNames(v){v.split(/[,\s]+/).map(function(s){return s.trim()}).filter(Boolean).forEach(function(n){if(names.indexOf(n)<0)names.push(n)});chips()}
function getWorker(){if(!worker)worker=Tesseract.createWorker('kor',1,{logger:function(m){if(m.status&&/load|init/.test(m.status)&&busy)status('인식 엔진 준비 중… (처음 한 번만 몇 초 걸려요)')}}).then(function(w){return w.setParameters({tessedit_pageseg_mode:'6'}).then(function(){return w})});return worker}
function handleFile(file){if(!file||!/^image\//.test(file.type))return;var url=URL.createObjectURL(file),img=new Image();img.onload=function(){
 // thumbnail
 var tw=240,th=Math.round(img.height*tw/img.width),tc=document.createElement('canvas');tc.width=tw;tc.height=th;tc.getContext('2d').drawImage(img,0,0,tw,th);thumb=tc.toDataURL('image/jpeg',.7);
 $('prev').src=url;$('prev').style.display='block';$('dropMsg').style.display='none';
 // normalize to ~610px wide (tuned)
 var W=img.width>700||img.width<450?610:img.width,H=Math.round(img.height*W/img.width),c=document.createElement('canvas');c.width=W;c.height=H;var x=c.getContext('2d');x.imageSmoothingQuality='high';x.drawImage(img,0,0,W,H);
 ocr(x.getImageData(0,0,W,H))};img.src=url}
function toInput(d){var c=document.createElement('canvas');c.width=d.width;c.height=d.height;c.getContext('2d').putImageData(new ImageData(d.data,d.width,d.height),0,0);return c}
function ocr(data){if(typeof Tesseract==='undefined'){status('인식 실패 · 직접 입력해 주세요 (인식 엔진을 불러오지 못했어요)','err');return}
 busy++;var my=busy;status('글자 인식 중…');prog(0.02);
 getWorker().then(function(w){return BunbaeOCR.run(w,data,toInput,prog)}).then(function(r){if(my!==busy)return;prog(null);
  if(r.item)setItem(r.item);var added=0;r.names.forEach(function(n){if(names.indexOf(n)<0){names.push(n);added++}});chips();
  if(!r.item&&!r.names.length)status('인식 실패 · 직접 입력해 주세요','err');
  else status('인식 완료 · 아이템 '+(r.item?'✓':'✗')+' · 이름 '+r.names.length+'명. 틀린 글자는 ✎로 고쳐 주세요.'+(r.names.length?'':' (이름 인식 실패 · 직접 입력해 주세요)'),'ok')})
 .catch(function(e){console.error(e);prog(null);status('인식 실패 · 직접 입력해 주세요','err')})}
// events
document.addEventListener('click',function(e){var t=e.target,a;
 if(t.closest('[data-f]')){filt=t.closest('[data-f]').dataset.f;document.querySelectorAll('[data-f]').forEach(function(b){b.classList.toggle('on',b.dataset.f===filt)});render();return}
 if((a=t.closest('[data-fin]'))){posts[+a.dataset.fin].done=true;persist();render();return}
 if((a=t.closest('[data-re]'))){posts[+a.dataset.re].done=false;persist();render();return}
 if((a=t.closest('[data-ed]'))){openModal(+a.dataset.ed);return}
 if((a=t.closest('[data-z]'))){var p=posts[+a.dataset.z];if(p&&p.thumb){$('zoom').querySelector('img').src=p.thumb;$('zoom').classList.add('show')}return}
 if((a=t.closest('[data-rm]'))){var i=+a.dataset.rm;if(names[i]===dist)dist=null;names.splice(i,1);chips();return}
 if((a=t.closest('[data-edn]'))){var j=+a.dataset.edn,v=prompt('이름 수정',names[j]);if(v&&v.trim()){if(names[j]===dist)dist=v.trim();names[j]=v.trim();chips()}return}
 if((a=t.closest('[data-pick]'))){var n=names[+a.dataset.pick];dist=dist===n?null:n;chips();return}
});
$('newBtn').onclick=function(){openModal(-1)};$('cancelBtn').onclick=closeModal;$('saveBtn').onclick=function(){save(false)};$('doneBtn').onclick=function(){save(true)};
$('delBtn').onclick=function(){if(editIdx>=0&&confirm('이 기록을 삭제할까요?')){posts.splice(editIdx,1);persist();closeModal();render()}};
$('zoom').onclick=function(){this.classList.remove('show')};
$('addBtn').onclick=function(){addNames($('addn').value);$('addn').value=''};$('addn').onkeydown=function(e){if(e.key==='Enter'&&!e.isComposing){addNames(this.value);this.value=''}};
$('title').oninput=function(){titleEdited=true};
$('drop').onclick=function(){$('file').click()};$('file').onchange=function(){handleFile(this.files[0]);this.value=''};
var dz=$('drop');dz.ondragover=function(e){e.preventDefault();dz.classList.add('hover')};dz.ondragleave=function(){dz.classList.remove('hover')};dz.ondrop=function(e){e.preventDefault();dz.classList.remove('hover');handleFile(e.dataTransfer.files[0])};
document.addEventListener('paste',function(e){var it=[].slice.call((e.clipboardData||{}).items||[]).filter(function(x){return x.type.indexOf('image')===0})[0];if(!it)return;e.preventDefault();if(!$('ov').classList.contains('show'))openModal(-1);handleFile(it.getAsFile())});
document.addEventListener('keydown',function(e){if(e.key==='Escape'){$('zoom').classList.remove('show');}});
load();render();
})();
