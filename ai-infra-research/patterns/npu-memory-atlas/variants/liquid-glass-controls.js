/* Memory-only composition using the common control contracts. */
(()=>{
 const dial=AtlasControls.mountDial(document.querySelector('.view-dial'),{onSelect:index=>{viewMode=viewModes[index];fitCanvas();}});
 const originalRender=render;
 render=function(){originalRender();dial.update({views:['立体视图','顶视图','正视图','侧视图'],selected:viewModes.indexOf(viewMode),name:viewMode});AtlasControls.syncScope();};
 $('memory-legend').onclick=e=>{const button=e.target.closest('[data-memory-category]');if(!button)return;const category=Number(button.dataset.memoryCategory);selectedMemoryCategory=selectedMemoryCategory===category?null:category;render();};
 $('labels').onclick=()=>{labels=!labels;if(!labels)selectedMemoryCategory=null;render();};
 AtlasControls.mountScope();AtlasControls.mountTheme();render();
})();
