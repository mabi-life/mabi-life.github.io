// 분배 도우미 → Discord 분배 포럼 글 생성 (Incoming Webhook per forum, secrets only)
const FORUMS={lute:['WH_LUTE','류트'],mandolin:['WH_MANDOLIN','만돌린'],harp:['WH_HARP','하프'],wolf:['WH_WOLF','울프']};
const GUILD='1421225395004641394';
const ORIGINS=[/^https:\/\/mabi-life\.com$/,/^https:\/\/www\.mabi-life\.com$/,/^https:\/\/mabi-life\.github\.io$/,/^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/];
const cors=o=>({'Access-Control-Allow-Origin':o,'Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type','Vary':'Origin'});
const J=(o,s,h)=>new Response(JSON.stringify(o),{status:s,headers:{'Content-Type':'application/json',...h}});
const clean=(s,n)=>String(s||'').replace(/@(everyone|here)/gi,'@\u200b$1').replace(/<@[!&]?\d+>/g,'').replace(/[\r\n\t]+/g,' ').trim().slice(0,n);
async function sha(s){const b=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(s));return [...new Uint8Array(b)].map(x=>x.toString(16).padStart(2,'0')).join('').slice(0,32)}
export default{async fetch(req,env){
 const o=req.headers.get('Origin')||'';const ok=ORIGINS.some(r=>r.test(o));const h=ok?cors(o):{};
 if(req.method==='OPTIONS')return new Response(null,{status:ok?204:403,headers:h});
 if(req.method!=='POST')return J({ok:false,error:'method'},405,h);
 if(!ok)return J({ok:false,error:'origin'},403,h);
 let b;try{b=await req.json()}catch{return J({ok:false,error:'json'},400,h)}
 const f=FORUMS[b.server];if(!f)return J({ok:false,error:'server'},400,h);
 const hook=env[f[0]];if(!hook)return J({ok:false,error:'not_configured'},503,h);
 const title=clean(b.title,100),dist=clean(b.dist,40),url=String(b.url||'');
 const members=(Array.isArray(b.members)?b.members:[]).slice(0,12).map(m=>clean(m,30)).filter(Boolean);
 if(!title)return J({ok:false,error:'title'},400,h);
 if(url&&!/^https:\/\/mabi-life\.com\/b\/#[A-Za-z0-9~%._\-\u0080-\uffff]{1,1500}$/.test(url))return J({ok:false,error:'url'},400,h);
 const ip=req.headers.get('CF-Connecting-IP')||'0';
 const kIp='bs:ip:'+await sha(ip),kSame='bs:same:'+await sha(b.server+'|'+title+'|'+members.join(',')+'|'+dist);
 const [n,same]=await Promise.all([env.KV.get(kIp),env.KV.get(kSame)]);
 if(same)return J({ok:false,error:'duplicate',thread:same},429,h);
 if(+n>=5)return J({ok:false,error:'rate'},429,h);
 const lines=[];if(members.length)lines.push('파티원  '+members.map(m=>'@'+m).join(' '));lines.push('분배자  '+(dist||'-'));if(url)lines.push('',url);
 const r=await fetch(hook+(hook.includes('?')?'&':'?')+'wait=true',{method:'POST',headers:{'Content-Type':'application/json'},
  body:JSON.stringify({thread_name:title,content:lines.join('\n').slice(0,1900),username:'마비라이프 분배',allowed_mentions:{parse:[]}})});
 if(!r.ok){return J({ok:false,error:'discord',status:r.status},502,h)}
 const m=await r.json();const thread=`https://discord.com/channels/${GUILD}/${m.channel_id}`;
 await Promise.all([env.KV.put(kIp,String((+n||0)+1),{expirationTtl:600}),env.KV.put(kSame,thread,{expirationTtl:600})]);
 return J({ok:true,thread,forum:f[1]},200,h)}};
