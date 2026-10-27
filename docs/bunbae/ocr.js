/* 분배 도우미 OCR core v1.3 — browser + node */
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
 var block=vote(runs),rows=await nameRows(worker,img,toInput,runs);
 res.names=rows.length>=block.length?rows:block;res.nameMode=rows.length>=block.length?'row':'block';return res}
// 파티원 줄 단위: 1행 y≈0.467, 간격 0.0429 (607x700 기준), 최대 8명. 이름 열만(x 0.565~0.80) 잘라 5가지 전처리로 읽고 투표
var ROW_Y0=0.4675,ROW_DY=0.0429,ROW_V=[[3,150],[3,0],[2,150],[3,120],[4,150]];
async function nameRows(worker,img,toInput,runs){var B=NAME_BOX;var out=[],miss=0;await worker.setParameters({tessedit_pageseg_mode:'7'});
 try{for(var k=0;k<8&&miss<2;k++){var yc=ROW_Y0+k*ROW_DY,sc={};(runs||[]).forEach(function(r){r.forEach(function(l){var t=l.text.replace(/[^가-힣A-Za-z0-9]/g,'');if(Math.abs(B[1]+l.cy-yc)<ROW_DY*0.5&&/^[가-힣A-Za-z0-9]{2,12}$/.test(t)&&/[가-힣]/.test(t)&&!BAD.test(t)&&l.confidence>=50)sc[t]=(sc[t]||0)+l.confidence})});
  for(var v=0;v<ROW_V.length;v++){var r=await worker.recognize(toInput(crop(img,0.565,yc-0.017,0.80,yc+0.017,ROW_V[v][0],ROW_V[v][1])));var t=r.data.text.replace(/[^가-힣A-Za-z0-9]/g,'');
   if(/^[가-힣A-Za-z0-9]{2,12}$/.test(t)&&/[가-힣]/.test(t)&&!BAD.test(t)&&r.data.confidence>=50)sc[t]=(sc[t]||0)+r.data.confidence}
  var e=Object.entries(sc).sort(function(a,b){return b[1]-a[1]})[0];if(e&&e[1]>=100){miss=0;if(out.indexOf(e[0])<0)out.push(e[0])}else miss++}}
 finally{await worker.setParameters({tessedit_pageseg_mode:'6'})}return out}
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

// resample a sub-rect (px) of RGBA img to width tw (bilinear-ish box)
function resample(img,x,y,w,h,tw){var W=img.width,H=img.height,th=Math.round(h*tw/w),o=new Uint8ClampedArray(tw*th*4),d=img.data,k=w/tw;
 for(var oy=0;oy<th;oy++)for(var ox=0;ox<tw;ox++){var sx0=x+ox*k,sy0=y+oy*k,n=Math.max(1,Math.ceil(k)),r=0,g=0,b=0,c=0;
  for(var j=0;j<n;j++)for(var i=0;i<n;i++){var px=Math.floor(sx0+(i+.5)*k/n),py=Math.floor(sy0+(j+.5)*k/n);if(px<0||py<0||px>=W||py>=H){r+=20;g+=20;b+=40;c++;continue}var q=(py*W+px)*4;r+=d[q];g+=d[q+1];b+=d[q+2];c++}
  var t=(oy*tw+ox)*4;o[t]=r/c;o[t+1]=g/c;o[t+2]=b/c;o[t+3]=255}
 return {width:tw,height:th,data:o}}
// ref layout (607x700 dialog): 리스트 x0=46.5 y0=54 · 정보 x0=490 y0=81 · 전체(입찰) x0=240 y0=665
var REF={w:607,h:700,lx:46.5,ly:54,ix:490,iy:81,ex:240,ey:665};
function locateFromWords(words){var L=[],I=[],E=[];function prev(w,re){return words.some(function(v){return re.test(v.text)&&Math.abs(v.bbox.y0-w.bbox.y0)<(w.bbox.y1-w.bbox.y0)*0.6&&v.bbox.x1<=w.bbox.x0+3&&w.bbox.x0-v.bbox.x1<2.5*(w.bbox.y1-w.bbox.y0)})}
 words.forEach(function(w){var t=w.text.replace(/\s/g,'');if(w.confidence<30)return;var bb=w.bbox;
  if(/리스트/.test(t)&&(prev(w,/보상/)||/보상/.test(t)))L.push({x:bb.x0+(/보상/.test(t)?(bb.x1-bb.x0)*0.45:0),y:bb.y0,h:bb.y1-bb.y0});
  if(/^정보/.test(t)&&prev(w,/상세/))I.push({x:bb.x0,y:bb.y0});
  if(/^전체/.test(t))E.push({x:bb.x0,y:bb.y0})});
 var best=null;L.forEach(function(l){var c={l:l,sx:0,sy:0,sc:0};
  I.forEach(function(i){var s=(i.x-l.x)/(REF.ix-REF.lx);if(s>0.2&&Math.abs(i.y-l.y-(REF.iy-REF.ly)*s)<10*s&&Math.abs(l.h/14-s)<0.6*s&&c.sc<2){c.sx=s;c.sc=2}});
  E.forEach(function(e){var s=(e.y-l.y)/(REF.ey-REF.ly),ref=c.sx||l.h/14;if(s>0.2&&Math.abs(s/ref-1)<0.3&&Math.abs(e.x-l.x-(REF.ex-REF.lx)*s)<25*s){if(!c.sy||Math.abs(s-ref)<Math.abs(c.sy-ref))c.sy=s}});
  if(c.sy)c.sc++;if(!best||c.sc>best.sc)best=c});
 if(!best)return null;var l=best.l,sx=best.sx||best.sy||l.h/14,sy=best.sy||sx;if(!(sx>0.2&&sx<8))return null;
 return {x:l.x-REF.lx*sx,y:l.y-REF.ly*sy,w:REF.w*sx,h:REF.h*sy,s:sx,anchors:'L'+(best.sx?'I':'')+(best.sy?'E':'')}}
async function locate(worker,img,toInput){var out=null;await worker.setParameters({tessedit_pageseg_mode:'11'});
 try{var r=await worker.recognize(toInput(crop(img,0,0,1,1,1,150)));out=locateFromWords(r.data.words||[]);
  if(!out||out.anchors==='L'){var r2=await worker.recognize(toInput(crop(img,0,0,1,1,1,0)));var o2=locateFromWords(r2.data.words||[]);if(o2&&(!out||o2.anchors.length>out.anchors.length))out=o2}}
 finally{await worker.setParameters({tessedit_pageseg_mode:'6'})}return out}
// full pipeline on an arbitrary screenshot
function bilinear(img,x,y,w,h,tw){var W=img.width,H=img.height,th=Math.round(h*tw/w),o=new Uint8ClampedArray(tw*th*4),d=img.data,k=w/tw;
 for(var oy=0;oy<th;oy++)for(var ox=0;ox<tw;ox++){var fx=x+(ox+.5)*k-.5,fy=y+(oy+.5)*k-.5,xi=Math.floor(fx),yi=Math.floor(fy),dx=fx-xi,dy=fy-yi,t=(oy*tw+ox)*4;
  for(var c=0;c<3;c++){var P=function(xx,yy){if(xx<0||yy<0||xx>=W||yy>=H)return c==2?40:20;return d[(yy*W+xx)*4+c]};
   o[t+c]=P(xi,yi)*(1-dx)*(1-dy)+P(xi+1,yi)*dx*(1-dy)+P(xi,yi+1)*(1-dx)*dy+P(xi+1,yi+1)*dx*dy}o[t+3]=255}
 return {width:tw,height:th,data:o}}
function extract(img,x,y,w,h){var tw=610;if(Math.abs(w/607-1)<0.08){x=Math.round(x);y=Math.round(y);w=Math.round(w);h=Math.round(h);var o=new Uint8ClampedArray(w*h*4);
  for(var j=0;j<h;j++)for(var i=0;i<w;i++){var sx=x+i,sy=y+j,t=(j*w+i)*4;if(sx<0||sy<0||sx>=img.width||sy>=img.height){o[t]=o[t+1]=20;o[t+2]=40}else{var q=(sy*img.width+sx)*4;o[t]=img.data[q];o[t+1]=img.data[q+1];o[t+2]=img.data[q+2]}o[t+3]=255}
  return {width:w,height:h,data:o}}
 return w>tw*1.5?bilinear(resample(img,x,y,w,h,Math.round(tw*1.5)),0,0,Math.round(tw*1.5),Math.round(h*tw*1.5/w),tw):bilinear(img,x,y,w,h,tw)}
async function runAny(worker,img,toInput,onProg){var box=null;
 var f=Math.max(0.5,Math.min(2,2400/Math.max(img.width,img.height)));var src=f===1?img:resample(img,0,0,img.width,img.height,Math.round(img.width*f));
 try{box=await locate(worker,src,toInput)}catch(e){box=null}
 if(!box&&f!==1){try{box=await locate(worker,img,toInput);if(box)f=1}catch(e){box=null}}
 if(box){box={x:box.x/f,y:box.y/f,w:box.w/f,h:box.h/f,s:box.s/f,anchors:box.anchors}}
 var dlg;if(box){dlg=extract(img,box.x,box.y,box.w,box.h)}else{var w=img.width;dlg=(w>700||w<450)?bilinear(img,0,0,img.width,img.height,610):img}
 var res=await run(worker,dlg,toInput,onProg);res.located=!!box;res.box=box;return res}
var api={runAny:runAny,locate:locate,resample:resample,listItems:listItems,cleanSlot:cleanSlot,crop:crop,vote:vote,cleanItem:cleanItem,run:run};
if(typeof module!=='undefined')module.exports=api;else root.BunbaeOCR=api;
})(this);
