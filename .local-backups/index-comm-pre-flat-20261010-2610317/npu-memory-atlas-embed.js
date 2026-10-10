/* Optional host adapter. The standalone atlas retains its own controls/clock. */
function rankHostedState(context,id){
  const phase=context.phase,forward=phase==='forward',backward=phase==='backward';
  const q=forward?(context.activeLayer+1)/49:backward?(49-context.activeLayer)/49:0;
  const grad=params[id]*4/1e9;
  const gradient=phase==='ready'||phase==='complete'?0:context.completedMicrobatches>0||phase==='update'?grad:backward?grad*q:0;
  let activation=PEAK_ACT*(phase==='loss'?1:forward?q:backward?1-q:0);
  const pulse=forward||backward?Math.sin(Math.PI*q*4)**2:0;
  let workspace=phase==='update'?3:forward||backward?.3+.65*Math.sin(Math.PI*q)**2:0;
  let communication=pulse*(backward?1.6:.8);
  const factor=Math.min(1,PEAK_ACT/(activation+workspace+communication||1));
  activation*=factor;workspace*=factor;communication*=factor;
  return {activation,gradient,workspace,communication,poolActive:activation+gradient+workspace,
    mb:context.microbatch,q,layer:context.activeLayer,
    active:phase==='complete'?'zero':phase==='ready'||phase==='loss'?'idle':phase,
    phase:({ready:'待开始',forward:'前向',backward:'反向',loss:'Loss',update:'参数更新',complete:'释放梯度'})[phase],
    detail:'主页面统一播放进度 · 教学映射，非实测调度'};
}
if(ATLAS_EMBED){
  const zoomControls=document.createElement('nav');
  zoomControls.className='bar embedded-zoom-controls';
  zoomControls.setAttribute('aria-label','缩放');
  zoomControls.append($('minus'),$('zoom'),$('plus'));
  document.body.append(zoomControls);
  $('fit').hidden=true;
  transform();
  window.addEventListener('message',event=>{
    if(event.source!==window.parent||event.data?.type!=='layer-atlas:state')return;
    const c=event.data.context;
    if(!c||!['ready','forward','loss','backward','update','complete'].includes(c.phase)
      ||!Number.isInteger(c.activeLayer)||c.activeLayer<0||c.activeLayer>48
      ||!Number.isInteger(c.microbatch)||c.microbatch<1||c.microbatch>4
      ||!Number.isInteger(c.completedMicrobatches)||c.completedMicrobatches<0||c.completedMicrobatches>4)return;
    atlasHostState={phase:c.phase,activeLayer:c.activeLayer,microbatch:c.microbatch,completedMicrobatches:c.completedMicrobatches};
    playing=false;lastFrame=null;scope='all';
    simTime=c.phase==='complete'?CYCLE_MS:c.phase==='update'?29000:(c.microbatch-1)*7000+(c.phase==='backward'?3000+(49-c.activeLayer)/49*4000:c.phase==='loss'?3000:(c.activeLayer+1)/49*3000);
    if(mode==='shard'){
      const active=currentModule(rankHostedState(atlasHostState,selectedRank));
      if(active!==null)$('tensor').value=String(active);
    }
    render();
  });
  // Do not permit double-click / Enter to switch scope while embedded.
  $('scene').addEventListener('dblclick',event=>event.stopImmediatePropagation(),true);
  $('scene').addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' ')event.stopImmediatePropagation();},true);
  document.addEventListener('keydown',event=>{
    if(event.key==='Escape')window.parent.postMessage({type:'rank-atlas:close'},'*');
  });
  window.parent.postMessage({type:'rank-atlas:ready'},'*');
}
