<script setup>
import {ref,onBeforeUnmount,computed,watch,unref} from 'vue'
import {useNav,useSlideContext} from '@slidev/client'
const props=defineProps({stage:{type:Number,default:undefined}})
const frame=ref(null)
const {next,prev,nextSlide,prevSlide,currentPage,currentSlideNo}=useNav()
const {$page,$renderContext,$clicks}=useSlideContext()
const active=computed(()=>currentPage.value===$page.value)
const nearby=computed(()=>Math.abs(Number(currentSlideNo.value)-Number(unref($page)))<=1)
const stage=computed(()=>props.stage??Math.min(3,$clicks.value))
watch(stage,value=>frame.value?.contentWindow?.setCaseStage?.(value))
watch(active,value=>frame.value?.contentWindow?.setCaseActive?.(value))
const loaded=ref(false)
watch(nearby,value=>{if(value)loaded.value=true},{immediate:true})
const boundDocuments=new WeakSet()
const cleanups=[]
function key(event){
 if(!active.value||event.repeat||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown','PageUp','PageDown',' '].includes(event.key)||event.altKey||event.ctrlKey||event.metaKey)return
 if(event.target?.closest?.('input,textarea,select,[contenteditable="true"]'))return
 event.preventDefault();event.stopImmediatePropagation()
 frame.value?.blur();window.focus()
 if(event.key==='ArrowDown'||event.key==='ArrowRight'&&event.shiftKey)nextSlide()
 else if(event.key==='ArrowUp'||event.key==='ArrowLeft'&&event.shiftKey)prevSlide()
 else if(['ArrowLeft','PageUp'].includes(event.key)||event.key===' '&&event.shiftKey)prev()
 else next()
}
function bind(win){
 try{
 if(!win||boundDocuments.has(win.document))return
 boundDocuments.add(win.document)
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
function onLoad(event){const win=event.target?.contentWindow;if(!win)return;bind(win);win.setCaseStage?.(stage.value);win.setCaseActive?.(active.value)}
// The parent document uses Slidev shortcuts; only focused child frames forward keys.
onBeforeUnmount(()=>{window.removeEventListener('keydown',key,true);cleanups.forEach(fn=>fn())})
</script>
<template><iframe v-if="loaded||$renderContext==='overview'" ref="frame" src="/cases/transformer-cognition-case.html?v=native-clicks&fixedStage=0" title="认知机制在 Transformer 图元中的应用" @load="onLoad" /></template>
