/* 홈: 전체 저장 내역 내보내기/가져오기 (클라이언트 전용, 서버 전송 없음) */
(function(){
var KEYS=['albaHelper.v2','albaHelper.v1','mabiBarter.v1','mabiBarter.ui','mabiBarter.tq2','mabiBarter.invIconLearn.v1','mabiPassTracker.v1','mabiPassTracker.wealth.v1','mabiPassTracker.wealth.bak.v1','mabiPassTracker.wealth.fold','mabiPassTracker.wealth.mainImportAsked','halo4.cfg','mabi.bunbae.v1','mabi.bunbae.names','mabiCraft.v0','mabiCoin.v1','relicArc','hornSrv','hornCat'];
var DB='mabi-bunbae',ST='img';
var $=function(id){return document.getElementById(id)};
function msg(t){var m=$('bkMsg');if(m)m.textContent=t}
function openDb(){return new Promise(function(res,rej){if(!window.indexedDB)return rej();var r=indexedDB.open(DB,1);r.onupgradeneeded=function(){r.result.createObjectStore(ST)};r.onsuccess=function(){res(r.result)};r.onerror=function(){rej(r.error)}})}
function b2u(b){return new Promise(function(res){var f=new FileReader();f.onload=function(){res(f.result)};f.onerror=function(){res(null)};f.readAsDataURL(b)})}
function idbAll(){return openDb().then(function(d){return new Promise(function(res){var out=[],tx=d.transaction(ST,'readonly'),c=tx.objectStore(ST).openCursor();c.onsuccess=function(){var k=c.result;if(k){out.push([k.key,k.value]);k.continue()}};tx.oncomplete=function(){res(out)};tx.onerror=function(){res([])}})}).then(function(rows){return Promise.all(rows.map(function(r){var v=r[1];return(v instanceof Blob?b2u(v):Promise.resolve(null)).then(function(u){return u?{k:r[0],d:u}:null})}))}).then(function(a){return a.filter(Boolean)}).catch(function(){return[]})}
function idbPut(list){if(!list||!list.length)return Promise.resolve(0);return openDb().then(function(d){return Promise.all(list.map(function(it){return fetch(it.d).then(function(r){return r.blob()})})).then(function(bs){return new Promise(function(res,rej){var tx=d.transaction(ST,'readwrite'),s=tx.objectStore(ST);bs.forEach(function(b,i){s.put(b,list[i].k)});tx.oncomplete=function(){res(bs.length)};tx.onerror=function(){rej(tx.error)}})})})}
function ymd(){var d=new Date();return d.getFullYear()+String(d.getMonth()+1).padStart(2,'0')+String(d.getDate()).padStart(2,'0')}
function exp(){var ls={},n=0;KEYS.forEach(function(k){var v=localStorage.getItem(k);if(v!==null){ls[k]=v;n++}});msg('내보내는 중…');
 idbAll().then(function(imgs){var o={app:'mabi-life',type:'backup',version:1,exportedAt:new Date().toISOString(),localStorage:ls,indexedDB:{'mabi-bunbae/img':imgs}};
 var a=document.createElement('a');a.href=URL.createObjectURL(new Blob([JSON.stringify(o)],{type:'application/json'}));a.download='mabi-life-backup-'+ymd()+'.json';document.body.appendChild(a);a.click();setTimeout(function(){URL.revokeObjectURL(a.href);a.remove()},1000);
 msg(n?('저장 항목 '+n+'개'+(imgs.length?' · 분배 원본 이미지 '+imgs.length+'장':'')+' 내보냈어요.'):'저장된 기록이 없어요. (빈 백업 파일을 받았어요)')})}
function imp(file){var r=new FileReader();r.onload=function(){var o;try{o=JSON.parse(r.result)}catch(e){return msg('JSON 파일이 아니에요.')}
 if(!o||o.app!=='mabi-life'||typeof o.localStorage!=='object')return msg('mabi-life 백업 파일이 아니에요.');
 var ls=o.localStorage,ok=Object.keys(ls).filter(function(k){return KEYS.indexOf(k)>=0&&typeof ls[k]==='string'}),bad=Object.keys(ls).length-ok.length,imgs=(o.indexedDB&&o.indexedDB['mabi-bunbae/img'])||[];
 if(!ok.length&&!imgs.length)return msg('가져올 항목이 없어요.');
 if(!confirm('백업의 '+ok.length+'개 항목'+(imgs.length?'과 분배 이미지 '+imgs.length+'장':'')+'으로 이 브라우저의 기존 기록을 덮어쓸까요?'))return msg('취소했어요.');
 try{ok.forEach(function(k){localStorage.setItem(k,ls[k])})}catch(e){return msg('저장 공간이 부족해 일부만 반영됐을 수 있어요.')}
 idbPut(imgs.filter(function(i){return i&&typeof i.d==='string'&&/^data:/.test(i.d)})).then(function(c){msg(ok.length+'개 항목'+(c?' · 이미지 '+c+'장':'')+' 가져왔어요.'+(bad?' (알 수 없는 항목 '+bad+'개는 무시)':''))},function(){msg(ok.length+'개 항목을 가져왔어요. 분배 이미지는 이 브라우저에서 넣지 못했어요.')})};
 r.readAsText(file)}
document.addEventListener('DOMContentLoaded',function(){var e=$('bkExp'),i=$('bkImp'),f=$('bkFile');if(!e)return;e.onclick=exp;i.onclick=function(){f.click()};f.onchange=function(){if(f.files[0])imp(f.files[0]);f.value=''}});
})();
