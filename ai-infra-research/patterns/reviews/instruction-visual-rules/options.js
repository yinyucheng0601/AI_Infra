/* Candidate compositions. Geometry is a design specimen, not measured time. */
'use strict';
const schemes = {
 A:{title:'蓝 · 留白',sub:'01 / CUT PAPER',bg:'#f5f2e9',ink:'#252d39',color:'#315acb',light:'#e0e6f4',sync:'#c85435'},
 B:{title:'绿 · 场域',sub:'02 / COMMON GROUND',bg:'#222e2b',ink:'#e9eee5',color:'#b8c9a8',light:'#36463e',sync:'#f0c77a'},
 C:{title:'朱 · 节奏',sub:'03 / COLOR INTERVAL',bg:'#eeeae4',ink:'#342d2a',color:'#b94631',light:'#e3d5cd',sync:'#342d2a'}
};
const text=(x,y,s,size=12,c='currentColor',extra='')=>`<text x="${x}" y="${y}" font-size="${size}" fill="${c}" ${extra}>${s}</text>`;
const rect=(x,y,w,h,c,r=0)=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${r}" fill="${c}"/>`;
const path=(d,c,w=1)=>`<path d="${d}" stroke="${c}" stroke-width="${w}" fill="none" stroke-linejoin="round"/>`;
const dot=(x,y,c,r=6)=>`<circle cx="${x}" cy="${y}" r="${r}" fill="${c}"/>`;
const fx=(x,y,c,size=44)=>text(x,y,'ƒx',size,c,'font-family="Georgia,serif" font-style="italic"');
function badge(x,y,v,c){return (v==='C'?rect(x,y-9,9,9,c):rect(x,y-9,14,3,c)+rect(x,y-3,14,3,c))+text(x+22,y,v,11,c);}
function block(x,y,w,h,name,side,p,round=0){const ink=p.bg;return rect(x,y,w,h,p.color,round)+badge(x+20,y+27,side,ink)+fx(x+20,y+h-46,ink)+text(x+20,y+h-19,name,11,ink,'letter-spacing="1"');}
function transfer(x,y,w,p){return `<path d="M${x} ${y}H${x+w-13}L${x+w} ${y+15}L${x+w-13} ${y+30}H${x}Z" fill="${p.light}"/>`+path(`M${x+15} ${y+15}H${x+w-19}m-6-5 6 5-6 5`,p.ink,1.2);}
function memory(p){let s=path('M44 654H576',p.ink,.7)+text(44,682,'BUFFER',9,p.ink,'letter-spacing="2"');s+=rect(148,669,366,22,p.light)+path('M153 663H147V697H153M509 663H515V697H509',p.ink,1.3);for(const [x,t] of [[220,'W'],[356,'R']])s+=text(x,685,t,10,p.ink);return s+text(147,715,'取得',10,p.ink)+text(494,715,'释放',10,p.ink)+dot(558,680,p.sync,5)+text(539,715,'归还',10,p.ink);}
function legend(p){return fx(44,591,p.ink,23)+text(78,588,'计算',10,p.ink)+transfer(150,574,52,p)+text(212,588,'搬运',10,p.ink)+dot(300,584,p.sync)+text(315,588,'同步',10,p.ink)+badge(408,589,'C',p.ink)+badge(496,589,'V',p.ink)+text(44,625,'DAG  /  指令卡片  /  泳道',10,p.ink,'letter-spacing="1"');}
function composition(id,p){let s=rect(0,0,620,760,p.bg);s+=text(44,61,id,14,p.ink)+text(78,61,p.sub,10,p.ink,'letter-spacing="1.5"');
 if(id==='A'){
 s+=block(44,106,302,236,'QK · MATMUL','C',p)+block(366,266,210,236,'SOFTMAX','V',p);
 s+=text(366,127,'01',12,p.ink)+text(366,150,'COMPUTE',9,p.ink,'letter-spacing="2"');
 s+=transfer(64,374,238,p)+path('M302 389H326V454H366',p.ink,1.2)+dot(326,389,p.sync,8)+text(64,431,'C2V',11,p.ink)+text(64,451,'数据交接',10,p.ink);
 s+=path('M386 234H556',p.ink,.6)+text(386,215,'02 / VECTOR',10,p.ink,'letter-spacing="1"');
 } else if(id==='B'){
 s+=rect(44,106,532,396,p.light,4)+block(66,128,274,205,'QK · MATMUL','C',p,2);
 s+=block(362,286,192,194,'SOFTMAX','V',p,2)+text(367,155,'C → V',14,p.ink)+text(367,179,'SHARED FIELD',9,p.ink,'letter-spacing="1"');
 s+=path('M88 365H326V440H362',p.color,2)+dot(326,365,p.sync,9)+text(88,395,'C2V',11,p.ink)+text(88,417,'数据交接',10,p.ink)+path('M286 359l8 6-8 6',p.color,1.5);
 } else {
 s+=text(44,125,'C',12,p.ink)+text(44,297,'V',12,p.ink)+text(44,453,'C',12,p.ink);
 s+=rect(78,106,338,126,p.color)+fx(98,180,p.bg,48)+text(174,180,'QK',13,p.bg)+transfer(428,154,148,p);
 s+=rect(182,267,394,126,p.color)+fx(202,341,p.bg,48)+text(279,341,'SOFTMAX',13,p.bg);
 s+=path('M493 184V246H182V267',p.ink,1.2)+dot(493,246,p.sync,7);
 s+=transfer(78,426,204,p)+rect(308,426,268,76,p.color)+fx(328,477,p.bg,35)+text(401,473,'PV',13,p.bg)+path('M282 441H295V407H548V393',p.ink,1.2)+dot(295,407,p.sync,7);
 }
 return s+legend(p)+memory(p);
}
document.getElementById('boards').innerHTML=Object.entries(schemes).map(([id,p])=>`<article class="board" data-option="${id}"><div class="board-header"><h2>${p.title}</h2><button class="focus" data-focus="${id}" aria-label="放大方案 ${id}">↗</button></div><svg xmlns="http://www.w3.org/2000/svg" class="art" viewBox="0 0 620 760" role="img" aria-label="${p.title}，点线面构成"><style>text{font-family:Inter,'PingFang SC',system-ui,sans-serif}</style>${composition(id,p)}</svg></article>`).join('');
function setView(view){document.getElementById('boards').dataset.view=view;document.querySelectorAll('button[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.view===view)));document.querySelectorAll('[data-focus]').forEach(b=>{b.textContent=view==='all'?'↗':'×';b.setAttribute('aria-label',view==='all'?`放大方案 ${b.dataset.focus}`:'返回三案对照');});}
document.querySelectorAll('button[data-view]').forEach(b=>b.onclick=()=>setView(b.dataset.view));
document.querySelectorAll('[data-focus]').forEach(b=>b.onclick=()=>setView(document.getElementById('boards').dataset.view==='all'?b.dataset.focus:'all'));
document.getElementById('gray').onclick=function(){const on=this.getAttribute('aria-pressed')!=='true';this.setAttribute('aria-pressed',String(on));document.body.classList.toggle('gray-mode',on);};
