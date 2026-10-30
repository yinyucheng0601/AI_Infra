(function(root){
'use strict';
function route(m,e){const t=e.task;if(m.path!=='Matrix deinterleave')return {kind:'copy',label:m.path,task:t.index,elementScope:'copy',findingLines:[],steps:[]};
 const vectorRows=Math.floor(t.rows/16)*16,localRow=Math.floor(e.position/m.inner)-t.row;
 const compact=m.num<16&&(m.bytes===2||m.bytes===4);
 let kind=compact?'compact':'packed',elementScope='vector';
 if(!vectorRows||(!compact&&(m.bytes===1||t.cols<16)))elementScope='scalar';
 else if(localRow>=vectorRows)elementScope=compact?'unconfirmed-tail':'scalar';
 const findingLines=elementScope==='vector'?[compact?430:554]:[];
 const steps=elementScope==='vector'?(compact?[
 {id:'copy-in',label:'DataCopyPad',pipe:'MTE2 · srcLocal',line:407,start:395,end:409},
 {id:'ready',label:'Set / Wait',pipe:'MTE2 → V',line:417,start:204,end:225},
 {id:'compute',label:'Gather',pipe:'V · dstLocal',line:420,start:412,end:425},
 {id:'visible',label:'Set / Wait',pipe:'V → MTE3',line:423,start:227,end:246},
 {id:'copy-out',label:'DataCopyPad',pipe:'MTE3 · Y',line:430,start:423,end:433}]:[
 {id:'copy-in',label:'DataCopyPad',pipe:'MTE2 · srcLocal',line:553,start:539,end:555},
 {id:'ready',label:'Set / Wait',pipe:'MTE2 → V',line:554,start:550,end:555},
 {id:'compute',label:m.bytes===4?'Gather':'TransDataTo5HD',pipe:'V · dstLocal',line:m.bytes===4?560:573,start:557,end:575},
 {id:'visible',label:'Set / Wait',pipe:'V → MTE3',line:576,start:574,end:577},
 {id:'copy-out',label:'DataCopyPad',pipe:'MTE3 · Y',line:583,start:578,end:591}]) : [{id:'fallback',label:elementScope==='scalar'?'Scalar fallback':'尾行待核对',pipe:elementScope==='scalar'?'GetValue / SetValue':'当前函数未确认消费',line:compact?502:535,start:compact?490:518,end:compact?513:537}];
 return {kind,label:compact?'Compact matrix':'Packed matrix',task:t.index,vectorRows,localRow,elementScope,findingLines,steps,dispatch:{start:630,end:670},reuse:compact?{line:432,start:248,end:268}:{line:585,start:580,end:591}};
}
function snapshot(data,m,e){const r=route(m,e);return {scanner:data.scanner,sourceRevision:data.revision,sourceSha256:data.sourceSha256,route:r,findings:data.audit.findings.map((f,i)=>({...f,review:(data.reviews||[]).find(r=>r.line===f.line)||{status:'pending',statusLabel:'待复核'},id:'sync-'+i,association:r.findingLines.includes(f.line)?'current-element-path':'file-level'})),graphFindingCount:data.graph.findings.length,scope:'source-derived call path; not device event trace; regex findings remain candidates'};}
function targets(data,M,configs){return data.audit.findings.map((f,i)=>{const matches=[];configs.forEach((c,config)=>{const m=M.unpack(c);for(const t of m.tasks){const e=M.unpackElement(m,t.o,t.start),r=route(m,e);if(r.findingLines.includes(f.line)){matches.push({config,o:t.o,p:t.start,task:t.index,shape:c.shape,dtype:c.dtype,step:f.line===430?'copy-out':'ready'});break;}}});return {...f,review:(data.reviews||[]).find(r=>r.line===f.line)||{status:'pending',statusLabel:'待复核'},id:'sync-'+i,targets:matches};});}
const api={route,snapshot,targets};if(typeof module!=='undefined')module.exports=api;root.UnpackSync=api;
})(typeof globalThis!=='undefined'?globalThis:this);
