/* 분배 도우미 이름 사전 v1.6 — 자주 쓰는 이름으로 OCR 결과 보정 (localStorage 'mabi.bunbae.names') */
(function(root){
var CHO='ㄱㄲㄴㄷㄸㄹㅁㅂㅃㅅㅆㅇㅈㅉㅊㅋㅌㅍㅎ',JUNG='ㅏㅐㅑㅒㅓㅔㅕㅖㅗㅘㅙㅚㅛㅜㅝㅞㅟㅠㅡㅢㅣ',JONG=' ㄱㄲㄳㄴㄵㄶㄷㄹㄺㄻㄼㄽㄾㄿㅀㅁㅂㅄㅅㅆㅇㅈㅊㅋㅌㅍㅎ';
function jamo(s){var o=[];for(var i=0;i<s.length;i++){var c=s.charCodeAt(i)-0xAC00;if(c>=0&&c<11172){o.push(CHO[Math.floor(c/588)],JUNG[Math.floor(c%588/28)]);if(c%28)o.push(JONG[c%28])}else o.push(s[i])}return o}
// OCR이 자주 헷갈리는 자모 쌍은 비용 0.4
var NEAR={};'ㄹㄴ ㄹㄷ ㄴㄷ ㅇㅁ ㅁㅂ ㅇㅂ ㅂㅃ ㅅㅆ ㅈㅊ ㅈㅅ ㄱㅋ ㄷㅌ ㅏㅑ ㅓㅕ ㅗㅛ ㅜㅠ ㅡㅜ ㅔㅐ ㅣㅏ ㅇㅎ ㄱㄲ ㄷㄸ 0ㅇ lㅣ Iㅣ 1ㅣ'.split(' ').forEach(function(p){NEAR[p[0]+p[1]]=NEAR[p[1]+p[0]]=1});
function cost(a,b){return a===b?0:NEAR[a+b]?0.4:1}
function dist(a,b){var A=jamo(a),B=jamo(b),m=A.length,n=B.length,d=[];for(var i=0;i<=m;i++){d[i]=[i]}for(var j=1;j<=n;j++)d[0][j]=j;
 for(i=1;i<=m;i++)for(j=1;j<=n;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+cost(A[i-1],B[j-1]));return d[m][n]}
var KEY='mabi.bunbae.names';
function load(){try{return JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch(e){return {}}}
function learn(list){var d=load();(list||[]).forEach(function(n){n=String(n).trim();if(n)d[n]=(d[n]||0)+1});try{localStorage.setItem(KEY,JSON.stringify(d))}catch(e){}}
// returns {name, from} — from set when corrected
function correct(s,dict){dict=dict||load();if(dict[s])return {name:s};var L=jamo(s).length,lim=L<=6?1.4:Math.min(3,L*0.22+0.4),best=null,b1=1e9,b2=1e9;
 Object.keys(dict).forEach(function(k){var x=dist(s,k);if(x<b1||(x===b1&&dict[k]>dict[best])){if(k!==best)b2=b1;b1=x;best=k}else if(x<b2)b2=x});
 if(best&&b1<=lim&&b2-b1>=0.6)return {name:best,from:s};return {name:s}}
function correctAll(arr){var d=load(),out=[],fixes=[];arr.forEach(function(s){var r=correct(s,d);if(r.from)fixes.push(r.from+'→'+r.name);if(out.indexOf(r.name)<0)out.push(r.name)});return {names:out,fixes:fixes}}
var api={jamo:jamo,dist:dist,correct:correct,correctAll:correctAll,learn:learn,load:load,KEY:KEY};
if(typeof module!=='undefined')module.exports=api;else root.BunbaeNames=api;
})(this);
