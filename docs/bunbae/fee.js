(()=>{
const $=s=>document.querySelector(s),num=s=>+String(s).replace(/[^0-9]/g,'')||0,f=v=>Math.floor(v).toLocaleString('ko-KR');
const kor=v=>{const e=Math.floor(v/1e8),m=Math.floor(v%1e8/1e4);return v?(e?e+'억 ':'')+(m?m+'만':''):''};
const CP=[10,20,30,50,100],NAME=c=>`경매장 수수료 ${c}% 할인 쿠폰`;
// 기본값: 2026-10-27 20:35 KST Open API 최저가 스냅샷 → /prices.json 로 갱신
let cpPrice={10:254900,20:800000,30:1495000,50:11740000,100:7140000},cpT=new Date('2026-10-27T20:35:00+09:00');
let rate=4,force=null;
function feeToast(t){const e=$('#toast');if(!e){try{console.log(t)}catch(_){ }return}e.textContent=t;e.style.display='block';clearTimeout(e._t);e._t=setTimeout(()=>{e.style.display='none'},2400)}
async function refresh(){$('#upd').textContent='시세 불러오는 중…';let ok=false;
 try{const ac=window.AbortController?new AbortController():null,tm=setTimeout(()=>ac&&ac.abort(),8000);const r=await fetch('/prices.json',{cache:'no-store',signal:ac?ac.signal:undefined});clearTimeout(tm);const d=await r.json();let got=0;CP.forEach(c=>{const x=d.prices&&d.prices[NAME(c)];if(x){cpPrice[c]=x.min;got++;if(x.t)cpT=new Date(x.t)}});if(!got)throw 0;ok=true}
 catch(e){}
 calc();if(!ok)$('#upd').textContent='시세를 불러오지 못했어요 · 저장된 기본 시세로 계산 중 (↻ 다시 시도)'}
function calc(){const p=num($('#price').value),n=Math.max(1,num($('#n').value)),base=Math.floor(p*rate/100);
 const rows=[{c:0,price:0,ben:0}].concat(CP.map(c=>({c,price:cpPrice[c],ben:Math.floor(base*c/100)-(cpPrice[c]??Infinity)})));
 const best=rows.reduce((a,b)=>b.ben>a.ben?b:a),use=rows.find(o=>o.c===force)||best;
 const fee=base-Math.floor(base*use.c/100)+use.price,net=p-fee;
 $('#kor').textContent=kor(p);$('#rFee').textContent=f(fee);$('#rNet').textContent=f(net);const ex=Math.floor(net/n),chk=Math.floor(ex/1e4)*1e4;window._chk=chk;window._fee={p,n,rate,c:use.c,cpPrice:use.price,base,disc:Math.floor(base*use.c/100),fee,net,per:chk,exact:ex,isBest:use===best,t:cpT};$('#rPer').textContent=f(chk);$('#rExact').textContent=ex!==chk?'정확히 '+f(ex):'';
 $('#pick').textContent=(use===best?'★ 추천: ':'선택: ')+(use.c?use.c+'% 쿠폰':'쿠폰 없음')+(use!==best?` (추천은 ${best.c?best.c+'%':'없음'})`:'');
 $('#cpBody').innerHTML=rows.map(o=>`<tr data-c="${o.c}" class="${o===best?'best':''} ${o===use?'sel':''}"><td>${o.c?o.c+'%':'없음'}</td><td>${o.c?'<img src="/assets/icons/2x/2000.png" alt="G" style="width:1.1em;height:1.1em;vertical-align:-.2em;margin-right:1px">'+f(o.price):'—'}</td><td style="color:${o.ben>0?'var(--ok)':o.ben<0?'#ffb3bd':'inherit'}">${o.ben>0?'+':''}${f(o.ben)}</td></tr>`).join('');
 document.querySelectorAll('#cpBody tr').forEach(t=>t.onclick=()=>{const c=+t.dataset.c;force=(force===c||c===best.c)?null:c;calc()});
 $('#upd').textContent='시세 '+cpT.toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})+' 기준 · Open API 최저가';}
function downloadPng(blob){const a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='분배결과_'+new Date().toISOString().slice(0,19).replace(/[:T]/g,'')+'.png';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),2e3)}
async function copyOrSavePng(blob){
 const text=String(window._chk||0);let imgOk=false,txtOk=false;
 if(navigator.clipboard&&window.isSecureContext){
  if(window.ClipboardItem){
   try{await navigator.clipboard.write([new ClipboardItem({'image/png':blob,'text/plain':new Blob([text],{type:'text/plain'})})]);imgOk=txtOk=true}
   catch(e){
    try{await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);imgOk=true}catch(e2){imgOk=false}
    if(!txtOk){try{await navigator.clipboard.writeText(text);txtOk=true}catch(e3){}}
   }
  }else{
   try{await navigator.clipboard.writeText(text);txtOk=true}catch(e){}
  }
 }
 if(imgOk){feeToast(txtOk?'✅ 결과 이미지+1인당 금액 복사됨 · 디스코드/수표에 Ctrl+V':'✅ 결과 이미지 복사됨 · 디스코드에 Ctrl+V');return}
 if(!txtOk&&navigator.clipboard&&window.isSecureContext){try{await navigator.clipboard.writeText(text);txtOk=true}catch(e){}}
 downloadPng(blob);feeToast(window.isSecureContext?(txtOk?'💾 PNG 저장됨 · 1인당 금액은 클립보드에 있음':'💾 PNG 저장됨 (클립보드 복사 실패)'):'💾 PNG 저장됨 (HTTP에선 이미지 복사 제한)')
}
function rr(x,X,Y,W,H,R){x.beginPath();x.moveTo(X+R,Y);x.arcTo(X+W,Y,X+W,Y+H,R);x.arcTo(X+W,Y+H,X,Y+H,R);x.arcTo(X,Y+H,X,Y,R);x.arcTo(X,Y,X+W,Y,R);x.closePath()}
function drawShareCard(d){const W=640,H=560,S=2,cv=document.createElement('canvas');cv.width=W*S;cv.height=H*S;const x=cv.getContext('2d');x.scale(S,S);
 const FF='"Pretendard","Noto Sans KR","Apple SD Gothic Neo","Malgun Gothic",sans-serif',GOLD='#f7d98b',DIM='#a9a2c8',TXT='#efeaff';
 const g=x.createLinearGradient(0,0,W,H);g.addColorStop(0,'#211a44');g.addColorStop(1,'#120e26');x.fillStyle=g;x.fillRect(0,0,W,H);
 rr(x,12,12,W-24,H-24,18);x.strokeStyle='rgba(247,217,139,.55)';x.lineWidth=1.5;x.stroke();
 x.textBaseline='alphabetic';x.fillStyle=GOLD;x.font='800 24px '+FF;x.fillText('💰 분배 정산',36,58);
 x.fillStyle=DIM;x.font='500 14px '+FF;x.textAlign='right';x.fillText(d.n+'명 · '+(d.rate==4?'멤버십 4%':'일반 5%'),W-36,58);x.textAlign='left';
 x.fillStyle='rgba(247,217,139,.25)';x.fillRect(36,76,W-72,1);
 const row=(y,l,v,sub,col)=>{x.fillStyle=DIM;x.font='500 16px '+FF;x.fillText(l,36,y);x.textAlign='right';x.fillStyle=col||TXT;x.font='700 20px '+FF;x.fillText(v,W-36,y);if(sub){x.fillStyle=DIM;x.font='400 12.5px '+FF;x.fillText(sub,W-36,y+20)}x.textAlign='left'};
 row(118,'총 판매금액',f(d.p)+' G',kor(d.p));
 row(176,'수수료 할인 쿠폰',d.c?d.c+'% 할인 쿠폰':'쿠폰 없음 (미사용)',d.c?'경매장 수수료 '+d.c+'% 할인 쿠폰':'기본 수수료 '+d.rate+'% 그대로 적용',d.c?GOLD:'#ffb3bd');
 row(234,'쿠폰 가격',d.c?f(d.cpPrice)+' G':'—',d.c?'최저가 '+d.t.toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})+' 기준':'');
 row(292,'빠진 수수료 (실제)',f(d.fee)+' G',d.c?'기본 '+f(d.base)+' − 할인 '+f(d.disc)+' + 쿠폰 '+f(d.cpPrice):'판매금액의 '+d.rate+'%','#ffb3bd');
 row(350,'실수령',f(d.net)+' G');
 rr(x,28,384,W-56,140,14);const g2=x.createLinearGradient(0,384,0,524);g2.addColorStop(0,'rgba(247,217,139,.18)');g2.addColorStop(1,'rgba(247,217,139,.06)');x.fillStyle=g2;x.fill();x.strokeStyle='rgba(247,217,139,.6)';x.lineWidth=1;x.stroke();
 x.textAlign='center';x.fillStyle=GOLD;x.font='600 16px '+FF;x.fillText('1인당 분배금',W/2,420);
 x.font='900 44px '+FF;x.fillText(f(d.per)+' G',W/2,474);
 x.fillStyle=DIM;x.font='400 13px '+FF;x.fillText((d.exact!==d.per?'정확히 '+f(d.exact)+' G · 수표 단위 · ':'')+d.n+'명 기준',W/2,502);
 x.textAlign='right';x.fillStyle='rgba(169,162,200,.6)';x.font='400 11px '+FF;x.fillText('mabi 분배 도우미',W-36,H-20);x.textAlign='left';
 return cv}
window._drawShareCard=d=>drawShareCard(d||window._fee);
async function captureFee(){const btn=$('#capBtn');if(btn){btn.disabled=true;btn.textContent='만드는 중…'}
 try{calc();try{await document.fonts&&document.fonts.ready}catch(_){}
  const cv=drawShareCard(window._fee);const blob=await new Promise(r=>cv.toBlob(r,'image/png'));if(!blob)throw new Error('blob');
  await copyOrSavePng(blob);
 }catch(e){feeToast('이미지 생성 실패 · 다시 시도해 주세요');try{console.warn(e)}catch(_){}}
 finally{if(btn){btn.disabled=false;btn.textContent='🖼 결과 캡처'}}}
document.querySelectorAll('[data-rate]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-rate]').forEach(x=>x.classList.remove('on'));b.classList.add('on');rate=+b.dataset.rate;calc()});
document.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>{const a=+b.dataset.add;$('#price').value=f(a?num($('#price').value)+a:0);force=null;calc()});
document.querySelectorAll('[data-n]').forEach(b=>b.onclick=()=>{$('#n').value=Math.max(1,num($('#n').value)+(b.dataset.n=='+'?1:-1));calc()});
$('#price').oninput=()=>{force=null;calc()};$('#n').oninput=calc;$('#refresh').onclick=refresh;
$('#cpyPer').onclick=()=>{const t=String(window._chk||0),lbl=$('#cpyPerLbl')||$('#cpyPer'),ok=()=>{if(lbl)lbl.textContent='복사됨';feeToast('✅ 1인당 금액 복사됨');setTimeout(()=>{if(lbl)lbl.textContent='복사'},1200)};
 const fail=()=>{feeToast('복사 실패 · 숫자를 직접 복사해 주세요');prompt('1인당 금액',t)};
 if(navigator.clipboard&&window.isSecureContext)navigator.clipboard.writeText(t).then(ok,fail);else{try{const ta=document.createElement('textarea');ta.value=t;ta.setAttribute('readonly','');ta.style.cssText='position:fixed;top:-1000px;opacity:0';document.body.appendChild(ta);ta.select();const ok2=document.execCommand('copy');ta.remove();ok2?ok():fail()}catch(e){fail()}}};
const cap=$('#capBtn');if(cap)cap.onclick=()=>{captureFee()};
document.getElementById('list').addEventListener('click',e=>{const b=e.target.closest('[data-fee]');if(!b)return;e.stopPropagation();$('#n').value=Math.max(1,+b.dataset.fee||1);calc();$('#price').focus();$('#price').select();if(innerWidth<900)document.querySelector('.fee').scrollIntoView({behavior:'smooth'})},true);
$('#price').onblur=()=>$('#price').value=f(num($('#price').value));calc();refresh();setInterval(refresh,5*60*1000);
})();
