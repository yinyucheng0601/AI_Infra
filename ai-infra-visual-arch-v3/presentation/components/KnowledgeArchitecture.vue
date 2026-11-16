<script setup>
import DesignBasisHeader from './DesignBasisHeader.vue'
import ComputationMechanisms from './ComputationMechanisms.vue'
import {computed,onMounted,onBeforeUnmount,ref,watch,unref} from 'vue'
import {useNav,useSlideContext} from '@slidev/client'
const {currentSlideNo,next,prev}=useNav()
const {$page:ownPage}=useSlideContext()
const isActive=computed(()=>Number(currentSlideNo.value)===Number(unref(ownPage)))
const selectedStage=ref(1)
const mapFrame=ref(null)
let fixed=1
const stageConclusions=['多对象：概念、属性、策略与记录共同构成领域知识']
function selectStage(stage){
 selectedStage.value=Math.max(1,Math.min(2,stage))
 if(stage!==1)mapFrame.value?.contentWindow?.postMessage({type:'knowledge-map-reset'},location.origin)
}
function advance(direction){
 if(direction===1&&selectedStage.value===2){next();return}
 if(direction===-1&&selectedStage.value===1){prev();return}
 selectStage(selectedStage.value+direction)
}
function onMapNavigation(event){
 if(event.origin!==location.origin||event.source!==mapFrame.value?.contentWindow||!isActive.value)return
 if(event.data?.type==='knowledge-map-slide-nav'&&[1,-1].includes(event.data.direction))advance(event.data.direction)
}
function onStageKey(event){
 if(!isActive.value||event.altKey||event.ctrlKey||event.metaKey||!['ArrowLeft','ArrowRight'].includes(event.key))return
 if(event.composedPath().some(el=>el instanceof HTMLElement&&(el.isContentEditable||['INPUT','TEXTAREA','SELECT'].includes(el.tagName))))return
 event.preventDefault();event.stopImmediatePropagation()
 advance(event.key==='ArrowRight'?1:-1)
 const focused=document.activeElement
 if(focused?.getAttribute('role')==='tab')focused.closest('[role=tablist]')?.querySelectorAll('[role=tab]')[selectedStage.value-1]?.focus()
}
watch(currentSlideNo,n=>{if(Number(n)===Number(unref(ownPage)))selectStage(fixed)})
onMounted(()=>{
 fixed=Number(new URLSearchParams(location.search).get('knowledge-stage'))===2?2:1
 selectStage(fixed)
 window.addEventListener('message',onMapNavigation)
 window.addEventListener('keydown',onStageKey,true)
})
onBeforeUnmount(()=>{window.removeEventListener('message',onMapNavigation);window.removeEventListener('keydown',onStageKey,true)})
</script>
<template>
<DesignBasisHeader :title="selectedStage===1?'【领域知识】多对象、跨层级与语义关系':'【计算机制】从执行依赖理解运行行为'" :subtitle="selectedStage===2?'计算、访存、通信、同步与资源调度共同决定任务的执行过程及性能表现。':undefined" />
<svg class="knowledge-story" viewBox="0 0 1320 742" role="img" aria-label="领域知识与计算机制">


<foreignObject x="815" y="24" width="465" height="42"><div xmlns="http://www.w3.org/1999/xhtml" class="stage-tabs" role="tablist" aria-label="设计依据讲解阶段"><button v-for="(label,i) in ['领域知识','计算机制']" :key="label" role="tab" :aria-selected="selectedStage===i+1" :class="{active:selectedStage===i+1}" :title="`切换到阶段 ${i+1}：${label}`" @click="selectStage(i+1)">{{String(i+1).padStart(2,'0')}}　{{label}}</button></div></foreignObject>
<g v-show="selectedStage===1" transform="translate(0,60)" class="knowledge-canvas">
<foreignObject x="40" y="115" width="1240" height="550"><iframe ref="mapFrame" xmlns="http://www.w3.org/1999/xhtml" class="stage-mindmap" src="/knowledge-mindmap/index.html?mode=stage1" title="多对象：六类知识对象导图"/></foreignObject>
</g>
<ComputationMechanisms v-if="selectedStage===2" />
<text v-if="selectedStage===1" x="660" y="710" text-anchor="middle" class="conclusion">{{stageConclusions[0]}}</text>
</svg>
</template>
<style scoped>
.knowledge-story{width:100%;height:100%;font-family:Inter,'PingFang SC',sans-serif;fill:#17242e}
.stage-tabs{display:flex;gap:8px;height:40px;align-items:center;justify-content:flex-end}
.stage-tabs button{border:0;border-radius:24px;padding:9px 15px;background:#e4e6eb;color:#657180;font:14px sans-serif;cursor:pointer}
.stage-tabs button.active{background:#fff;color:#17242e}
.stage-tabs button:focus-visible{outline:none;text-decoration:underline;text-underline-offset:4px}
.conclusion{font-size:22px;font-weight:600}
.stage-mindmap{width:100%;height:100%;border:0;display:block;background:#f0f1f3}
</style>
