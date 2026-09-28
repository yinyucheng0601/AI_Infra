/* Data/model layer: original v10 Rank 2 memory budgets, driven by the
 * layer atlas phase/progress. Illustrative whole-rank background, not measured
 * PanGu memory. No DOM, colors, independent clock or RMS-to-byte conversion.
 */
(function (global) {
  'use strict';
  // v10: H4096, L32, I14336, V128256, TP2 / PP2 / EP2 / ETP2.
  const H=4096,L=32,I=14336,V=128256,TP=2,PP=2,EP=2,ETP=2;
  const localParams=(L/PP)*(H*H/TP+2*H*1024/TP+H*H/TP+2*H*(I/EP)/ETP+H*(I/EP)/ETP)
    +V*H/TP+(L/PP)*2*H;
  const config=Object.freeze({rank:2,capacityGB:64,layers:49,localParams,peakActivationGB:3.8,baseReserveGB:2.3,mockFreeFraction:0.2});
  const weightGB=localParams*2/1e9,gradientGB=localParams*4/1e9,optimizerGB=localParams*12/1e9;
  const reservedGB=localParams*18/1e9+config.peakActivationGB+config.baseReserveGB;
  // Scale every modeled category together, retaining the original relative dynamics.
  const mockScale=config.capacityGB*(1-config.mockFreeFraction)/reservedGB;
  function snapshot(context={}) {
    const phase=context.phase||'ready',layer=context.activeLayer??0;
    if(!Number.isInteger(layer)||layer<0||layer>=config.layers)throw new Error('Invalid layer context');
    const forward=phase==='forward',backward=phase==='backward',loss=phase==='loss';
    const q=forward?(layer+1)/config.layers:backward?(config.layers-layer)/config.layers:0;
    const completed=context.completedMicrobatches||0;
    const gradient=phase==='complete'||phase==='ready'?0:completed>0||phase==='update'?gradientGB:backward?gradientGB*q:0;
    let activation=config.peakActivationGB*(loss?1:forward?q:backward?1-q:0);
    const pulse=forward||backward?Math.sin(Math.PI*q*4)**2:0;
    let workspace=phase==='update'?3:forward||backward?.3+.65*Math.sin(Math.PI*q)**2:0;
    let communication=pulse*(backward?1.6:.8);
    // Reuse the original transient budget and allocator accounting.
    const transient=activation+workspace+communication;
    const scale=transient>config.peakActivationGB?config.peakActivationGB/transient:1;
    activation*=scale;workspace*=scale;communication*=scale;
    const live=weightGB+optimizerGB+gradient+activation+workspace+communication;
    return {version:4,rank:config.rank,capacityGB:config.capacityGB,linked:true,
      source:'v10 proportions scaled to 80% reserved capacity; teaching mock',scope:'原内存示例 · 训练阶段联动',
      context:{...context,phase},selectedCategory:context.mode||'activation',
      categories:[
        {id:'weight',name:'权重',symbol:'W',valueGB:weightGB},
        {id:'optimizer',name:'优化器态',symbol:'Opt',valueGB:optimizerGB},
        {id:'gradient',name:'梯度',symbol:'g',valueGB:gradient},
        {id:'activation',name:'激活',symbol:'h',valueGB:activation},
        {id:'workspace',name:'临时工作区',symbol:'WS',valueGB:workspace},
        {id:'communication',name:'通信缓冲',symbol:'Comm',valueGB:communication},
        {id:'pool',name:'分配器可复用空间',symbol:'Pool',valueGB:reservedGB-live},
        {id:'free',name:'空余',symbol:'Free',valueGB:config.capacityGB*config.mockFreeFraction}
      ].map(category=>({...category,valueGB:category.id==='free'?category.valueGB:category.valueGB*mockScale})),
      assumptions:['沿用 v10 分区比例并整体放大，mock 空余固定 20%，非盘古实测',
        '49 层播放进度归一化驱动原示例内存生命周期，非真实层到 rank 映射',
        '优化器态沿用原示例 Adam 预算，不表示主页面 SGD 实际分配',
        '更新后梯度归还可复用池；后续 microbatch 复用梯度，不重复叠加']};
  }
  global.RankMemoryData={config,async querySnapshot(context){return snapshot(context);}};
})(window);
