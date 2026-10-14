import { writeFileSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {tubePieces,tubeSvg} from '/Users/yin/.codex/skills/anatomy/kit/tube.mjs';
import * as k from '/Users/yin/.codex/skills/anatomy/kit/iso-kit.mjs';
import { model, rackEquivalents, levels, subjects } from './model.mjs';
const here=dirname(fileURLToPath(import.meta.url));
const W=820,H=620;
const projections=[];
let P={origin:[0,0],scale:1,azimuth:48,elevation:30}, count=0;
const plan=(x,y,w,d,r=.8)=>({x,y,w,d,r});
function box(x,y,z,w,d,h,tone='mid',extra=''){
  count++;
  return `<g ${extra}>${k.solidSvg(k.slabOf(plan(x,y,w,d),z,h,P,3,.35),{tone})}</g>`;
}
const outline=(x,y,z,w,d)=>k.lineSvg(k.planOutline(plan(x,y,w,d,.4),z,P,3),{tone:'faint'});
const dots=(points)=>k.dotsSvg(points.map(p=>k.iso(p,P)),{size:.5,tone:'mid'});
const seam=(a,b)=>k.lineSvg(k.pathOf([k.iso(a,P),k.iso(b,P)]),{tone:'lo'});
function fit(bounds,elevation=30,pad=75){P=k.fitProjection(bounds,W,H,{pad,azimuth:48,elevation});projections.push(P);}
function svg(body,label){return k.figureSvg({width:W,height:H,label,body:[body]});}
function floor(x,y,w,d){return `<path class="iso-halo" d="${k.haloOf(plan(x,y,w,d,5),-4,4,P)}"/>`+box(x,y,-4,w,d,4,'lo')+outline(x+3,y+3,.1,w-6,d-6);}
const shadow=(x,y,z,w,d,blur='contact')=>`<path class="physical-shadow" filter="url(#${blur})" d="${k.planOutline(plan(x,y,w,d,2),z,P,5)}"/>`;
const pipe=(a,b,r=1.8)=>tubePieces([a,b],r,P,{maxLength:1000}).map(p=>tubeSvg(p,{tone:'mid'})).join('');
function faceLabel(text,x,y,z,size=2){const p=k.iso([x,y,z],P);return `<text class="part-label" x="${p[0]}" y="${p[1]}" font-size="${size}">${text}</text>`}
function vent(x,y,z,w,h,cols=10,rows=4){let out='';cols=Math.min(cols,16);rows=Math.min(rows,4);for(let i=0;i<cols;i++)for(let j=0;j<rows;j++){const p=k.iso([x+(i+.5)*w/cols,y,z+(j+.5)*h/rows],P);out+=`<circle cx="${p[0]}" cy="${p[1]}" r=".22"/>`}return `<g class="perforation">${out}</g>`}
// Source compute tray: narrow and deep, disks at front, fans at rear, two NPU packages along depth.
let node=shadow(0,0,0,100,280,'ground')+box(0,0,0,100,280,2,'mid');
node+=box(0,0,2,2,280,28)+box(2,0,2,96,2,25);
node+=box(4,15,2,92,235,1.4,'lo');
let fans='';for(let i=0;i<4;i++){fans+=box(5+i*23,18,3.4,21,30,20,'mid');fans+=outline(7+i*23,20,23.4,17,26);for(let j=0;j<6;j++)fans+=seam([8+i*23+j*2.4,22,23.5],[8+i*23+j*2.4,44,23.5]);}
node+=`<g id="fans" data-subject="fans">${fans}</g>`;
let ports='';for(let i=0;i<5;i++)ports+=box(8+i*13,1,4,10,11,9,'hi');node+=`<g id="power">${box(77,1,4,16,12,12,'mid')}</g>`;node+=`<g id="ports" data-subject="ports">${ports}</g>`;
node+=`<g id="cpu-part">${box(37,126,3.4,26,28,3,'hi')}</g>`;
let host='';
for(const x of [10,82])for(let i=0;i<4;i++)host+=box(x,65+i*35,3.4,7,29,1.8)+box(x+1.5,66+i*35,5.2,3,27,10,'hi');
node+=`<g id="dram" data-subject="cpu">${host}</g>`;
let chips='',plates='';
for(const y of [76,145]){
 chips+=`<g id="npu-${y}">`;
 chips+=box(27,y,4,46,43,2,'mid')+box(39,y+8,6,22,27,3,'hi');
 for(const x of [29,65])for(const dy of [6,25])chips+=box(x,y+dy,6,6,12,2,'mid');
 chips+=outline(40,y+9,9,20,25);
 chips+=dots([[29,y+2,6],[71,y+2,6],[29,y+41,6],[71,y+41,6]]);
 chips+='</g>';
 plates+=box(26,y-1,10,48,45,8,'hi');
 plates+=outline(28,y+1,18,44,41);
 for(const x of [28,72])plates+=dots([[x,y+2,18],[x,y+40,18]]);
 plates+=pipe([16,y+22,16],[26,y+22,16])+pipe([74,y+22,16],[84,y+22,16]);
}
node+=`<g id="chips" data-subject="npu">${chips}</g>`;
let couplings="";for(const x of [16,84]){plates+=pipe([x,-14,16],[x,205,16]);couplings+=pipe([x,-18,16],[x,-8,16],4)+pipe([x,-15,16],[x,-11,16],5.5);}node+=`<g id="couplings">${couplings}</g>`;
node+=`<g id="coldplates" data-subject="cold">${plates}</g>`;
// Front drive bay and removable airflow cover retain the source's front/rear relationship.
let cover=box(3,215,24,94,64,2,'mid');

node+=box(98,0,2,2,280,28)+box(2,278,2,96,2,23,'mid');
node+='<g id="disks">';
for(let i=0;i<10;i++){node+=box(7+i*8.6,227,3,7.3,54.6,21,'hi');node+=vent(8+i*8.6,281.7,5,5.3,17,3,12);}
for(const x of [1,94])node+=box(x,280,5,5,3,17,'mid');
node+=vent(3,280,25,94,1.5,70,1)+'</g>';
function closedTray(x,z){let t=box(x,8,z,26,73,8.6,'mid');t+=box(x,81,z,.8,2,8.6)+box(x+25.2,81,z,.8,2,8.6);for(let i=0;i<10;i++){t+=box(x+2+i*2.25,81,z+.7,1.8,.5,6.8,'hi');}return t;}
// Ground meets the lower frame directly: no decorative floating platform or displaced feet.
let cabinet=shadow(0,0,0,64,88,'ground')+box(0,0,0,64,88,2,'lo');
cabinet+=box(0,0,2,64,2,220)+box(0,2,2,3,86,220);
const rackModules=[];
for(const z of [99,126]){
 let net=box(4,6,z,56,76,10,'mid');
 for(let row=0;row<2;row++)for(let i=0;i<16;i++){const x=7+i*3.1,zz=z+2+row*3;net+=`<path class="port-opening" d="${k.pathOf([[x,82.7,zz],[x+2.4,82.7,zz],[x+2.4,82.7,zz+2],[x,82.7,zz+2]].map(p=>k.iso(p,P)),true)}"/>`;}
 net+=vent(5,82.7,z+.4,54,1,70,1)+vent(5,82.7,z+8.8,54,1,70,1);
 net+=faceLabel('LINGQU',26,83,z+6.5,1.6);
 rackModules.push({z,svg:`<g data-system="lingqu">${net}</g>`});
}
for(const z of [111.5,116.23])for(let i=0;i<6;i++){
 const x=5+i*9;rackModules.push({z,svg:box(x,10,z,8.5,72,4.2,'mid')+box(x+1,82,z+1,6.5,2,1,'hi')});
}
for(const base of [16,138.4])for(let row=0;row<8;row++)for(const x of [5,33]){
 const z=base+row*10;
 if(base===138.4&&row===0&&x===5){const origin=k.iso([x,8,z],P);rackModules.push({z,svg:`<g id="drawer"><g id="node-root" transform="translate(${origin}) scale(.26)">${node}</g></g>`});}
 else rackModules.push({z,svg:closedTray(x,z)});
}
cabinet+=rackModules.sort((a,b)=>a.z-b.z).map(m=>m.svg).join('');
cabinet+=box(4,80,2,56,3,11,'mid');
cabinet+=box(61,2,2,3,86,220)+box(0,0,222,64,88,3,'mid');
cabinet+=box(4,78,219,56,5,2,'lo')+vent(5,83.1,219.2,54,1.6,60,2);
cabinet+=faceLabel('ATLAS 950',25,88,220,2);

cabinet='<g class="rack-shell">'+cabinet.replace('<g id="drawer">','</g><g id="drawer">');
// Place the remaining cabinet shell after the drawer in its original painter order.
// Nested geometry has many groups: parse group depth to locate the assembly boundary.
let start=cabinet.indexOf('<g id="drawer"'),depth=0,end=0;
for(const m of cabinet.slice(start).matchAll(/<g\b[^>]*>|<\/g>/g)){depth+=m[0].startsWith('</')?-1:1;if(depth===0){end=start+m.index+m[0].length;break}}
cabinet=cabinet.slice(0,end)+'<g class="rack-shell">'+cabinet.slice(end)+'</g>';
let staticRack=box(0,0,0,64,88,2,'lo')+box(0,0,2,64,2,220)+box(0,2,2,3,86,220)+box(61,2,2,3,86,220)+box(0,0,222,64,88,3,'mid');
let simplified='';
for(const base of [16,138.4])for(let row=0;row<8;row++) for(const x of [5,33]) simplified+=box(x,79,base+row*10,26,3,8,'lo');
for(const z of [99,126]) simplified+=box(5,79,z,54,3,10,'mid');
for(const z of [111.5,116.23]) simplified+=box(5,79,z,54,3,3,'lo');
staticRack+=`<g class="overview-interior">${simplified}</g>`;
let world='';
const selected=[330,285,0];
for(let row=0;row<4;row++)for(let col=0;col<4;col++){
 const xy=k.iso([col*110,row*95,0],P),chosen=row===3&&col===3;
 world+=`<g ${chosen?'id="selected"':'class="neighbor"'} transform="translate(${xy})">${chosen?'<g id="overview-rack"><use href="#rack-template"/></g><g id="detail-rack">'+cabinet+'</g>':'<use href="#rack-template"/>'}</g>`;
}
function bounds(x,y,z,w,d,h,pad){
 const pts=k.boxCorners(plan(x,y,w,d),z,z+h).map(p=>k.iso(p,P));
 const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]);
 return [Math.min(...xs)-pad,Math.min(...ys)-pad,Math.max(...xs)-Math.min(...xs)+2*pad,Math.max(...ys)-Math.min(...ys)+2*pad];
}
const shots=[bounds(-6,-6,0,414,390,228,30),bounds(324,279,0,76,98,228,16),bounds(335,390,138,26,80,30,8),bounds(310,365,125,78,120,65,12)];
const css=readFileSync(join(here,'style.css'),'utf8'),live=readFileSync(join(here,'live.js'),'utf8');
const html=`<!doctype html><html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>NPU 超节点 · Anatomy</title><style>${k.ISO_CSS}\n${css}</style></head><body class="iso" data-theme="light"><svg id="world" class="iso-svg" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="NPU 超节点连续动画：从机柜群推进至一台机柜，拉出计算抽屉并展开冷板与 NPU 模组。"><defs><filter id="ground" x="-50%" y="-80%" width="200%" height="260%"><feGaussianBlur stdDeviation="1.5"/></filter><filter id="contact" x="-30%" y="-50%" width="160%" height="200%"><feGaussianBlur stdDeviation="1.1"/></filter><g id="rack-template">${staticRack}</g></defs>${world}</svg><svg id="annotations" aria-label="组件标注"></svg><nav class="player" aria-label="动画播放控制"><div class="player-row"><button id="play" class="icon-button" aria-label="暂停播放"></button><button id="reset" class="icon-button" aria-label="重置播放">↺</button><div class="steps">${['机柜群','计算机柜','拉出抽屉','组件展开','950 封装'].map((name,i)=>`<button data-step="${i}" aria-label="步骤 ${i+1}：${name}"><span>0${i+1}</span>${name}</button>`).join('')}</div></div><input id="timeline" type="range" min="0" max="15" step="0.01" value="0" aria-label="播放进度"></nav><script>const SHOTS=${JSON.stringify(shots)}, VX=${JSON.stringify(k.iso([1,0,0],P))}, ORIGIN=${JSON.stringify(k.iso([335,393,138.4],P))}, VY=${JSON.stringify(k.iso([0,1,0],P))}, VZ=${JSON.stringify(k.iso([0,0,1],P))};${live}</script></body></html>`;
writeFileSync(join(here,'index.html'),html);
writeFileSync(join(here,'index-dark.html'),html.replace('data-theme="light"','data-theme="dark"'));
console.log('Built one continuous world with a shared cabinet and drawer assembly.');
