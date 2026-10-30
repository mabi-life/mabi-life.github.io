(function(){var C={"홈":"#f7d98b","알바":"#d98bb8","물교":"#c8b46a","던전":"#e0a458","분배":"#6fb7ff","제작":"#7cc49a","유물":"#9a8cf0"},
I={"홈":"🎒","알바":"🧺","물교":"🔁","던전":"⚔","분배":"🪙","제작":"⚒","유물":"💎"},
P={"/":["홈","00",""],"/alba/":["알바","01"],"/barter/":["물교","02"],"/dungeon/":["던전","03","캐릭터별 던전 보상·전재산 기록"],"/bunbae/":["분배","04"],"/craft/":["제작","05"],"/relics/":["유물","06"]};
function go(){var path=location.pathname.replace(/index\.html$/,"");var pg=P[path]||P["/"];var b=document.body;
b.style.setProperty("--kit",C[pg[0]]);
document.querySelectorAll("nav.siteNav a,nav.siteNav span").forEach(function(e){var t=e.textContent.trim();if(!C[t])return;e.style.setProperty("--c",C[t]);e.textContent=I[t]+" "+t});
var nav=document.querySelector("nav.siteNav");if(!nav)return;var wrap=nav.parentElement;if(wrap&&wrap.clientWidth&&wrap.clientWidth<760)b.classList.add("kit-narrow");
if(path=="/alba/"||path=="/barter/")return;
var hd=document.querySelector(".head:not(.coinHead)")||document.querySelector(".wrap>.hd");if(!hd)return;
var h1=hd.querySelector("h1"),p=hd.querySelector("p");var d=document.createElement("div");d.className="kitHd";
d.innerHTML='<span class="ki">'+I[pg[0]]+'</span><div><b></b><div class="kp"></div></div><span class="kn">TOOL '+pg[1]+'</span>';
d.querySelector("b").innerHTML=path=="/"?"마비라이프 도우미 키트":(h1?h1.innerHTML:"");
d.querySelector(".kp").textContent=pg[2]||(p?p.textContent:"")||(hd.textContent.replace(h1?h1.textContent:"","").trim());
nav.after(d);b.classList.add("kit-hd")}
if(document.readyState=="loading")document.addEventListener("DOMContentLoaded",go);else go()})();
