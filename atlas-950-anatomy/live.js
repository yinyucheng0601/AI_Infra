const svg=document.querySelector('#world'),selected=document.querySelector('#selected'),neighbors=[...document.querySelectorAll('.neighbor')],drawer=document.querySelector('#drawer'),plates=document.querySelector('#coldplates'),chips=document.querySelector('#chips');
const ease=x=>{x=Math.max(0,Math.min(1,x));return x<.5?8*x*x*x*x:1-Math.pow(-2*x+2,4)/2},ramp=(t,a,b)=>ease((t-a)/(b-a)),mix=(a,b,t)=>a.map((v,i)=>v+(b[i]-v)*t);
function fit(b){const aspect=svg.clientWidth/svg.clientHeight,cx=b[0]+b[2]/2,cy=b[1]+b[3]/2,w=Math.max(b[2],b[3]*aspect),h=w/aspect;return[cx-w/2,cy-h/2,w,h]}
const shells=[...selected.querySelectorAll('.rack-shell')], overview=document.querySelector('#overview-rack'),detail=document.querySelector('#detail-rack');
const project=([x,y,z])=>[VX[0]*x+VY[0]*y+VZ[0]*z,VX[1]*x+VY[1]*y+VZ[1]*z];
// Screen-space separation preserves the assembly projection while giving each component its own vertical layer.
const lifts={coldplates:235,couplings:235,fans:135,chips:125,'cpu-part':65,dram:55,ports:28,power:8,disks:18};
const parts=Object.entries(lifts).map(([id,lift])=>({el:document.getElementById(id),id,offset:[0,-lift]}));
const offsets=Object.fromEntries(parts.map(p=>[p.id,p.offset]));
const context=[...document.querySelector('#node-root').children].filter(el=>!(el.id in lifts));
const labels=[['NPU 模组 / NPU Module','chips',[27,145,6],0],['中央处理器 / CPU','cpu-part',[37,140,6],0],['硬盘 / Disks','disks',[7,255,24],0],['液冷冷板 / Cold Plates','coldplates',[26,98,18],0],['浮动盲插接口 / Blind-mate Connectors','couplings',[84,-15,16],1],['风扇 / Fans','fans',[96,30,24],1],['网络接口 / Network Connectors','ports',[68,6,13],1],['电源接口 / Power Connector','power',[93,6,16],1],['内存 / DRAM','dram',[85,110,15],1]];
const annotation=document.querySelector('#annotations');
annotation.innerHTML=labels.map(([name])=>`<g><path/><circle r="2"/><text>${name}</text></g>`).join('')+'<text id="package-title">950DT 封装 / 950DT Package</text>';
const labelNodes=[...annotation.querySelectorAll('g')];
const packageLabels=[['计算芯片 / Compute Die',[40,90,9],0],['封装内存 / Package Memory',[70,106,8],1],['封装基板 / Package Substrate',[30,117,6],0]];
annotation.insertAdjacentHTML('beforeend',packageLabels.map(([name])=>`<g class="package-callout"><path/><circle r="2"/><text>${name}</text></g>`).join(''));
const packageNodes=[...annotation.querySelectorAll('.package-callout')];
function annotate(explode,view,focus){
 annotation.style.display=explode>.6?'block':'none';if(explode<=.6)return;
 const w=svg.clientWidth,h=svg.clientHeight;annotation.setAttribute('viewBox',`0 0 ${w} ${h}`);
 const scale=w/view[2];
 labels.forEach(([name,id,anchor,side],i)=>{
 const local=project(anchor),off=offsets[id];
 const x=(ORIGIN[0]+(local[0]+off[0]*explode)*.26-view[0])*scale,y=(ORIGIN[1]+(local[1]+off[1]*explode)*.26-view[1])*scale;
 const tx=side?w*.88:w*.12,g=labelNodes[i];g.style.opacity=1-focus;
 g.children[0].setAttribute('d',`M${x},${y} H${tx}`);
 g.children[1].setAttribute('cx',x);g.children[1].setAttribute('cy',y);
 g.children[2].setAttribute('x',tx);g.children[2].setAttribute('y',y-9);g.children[2].setAttribute('text-anchor',side?'end':'start');
 });
 packageLabels.forEach(([name,anchor,side],i)=>{
 const local=project(anchor),off=offsets.chips,g=packageNodes[i],tx=side?w*.92:w*.08;
 const x=(ORIGIN[0]+(local[0]+off[0])*.26-view[0])*scale,y=(ORIGIN[1]+(local[1]+off[1])*.26-view[1])*scale;
 g.style.opacity=ramp(focus,.85,1);g.children[0].setAttribute('d',`M${x},${y} H${tx}`);g.children[1].setAttribute('cx',x);g.children[1].setAttribute('cy',y);g.children[2].setAttribute('x',tx);g.children[2].setAttribute('y',y-9);g.children[2].setAttribute('text-anchor',side?'end':'start');
 });
 const title=document.querySelector('#package-title');title.setAttribute('x',w/2);title.setAttribute('y',h*.85);title.setAttribute('text-anchor','middle');title.style.opacity=focus;
 annotation.style.opacity=ease((explode-.6)/.4);
}
function localShot(x,y,w,h){return[ORIGIN[0]+x*.26,ORIGIN[1]+y*.26,w*.26,h*.26]}
const explodedShot=localShot(-270,-285,460,510);
const firstPackage=document.getElementById('npu-76'),secondPackage=document.getElementById('npu-145'),pb=firstPackage.getBBox();
const packageShot=localShot(pb.x+offsets.chips[0]-25,pb.y+offsets.chips[1]-25,pb.width+50,pb.height+50);
const DURATION=15,stops=[0,3.5,7,11,15];
const timing=[[0,0],[.5,3],[3,8],[3.8,9],[5.7,12],[7,17],[7.5,17.5],[10.5,22],[11.5,26],[14.5,30],[15,32]];
function storyTime(clock){const u=Math.min(clock,15);for(let i=1;i<timing.length;i++){const [b,y]=timing[i],[a,x]=timing[i-1];if(u<=b)return x+(y-x)*(u-a)/(b-a)}return 32}
function render(time){
 const t=storyTime(time);
 const zoom=ramp(t,3,8),close=ramp(t,12,17),open=ramp(t,9,13),explode=ramp(t,17.5,22),focus=ramp(t,26,30);
 const view=mix(mix(mix(mix(fit(SHOTS[0]),fit(SHOTS[1]),zoom),fit(SHOTS[2]),close),fit(explodedShot),explode),fit(packageShot),focus);svg.setAttribute('viewBox',view.join(' '));
 overview.style.display=zoom<.8?'':'none';detail.style.display=zoom>.2?'':'none';detail.style.opacity=ramp(t,4,7);overview.style.opacity=1-ramp(t,4,7);
 neighbors.forEach(el=>{el.style.display=t>=6?'none':'';el.style.opacity=1-ramp(t,2,6)});
 shells.forEach(el=>{el.style.display=t>=17?'none':'';el.style.opacity=1-ramp(t,13,17)});

 drawer.setAttribute('transform',`translate(${VY[0]*100*open} ${VY[1]*100*open})`);
 parts.forEach(({el,id,offset:p})=>{el.setAttribute('transform',`translate(${p[0]*explode} ${p[1]*explode})`);el.style.opacity=id==='chips'?1:1-focus;el.style.display=focus===1&&id!=='chips'?'none':''});
 context.forEach(el=>{el.setAttribute('transform',`translate(0 ${0*explode})`);el.style.opacity=1-focus;el.style.display=focus===1?'none':''});secondPackage.style.opacity=1-focus;
 annotate(explode,view,focus);
 svg.dataset.time=time.toFixed(3);
 const active=t<5?0:t<11?1:t<18?2:t<26?3:4;
 stepButtons.forEach((b,i)=>{b.setAttribute('aria-current',i===active?'step':'false')});
 timeline.value=time;timeline.style.setProperty('--progress',`${time/DURATION*100}%`);

}
const play=document.querySelector('#play'),timeline=document.querySelector('#timeline'),stepButtons=[...document.querySelectorAll('[data-step]')],reduced=matchMedia('(prefers-reduced-motion: reduce)');
let time=0,last=0,playing=!reduced.matches;
function updatePlay(){play.innerHTML=playing?'<svg viewBox="0 0 20 20"><path d="M7 5v10M13 5v10"/></svg>':'<svg viewBox="0 0 20 20"><path d="m7 4 9 6-9 6z"/></svg>';play.setAttribute('aria-label',playing?'暂停播放':'继续播放');play.setAttribute('aria-pressed',String(playing))}
function seek(value){time=Math.max(0,Math.min(DURATION,value));last=0;render(time)}
function pause(){playing=false;updatePlay()}
play.addEventListener('click',()=>{if(time>=DURATION)seek(0);playing=!playing;last=0;updatePlay()});
document.querySelector('#reset').addEventListener('click',()=>{pause();seek(0)});
stepButtons.forEach((button,i)=>button.addEventListener('click',()=>{pause();seek(stops[i])}));
timeline.addEventListener('input',()=>{pause();seek(Number(timeline.value))});
function tick(now){if(last&&!document.hidden&&playing){time=Math.min(DURATION,time+Math.min((now-last)/1000,.1));render(time);if(time>=DURATION)pause()}last=now;requestAnimationFrame(tick)}
document.addEventListener('visibilitychange',()=>last=0);
document.addEventListener('keydown',e=>{if(e.code==='Space'&&e.target===document.body){e.preventDefault();play.click()}});
reduced.addEventListener('change',()=>{if(reduced.matches)pause()});
window.anatomySeek=value=>{pause();seek(value)};
updatePlay();render(0);requestAnimationFrame(tick);

window.addEventListener("resize",()=>render(time));
