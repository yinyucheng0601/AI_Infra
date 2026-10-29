(function(root){
'use strict';
const product=a=>a.reduce((x,y)=>x*y,1),ceil=(a,b)=>Math.ceil(a/b);
const configs=[
 {id:'matrix-tail',shape:[17,19],axis:1,bytes:2,dtype:'FP16'},
 {id:'matrix-compact',shape:[33,3],axis:1,bytes:2,dtype:'FP16'},
 {id:'row-burst',shape:[5,3,7],axis:1,bytes:2,dtype:'FP16'},
 {id:'row-boundary',shape:[1030,3,17],axis:1,bytes:2,dtype:'FP16'},
 {id:'copy-chunk',shape:[1,4,17001],axis:1,bytes:2,dtype:'FP16'},
 {id:'copy-boundary',shape:[2,3,17000],axis:1,bytes:2,dtype:'FP16'}
];
function unpack(c){
 const axis=(c.axis+c.shape.length)%c.shape.length,num=c.shape[axis],inner=product(c.shape.slice(axis+1)),outer=product(c.shape.slice(0,axis)),size=inner*outer,max=size>=4096?50:8;
 let cores,split=1;
 if(inner<=1){if(num<max&&size>=4096){split=Math.min(Math.floor(max/num),size);cores=num*split}else cores=Math.min(num,max)}else cores=Math.min(size*num||1,max);
 let path,tasks=[],rowsPerTask=0;
 if(inner>1){const padded=ceil(inner*c.bytes,32)*32;
  if(outer>1&&inner*c.bytes<=32768&&(padded-inner*c.bytes)/c.bytes<=255){path='Row burst';rowsPerTask=Math.min(outer,Math.max(1,Math.floor(32768/padded)));for(let o=0;o<num;o++)for(let r=0;r<outer;r+=rowsPerTask)tasks.push({o,row:r,rows:Math.min(rowsPerTask,outer-r),start:r*inner,count:Math.min(rowsPerTask,outer-r)*inner});}
  else{path='Copy chunk';const tile=32768/c.bytes;for(let o=0;o<num;o++)for(let r=0;r<outer;r++)for(let i=0;i<inner;i+=tile)tasks.push({o,row:r,rows:1,start:r*inner+i,count:Math.min(tile,inner-i)});}
 }else{path='Matrix deinterleave';rowsPerTask=49152/(16*c.bytes);if((c.bytes===2||c.bytes===4)&&num<16)rowsPerTask=Math.floor(Math.min(2048,Math.floor(30720/(num*c.bytes)))/16)*16||rowsPerTask;for(let r=0;r<size;r+=rowsPerTask)for(let o=0;o<num;o+=16)tasks.push({o,cols:Math.min(16,num-o),row:r,rows:Math.min(rowsPerTask,size-r),start:r,count:Math.min(rowsPerTask,size-r)});}
 const ranges=Array.from({length:cores},(_,core)=>({core,start:Math.floor(core*tasks.length/cores),end:Math.floor((core+1)*tasks.length/cores)}));
 tasks=tasks.map((t,id)=>({...t,id:'task-'+id,index:id,core:ranges.find(r=>id>=r.start&&id<r.end).core}));
 return {...c,axis,num,inner,outer,size,cores,path,rowsPerTask,tasks,ranges};
}
function unpackElement(m,o,p){const outer=Math.floor(p/m.inner),i=p%m.inner,src=(outer*m.num+o)*m.inner+i;const task=m.tasks.find(t=>o>=t.o&&o<t.o+(t.cols||1)&&p>=t.start&&p<t.start+t.count);return {id:`y${o}-${p}`,output:o,position:p,src,srcBytes:src*m.bytes,dstBytes:p*m.bytes,outer,inner:i,task};}
const expandConfigs=[{id:'broadcast-columns',shape:[2,1,3],target:[2,4,3],bytes:4,dtype:'INT32'},{id:'broadcast-two-stages',shape:[1,3,1],target:[2,3,5],bytes:4,dtype:'INT32'},{id:'broadcast-wide',shape:[2,1,9],target:[2,3,9],bytes:4,dtype:'INT32'}];
function expand(c){let out=product(c.shape),inner=1,repeat=1,stages=[];for(let i=c.shape.length-1;i>=0;i--){if(c.shape[i]===1)repeat*=c.target[i];else{if(repeat!==1){stages.push({outer:out,inner,repeat});inner*=repeat;}repeat=1;out/=c.shape[i];inner*=c.shape[i];}}if(repeat!==1)stages.push({outer:out,inner,repeat});stages=stages.map((s,i)=>({...s,id:'stage-'+i,index:i,source:i===0?'X':((stages.length&1)===((i+1)&1)?'Workspace':'Y'),destination:(stages.length&1)===((i+1)&1)?'Y':'Workspace',step:s.inner*c.bytes>=32?Math.max(1,Math.min(s.outer,Math.floor((240*1024/2/c.bytes)/s.inner))):1}));return {...c,size:product(c.target),inputSize:product(c.shape),stages,cores:1};}
function expandElement(m,p){let rem=p,coords=Array(m.target.length);for(let i=coords.length-1;i>=0;i--){coords[i]=rem%m.target[i];rem=Math.floor(rem/m.target[i]);}let src=0;for(let i=0;i<coords.length;i++)src=src*m.shape[i]+(m.shape[i]===1?0:coords[i]);return {id:'out-'+p,position:p,coords,src,srcBytes:src*m.bytes,dstBytes:p*m.bytes};}
// Fixed-revision source adapter. DataCopy count-argument envelopes are NOT device accesses.
function auditExpand(m){
 let values=Array.from({length:m.inputSize},(_,i)=>i),findings=[],stages=[];
 for(const s of m.stages){const inputSize=s.outer*s.inner,next=[];let candidates=[];
  for(let o=0;o<s.outer;o+=s.step){const step=Math.min(s.step,s.outer-o);if(step===1){const chunk=Math.min(122880/m.bytes,s.inner);for(let offset=0;offset<s.inner;offset+=chunk){const cur=Math.min(chunk,s.inner-offset),base=o*s.inner+offset,count=cur+32/m.bytes-1;if(base+count>inputSize)candidates.push({outer:o,offset,start:base,end:base+count,logicalEnd:base+cur,sourceSize:inputSize,extra:base+count-inputSize});}}}
  for(let o=0;o<s.outer;o++)for(let r=0;r<s.repeat;r++)next.push(...values.slice(o*s.inner,(o+1)*s.inner));values=next;
  stages.push({stage:s.index,inputSize,outputSize:next.length,branch:s.step>1?'DataCopyPad/step':'copyIn/count',candidates});
  for(const c of candidates){let p=c.outer*s.inner*s.repeat+c.offset;for(const later of m.stages.slice(s.index+1))p=Math.floor(p/later.inner)*(later.inner*later.repeat)+p%later.inner;findings.push({id:`request-s${s.index}-o${c.outer}-${c.offset}`,type:'count-envelope',status:'investigate',stage:s.index,position:p,source:s.source,...c,title:`S${s.index} · 请求参数超出逻辑输入 ${c.extra*m.bytes} B`,evidence:'copy-request',expression:'count = cur_elems + align_elems - 1',boundary:'count-argument envelope only; CANN version and device access not verified'});}
 }
 let mismatches=[];for(let p=0;p<m.size;p++)if(values[p]!==expandElement(m,p).src)mismatches.push(p);
 return {logical:{checked:m.size,mismatches:mismatches.length,first:mismatches[0]??null},stages,findings,deviceAccess:'unknown'};
}
function context(kind,m,item,evidence,question){return {kind,configuration:m,selection:item,question,evidence,units:{address:'B',time:'ms'},deviceValidation:'not-run-in-this-task'};}
const api={product,configs,expandConfigs,unpack,unpackElement,expand,expandElement,auditExpand,context};if(typeof module!=='undefined')module.exports=api;root.TrialModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
