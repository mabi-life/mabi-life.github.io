/* 분배 도우미 OCR core v1.1 — browser + node */
(function(root){
var BAD=/입찰|포기|분배|보상|리스트|상세|종료|남음|정보|주사위|현황|완료|전체|최고/;
// src:{width,height,data(RGBA)} -> {width,height,data} grayscale-binarized, dark text on white
function crop(img,x0,y0,x1,y1,sc,th){var W=img.width,H=img.height,ax=Math.round(x0*W),ay=Math.round(y0*H),w=Math.round((x1-x0)*W),h=Math.round((y1-y0)*H),ow=w*sc,oh=h*sc,o=new Uint8ClampedArray(ow*oh*4),d=img.data;
 function P(xx,yy){xx=xx<0?0:xx>=W?W-1:xx;yy=yy<0?0:yy>=H?H-1:yy;var i=(yy*W+xx)*4;return Math.min(d[i],d[i+1],d[i+2])}
 for(var y=0;y<oh;y++)for(var x=0;x<ow;x++){var fx=ax+(x+.5)/sc-.5,fy=ay+(y+.5)/sc-.5,xi=Math.floor(fx),yi=Math.floor(fy),dx=fx-xi,dy=fy-yi;
  var v=P(xi,yi)*(1-dx)*(1-dy)+P(xi+1,yi)*dx*(1-dy)+P(xi,yi+1)*(1-dx)*dy+P(xi+1,yi+1)*dx*dy;
  var g=th?(v>th?0:255):255-v,j=(y*ow+x)*4;o[j]=o[j+1]=o[j+2]=g;o[j+3]=255}
 return {width:ow,height:oh,data:o}}
var NAME_BOX=[0.565,0.445,0.80,0.66],ITEM_BOX=[0.56,0.27,0.97,0.34],LEFT_BOX=[0.03,0.10,0.55,0.20];
var VARIANTS=[[4,150],[3,150],[5,150],[4,0],[3,180],[5,180]];
function cleanName(t){return t.replace(/[^가-힣A-Za-z0-9]/g,'')}
function vote(runs){var rows={};runs.forEach(function(r){r.forEach(function(l){var t=cleanName(l.text);
 if(!/^[가-힣A-Za-z0-9]{2,12}$/.test(t)||!/[가-힣]/.test(t)||BAD.test(t)||l.confidence<50)return;
 var k=Math.round(l.cy/0.0415);rows[k]=rows[k]||{};rows[k][t]=(rows[k][t]||0)+l.confidence})});
 var out=[];Object.keys(rows).sort(function(a,b){return a-b}).forEach(function(k){var e=Object.entries(rows[k]).sort(function(a,b){return b[1]-a[1]})[0];if(out.indexOf(e[0])<0)out.push(e[0])});return out}
function cleanItem(t){var ls=t.split('\n').map(function(s){return s.replace(/[|_~"'`.,:;!?\\\/\[\]{}()<>«»“”‘’^*#=+-]/g,' ').replace(/[^가-힣0-9A-Za-z ]/g,'').replace(/\s+/g,' ').trim()}).filter(function(s){return (s.match(/[가-힣]/g)||[]).length>=2&&!BAD.test(s)});
 return ls.length?ls[0].replace(/^[A-Za-z0-9]{1,2} (?=[가-힣])/,'').trim():''}
// toInput(imgData)->something worker.recognize accepts (canvas in browser, PNG buffer in node)
async function run(worker,img,toInput,onProg){var res={item:'',names:[]};var step=0,total=VARIANTS.length+1;
 var r=await worker.recognize(toInput(crop(img,ITEM_BOX[0],ITEM_BOX[1],ITEM_BOX[2],ITEM_BOX[3],3,150)));res.item=cleanItem(r.data.text);
 if(!res.item){r=await worker.recognize(toInput(crop(img,ITEM_BOX[0],ITEM_BOX[1],ITEM_BOX[2],ITEM_BOX[3],3,0)));res.item=cleanItem(r.data.text)}
 if(!res.item){r=await worker.recognize(toInput(crop(img,LEFT_BOX[0],LEFT_BOX[1],LEFT_BOX[2],LEFT_BOX[3],3,150)));res.item=cleanItem(r.data.text)}
 res.items=await listItems(worker,img,toInput,3,res.item);if(!res.item&&res.items[0])res.item=res.items[0];
 onProg&&onProg(++step/total);
 var runs=[],b=NAME_BOX;
 for(var i=0;i<VARIANTS.length;i++){var sc=VARIANTS[i][0],th=VARIANTS[i][1];var c=crop(img,b[0],b[1],b[2],b[3],sc,th);
  var rr=await worker.recognize(toInput(c));var H=c.height;
  runs.push(rr.data.lines.map(function(l){return {text:l.text,confidence:l.confidence,cy:((l.bbox.y0+l.bbox.y1)/2/H)*(b[3]-b[1])}}));onProg&&onProg(++step/total)}
 res.names=vote(runs);return res}
function cleanSlot(t){var tk=t.replace(/[|\[\]{}()<>\/]/g,' ').trim().split(/\s+/),o=[];for(var i=0;i<tk.length;i++){if(/^[가-힣0-9]+$/.test(tk[i])&&!BAD.test(tk[i]))o.push(tk[i]);else break}
 var r=o.join(' ');return (r.match(/[가-힣]/g)||[]).length>=2?r:''}
var SLOT_Y0=0.132,SLOT_DY=0.1225,SLOT_V=[[4,150],[3,150],[4,0],[3,180],[5,170]];
async function listItems(worker,img,toInput,n,right){await worker.setParameters({tessedit_pageseg_mode:'7'});var out=[];
 try{for(var k=0;k<n;k++){var yc=SLOT_Y0+k*SLOT_DY,score={};
  for(var v=0;v<SLOT_V.length;v++){var r=await worker.recognize(toInput(crop(img,0.11,yc-0.018,0.53,yc+0.018,SLOT_V[v][0],SLOT_V[v][1])));var t=cleanSlot(r.data.text);if(t&&r.data.confidence>=40)score[t]=(score[t]||0)+r.data.confidence}
  var best=Object.entries(score).sort(function(a,b){return b[1]-a[1]})[0];out.push(best?best[0]:'')}}
 finally{await worker.setParameters({tessedit_pageseg_mode:'6'})}
 if(right){var nz=function(s){return s.replace(/\s/g,'')};if(!out[0]||nz(out[0])!==nz(right)){if(out.some(function(x){return x&&nz(x)===nz(right)}))out=out;else out[0]=right}}
 return out.filter(function(x,i){return x&&out.indexOf(x)===i})}
var api={listItems:listItems,cleanSlot:cleanSlot,crop:crop,vote:vote,cleanItem:cleanItem,run:run};
if(typeof module!=='undefined')module.exports=api;else root.BunbaeOCR=api;
})(this);
