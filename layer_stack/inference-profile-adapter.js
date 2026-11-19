/* Run and capture selectors deliberately never infer cross-capture timestamps. */
(function(root){
 'use strict';
 function create(data){
  if(data.schemaVersion!==1||data.invocations.length!==5)throw Error('Unsupported inference profile');
  const captures=new Map(data.captures.map(c=>[c.id,c]));
  return Object.freeze({run:data,
   invocation:id=>data.invocations.find(x=>x.id===id)||null,
   capture:id=>captures.get(id)||null,
   layerEvents:(captureId,rank,layer)=>{
    const c=captures.get(captureId);return c&&c.rank===rank?c.events.filter(e=>e.layer===layer):[];
   },
   rank:id=>data.ranks.find(r=>r.id===id)||null
  });
 }
 root.InferenceProfile=Object.freeze({create});
})(typeof window==='undefined'?globalThis:window);
