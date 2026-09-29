/* Playback automatically focuses the most affected mock rank shard. */
(()=>{
'use strict';
const caption=document.createElement('section');caption.className='shard-rank-controls';caption.hidden=true;
caption.setAttribute('aria-label','当前异常 Rank 分片');
document.querySelector('.rank-memory').append(caption);
let context=null;
function render(rank){
 const a=context?.anomaly;
 const shards=a?.shards.filter(s=>s.alerts>0)||[];
 caption.hidden=!shards.length;
 if(!shards.length){caption.replaceChildren();return;}
 caption.innerHTML=`<span>L${a.layer} · Query ${a.mode==='activation'?'激活':a.mode==='weight'?'权重':'梯度'} · 分片 ${rank+1}/4</span>
 ${shards.length>1?`<div class="shard-ranks">${shards.map(s=>`<button type="button" data-rank="${s.rank}" aria-pressed="${s.rank===rank}">Rank ${String(s.rank).padStart(2,'0')}</button>`).join('')}</div>`:''}`;
 caption.querySelectorAll('[data-rank]').forEach(button=>button.addEventListener('click',()=>{
  const selected=Number(button.dataset.rank),shard=shards.find(s=>s.rank===selected);
  window.dispatchEvent(new CustomEvent('rank-memory:inspect-shard',{detail:{...context,shardInspection:{...shard,layer:a.layer}}}));
  render(selected);caption.querySelector(`[data-rank="${selected}"]`).focus();
 }));
}
function sync(next){
 context=next;
 const first=next?.anomaly?.shards.filter(s=>s.alerts>0).sort((a,b)=>b.alerts-a.alerts||a.rank-b.rank)[0];
 render(first?.rank);
}
window.addEventListener('layer-atlas:training-state',event=>sync(event.detail));
sync(window.LayerAtlasTrainingState);
})();
