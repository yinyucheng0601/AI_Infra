<script setup>
import CollaborationFrame from './CollaborationFrame.vue'
import {useNav} from '@slidev/client'
import {loadAssets} from '../asset-loader.js'
import {onMounted,onBeforeUnmount,ref,watch} from 'vue'
const props=defineProps({scene:String,title:String,titleHtml:String,subtitleHtml:String,evidenceTitle:String,cognitionTitle:String,controlTitle:String,glyphTitle:String,patternTitle:String,frameworkTitle:String})
const root=ref(null)
import '../styles/deck.css'
import '../styles/adapter.css'
const {currentSlideNo}=useNav()
let fixture,coverObserver
const coverVisible=ref(false)
function syncCollaboration(){
 if(props.scene!=='attention')return
 const slide=root.value?.querySelector('#attention')
 coverVisible.value=slide?.dataset.step==='-1'
}

const active=()=>Number(root.value?.closest('.slidev-page')?.className.match(/slidev-page-(\d+)/)?.[1])===currentSlideNo.value
watch(currentSlideNo,()=>{fixture?.setActive(active());syncCollaboration()})
function applyText(){if(!root.value)return;for(const [selector,value] of [['.title',props.titleHtml],['.subtitle',props.subtitleHtml]]){const el=root.value.querySelector(selector);if(el&&value)el.innerHTML=value;}fixture?.setTitles([props.glyphTitle,props.patternTitle,props.frameworkTitle]);for(const [selector,value] of [['.title',props.title],['.principle-card-1 h2',props.evidenceTitle],['.principle-card-0 h2',props.cognitionTitle],['.principle-card-2 h2',props.controlTitle]]){const el=root.value.querySelector(selector);if(el&&value)el.textContent=value}}
watch(()=>[props.title,props.titleHtml,props.subtitleHtml,props.evidenceTitle,props.cognitionTitle,props.controlTitle,props.glyphTitle,props.patternTitle,props.frameworkTitle],applyText)
onMounted(async()=>{await loadAssets();const {mountFixture}=await import('../fixture.js');fixture=await mountFixture(root.value,props.scene);applyText();fixture.setActive(active());syncCollaboration();if(props.scene==='attention'){coverObserver=new MutationObserver(syncCollaboration);coverObserver.observe(root.value.querySelector('#attention'),{attributes:true,attributeFilter:['data-step']})}})
onBeforeUnmount(()=>{coverObserver?.disconnect();fixture?.destroy()})
</script>
<template><div ref="root" class="trial-stage" /><CollaborationFrame v-if="scene==='attention'&&coverVisible" color="#c19cf0" label="02 聚焦 · 执行泳道" /></template>
