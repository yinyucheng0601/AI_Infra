<script setup>
import {computed,onMounted,onBeforeUnmount,ref,watch,unref} from 'vue'
import {useNav,useSlideContext} from '@slidev/client'
import KnowledgeGlyph from './KnowledgeGlyph.vue'
import glyphAssets from './knowledgeGlyphAssets.json'
import {objects,relations} from './knowledgeArchitectureData'
const {currentSlideNo,next,prev}=useNav()
const {$page:ownPage}=useSlideContext()
const isActive=computed(()=>Number(currentSlideNo.value)===Number(unref(ownPage)))
const time=ref(0)
const mapFrame=ref(null)
const mapAnchors=ref({})
const mapMotionActive=ref(false)
let raf=0,autoTimer=0,fixed=0,reduced=false,mapInteracting=false
const smooth=x=>{x=Math.max(0,Math.min(1,x));return x*x*(3-2*x)}
const spread=computed(()=>Math.max(0,Math.min(1,time.value/6500)))
const glyphReveal=computed(()=>mapMotionActive.value?smooth((spread.value-.55)/.45):spread.value)
const mix=(a,b,t)=>a+(b-a)*t
const nodes=computed(()=>objects.map(n=>{
 const source=mapAnchors.value[n.id],a=source?[source.x,source.y]:n.a,b=n.id==='Trace'?[268,570]:n.b;
 return {...n,sourceLabel:source?.label||n.label,x:mix(a[0],b[0],spread.value),y:mix(a[1],b[1],spread.value)+(mapMotionActive.value&&['Task','Rank'].includes(n.id)?Math.sin(Math.PI*spread.value)*(n.id==='Task'?-28:28):0),opacity:n.used?1:0}
}))
const byId=computed(()=>Object.fromEntries(nodes.value.map(n=>[n.id,n])))
const edgeTuple=e=>Array.isArray(e)?e:[e.source,e.target,e.label,...e.offset]
// Every relation uses orthogonal segments attached to actual card ports.
function route(edge){
 const e=edgeTuple(edge),a=byId.value[e[0]],b=byId.value[e[1]]
 const aw=(glyphAssets[a.label]?.width||(a.label.length*8.5+8))/2,ah=(glyphAssets[a.label]?.height||20)/2,bw=(glyphAssets[b.label]?.width||(b.label.length*8.5+8))/2,bh=(glyphAssets[b.label]?.height||20)/2
 let points
 if(e[0]==='Task'&&e[1]==='Event')points=[[a.x,a.y+ah],[b.x,b.y]]
 else if(e[0]==='Kernel'&&e[1]==='Core')points=[[a.x,a.y+ah],[a.x,455],[b.x,455],[b.x,b.y+bh]]
 else if(Math.abs(a.y-b.y)<1)points=[[a.x+Math.sign(b.x-a.x)*aw,a.y],[b.x-Math.sign(b.x-a.x)*bw,b.y]]
 else if(Math.abs(a.x-b.x)<1)points=[[a.x,a.y+Math.sign(b.y-a.y)*ah],[b.x,b.y-Math.sign(b.y-a.y)*bh]]
 else{
  const direction=Math.sign(b.x-a.x),sx=a.x+direction*aw,tx=b.x-direction*bw,mid=(sx+tx)/2
  points=[[sx,a.y],[mid,a.y],[mid,b.y],[tx,b.y]]
 }
 return points
}
function path(e){return route(e).map((p,i)=>i===0? `M${p[0]} ${p[1]}` : `${p[0]===route(e)[i-1][0]?'V'+p[1]:'H'+p[0]}`).join('')}
function edgeLabel(edge){
 const e=edgeTuple(edge)
 const points=route(edge)
 // Put the label on the longest segment, away from the bend.
 let best=0,length=-1
 for(let i=0;i<points.length-1;i++){const d=Math.abs(points[i+1][0]-points[i][0])+Math.abs(points[i+1][1]-points[i][1]);if(d>length){length=d;best=i}}
 const a=points[best],b=points[best+1],vertical=a[0]===b[0]
 return {x:(a[0]+b[0])/2+(vertical?18:0),y:(a[1]+b[1])/2-9}
}
const selectedStage=ref(1)
const stageConclusions = [
 '多对象：概念、属性、策略与记录共同构成领域知识',
 '跨层级：以明确的关系连接模型定义、执行实现与运行证据',
]
function captureMapAnchors(){
 const frame=mapFrame.value;if(!frame?.contentWindow?.getKnowledgeAnchors)return;
 const source=frame.contentWindow.getKnowledgeAnchors(),bounds=frame.getBoundingClientRect(),inverse=frame.closest('svg').getScreenCTM().inverse(),width=frame.contentWindow.innerWidth,height=frame.contentWindow.innerHeight;
 const anchors={};
 for(const [id,item] of Object.entries(source)){
  const p=new DOMPoint(bounds.x+item.x*bounds.width/width,bounds.y+item.y*bounds.height/height).matrixTransform(inverse);
  anchors[id]={...item,x:p.x,y:p.y};
 }
 mapAnchors.value=anchors;
}
function selectStage(stage,animate=true){
 stage=Math.max(1,Math.min(2,stage));
 const previous=selectedStage.value;
 clearTimeout(autoTimer);cancelAnimationFrame(raf);
 const mapPair=(previous===1&&stage===2)||(previous===2&&stage===1);
 if(mapPair)captureMapAnchors();
 mapMotionActive.value=mapPair&&animate&&!reduced&&Object.keys(mapAnchors.value).length>0;
 selectedStage.value=stage
 if(stage!==1){mapInteracting=false;mapFrame.value?.contentWindow?.postMessage({type:'knowledge-map-reset'},location.origin)}
 if(!fixed&&!mapInteracting&&isActive.value)autoTimer=setTimeout(()=>selectStage(stage%2+1),7100)
 const target=[0,6500][stage-1],from=time.value
 if(!animate||reduced){mapMotionActive.value=false;time.value=target;return}
 const began=performance.now(),duration=mapPair?720:1100
 function frame(now){const progress=Math.min(1,(now-began)/duration);time.value=mix(from,target,smooth(progress));if(progress<1)raf=requestAnimationFrame(frame);else mapMotionActive.value=false}
 raf=requestAnimationFrame(frame)
}
watch(currentSlideNo,n=>{clearTimeout(autoTimer);cancelAnimationFrame(raf);if(Number(n)===Number(unref(ownPage)))selectStage(fixed||1,false)})
function onMapNavigation(event){
 if(event.origin!==location.origin||event.source!==mapFrame.value?.contentWindow||!isActive.value)return
 if(event.data?.type==='knowledge-map-interaction'){
  if(selectedStage.value!==1)return;
  mapInteracting=Boolean(event.data.active);clearTimeout(autoTimer);
  if(!mapInteracting)selectStage(1,false);
  return;
 }
 if(event.data?.type!=='knowledge-map-slide-nav')return;
 mapInteracting=false;
 const direction=event.data.direction;
 if(direction===1&&selectedStage.value===2){clearTimeout(autoTimer);next();return}
 if(direction===-1&&selectedStage.value===1){clearTimeout(autoTimer);prev();return}
 if(direction!==1&&direction!==-1)return;
 selectStage(selectedStage.value+direction);
 document.querySelectorAll('.stage-tabs button')[selectedStage.value-1]?.focus({preventScroll:true});
}
function onStageKey(event){
 if(!isActive.value||event.altKey||event.ctrlKey||event.metaKey||!['ArrowLeft','ArrowRight'].includes(event.key))return
 if(event.composedPath().some(el=>el instanceof HTMLElement&&(el.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(el.tagName))))return
 event.preventDefault();event.stopImmediatePropagation()
 if(event.key==='ArrowRight'&&selectedStage.value===2){clearTimeout(autoTimer);next();return}
 if(event.key==='ArrowLeft'&&selectedStage.value===1){clearTimeout(autoTimer);prev();return}
 selectStage(selectedStage.value+(event.key==='ArrowRight'?1:-1))
 const focused=document.activeElement
 if(focused?.getAttribute('role')==='tab')focused.closest('[role=tablist]')?.querySelectorAll('[role=tab]')[selectedStage.value-1]?.focus()
}
onMounted(()=>{window.addEventListener('message',onMapNavigation);window.addEventListener('keydown',onStageKey,true);const requested=Number(new URLSearchParams(location.search).get('knowledge-stage'));fixed=requested?Math.max(1,Math.min(2,Math.trunc(requested))):0;reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;selectStage(fixed||1,false)})
onBeforeUnmount(()=>{window.removeEventListener('message',onMapNavigation);window.removeEventListener('keydown',onStageKey,true);clearTimeout(autoTimer);cancelAnimationFrame(raf)})
const crossLevelRelations=relations.filter(e=>['Layer-Operator','Tensor-Operator','Operator-Kernel','Task-Kernel','Kernel-Core','GPU-Core','Rank-GPU','Task-Event'].includes(e.id)).map(e=>({...e,type:e.id==='Task-Kernel'?'call':e.type,label:e.id==='Operator-Kernel'?'编译映射 · 可融合 / 拆分':e.id==='Task-Kernel'?'调用 / 启动':e.label}))

</script>
<template>
<svg class="knowledge-story" viewBox="0 0 1320 742" role="img" aria-label="领域知识的多对象、跨层级与语义关系">
<defs><marker id="knowledge-purple-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M1 1L9 5L1 9" fill="none" stroke="#9461cf" stroke-width="1.4"/></marker><marker id="knowledge-green-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M1 1L9 5L1 9" fill="none" stroke="#278777" stroke-width="1.4"/></marker><marker id="knowledge-data-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M1 1L9 5L1 9" fill="none" stroke="#87919c" stroke-width="1.4"/></marker><marker id="knowledge-mapping" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M1 5L5 1L9 5L5 9Z" fill="#f0f1f3" stroke="#87919c"/></marker></defs>
<text x="40" y="70" class="headline">领域知识：多对象、跨层级与语义关系</text>
<foreignObject x="815" y="36" width="465" height="42"><div xmlns="http://www.w3.org/1999/xhtml" class="stage-tabs" role="tablist" aria-label="领域知识讲解阶段"><button v-for="(label,i) in ['多对象','跨层级']" :key="label" role="tab" :aria-selected="selectedStage===i+1" :class="{active:selectedStage===i+1}" :title="`切换到阶段 ${i+1}：${label}`" @click="selectStage(i+1)">{{String(i+1).padStart(2,'0')}}　{{label}}</button></div></foreignObject>
<g class="knowledge-canvas" style="pointer-events:none">
<g :opacity="spread" class="level-backplates"><rect v-for="y in [123,301,479]" :key="y" x="40" :y="y" width="1240" height="162" rx="18" fill="#e4e6eb"/></g>
<foreignObject x="40" y="115" width="1240" height="550" :opacity="1-spread" :style="{pointerEvents:selectedStage===1?'auto':'none'}"><iframe ref="mapFrame" xmlns="http://www.w3.org/1999/xhtml" class="stage-mindmap" src="/knowledge-mindmap/index.html?mode=stage1" title="多对象：六类知识对象导图"/></foreignObject>
<g :opacity="spread" class="level-labels"><text x="62" y="151">模型定义</text><text x="62" y="329">执行实现</text><text x="62" y="507">运行记录</text></g>
<g :opacity="spread" class="relation-legend"><g v-for="(item,i) in [{type: `structure`,label: `结构 / 数据`},{type: `mapping`,label: `编译 / 资源映射`},{type: `call`,label: `调用`},{type: `evidence`,label: `运行证据`}]" :key="item.type" :transform="`translate(${635+i*170},106)`"><path d="M0 0H32" :class="item.type"/><text x="42" y="4">{{item.label}}</text></g></g>
<g :opacity="glyphReveal" class="network-edges"><g v-for="e in crossLevelRelations" :key="e.id"><path :d="path(e)" :class="[e.type,{call:e.id==='Task-Kernel'}]" :marker-end="e.id==='Task-Kernel'?'url(#knowledge-data-arrow)':e.type==='mapping'?'url(#knowledge-mapping)':e.type==='evidence'?'url(#knowledge-green-arrow)':'url(#knowledge-data-arrow)'"/><text v-bind="edgeLabel(e)" class="edge-label">{{e.label}}</text></g></g>

<g v-for="n in nodes" :key="n.id" :transform="`translate(${n.x},${n.y})`" :opacity="n.opacity*(mapMotionActive?1:spread)" :data-motion-source="n.sourceLabel" :data-object="n.id">
<g v-if="mapMotionActive&&n.used" :opacity="1-glyphReveal" class="map-motion-tag"><rect x="-50" y="-18" width="100" height="36" rx="7" fill="#fff"/><text y="5" text-anchor="middle" class="node-label">{{n.sourceLabel}}</text></g>
<KnowledgeGlyph v-if="n.id!=='Trace'&&n.id!=='Event'" :label="n.label" :opacity="glyphReveal"/> 
</g>
<g :opacity="glyphReveal" class="inline-trace" aria-label="Trace 中的三条执行泳道与事件">
<text x="240" y="574" class="trace-name">Trace</text>
<g v-for="(label,i) in ['Stream 0','Stream 1','Stream 2']" :key="label">
<text x="455" :y="554+i*20" class="trace-lane" text-anchor="end">{{label}}</text>
<path :d="`M480 ${550+i*20}H1130`" stroke="#cbd1da" stroke-width="1"/>
</g>
<g v-for="(bar,i) in [{x:500,y:547,w:130},{x:900,y:547,w:160},{x:540,y:567,w:70},{x:700,y:567,w:130},{x:510,y:587,w:150},{x:920,y:587,w:100}]" :key="i">
<rect :x="bar.x" :y="bar.y" :width="bar.w" height="6" rx="1" fill="#929ba7"/>
</g>
<path d="M700 560V580" stroke="#7d8794" stroke-width="1"/>
<circle cx="700" cy="570" r="2.5" fill="#657180"/><text x="715" y="559" class="trace-lane">Event · 记录于 Trace</text>
<path d="M480 606H1130" stroke="#a8b2bf"/><path v-for="x in [480,610,740,870,1000,1130]" :key="x" :d="`M${x} 606v4`" stroke="#a8b2bf"/>
<text x="1143" y="610" class="trace-lane">时间 →</text>
</g>
</g>
<text x="660" y="710"  text-anchor="middle" class="conclusion">{{ stageConclusions[selectedStage - 1] }}</text>
</svg>
</template>
<style scoped>
.knowledge-story{width:100%;height:100%;font-family:Inter,'PingFang SC',sans-serif;fill:#17242e}.headline{font-size:30px;font-weight:600}.stage-tabs{display:flex;gap:8px;height:40px;align-items:center;justify-content:flex-end}.stage-tabs button{border:0;border-radius:24px;padding:9px 15px;background:#e4e6eb;color:#657180;font:14px sans-serif;cursor:pointer}.stage-tabs button.active{background:#fff;color:#17242e}.stage-tabs button:focus-visible{outline:none;text-decoration:underline;text-underline-offset:4px}.domain-title{font-size:20px;font-weight:600}.node-label{font-size:14px}.panel-title{font-size:21px;font-weight:600}.panel-sub,.lane{font-size:13px;fill:#6d7886}.data,.mapping{fill:none;stroke:#87919c;stroke-width:1.35}.network-edges path{stroke-dasharray:1;transition:stroke-dashoffset 500ms ease-out}.network-edges .mapping{stroke:#9461cf}.edge-label{font-size:12px;text-anchor:middle;fill:#677482;paint-order:stroke;stroke:#f0f1f3;stroke-width:5px;stroke-linejoin:round}.level-labels{font-size:14px;fill:#738096}.conclusion{font-size:22px;font-weight:600}@media(prefers-reduced-motion:reduce){.network-edges path{transition:none}}
</style>

<style scoped>
.network-edges .structure,.relation-legend .structure{fill:none;stroke:#87919c;stroke-width:1.5;stroke-dasharray:none}
.network-edges .mapping,.relation-legend .mapping{fill:none;stroke:#9461cf;stroke-width:1.5;stroke-dasharray:2 5}
.network-edges .evidence,.relation-legend .evidence{fill:none;stroke:#278777;stroke-width:1.8;stroke-dasharray:2 5;stroke-linecap:round}
.relation-legend text{font-size:12px;fill:#657180}
</style>

<style scoped>
.network-edges g:has(.mapping) text,.relation-legend g:has(.mapping) text{fill:#8050b6}.network-edges g:has(.evidence) text,.relation-legend g:has(.evidence) text{fill:#207b6d}
</style>

<style scoped>.network-edges .call{stroke:#87919c;stroke-dasharray:8 5}</style>


<style scoped>
.trace-name{font-size:20px;font-weight:600;fill:#253344}.trace-lane{font-size:11px;fill:#657180}.trace-event{font-size:10px;fill:#253344}
</style>

<style scoped>.stage-mindmap{width:100%;height:100%;border:0;display:block;background:#f0f1f3}</style>

<style scoped>.relation-legend .call{fill:none;stroke:#87919c;stroke-width:1.5;stroke-dasharray:8 5}</style>
