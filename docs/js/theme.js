/* mabi-life theme v1 — 기본 다크, 화이트 모드 토글(localStorage "mabi-theme").
   기존 CSS/인라인 색을 고치지 않고, 화이트 모드일 때만 색을 밝은 톤으로 변환해 덧씌움. */
(function(){
var KEY="mabi-theme",D=document,R=D.documentElement,LIGHT=false,done=new WeakSet(),cache=new Map();
function stored(){try{return localStorage.getItem(KEY)==="light"?"light":"dark"}catch(e){return"dark"}}
/* ---------- color math (OKLab) ---------- */
function lin(c){c/=255;return c<=.04045?c/12.92:Math.pow((c+.055)/1.055,2.4)}
function dlin(c){c=c<=.0031308?12.92*c:1.055*Math.pow(c,1/2.4)-.055;return c*255}
function toLab(r,g,b){r=lin(r);g=lin(g);b=lin(b);
var l=Math.cbrt(.4122214708*r+.5363325363*g+.0514459929*b),m=Math.cbrt(.2119034982*r+.6806995451*g+.1073969566*b),s=Math.cbrt(.0883024619*r+.2817188376*g+.6299787005*b);
return[.2104542553*l+.793617785*m-.0040720468*s,1.9779984951*l-2.428592205*m+.4505937099*s,.0259040371*l+.7827717662*m-.808675766*s]}
function fromLab(L,a,b){var l=L+.3963377774*a+.2158037573*b,m=L-.1055613458*a-.0638541728*b,s=L-.0894841775*a-1.291485548*b;l=l*l*l;m=m*m*m;s=s*s*s;
return[dlin(4.0767416621*l-3.3077115913*m+.2309699292*s),dlin(-1.2684380046*l+2.6097574011*m-.3413193965*s),dlin(-.0041960863*l-.7034186147*m+1.707614701*s)]}
function inG(c){return c[0]>=-.5&&c[0]<=255.5&&c[1]>=-.5&&c[1]<=255.5&&c[2]>=-.5&&c[2]<=255.5}
function lch2rgb(L,C,h){var lo=0,hi=C,c=fromLab(L,C*Math.cos(h),C*Math.sin(h));if(inG(c))return c;
for(var i=0;i<18;i++){var mid=(lo+hi)/2,t=fromLab(L,mid*Math.cos(h),mid*Math.sin(h));if(inG(t)){lo=mid;c=t}else hi=mid}return fromLab(L,lo*Math.cos(h),lo*Math.sin(h))}
function cl(v,a,b){return v<a?a:v>b?b:v}
/* kind: fg(글자) | bg(그 외) | sh(그림자) */
function mapRGBA(r,g,b,a,kind){
 var lab=toLab(r,g,b),L=lab[0],C=Math.hypot(lab[1],lab[2]),h=Math.atan2(lab[2],lab[1]);
 if(kind==="sh"){ if(L<.5)return[0,0,0,a*.35]; }
 var Lp=cl(1.118-.987*L,.12,1);
 if(kind==="surf"){ if(C<.08&&L<.36&&a>=.5){Lp=cl(.95+(L-.19)*.8,.86,1);return lch2rgb(Lp,C,h).concat(a)} kind="bg"; } /* 면(배경): 높은 면일수록 더 하얗게 */
 if(kind!=="fg"&&C<.03&&L<.3&&a>=.5&&a<.85)return[r,g,b,a*.6];      /* 어두운 반투명 스크림은 유지 */
 if(C>=.04&&L>.55){Lp=kind==="fg"?cl(Lp,.43,.53):cl(Lp,.48,.62);C=Math.max(C,.06)} /* 금색·티어·경고 등 밝은 강조색 */
 else if(C>=.04&&L>.35){Lp=cl(Lp,.5,.72)}
 if(kind==="fg"&&C<.04)Lp=Math.min(Lp,.62);
 var o=lch2rgb(Lp,C,h);return[o[0],o[1],o[2],a]}
var NAMED={white:[255,255,255],black:[0,0,0],red:[255,0,0],green:[0,128,0],blue:[0,0,255],yellow:[255,255,0],orange:[255,165,0],gray:[128,128,128],grey:[128,128,128],silver:[192,192,192],gold:[255,215,0],lime:[0,255,0],aqua:[0,255,255],cyan:[0,255,255],magenta:[255,0,255],purple:[128,0,128],pink:[255,192,203],navy:[0,0,128],teal:[0,128,128],maroon:[128,0,0],olive:[128,128,0],whitesmoke:[245,245,245],gainsboro:[220,220,220],lightgray:[211,211,211],lightgrey:[211,211,211],darkgray:[169,169,169],dimgray:[105,105,105],tomato:[255,99,71],crimson:[220,20,60],orangered:[255,69,0],goldenrod:[218,165,32],khaki:[240,230,140],skyblue:[135,206,235],dodgerblue:[30,144,255],royalblue:[65,105,225],limegreen:[50,205,50],seagreen:[46,139,87],coral:[255,127,80],salmon:[250,128,114],violet:[238,130,238]};
var RE=/#[0-9a-fA-F]{3,8}\b|rgba?\([^)]*\)|hsla?\([^)]*\)|\b(?:white|black|red|green|blue|yellow|orange|gray|grey|silver|gold|lime|aqua|cyan|magenta|purple|pink|navy|teal|maroon|olive|whitesmoke|gainsboro|lightgray|lightgrey|darkgray|dimgray|tomato|crimson|orangered|goldenrod|khaki|skyblue|dodgerblue|royalblue|limegreen|seagreen|coral|salmon|violet)\b/gi;
function hsl2rgb(h,s,l){s/=100;l/=100;var k=function(n){return(n+h/30)%12},a=s*Math.min(l,1-l),f=function(n){return 255*(l-a*Math.max(-1,Math.min(k(n)-3,Math.min(9-k(n),1))))};return[f(0),f(8),f(4)]}
function parse(t){var s=t.toLowerCase(),m;
 if(s[0]==="#"){s=s.slice(1);if(s.length===3||s.length===4)s=s.split("").map(function(c){return c+c}).join("");if(s.length!==6&&s.length!==8)return null;
  return[parseInt(s.slice(0,2),16),parseInt(s.slice(2,4),16),parseInt(s.slice(4,6),16),s.length===8?parseInt(s.slice(6,8),16)/255:1]}
 if(NAMED[s])return NAMED[s].concat(1);
 m=s.match(/^(rgba?|hsla?)\(([^)]*)\)$/);if(!m)return null;
 var p=m[2].replace(/\//g," ").replace(/,/g," ").trim().split(/\s+/);if(p.length<3)return null;
 var al=p[3]==null?1:(p[3].indexOf("%")>0?parseFloat(p[3])/100:parseFloat(p[3]));
 if(m[1][0]==="r"){var v=p.slice(0,3).map(function(x){return x.indexOf("%")>0?parseFloat(x)*2.55:parseFloat(x)});if(v.some(isNaN))return null;return v.concat(al)}
 var hs=hsl2rgb(parseFloat(p[0]),parseFloat(p[1]),parseFloat(p[2]));return hs.concat(al)}
function fmt(c){var r=Math.round(cl(c[0],0,255)),g=Math.round(cl(c[1],0,255)),b=Math.round(cl(c[2],0,255)),a=Math.round(c[3]*1000)/1000;
 return a>=1?"#"+[r,g,b].map(function(x){return(x<16?"0":"")+x.toString(16)}).join(""):"rgba("+r+","+g+","+b+","+a+")"}
function mapValue(v,kind){var k=kind+"|"+v;if(cache.has(k))return cache.get(k);
 var out=v.replace(RE,function(t,off,all){var pre=all.slice(Math.max(0,off-4),off);
  if(pre.slice(-1)==="-"||pre.toLowerCase()==="url(")return t;
  var c=parse(t);return c?fmt(mapRGBA(c[0],c[1],c[2],c[3],kind)):t});
 cache.set(k,out);return out}
var FG={"color":1,"caret-color":1,"-webkit-text-fill-color":1,"text-decoration-color":1,"text-emphasis-color":1,"-webkit-text-stroke-color":1,"-webkit-text-stroke":1};
function kindOf(p){p=p.toLowerCase();if(FG[p])return"fg";if(/shadow/.test(p))return"sh";if(/^background/.test(p))return"surf";return"bg"}
function kindVar(p,v){var n=p.slice(2).toLowerCase();
 if(/^(tx|text|fg|ink|font|txt|mu|muted)/.test(n))return"fg";
 if(/ln|line|bd|border|sep|grid|rule/.test(n))return"bg";
 if(/bg|surf|panel|card|back|^p\d*$/.test(n))return"surf";
 var m=(v||"").match(RE);RE.lastIndex=0;var c=m&&parse(m[0]);if(c){var lb=toLab(c[0],c[1],c[2]);if(Math.hypot(lb[1],lb[2])<.04&&lb[0]<.3)return"surf"}return"bg"}
function isColorProp(p){p=p.toLowerCase();return p.slice(0,2)==="--"||FG[p]||/^(background|border|outline|box-shadow|text-shadow|fill|stroke|stop-color|flood-color|lighting-color|column-rule|accent-color|text-decoration|filter|scrollbar-color|-webkit-tap-highlight-color)/.test(p)}
function splitDecl(txt){var out=[],d=0,q=null,cur="";for(var i=0;i<txt.length;i++){var ch=txt[i];
 if(q){cur+=ch;if(ch===q&&txt[i-1]!=="\\")q=null;continue}
 if(ch==='"'||ch==="'"){q=ch;cur+=ch;continue}if(ch==="(")d++;else if(ch===")")d--;
 if(ch===";"&&d===0){out.push(cur);cur=""}else cur+=ch}if(cur.trim())out.push(cur);return out}
function mapDecls(txt){var res=[];splitDecl(txt).forEach(function(dc){var i=dc.indexOf(":");if(i<0)return;var p=dc.slice(0,i).trim(),v=dc.slice(i+1).trim();if(!p||!isColorProp(p))return;
 var kind=p.slice(0,2)==="--"?kindVar(p,v):kindOf(p);res.push(p+":"+mapValue(v,kind))});return res}
/* ---------- stylesheet conversion ---------- */
var PFX='html[data-theme="light"]';
function splitSel(s){var o=[],d=0,c="";for(var i=0;i<s.length;i++){var ch=s[i];if(ch==="("||ch==="[")d++;else if(ch===")"||ch==="]")d--;if(ch===","&&d===0){o.push(c);c=""}else c+=ch}o.push(c);return o}
function pref(sel){return splitSel(sel).map(function(x){x=x.trim();
 if(/^:root\b/.test(x))return PFX+x.slice(5);
 if(/^html(?![\w-])/.test(x))return PFX+x.slice(4);
 return PFX+" "+x}).join(",")}
function conv(rules){var out="";for(var i=0;i<rules.length;i++){var r=rules[i];
 try{
 if(r.type===1){ if(!r.style||!r.style.length)continue;var dd=mapDecls(r.style.cssText);if(dd.length)out+=pref(r.selectorText)+"{"+dd.join(";")+"}\n";}
 else if(r.type===4){var inner=conv(r.cssRules);if(inner)out+="@media "+r.media.mediaText+"{"+inner+"}\n";}
 else if(r.type===12){var inn=conv(r.cssRules);if(inn)out+="@supports "+r.conditionText+"{"+inn+"}\n";}
 else if(r.type===3&&r.styleSheet){out+=convSheet(r.styleSheet)}
 }catch(e){}}return out}
function convSheet(sh){if(done.has(sh))return"";var own=sh.ownerNode;if(own&&own.hasAttribute&&own.hasAttribute("data-theme-skip"))return"";
 var rules;try{rules=sh.cssRules}catch(e){return""}if(!rules)return"";done.add(sh);return conv(rules)}
function convertSheets(){var txt="";for(var i=0;i<D.styleSheets.length;i++)txt+=convSheet(D.styleSheets[i]);
 if(!txt)return;var st=D.createElement("style");st.setAttribute("data-theme-skip","");st.setAttribute("data-theme-gen","");st.textContent=txt;st.disabled=!LIGHT;(D.head||R).appendChild(st);
 if(!LIGHT)st.sheet&&(st.sheet.disabled=true)}
function setGen(on){D.querySelectorAll("style[data-theme-gen]").forEach(function(s){if(s.sheet)s.sheet.disabled=!on})}
/* ---------- inline style / SVG attributes ---------- */
var ATTRS=["style","fill","stroke","stop-color","flood-color","color","bgcolor"],orig=new Map();
function skip(el){return el===R||(el.closest&&el.closest("[data-theme-skip]"))}
function mapAttr(el,a){var v=el.getAttribute(a);if(v==null)return;var rec=orig.get(el);
 if(rec&&rec[a]&&rec[a].m===v)return;/* 이미 변환된 값 */
 var m=a==="style"?mapInline(v):mapValue(v,a==="color"?"fg":"bg");
 if(m===v){if(rec)delete rec[a];return}
 if(!rec){rec={};orig.set(el,rec)}rec[a]={o:v,m:m};el.setAttribute(a,m)}
function mapInline(v){if(!RE.test(v)){RE.lastIndex=0;return v}RE.lastIndex=0;
 return splitDecl(v).map(function(dc){var i=dc.indexOf(":");if(i<0)return dc;var p=dc.slice(0,i).trim(),val=dc.slice(i+1);
  if(!isColorProp(p))return dc;var kind=p.slice(0,2)==="--"?kindVar(p,val):kindOf(p);return p+":"+mapValue(val.trim(),kind)}).join(";")}
function procEl(el){if(el.nodeType!==1||skip(el))return;for(var i=0;i<ATTRS.length;i++)if(el.hasAttribute(ATTRS[i]))mapAttr(el,ATTRS[i])}
function procTree(root){if(root.nodeType!==1)return;procEl(root);var l=root.querySelectorAll("[style],[fill],[stroke],[stop-color],[flood-color],font[color],[bgcolor]");for(var i=0;i<l.length;i++)procEl(l[i])}
function revertAll(){orig.forEach(function(rec,el){for(var a in rec){if(el.getAttribute(a)===rec[a].m)el.setAttribute(a,rec[a].o)}});orig.clear()}
var mo=new MutationObserver(function(ms){
 for(var i=0;i<ms.length;i++){var m=ms[i];
  if(m.type==="childList"){for(var j=0;j<m.addedNodes.length;j++){var n=m.addedNodes[j];
    if(n.nodeName==="STYLE"||n.nodeName==="LINK"){watchSheet(n);continue}
    if(LIGHT)procTree(n)}}
  else if(LIGHT&&m.type==="attributes")procEl(m.target)}});
function watchSheet(n){if(n.hasAttribute&&n.hasAttribute("data-theme-skip"))return;
 if(n.nodeName==="LINK"&&!n.sheet){n.addEventListener("load",function(){convertSheets()},{once:true});return}
 setTimeout(convertSheets,0)}
/* ---------- toggle UI ---------- */
var SUN='<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.5v2.2M12 19.3v2.2M2.5 12h2.2M19.3 12h2.2M5.3 5.3l1.6 1.6M17.1 17.1l1.6 1.6M5.3 18.7l1.6-1.6M17.1 6.9l1.6-1.6"/></svg>',
MOON='<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true" focusable="false" fill="currentColor"><path d="M20.5 14.6A8.5 8.5 0 0 1 9.4 3.5a.6.6 0 0 0-.8-.7A9.5 9.5 0 1 0 21.2 15.4a.6.6 0 0 0-.7-.8z"/></svg>';
var CSS='nav.siteNav button.navTheme{display:inline-flex!important;align-items:center;gap:5px;margin-left:6px;font:inherit;font-size:14px!important;line-height:1.3!important;padding:4px 10px!important;border-radius:6px!important;cursor:pointer;white-space:nowrap;border:1px solid #6b5a33!important;border-top:3px solid #f7d98b!important;background:transparent!important;color:#f0dfae!important}'+
'nav.siteNav button.navTheme:hover{background:rgba(247,217,139,.14)!important;color:#fff3cf!important}'+
'nav.siteNav button.navTheme:focus-visible{outline:2px solid #f7d98b;outline-offset:2px}'+
'nav.siteNav button.navTheme svg{display:block;flex:0 0 auto}nav.siteNav button.navTheme i.tl{font-style:normal;border:0;padding:0;margin:0;background:none}'+
'html[data-theme="light"] nav.siteNav button.navTheme{border-color:#c9b27a!important;border-top-color:#a87b12!important;color:#6b4c00!important}'+
'html[data-theme="light"] nav.siteNav button.navTheme:hover{background:rgba(168,123,18,.1)!important;color:#4a3400!important}'+
'html[data-theme="light"] nav.siteNav button.navTheme:focus-visible{outline-color:#a87b12}'+
'button.navTheme.floatTheme{position:fixed;right:14px;bottom:14px;z-index:2000}'+
'html[data-theme="light"]{color-scheme:light}html[data-theme="light"] img.inv-in-light{filter:invert(1)}'+
'@media(max-width:560px){nav.siteNav button.navTheme .tl{display:none}}';
function paintBtn(b){b.innerHTML=(LIGHT?MOON:SUN)+'<i class="tl">'+(LIGHT?"다크 모드":"화이트 모드")+'</i>';
 b.setAttribute("aria-label",LIGHT?"다크 모드로 전환":"화이트 모드로 전환");b.title=b.getAttribute("aria-label");b.setAttribute("aria-pressed",LIGHT?"true":"false")}
function mountBtn(){if(D.querySelector("button.navTheme"))return;
 var st=D.createElement("style");st.setAttribute("data-theme-skip","");st.textContent=CSS;D.head.appendChild(st);
 var b=D.createElement("button");b.type="button";b.className="navTheme";b.setAttribute("data-theme-skip","");paintBtn(b);
 b.addEventListener("click",function(){setTheme(LIGHT?"dark":"light",true);paintBtn(b)});
 var nav=D.querySelector("nav.siteNav");
 if(nav){var dc=nav.querySelector("a.navDiscord");if(dc)dc.after(b);else{b.style.marginLeft="auto";nav.appendChild(b)}}
 else{b.classList.add("floatTheme");D.body.appendChild(b)}
 /* kit.js가 디스코드 버튼을 나중에 만들면 그 뒤로 이동 */
 if(nav&&!nav.querySelector("a.navDiscord")){new MutationObserver(function(_,o){var dc=nav.querySelector("a.navDiscord");if(dc){b.style.marginLeft="";dc.after(b);o.disconnect()}}).observe(nav,{childList:true})}}
function setTheme(t,save){LIGHT=t==="light";
 if(LIGHT)R.setAttribute("data-theme","light");else R.removeAttribute("data-theme");
 if(save)try{localStorage.setItem(KEY,t)}catch(e){}
 if(LIGHT){convertSheets();setGen(true);if(D.body)procTree(D.body)}else{setGen(false);revertAll()}
 var mt=D.querySelector('meta[name="theme-color"]');if(mt)mt.setAttribute("content",LIGHT?"#f3f4f7":"#14161b");
 try{window.dispatchEvent(new CustomEvent("mabi:themechange",{detail:{theme:t}}))}catch(e){}}
window.mabiTheme={get:function(){return LIGHT?"light":"dark"},set:function(t){setTheme(t,true);var b=D.querySelector("button.navTheme");if(b)paintBtn(b)},map:function(v,kind){return LIGHT?mapValue(v,kind||"bg"):v}};
/* ---------- boot ---------- */
LIGHT=stored()==="light";
mo.observe(R,{subtree:true,childList:true,attributes:true,attributeFilter:ATTRS});
function ready(){convertSheets();if(LIGHT){setGen(true);procTree(D.body)}mountBtn();R.classList.remove("theme-pending");R.style.removeProperty("background")}
if(D.readyState==="loading")D.addEventListener("DOMContentLoaded",ready);else ready();
window.addEventListener("load",function(){convertSheets();if(LIGHT)setGen(true)});
setTimeout(function(){R.classList.remove("theme-pending")},2500);
})();
