/* Communication-only composition: model runtime, projections, theme and physical config. */
(()=>{
 const runtime=window.installRankAtlasRuntime(),M=RankAtlasModel;
 const transfer=new URLSearchParams(window.location.hash.slice(1));
 if(transfer.has('config')){try{runtime.applyConfig(JSON.parse(transfer.get('config')));}catch{}}
 const id=Number(transfer.get('rank'));if(transfer.has('rank')&&ranks[id])selectedRank=relationRank=id;
 if(M.moeLayer(selectedRank,atlasConfig)===null){const first=ranks.find(r=>M.moeLayer(r.id,atlasConfig)!==null);if(first)selectedRank=relationRank=first.id;}
 const capacity=Number(transfer.get('capacity'));if(Number.isInteger(capacity)&&capacity>=1&&capacity<=32)physicalRanksPerCabinet=capacity;
 mode='comm';scope='all';rankLayout='physical';viewMode='2.5D';playing=false;lastFrame=null;
 function selectView(index){viewMode=viewModes[index];epIncidentActive=false;commCamera=null;fitCanvas();}
 const dial=AtlasControls.mountDial(document.querySelector('.view-dial'),{center:true,onCenter:()=>selectView(viewMode==='2.5D'?1:0),onSelect:selectView});
 syncViewDial=()=>dial.update({centerActive:viewMode!=='2.5D',views:['立体视图','顶视图','正视图','侧视图'],selected:viewModes.indexOf(viewMode),name:viewMode});
 const backNav=document.createElement('nav');backNav.className='bar communication-return';backNav.setAttribute('aria-label','返回导航');
 const backLink=document.createElement('a');backLink.id='communication-back';backLink.textContent='← 返回';backLink.setAttribute('aria-label','返回内存工作台');backNav.append(backLink);document.body.append(backNav);
 function syncReturn(){const params=new URLSearchParams({config:JSON.stringify(atlasConfig),rank:String(selectedRank),capacity:String(physicalRanksPerCabinet),layout:transfer.get('layout')||'physical',view:transfer.get('view')||'2.5D'});backLink.href='index_comm.html#'+params.toString();}
 const originalRender=render;
 render=function(){originalRender();syncViewDial();syncReturn();};
 setAtlasMode=function(next){if(next==='comm'){mode='comm';render();}};
 switchScope=function(next){if(next==='all'){scope='all';render();}};
 $('scene').ondblclick=null;
 $('rank-settings-toggle').setAttribute('aria-label','通信显示配置');$('rank-settings-toggle').title='通信显示配置';
 $('ep-physical-config').querySelector('legend').textContent='物理排布';
 $('ep-physical-config').querySelector('p').textContent='每柜 1–32 Rank，按两列排列；通信组按 EP / ETP 及 Rank 映射计算，可跨机柜。';
 $('relations').value='ep';$('timeline').max='1000';$('timeline').setAttribute('aria-label','通信事件进度');
 setRankLayout('physical');
 const event=epEventAt(0,relationRank);simTime=event.start+trafficWindow.end*(event.end-event.start);
 document.title='Rank 通信 · Sankey';AtlasControls.mountTheme();fitCanvas();render();
})();
