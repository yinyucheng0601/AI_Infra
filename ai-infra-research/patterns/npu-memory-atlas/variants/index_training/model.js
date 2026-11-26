/* Configuration-derived relationships. No device trace or timing estimates. */
(function(root){
 'use strict';
 const M=root.RankAtlasModel,cache=new Map();
 function rankForLayer(c,id,layer){const r=M.rank(id,c);return Math.floor(layer/(c.layers/c.pp))*M.lanes(c)*c.tp+r.cp*M.dpReplica(c)*c.tp+r.dpIndex*c.tp+r.tp;}
 function epMembers(c,id){const r=M.rank(id,c),base=Math.floor(r.dpIndex/c.ep)*c.ep;return Array.from({length:c.ep},(_,i)=>(r.pp*M.lanes(c)+r.cp*M.dpReplica(c)+base+i)*c.tp+r.tp);}
 function owners(c,id,expert){const r=M.rank(id,c),owner=Math.floor(expert/(c.experts/c.ep));return Array.from({length:M.world(c)},(_,n)=>n).filter(n=>{const q=M.rank(n,c);return q.pp===r.pp&&q.ep===owner;});}
 function representative(c,id,expert){const group=epMembers(c,id);return group[Math.floor(expert/(c.experts/c.ep))];}
 function route(c,id,layer,mb=0){
  const r=M.rank(id,c),key=JSON.stringify([c,id,layer,mb]);if(cache.has(key))return cache.get(key);
  const config={...root.EPTeachingModel.baseline,tp:c.tp,pp:c.pp,dp:M.lanes(c),cp:c.cp,cpIndex:r.cp,dataDP:M.dpReplica(c),ep:c.ep,layers:c.layers,experts:c.experts,topk:c.topk,seq:Math.min(32,c.seq/c.cp),mbs:1};
  const e=root.EPTeachingModel.event({config,pp:r.pp,edp:Math.floor(r.dpIndex/c.ep),tp:r.tp,layer,mb});
  if(cache.size>12)cache.clear();cache.set(key,e);return e;
 }
 const state={bucket:null,token:0,searchExpert:null,selectedExpert:null};
 root.TrainingGraphState=state;
 root.TrainingModel={rankForLayer,epMembers,owners,representative,route};
 if(typeof module!=='undefined')module.exports=root.TrainingModel;
})(globalThis);
