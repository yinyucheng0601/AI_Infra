(function(root){
'use strict';
const revision='13baf5274751fcf46aa04905c53ad285d656ac74';
const source='https://github.com/heiheiha798/Ascend-Kernels-S8/blob/'+revision+'/case_910b/Scale/test_op.py';
const configs=[{id:'case1',label:'case1 · 原配置',axis:1,axes_num:-1,blob:true,shape:[6,10]}, {id:'channel',label:'按通道 · 参考变体',axis:1,axes_num:1,blob:true,shape:[6]}, {id:'rank',label:'rank(scale) · 参考变体',axis:1,axes_num:0,blob:false,shape:[6,10]}, {id:'negative',label:'负轴 · 参考变体',axis:-1,axes_num:1,blob:true,shape:[10]}];
const f=Math.fround;
function create(index=0){const c=configs[index],a=c.axis<0?3+c.axis:c.axis,end=c.blob?(c.axes_num===-1?3:a+c.axes_num):a+c.shape.length;
 const expected=[2,6,10].slice(a,end);if(JSON.stringify(expected)!==JSON.stringify(c.shape))throw Error('shape mismatch');
 const size=c.shape.reduce((a,b)=>a*b,1),x=Array.from({length:120},(_,i)=>f(((i*37)%97-48)/4)),s=Array.from({length:size},(_,i)=>f((i%9-4)/4)),b=Array.from({length:size},(_,i)=>f((i%7-3)/2));
 return {config:c,axis:a,end,broadcast:[...Array(a).fill(1),...c.shape,...Array(3-end).fill(1)],x,s,b,originalS:s.slice(),originalB:b.slice(),bias:true};}
function element(m,i){if(!Number.isInteger(i)||i<0||i>=120)throw Error('coordinate outside [2,6,10]');const coord=[Math.floor(i/60),Math.floor(i/10)%6,i%10],pc=coord.slice(m.axis,m.end);let k=0;pc.forEach((v,j)=>k=k*m.config.shape[j]+v);const product=f(m.x[i]*m.s[k]),y=m.bias?f(product+m.b[k]):product,base=f(f(m.x[i]*m.originalS[k])+(m.bias?m.originalB[k]:0));return {id:m.config.id+':y:'+coord.join(','),i,coord,k,parameterCoord:pc,x:m.x[i],scale:m.s[k],bias:m.bias?m.b[k]:null,product,y,base,delta:f(y-base),offsetBytes:{x:i*4,y:i*4,scale:k*4,bias:m.bias?k*4:null},evidence:[source+'#L103-L121',source+'#L139-L160']};}
function affected(m,k){return Array.from({length:120},(_,i)=>element(m,i)).filter(e=>e.k===k);}
function context(m,i,question=''){const e=element(m,i);return {revision,source,config:m.config,broadcast:m.broadcast,dtype:'float32',selection:e,affected:affected(m,e.k).map(x=>x.id),question,scope:'CPU reference relation; deterministic fixtures, not upstream random samples',unverified:['NPU output','Host/Kernel implementation and physical memory accesses','FP16/BF16','original PyTorch runtime']};}
const api={revision,source,configs,create,element,affected,context};if(typeof module!=='undefined')module.exports=api;root.ScaleModel=api;
})(globalThis);
