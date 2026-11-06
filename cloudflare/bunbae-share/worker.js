// 분배 도우미 → Discord 분배 포럼 글 생성 (Incoming Webhook per forum, secrets only)
// FORUMS: [webhookEnvKey, displayName, tag진행중, tag완료]
const FORUMS={
 lute:['WH_LUTE','류트','1568109557413056614','1568109605332979752'],
 mandolin:['WH_MANDOLIN','만돌린','1568109639935991858','1568109652376289432'],
 harp:['WH_HARP','하프','1568107173253488750','1568107210272145449'],
 wolf:['WH_WOLF','울프','1568109688254500925','1568109699520270497']
};
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
 const tagId=b.done?f[3]:f[2];
 if(new URL(req.url).pathname==='/status'){
  const tid=String(b.thread||'').match(/^https:\/\/discord\.com\/channels\/1421225395004641394\/(\d{5,25})$/),mid=String(b.mid||'');
  if(!tid||!/^\d{5,25}$/.test(mid))return J({ok:false,error:'ids'},400,h);
  if(b.key!==await sha(hook+'|'+tid[1]+'|'+mid))return J({ok:false,error:'key'},403,h);
  const kS='bs:st:'+tid[1],c=+(await env.KV.get(kS))||0;if(c>=20)return J({ok:false,error:'rate'},429,h);
  const ls=['상태  '+(b.done?'완료':'진행중')];if(members.length)ls.push('파티원  '+members.map(m=>'@'+m).join(' '));ls.push('분배자  '+(dist||'-'));if(url)ls.push('',url);
  const r=await fetch(hook.split('?')[0]+'/messages/'+mid+'?thread_id='+tid[1],{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({content:ls.join('\n').slice(0,1900),allowed_mentions:{parse:[]}})});
  await env.KV.put(kS,String(c+1),{expirationTtl:600});
  if(r.ok&&env.DISCORD_BOT_TOKEN){
   try{await fetch('https://discord.com/api/v10/channels/'+tid[1],{method:'PATCH',headers:{Authorization:'Bot '+env.DISCORD_BOT_TOKEN,'Content-Type':'application/json'},body:JSON.stringify({applied_tags:[tagId]})})}catch{}}
  return r.ok?J({ok:true},200,h):J({ok:false,error:'discord',status:r.status},502,h)}
 const ip=req.headers.get('CF-Connecting-IP')||'0';
 const kIp='bs:ip:'+await sha(ip),kSame='bs:same:'+await sha(b.server+'|'+title+'|'+members.join(',')+'|'+dist);
 const [n,same]=await Promise.all([env.KV.get(kIp),env.KV.get(kSame)]);
 if(same)return J({ok:false,error:'duplicate',thread:same},429,h);
 if(+n>=5)return J({ok:false,error:'rate'},429,h);
 const lines=['상태  '+(b.done?'완료':'진행중')];if(members.length)lines.push('파티원  '+members.map(m=>'@'+m).join(' '));lines.push('분배자  '+(dist||'-'));if(url)lines.push('',url);
 const payload={thread_name:title,content:lines.join('\n').slice(0,1900),username:'마비라이프 분배',allowed_mentions:{parse:[]},applied_tags:[tagId]};
 let init={method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)};
 const im=/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+\/]+={0,2})$/.exec(typeof b.image==='string'&&b.image.length<=2.8e6?b.image:'');
 if(im){let bin;try{bin=Uint8Array.from(atob(im[2]),c=>c.charCodeAt(0))}catch{bin=null}
  const sig=bin&&bin.length>12&&(im[1]==='png'?bin[0]===0x89&&bin[1]===0x50:im[1]==='jpeg'?bin[0]===0xff&&bin[1]===0xd8:bin[8]===0x57&&bin[9]===0x45);
  if(sig&&bin.length<=2e6){const ext=im[1]==='jpeg'?'jpg':im[1],fd=new FormData();
   payload.attachments=[{id:0,filename:'bunbae.'+ext}];fd.append('payload_json',JSON.stringify(payload));
   fd.append('files[0]',new Blob([bin],{type:'image/'+im[1]}),'bunbae.'+ext);init={method:'POST',body:fd}}}
 const r=await fetch(hook+(hook.includes('?')?'&':'?')+'wait=true',init);
 if(!r.ok){return J({ok:false,error:'discord',status:r.status},502,h)}
 const m=await r.json();const thread=`https://discord.com/channels/${GUILD}/${m.channel_id}`;
 await Promise.all([env.KV.put(kIp,String((+n||0)+1),{expirationTtl:600}),env.KV.put(kSame,thread,{expirationTtl:600})]);
 return J({ok:true,thread,forum:f[1],mid:m.id,key:await sha(hook+'|'+m.channel_id+'|'+m.id)},200,h)}};
