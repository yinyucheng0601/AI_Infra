<script setup>
import {useEntrance} from './useEntrance'
useEntrance()
import {ref,onMounted,onBeforeUnmount,computed,watch} from 'vue'
import {useNav,useSlideContext} from '@slidev/client'
const frame=ref(null)
const {next,prev,currentPage}=useNav()
const {$page}=useSlideContext()
const active=computed(()=>currentPage.value===$page.value)
watch(active,value=>frame.value?.contentWindow?.setCaseActive?.(value))
const cleanups=[]
function key(event){
 if(!active.value||!['ArrowLeft','ArrowRight'].includes(event.key)||event.altKey||event.ctrlKey||event.metaKey)return
 if(event.target?.closest?.('input,textarea,select,[contenteditable="true"]'))return
 event.preventDefault();event.stopImmediatePropagation()
 const direction=event.key==='ArrowRight'?1:-1
 if(!frame.value?.contentWindow?.stepLesson?.(direction)){frame.value?.blur();window.focus();direction===1?next():prev()}
}
function bind(win){
 try{
 win.addEventListener('keydown',key,true)
 cleanups.push(()=>win.removeEventListener('keydown',key,true))
 for(const child of win.document.querySelectorAll('iframe')){
 const loaded=()=>bind(child.contentWindow)
 child.addEventListener('load',loaded)
 cleanups.push(()=>child.removeEventListener('load',loaded))
 loaded()
 }
 }catch{}
}
onMounted(()=>{window.addEventListener('keydown',key,true)})
onBeforeUnmount(()=>{window.removeEventListener('keydown',key,true);cleanups.forEach(fn=>fn())})
</script>
<template><iframe ref="frame" src="/cases/transformer-cognition-case.html?v=20261116-r3" title="认知机制在 Transformer 图元中的应用" @load="bind(frame.contentWindow);frame.contentWindow?.setCaseActive?.(active)" /></template>
