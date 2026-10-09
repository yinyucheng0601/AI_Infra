/* Deterministic teaching events, not an HCCL trace or throughput estimate. */
(function(root){
  'use strict';
  const baseline=Object.freeze({tp:2,pp:4,dp:16,ep:8,etp:1,cp:1,layers:48,experts:64,hidden:4096,ffn:2048,seq:8192,mbs:1,microbatches:8,hbm:64});
  const phases=Object.freeze([
    {id:'route',name:'路由分桶',start:0,end:.16},
    {id:'dispatch',name:'Dispatch · 分发',start:.16,end:.44},
    {id:'compute',name:'专家计算',start:.44,end:.7},
    {id:'combine',name:'Combine · 回收',start:.7,end:1}
  ]);
  const clamp=x=>Math.max(0,Math.min(1,x));
  function coordinates(id,c=baseline){return {id,tp:id%c.tp,dp:Math.floor(id/c.tp)%c.dp,pp:Math.floor(id/(c.tp*c.dp)),ep:Math.floor(id/c.tp)%c.dp%c.ep,edp:Math.floor((Math.floor(id/c.tp)%c.dp)/c.ep)};}
  function members(pp,edp,tp,c=baseline){return Array.from({length:c.ep},(_,e)=>(pp*c.dp+edp*c.ep+e)*c.tp+tp);}
  function expertReplicas(id,c=baseline){const r=coordinates(id,c);return Array.from({length:c.tp*c.pp*c.dp},(_,i)=>i).filter(i=>{const b=coordinates(i,c);return b.pp===r.pp&&b.ep===r.ep&&(c.etp===1||b.tp===r.tp);});}
  function allocate(total,weights){
    const sum=weights.reduce((a,b)=>a+b,0),raw=weights.map(w=>total*w/sum),out=raw.map(Math.floor);
    const order=raw.map((v,i)=>({i,f:v-out[i]})).sort((a,b)=>b.f-a.f||a.i-b.i);
    for(let i=0,n=total-out.reduce((a,b)=>a+b,0);i<n;i++)out[order[i].i]++;
    return out;
  }
  function event({pp=0,edp=1,tp=1,layer=7,mb=0,hot=false,config=baseline}={}){
    const ids=members(pp,edp,tp,config),n=ids.length,total=config.seq*config.mbs;
    // Top-1: every logical token has exactly one destination. Both TP lanes use
    // identical routing (ETP1); different replicas / layers / microbatches vary.
    const matrix=ids.map((_,s)=>allocate(total,ids.map((_,d)=>hot?(d===3%n?6:1):16+((s*3+d*5+layer+mb+edp)%5))));
    const flows=matrix.flatMap((row,s)=>row.map((tokens,d)=>({source:ids[s],target:ids[d],tokens,bytes:tokens*config.hidden*2,local:s===d})));
    const remote=flows.filter(f=>!f.local),local=flows.filter(f=>f.local).reduce((a,f)=>a+f.tokens,0);
    return {config,ids,matrix,flows,pp,edp,tp,layer,mb,hot,totalTokens:total*n,localTokens:local,networkTokens:remote.reduce((a,f)=>a+f.tokens,0),dispatchBytes:remote.reduce((a,f)=>a+f.bytes,0)};
  }
  function frame(e,position){
    const t=clamp(position),phase=phases.find(p=>t<p.end)||phases[3],q=clamp((t-phase.start)/(phase.end-phase.start));
    const dispatch=clamp((t-.16)/.28),combine=clamp((t-.7)/.3);
    const ranks=e.ids.map(id=>{
      const incoming=e.flows.filter(f=>f.target===id),outgoing=e.flows.filter(f=>f.source===id);
      const remoteIn=incoming.filter(f=>!f.local).reduce((a,f)=>a+f.tokens,0),remoteOut=outgoing.filter(f=>!f.local).reduce((a,f)=>a+f.tokens,0),local=incoming.find(f=>f.local).tokens;
      const state={t,phase,q,complete:t===1};
      const received=incoming.filter(v=>!v.local).reduce((n,v)=>n+allocate(v.tokens,Array(8).fill(1)).reduce((a,size,k)=>a+((phase.id==='compute'||phase.id==='combine'||parcel(state,k).place==='target')?size:0),0),0);
      const returned=outgoing.filter(v=>!v.local).reduce((n,v)=>n+allocate(v.tokens,Array(8).fill(1)).reduce((a,size,k)=>a+((phase.id==='combine'&&parcel(state,k).place==='source')?size:0),0),0);
      // Explicit allocator model: full send + receive staging is allocated for
      // each network phase and freed at phase end. It is not cumulative traffic.
      const bufferTokens=(phase.id==='dispatch'||(phase.id==='combine'&&t<1))?remoteIn+remoteOut:0;
      const held=t<.16?0:Math.floor((local+received)*(1-combine));
      return {id,local,remoteIn,remoteOut,received,returned,expertTokens:remoteIn+local,held,bufferBytes:bufferTokens*e.config.hidden*2,activationBytes:held*e.config.hidden*2};
    });
    return {t,phase,q,dispatch,combine,ranks,complete:t===1};
  }
  function parcel(f,k,n=8,local=false){
    if(f.complete)return {place:'source',q:1,output:true};
    const phase=f.phase.id;
    if(phase==='route')return {place:'source',q:0,output:false};
    if(phase==='compute')return {place:local?'source':'target',q:0,output:f.q>=(k+.5)/n};
    if(local)return {place:'source',q:0,output:phase==='combine'};
    const q=clamp((f.q-(n===1?0:k/(n-1)*.65))/.35);
    const place=phase==='dispatch'?(q<=0?'source':q>=1?'target':'outbound'):(q<=0?'target':q>=1?'source':'inbound');
    return {place,q,output:phase==='combine'};
  }
  // The same parcel states drive the drawing and integer accounting. A parcel
  // represents an eighth of this destination bucket, never one physical token.
  function trace(e,position,source){
    const f=frame(e,position);
    const buckets=e.flows.filter(v=>v.source===source).map(v=>{
      const sizes=allocate(v.tokens,Array(8).fill(1));
      let received=0,returned=0,dispatched=0,inFlight=0,held=0;
      sizes.forEach((n,k)=>{
        const p=parcel(f,k,8,v.local);
        if(v.local){received+=n;if(f.t>=.7)returned+=n;else held+=n;return;}
        if(f.phase.id!=='route'&&(f.phase.id!=='dispatch'||p.place!=='source'))dispatched+=n;
        if(f.phase.id==='compute'||f.phase.id==='combine'||p.place==='target')received+=n;
        if(f.phase.id==='combine'&&p.place==='source')returned+=n;
        if(p.place==='target')held+=n;
        if(p.place==='outbound'||p.place==='inbound')inFlight+=n;
      });
      return {...v,received,returned,dispatched,remaining:v.local?0:v.tokens-dispatched,inFlight,held};
    });
    const sum=(key,remote=false)=>buckets.filter(v=>!remote||!v.local).reduce((n,v)=>n+v[key],0);
    return {source,buckets,total:sum('tokens'),local:buckets.find(v=>v.local).tokens,
      remote:sum('tokens',true),sent:sum('dispatched',true),returned:sum('returned'),
      remoteReturned:sum('returned',true),complete:f.complete,phase:f.phase.id};
  }
  // Optional fault injection over the SAME routing event. This is an incremental
  // allocation budget, not a replacement for the full-device memory model.
  function allocationIncident(e,id,position){
    const r=frame(e,.3).ranks.find(r=>r.id===id);
    const retainedBytes=r.bufferBytes,requestBytes=r.expertTokens*e.config.hidden*2;
    const budgetBytes=retainedBytes+Math.floor(requestBytes/2);
    const supported=retainedBytes>=Math.ceil(requestBytes/2)&&requestBytes>0;
    const rootAt=.16,failAt=.44,t=clamp(position);
    const usedBytes=t>=rootAt?retainedBytes:0,freeBytes=budgetBytes-usedBytes;
    const failed=supported&&t>=failAt&&requestBytes>freeBytes;
    return {id,supported,rootAt,failAt,retainedBytes,requestBytes,budgetBytes,usedBytes,freeBytes,
      failed,acceptedBytes:0,normalFreeBytes:budgetBytes,expertTokens:r.expertTokens,
      phase:failed?'failed':t>=rootAt?'retained':'pending'};
  }
  const api={baseline,phases,coordinates,members,expertReplicas,allocate,event,frame,trace,parcel,allocationIncident};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.EPTeachingModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
