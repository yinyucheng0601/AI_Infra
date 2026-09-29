(function () {
  'use strict';
  const target=document.getElementById('rank-memory');
  let request=0,lastKey='';
  async function update(context) {
    const key=JSON.stringify(context);
    if(key===lastKey)return;
    lastKey=key;
    const current=++request;
    try {
      const snapshot=await window.RankMemoryData.querySnapshot(context);
      if(current!==request)return; // A late backend response must not rewind playback.
      const anomaly=context?.anomaly;
      const shard=context?.shardInspection||anomaly?.shards.filter(s=>s.alerts>0).sort((a,b)=>b.alerts-a.alerts||a.rank-b.rank)[0];
      if(shard){snapshot.rank=shard.rank;snapshot.shardInspection={...shard,layer:anomaly.layer};}
      window.RankMemoryView.render(target,snapshot);
    } catch(error) {
      if(current!==request)return;
      lastKey='';
      target.textContent='内存视图暂不可用';
      console.error('Rank memory:',error);
    }
  }
  window.addEventListener('layer-atlas:training-state',event=>update(event.detail));
  window.addEventListener('rank-memory:inspect-shard',event=>update(event.detail));
  update(window.LayerAtlasTrainingState);
})();
