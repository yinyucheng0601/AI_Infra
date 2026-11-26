"""Called by build.py. Extract approved components, rather than redrawing them."""
import re, json
pangu=read('layer_stack/pangu-layer-stack_2.html')
# Reuse standalone dock position, _2 occlusion and animation.
# Only the layer pitch is mapped to the host; palette comes from inference.
dock=read('layer_stack/pangu-layer-stack-standalone.html')
position_source=pangu[pangu.index('function position(l,focus=focusPosition){'):pangu.index('function paintGeometry(){')]
dock_position=dock[dock.index('function position(l,focus=focusPosition){'):dock.index('// Test the label footprint')]
# Retain the host's plane pitch; reuse the source dock's fraction/lift unchanged.
dock_position=dock_position.replace('l*20','l*layerStepX').replace('l*6','l*layerStepY')
# The same source dock must remain attached to the selected layer after hover
# leaves. Previously the source's selected-only fallback flattened its neighbours.
dock_position=dock_position.replace("hovered!==null?(1-Math.tanh(d/.9))/2:(l<selected?1:l===selected?.5:0)","(1-Math.tanh(d/.9))/2").replace("hovered!==null?180*Math.exp(-.5*Math.pow(d/.55,2)):(l===selected?180:0)","180*Math.exp(-.5*Math.pow(d/.55,2))")
position_source=dock_position+position_source[position_source.index('// Test the label footprint'):]
motion_source=pangu[pangu.index('function animateGeometry(time){'):pangu.index('function previewLayer(l){')]
geometry_prefix="""/* Source dock: pangu-layer-stack-standalone.html; animation/occlusion: _2.html. */
window.createTrainingStackGeometry=function(options){
let selected=0,hovered=null,focusPosition=0,animationFrame=0,lastFrameTime=0,mbPlaying=false;
let projectionX=.72,projectionY=.3312,layerStepY=12;const layerStepX=40,planeWidth=362,planeHeight=462;
let layers=[],displayedPositions=[];const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)');
function paintGeometry(){options.paint({projectionX,projectionY,positions:displayedPositions.map((p,l)=>({...p,occluded:labelIsOccluded(l)})),selected,hovered});}
"""
geometry_suffix="""
return {update(next){
const rebuild=layers.length!==next.count;if(selected!==next.selected)hovered=null;selected=next.selected;mbPlaying=next.playing;projectionX=next.side?.035:.72;projectionY=next.side?0:.3312;layerStepY=next.side?0:12;
if(rebuild){if(animationFrame)cancelAnimationFrame(animationFrame);animationFrame=0;lastFrameTime=0;layers=Array.from({length:next.count},(_,l)=>l);displayedPositions=layers.map(l=>position(l));}
requestGeometry();},preview(l){const preview=l===selected?null:l;if(hovered===preview)return;hovered=preview;requestGeometry();},snapshot(){return {positions:displayedPositions.map(p=>({...p})),selected,hovered,moving:animationFrame!==0,projectionX,projectionY};}};
};
"""
(HERE/'stack-geometry-source.js').write_text(geometry_prefix+position_source+motion_source+geometry_suffix)
(HERE/'stack-shell-source.css').write_text('''/* Source plane surfaces and outline. Current user explicitly requested the
reference layer border; scope this to the Stack, not global selection UI. */
#training-stack .plane>.outline{fill:#131313;stroke:#393939;stroke-width:1.5;vector-effect:non-scaling-stroke}
#training-stack .plane.chosen>.outline{fill:#1b1b1b;stroke:#fff;stroke-width:2}
#training-stack .plane.preview:not(.chosen)>.outline{stroke:#bcbcbc;stroke-width:1.5}
#training-stack .external-layer-number{user-select:none;paint-order:stroke;stroke:#111;stroke-width:3px;stroke-linejoin:round}
#training-stack .external-layer-number:focus-visible{text-decoration:underline;outline:none}
:root[data-theme=light] #training-stack .plane>.outline{fill:#efefef;stroke:#fff;filter:drop-shadow(0 5px 12px rgb(0 0 0 / 16%))}
:root[data-theme=light] #training-stack .plane.chosen>.outline{fill:#dedede;stroke:#fff}
''')
infer=read('layer_stack/inference-layer-stack.html')
infer_css=read('layer_stack/inference-layer-stack.css')
# Namespaced theme values from the approved inference Stack; avoid host token collisions.
palette=infer_css.splitlines()[1:3]
palette='\n'.join(palette).replace(':root','#training-stack').replace('#training-stack[data-theme=light]',':root[data-theme=light] #training-stack')
with (HERE/'stack-shell-source.css').open('a') as out: out.write('\n'+palette+'\n#training-stack .external-layer-number{fill:var(--muted);stroke:var(--bg);font-size:13px;font-family:monospace}\n#training-stack .external-layer-number.active,#training-stack .external-layer-number.preview{fill:var(--ink);font-size:18px}\n')
front=read('layer_stack/layer-front.js')
face=read('layer_stack/layer-stack-face.js')
matrix=front[front.index('function matrix('):front.index('function tensor(')]
face=face.replace("const {matrix,colors}=window.LayerFront.glyphs;", "const colors={activation:'#B1EF6B',weight:'#BCA0F3',gradient:'#79D4F2'};\n"+matrix)
face=face.replace("document.getElementById('scene').prepend(defs)","document.getElementById('scene').prepend(defs)")
face=face.replace('detailed=false,anomalySamples=[]','detailed=false,anomalySamples=[],dense=0,topk=8,lastLayer=47')
face=face.replace("query?(active&&Number.isFinite(rms)?rms.toFixed(4):'—'):label", "label")
face=face.replace('layer<2','layer<dense').replace("layer===48",'layer===lastLayer').replace("'Query Down'","'Q Projection'").replace("'Attention · MLA'","'Attention'").replace("'MoE · top-8'","'MoE · Top-'+topk")
(HERE/'stack-face-source.js').write_text(face)
(HERE/'stack-face-source.css').write_text(read('layer_stack/layer-stack-face.css').replace('#scene','#training-stack'))
# Light glyph text uses approved light ink, retaining role-colored tensor grids.
with (HERE/'stack-face-source.css').open('a') as out: out.write('''
:root[data-theme=light] #training-stack .stack-face .tensor-outline{fill:var(--plane)}
:root[data-theme=light] #training-stack .stack-face .tensor-label{fill:var(--ink);stroke:var(--plane)}
:root[data-theme=light] #training-stack .stack-face .op{fill:var(--op);stroke:var(--line)}
:root[data-theme=light] #training-stack .stack-face .op-label{fill:var(--ink)}
:root[data-theme=light] #training-stack .stack-face circle{fill:var(--plane);stroke:var(--muted)}
:root[data-theme=light] #training-stack .stack-face .add-mark{stroke:var(--ink)}
''')
dial=infer[infer.index('<div class="view-dial"'):infer.index('<section id="identity"')]
dial=dial[:dial.index('<div class="view-actions"')]+ '</div>'
dial=dial.replace('id="cycle-view"','id="stack-cycle-view"').replace('id="dial-marker"','id="stack-dial-marker"').replace('id="dial-cube"','id="stack-dial-cube"').replace('id="view-name"','id="stack-view-name"').replace('class="view-dial"','id="stack-view-dial" class="view-dial"')
(HERE/'reference-ui.json').write_text(json.dumps({'dial':dial},ensure_ascii=False))
(HERE/'reference-ui.js').write_text('window.TrainingReferenceUI='+json.dumps({'dial':dial},ensure_ascii=False)+';')
css='\n'.join(l for l in infer_css.splitlines() if l.startswith('.view-dial{') or l.startswith('.request-progress{'))
css=css.replace('--ink','--ui-text').replace('--muted','--ui-muted').replace('--surface','--ui-fill').replace('--line','--wb-line')
css=css.replace('.view-dial','#stack-view-dial').replace('#request-axis','#timeline').replace('.request-progress','.training-progress')
(HERE/'reference-ui.css').write_text(css)

canonical=read('ai-infra-research/patterns/training-graph/canonical.js')
model=read('ai-infra-research/patterns/training-graph/graph-model.js')
rows=model[model.index('function buildTrainingRows'):]
rows=rows.replace('const rows=[],byId={};','const rows=[],byId={};')
graph=read('ai-infra-research/patterns/training-graph/training-graph.js')
(HERE/'graph-renderer-source.js').write_text(read('ai-infra-research/patterns/training-graph/graph-renderer.js'))
graph=graph[graph.index('function trainingGraph(){'):]
graph=graph.replace('layoutExpertGrid(experts,ep)','layoutTrainingExperts(experts,ep)')
graph=graph.replace('cw=moe?1850:1030,cb=moe?2600:wgrad?1702:1030','cw=moe?cf+expertLayout.halfWidth+320:1030,cb=moe?cf+expertLayout.halfWidth+1020:wgrad?1702:1030')
start=graph.index(' function drawMoe(r){');end=graph.index(' const roleBodies=',start)
graph=graph[:start]+(HERE/'moe-source-hook.js').read_text()+graph[end:]
for old,new in [('[8,24/tp]','[T,Q/tp]'),('[8,8/tp]','[T,H/tp]'),('[8/tp,8]','[H/tp,H]'),('[seq,8]','[seq,H]'),('[8,16/tp]','[T,F/tp]'),('[16/tp,8]','[F/tp,H]'),('[8,8]','[T,H]')]:
 rows=rows.replace(old,new);graph=graph.replace(old,new)
graph=graph.replace('qkv:[T,Q/tp]','qkv:[H,Q/tp]')
# Exact shapes stay in metadata; the source's matrix renderer gets bounded
# square glyph cells so a real 8192×4096 tensor never creates millions of DOM nodes.
canonical=canonical.replace('rows=3,cols=12,seed=0){const pitch=', 'rows=3,cols=12,seed=0){const extent=Math.max(rows,cols);rows=Math.max(1,Math.round(rows/extent*8));cols=Math.max(1,Math.round(cols/extent*8));const pitch=')
canonical=canonical.replace('class="hit${selected===id?', 'class="hit cg-hit${selected===id?').replace('data-node="${esc(id)}"','data-node="${esc(id)}" data-cg-node="${esc(id)}"')
prefix="""(function(){'use strict';let CTX,H,T,F,Q,current=8,parameterState;const TRAINING_MODEL={};
function deriveTrainingConfig(){const c=CTX.config;return {stage:8,experts:c.experts,moe:true,ep:c.ep,tp:c.tp,sp:false,seq:T,detailed:true,training:true,wgrad:true,recollect:false,deployed:true,worldSize:RankAtlasModel.world(c),dp:RankAtlasModel.dpReplica(c),expertDP:RankAtlasModel.dpReplica(c)/c.ep};}
function moeRoute(t){const e=TrainingModel.route(CTX.config,CTX.rank,CTX.layer,CTX.mb),s=e.ids.indexOf(CTX.rank),token=Math.min(t,e.assignments[s].length-1);return {chosen:e.assignments[s][token],alpha:e.routingWeights[s][token],scores:[]};}
function moeStatistics(count){return {loads:Array(count).fill(0)};}
"""
suffix="""
window.TrainingFullGraph={render(c){CTX=c;H=RankAtlasModel.H;F=RankAtlasModel.I;T=c.config.mbs*c.config.seq/c.config.cp;Q=H+2048;parameterState={token:TrainingGraphState.token};registry={};selected=c.selected||(TrainingGraphState.searchExpert!==null&&TrainingGraphState.searchExpert<c.config.experts?'moe-e'+TrainingGraphState.searchExpert:'');TRAINING_MODEL.tokens=T;TRAINING_MODEL.hidden=H;TRAINING_MODEL.ffn=F;TRAINING_MODEL.heads=null;
let html=trainingGraph();const dom=new DOMParser().parseFromString(html,'image/svg+xml'),svgNode=dom.documentElement;
svgNode.classList.add('approved-compute-svg','training-full-source');const left=Math.min(-160,graphModel.positions['module-moe'].x-50),right=svgNode.viewBox.baseVal.width;svgNode.setAttribute('data-width',String(right-left));
const moe=graphModel.positions['module-moe'];for(const [key,value] of Object.entries({x:moe.x-48,y:moe.y-90,width:moe.width+96,height:moe.height+180}))svgNode.setAttribute('data-moe-'+key,String(value));svgNode.setAttribute('data-height',String(graphModel.rows.at(-1).bottom+100));svgNode.setAttribute('data-left',String(left));svgNode.setAttribute('data-layout-key','full:'+c.config.experts+':'+c.config.ep);
const focus=selected&&graphModel.positions[selected];if(focus&&TrainingGraphState.searchExpert!==null){svgNode.setAttribute('data-search-key',selected);svgNode.setAttribute('data-focus-x',String(focus.x+focus.width/2));svgNode.setAttribute('data-focus-y',String(focus.y));}const notes={};for(const [id,n] of Object.entries(registry)){const node=svgNode.querySelector('[data-cg-node="'+id+'"]');let description=n.role?`${n.title} · ${n.shape?.join(' × ')||''}`:n.expert!==undefined?n.body:n.title+' · 当前层计算依赖';
notes[id]={title:n.title,description};if(n.expert!==undefined)notes[id].communication={enabled:true,members:TrainingModel.owners(c.config,c.rank,n.expert)};
const comm={'moe-dispatch':'ep-dispatch','moe-combine':'ep-combine','full-f-rsp':'tp-attn','full-f-rsf':'tp-ffn','full-b-rsq':'tp-attn','full-b-agp':'tp-attn','full-b-rs1':'tp-ffn','full-b-ag2':'tp-ffn'}[id];if(comm)notes[id].communication=c.bindings.comm[comm];
if(n.role)notes[id].tensor={category:n.role==='w'?0:n.role==='g'?1:3,target:{kind:n.role==='w'?'parameter':n.role==='g'?'parameter-gradient':'activation',rank:c.rank,layer:c.layer,indices:n.expert!==undefined?[3,4]:[]},summary:n.shape?.join(' × '),description};
if(node){node.setAttribute('data-wb-tip',description);node.setAttribute('aria-pressed',String(selected===id));}
}
const groups=Array.from({length:c.config.ep},(_,owner)=>({id:'L'+c.layer+'-ep-'+owner,parallelism:'EP',experts:Array.from({length:c.config.experts/c.config.ep},(_,i)=>owner*c.config.experts/c.config.ep+i),ranks:[TrainingModel.representative(c.config,c.rank,owner*c.config.experts/c.config.ep)]}));window.TrainingGraphSnapshot={...graphModel.snapshot,groups,layer:c.layer,rank:c.rank,topk:c.config.topk,experts:c.config.experts,chosen:moeRoute(parameterState.token).chosen,sourceToken:parameterState.token,mb:c.mb};return {html:svgNode.outerHTML,notes};
}};
})();
"""
# Source declares graphModel before its renderer; helpers remain closure-scoped.
(HERE/'full-graph-source.js').write_text(prefix+(HERE/'expert-layout.js').read_text()+'\n'+canonical+'\n'+rows+'\nlet graphModel=null;\n'+graph+suffix)
css=read('ai-infra-research/patterns/training-graph/demo.css')
rules=[]
for selectors,body in re.findall(r'([^{}]+)\{([^{}]+)\}',css):
 for selector in selectors.split(','):
  selector=selector.strip()
  if selector.startswith('.') and any(k in selector for k in ['.text','.small','.tiny','.mono','.wire','.hit','.module-frame','.panel-frame','.compact-expert','.off-route','.is-route']) and not any(k in selector for k in ['#','body','footer']):
   rules.append('.training-full-source '+selector+'{'+body+'}')
(HERE/'full-graph-source.css').write_text('\n'.join(rules))
