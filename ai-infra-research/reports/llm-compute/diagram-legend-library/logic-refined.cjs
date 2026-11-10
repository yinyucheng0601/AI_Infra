// Library-native specimens: explicit semantic roles, shared scale, boundary-connected edges.
const V=require('./visual-system.js');
const vm=require('vm'),fs=require('fs');const ctx={window:{}};vm.runInNewContext(fs.readFileSync(__dirname+'/path-grid-glyphs.js','utf8'),ctx);const sourceTensor=ctx.window.PathGridGlyphs.tensor;
const C={data:V.tokens.role.activation,task:'#9EF04B',channel:V.tokens.role.gradient,structure:'#BCA0F3',ink:'#111'};
const t=(x,y,s,size=14,color='#ddd',anchor='start')=>`<text x="${x}" y="${y}" font-size="${size}" fill="${color}" text-anchor="${anchor}">${s}</text>`;
const r=(x,y,w,h,fill,rx=6,stroke='none')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rx}" fill="${fill}" stroke="${stroke}"/>`;
const line=(d,color='#aaa',dash='',arrow=true)=>`<path d="${d}" fill="none" stroke="${color}" stroke-width="2" ${dash?`stroke-dasharray="${dash}"`:''} ${arrow?'marker-end="url(#tip)"':''}/>`;
function chip(x,y,w,label,type,color='#303030'){return r(x,y,w,42,color,21)+t(x+15,y+26,label,14,'#ddd')+t(x+w-14,y+26,type,12,'#aaa','end');}
function task(x,y,w,label){return `<g data-detail="task-identity">`+r(x,y,w,38,'#303030',4)+r(x,y,w,12,'#414141',3)+t(x+7,y+10,'TASK',7,'#ccc')+t(x+w/2,y+29,label,12,'#eee','middle')+`<circle cx="${x+w/2}" cy="${y+38}" r="3" fill="${C.structure}" stroke="#171717"/>`+'</g>';}

function tile(x,y,w,label){const color=label.startsWith('acc')?'#ffbd1a':label.startsWith('K')?'#bca0f3':'#72d7af';return `<g transform="translate(${x} ${y}) scale(1.5)">${sourceTensor(label,label,'[16, 128]',0,0,w/1.5,32,color)}</g>`;}

module.exports=function(id){let b='';
if(id==='scalar')b=chip(65,18,290,'valid_len','INDEX')+chip(65,79,290,'fa_core','INDEX')+chip(65,140,290,'work_tid','TASK_ID','#303030');
if(id==='array'){b=t(44,49,'grp_tids',16)+t(376,49,'Array · TASK_ID',12,'#aaa','end');for(let i=0;i<6;i++)b+=r(44+i*56,75,50,52,'#303030',4)+t(69+i*56,107,'t'+i,16,'#ddd','middle')+t(69+i*56,150,'['+i+']',12,'#aaa','middle');}
if(id==='barrier'){for(const [i,x] of [55,175,295].entries()){b+=task(x,28,70,'t'+i)+line(`M${x+35} 66V97`,C.structure);}b+=r(60,97,300,12,C.structure,6)+line('M210 109V137',C.structure)+task(154,137,112,'joined_tid')+t(210,198,'task_dummy · 依赖汇合',12,'#aaa','middle');}
if(id==='pipe'){
 b=t(44,28,'AIC',16)+t(376,28,'AIV',16,'#ddd','end');
 for(const [i,label]of ['C2V','V2C'].entries()){
 const y=49+i*76;
 b+=t(44,y+25,label,13,'#aaa')+r(114,y,262,46,'#303030',6);
 for(let k=0;k<2;k++){
 const x=122+k*123;
 b+=`<g data-detail="channel-slot">`+r(x,y+7,115,32,C.channel,3)+t(x+10,y+27,'0'+k,11,'#111').replace('<text ','<text class="slot-title" ')+t(x+103,y+27,'16 KB',13,'#111','end').replace('<text ','<text class="slot-title" ')+`</g>`;
 }
 b+=line(i===0?`M122 ${y+56}H360`:`M360 ${y+56}H122`,'#aaa');
 }
}

if(id==='static'){for(const [i,label]of ['static_assert','static_print','dump_tag'].entries()){
 const y=13+i*62;
 b+=`<g data-detail="parse-directive">`+r(30,y,360,48,'#292929',5)+r(30,y,45,48,'#3a3a3a',4)+t(53,y+32,['✓','›','#'][i],22,C.structure,'middle')+t(89,y+29,label,15)+r(314,y+13,62,22,'#414141',11)+t(345,y+28,'解析期',11,'#ddd','middle')+`</g>`;
}}

if(id==='carry'){b=line('M26 173V23H394V173H26','#ffbd1a','6 5',false)+line('M45 23H26V173H45','#ffbd1a','',false)+t(43,46,'for i · IterArg',12,'#ffbd1a')+tile(49,65,124,'accᵢ')+tile(247,65,124,'accᵢ₊₁')+line('M173 89H247','#aaa')+line('M309 113V145H111V113','#aaa')+t(210,136,'yield → 下一迭代',12,'#aaa','middle');}
if(id==='index'){b=chip(36,35,180,'block_id','INDEX')+tile(246,112,138,'K cache')+line('M126 77V136H246','#aaa','2 5')+t(225,97,'offset',12,'#aaa','middle');}
if(id==='xcore'){b=t(82,37,'AIV',14,'#aaa','middle')+t(338,37,'AIC',14,'#aaa','middle')+line('M210 22V179','#666','4 5',false)+tile(30,70,104,'Q tile')+tile(286,70,104,'Q tile')+line('M134 94H286',C.channel)+t(210,151,'跨核交接',14,C.channel,'middle');}
if(!b)return null;
return V.wrap(`<defs><marker id="tip" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M1 1L9 5L1 9" stroke="context-stroke" fill="none" stroke-width="1.5"/></marker></defs>${b}`,420,200);
};
