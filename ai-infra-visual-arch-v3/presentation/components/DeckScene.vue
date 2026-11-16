<script setup>
import CollaborationFrame from './CollaborationFrame.vue'
import {useNav,useSlideContext} from '@slidev/client'
import {loadAssets} from '../asset-loader.js'
import {onMounted,onBeforeUnmount,ref,watch} from 'vue'
const props=defineProps({scene:String,fixedStep:Number,title:String,titleHtml:String,subtitleHtml:String,evidenceTitle:String,cognitionTitle:String,controlTitle:String,glyphTitle:String,patternTitle:String,frameworkTitle:String})
const root=ref(null)
import '../styles/deck.css'
import '../styles/adapter.css'
const {currentSlideNo,next,prev,nextSlide,prevSlide}=useNav()
const {$renderContext,$clicks}=useSlideContext()
let fixture,coverObserver,disposed=false,loading=false
const stepStart=['attention','layers','agent','system'].includes(props.scene)?-1:0
const step=()=>props.fixedStep??($clicks.value+stepStart)
watch($clicks,()=>{fixture?.step(step());syncCollaboration()})
const coverVisible=ref(false)
function syncCollaboration(){
 if(props.scene!=='attention')return
 const slide=root.value?.querySelector('#attention')
 coverVisible.value=slide?.dataset.step==='-1'
}

const active=()=>Number(root.value?.closest('.slidev-page')?.className.match(/slidev-page-(\d+)/)?.[1])===currentSlideNo.value
function near(){const no=Number(root.value?.closest('.slidev-page')?.className.match(/slidev-page-(\d+)/)?.[1]);return Math.abs(no-currentSlideNo.value)<=1}
// Slidev retains preloaded pages with v-show. Mount once, then only pause playback.
function syncScene(){
 fixture?.setActive(active())
 if(active()||near()||$renderContext.value==='overview')mountScene()
 syncCollaboration()
}
watch(currentSlideNo,syncScene)
function applyText(){if(!root.value)return;for(const [selector,value] of [['.title',props.titleHtml],['.subtitle',props.subtitleHtml]]){const el=root.value.querySelector(selector);if(el&&value)el.innerHTML=value;}fixture?.setTitles([props.glyphTitle,props.patternTitle,props.frameworkTitle]);for(const [selector,value] of [['.title',props.title],['.principle-card-1 h2',props.evidenceTitle],['.principle-card-0 h2',props.cognitionTitle],['.principle-card-2 h2',props.controlTitle]]){const el=root.value.querySelector(selector);if(el&&value)el.textContent=value}}
watch(()=>[props.title,props.titleHtml,props.subtitleHtml,props.evidenceTitle,props.cognitionTitle,props.controlTitle,props.glyphTitle,props.patternTitle,props.frameworkTitle],applyText)
async function mountScene(){
 if(loading||fixture||disposed||!root.value)return
 loading=true
 await loadAssets();if(disposed||!root.value)return
 const {mountFixture}=await import('../fixture.js');if(disposed||!root.value)return
 const mounted=await mountFixture(root.value,props.scene,{next,prev,nextSlide,prevSlide,fixedStep:props.fixedStep,initialStep:step(),nativeClicks:true,preview:$renderContext.value==='overview'})
 if(disposed){mounted?.destroy();return}
 if(!mounted||!root.value){loading=false;return}
 loading=false
 fixture=mounted;applyText();fixture.setActive(active());syncCollaboration()
 fixture.step(step())
 if(props.scene==='attention'){
  const scene=root.value.querySelector('#attention')
  if(scene){coverObserver=new MutationObserver(syncCollaboration);coverObserver.observe(scene,{attributes:true,attributeFilter:['data-step']})}
 }
}
onMounted(syncScene)
onBeforeUnmount(()=>{disposed=true;coverObserver?.disconnect();fixture?.destroy()})

</script>
<template><div ref="root" class="trial-stage" /><CollaborationFrame v-if="scene==='attention'&&coverVisible" color="#c19cf0" label="02 聚焦 · 执行泳道" /></template>
