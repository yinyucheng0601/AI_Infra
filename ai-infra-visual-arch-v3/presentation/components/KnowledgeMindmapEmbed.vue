<script setup>
import {ref,onMounted,onBeforeUnmount} from 'vue'
import {useNav} from '@slidev/client'
const frame=ref(null)
const {next,prev}=useNav()
function navigate(event){
 if(event.origin!==location.origin||event.source!==frame.value?.contentWindow||event.data?.type!=='knowledge-map-slide-nav')return
 if(event.data.direction===1)next()
 else if(event.data.direction===-1)prev()
}
onMounted(()=>window.addEventListener('message',navigate))
onBeforeUnmount(()=>window.removeEventListener('message',navigate))
</script>
<template>
<iframe ref="frame" class="knowledge-map-embed" src="/knowledge-mindmap/index.html" title="智能计算六类知识对象导图"/>
</template>
<style scoped>
.knowledge-map-embed{display:block;width:100%;height:100%;border:0;background:#f0f1f3}
</style>
