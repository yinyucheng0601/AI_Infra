<script setup>
import {ref,computed,watch,onMounted,onBeforeUnmount} from 'vue'
import {useNav,useSlideContext} from '@slidev/client'
const frame=ref(null)
const {next,prev,currentPage}=useNav()
const {$page}=useSlideContext()
const isSlideActive=computed(()=>currentPage.value===$page.value)
function sync(){frame.value?.contentWindow?.postMessage({type:'collaboration-playback',active:isSlideActive.value},location.origin)}
function navigate(event){
 if(event.origin!==location.origin||event.source!==frame.value?.contentWindow||event.data?.type!=='collaboration-slide-nav'||!isSlideActive.value)return
 frame.value?.blur();window.focus()
 if(event.data.direction===1)next()
 else if(event.data.direction===-1)prev()
}
watch(isSlideActive,sync)
onMounted(()=>window.addEventListener('message',navigate))
onBeforeUnmount(()=>window.removeEventListener('message',navigate))
</script>
<template><iframe ref="frame" src="/agent-human-collaboration-16x9.html?v=loop-6" title="Human × Agent 可核查、可接管的协作过程" style="position:absolute;inset:0;width:100%;height:100%;border:0" @load="sync" /></template>
