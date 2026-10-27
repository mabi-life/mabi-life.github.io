(()=>{
const $=s=>document.querySelector(s),num=s=>+String(s).replace(/[^0-9]/g,'')||0,f=v=>Math.floor(v).toLocaleString('ko-KR');
const kor=v=>{const e=Math.floor(v/1e8),m=Math.floor(v%1e8/1e4);return v?(e?e+'억 ':'')+(m?m+'만':''):''};
const CP=[10,20,30,50,100],NAME=c=>`경매장 수수료 ${c}% 할인 쿠폰`;
// 기본값: 2026-10-27 20:35 KST Open API 최저가 스냅샷 → /prices.json 로 갱신
let cpPrice={10:254900,20:800000,30:1495000,50:11740000,100:7140000},cpT=new Date('2026-10-27T20:35:00+09:00');
let rate=4,force=null;
async function refresh(){$('#upd').textContent='시세 불러오는 중…';
 try{const r=await fetch('/prices.json',{cache:'no-store'});const d=await r.json();let got=0;CP.forEach(c=>{const x=d.prices&&d.prices[NAME(c)];if(x){cpPrice[c]=x.min;got++;if(x.t)cpT=new Date(x.t)}});if(!got)throw 0}
 catch(e){}
 calc()}
function calc(){const p=num($('#price').value),n=Math.max(1,num($('#n').value)),base=Math.floor(p*rate/100);
 const rows=[{c:0,price:0,ben:0}].concat(CP.map(c=>({c,price:cpPrice[c],ben:Math.floor(base*c/100)-(cpPrice[c]??Infinity)})));
 const best=rows.reduce((a,b)=>b.ben>a.ben?b:a),use=rows.find(o=>o.c===force)||best;
 const fee=base-Math.floor(base*use.c/100)+use.price,net=p-fee;
 $('#kor').textContent=kor(p);$('#rFee').textContent=f(fee);$('#rNet').textContent=f(net);$('#rPer').textContent=f(net/n);
 $('#pick').textContent=(use===best?'★ 추천: ':'선택: ')+(use.c?use.c+'% 쿠폰':'쿠폰 없음')+(use!==best?` (추천은 ${best.c?best.c+'%':'없음'})`:'');
 $('#cpBody').innerHTML=rows.map(o=>`<tr data-c="${o.c}" class="${o===best?'best':''} ${o===use?'sel':''}"><td>${o.c?o.c+'%':'없음'}</td><td>${o.c?f(o.price):'—'}</td><td style="color:${o.ben>0?'var(--ok)':o.ben<0?'#ffb3bd':'inherit'}">${o.ben>0?'+':''}${f(o.ben)}</td></tr>`).join('');
 document.querySelectorAll('#cpBody tr').forEach(t=>t.onclick=()=>{const c=+t.dataset.c;force=(force===c||c===best.c)?null:c;calc()});
 $('#upd').textContent='시세 '+cpT.toLocaleTimeString('ko-KR',{hour:'2-digit',minute:'2-digit'})+' 기준 · Open API 최저가';}
document.querySelectorAll('[data-rate]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-rate]').forEach(x=>x.classList.remove('on'));b.classList.add('on');rate=+b.dataset.rate;calc()});
document.querySelectorAll('[data-add]').forEach(b=>b.onclick=()=>{const a=+b.dataset.add;$('#price').value=f(a?num($('#price').value)+a:0);force=null;calc()});
document.querySelectorAll('[data-n]').forEach(b=>b.onclick=()=>{$('#n').value=Math.max(1,num($('#n').value)+(b.dataset.n=='+'?1:-1));calc()});
$('#price').oninput=()=>{force=null;calc()};$('#n').oninput=calc;$('#refresh').onclick=refresh;
document.getElementById('list').addEventListener('click',e=>{const b=e.target.closest('[data-fee]');if(!b)return;e.stopPropagation();$('#n').value=Math.max(1,+b.dataset.fee||1);calc();$('#price').focus();$('#price').select();if(innerWidth<900)document.querySelector('.fee').scrollIntoView({behavior:'smooth'})},true);
$('#price').onblur=()=>$('#price').value=f(num($('#price').value));calc();refresh();setInterval(refresh,5*60*1000);
})();
