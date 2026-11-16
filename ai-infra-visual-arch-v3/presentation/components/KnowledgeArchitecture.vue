<script setup>
import DesignBasisHeader from './DesignBasisHeader.vue'
import {computed,onMounted,onBeforeUnmount,ref,unref,watch} from 'vue'
import {useNav,useSlideContext} from '@slidev/client'
const {currentSlideNo,next,prev}=useNav()
const {$page:ownPage}=useSlideContext()
const isActive=computed(()=>Number(currentSlideNo.value)===Number(unref(ownPage)))
const mapFrame=ref(null)
function syncMap(){mapFrame.value?.contentWindow?.setKnowledgeMapActive?.(isActive.value)}
watch(isActive,syncMap)
function onMapNavigation(event){
 if(event.origin!==location.origin||event.source!==mapFrame.value?.contentWindow||!isActive.value)return
 if(event.data?.type==='knowledge-map-slide-nav'){
  if(event.data.direction===1)next()
  else if(event.data.direction===-1)prev()
 }
}
onMounted(()=>window.addEventListener('message',onMapNavigation))
onBeforeUnmount(()=>window.removeEventListener('message',onMapNavigation))
</script>
<template>
<DesignBasisHeader title="【领域知识】多对象、跨层级与语义关系" />
<svg class="knowledge-story" viewBox="0 0 1320 742" role="img" aria-label="领域知识：计算对象与跨层语义">
<g transform="translate(0,25)" class="knowledge-canvas">
<foreignObject x="40" y="115" width="1240" height="550"><iframe ref="mapFrame" xmlns="http://www.w3.org/1999/xhtml" class="stage-mindmap" src="/knowledge-mindmap/index.html?mode=stage1" title="多对象：六类知识对象导图" @load="syncMap"/></foreignObject>
</g>
<text x="660" y="710" text-anchor="middle" class="conclusion">多对象：概念、属性、策略与记录共同构成领域知识</text>
</svg>
</template>
<style scoped>
.knowledge-story{width:100%;height:100%;font-family:Inter,'PingFang SC',sans-serif;fill:#17242e}
.conclusion{font-size:22px;font-weight:600}
.stage-mindmap{width:100%;height:100%;border:0;display:block;background:#f0f1f3}
</style>
