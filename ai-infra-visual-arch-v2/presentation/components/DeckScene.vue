<script setup>
import {useNav} from '@slidev/client'
import {loadAssets} from '../asset-loader.js'
import {onMounted,onBeforeUnmount,ref,watch} from 'vue'
const props=defineProps({scene:String,title:String,titleHtml:String,subtitleHtml:String,evidenceTitle:String,cognitionTitle:String,controlTitle:String,glyphTitle:String,patternTitle:String,frameworkTitle:String})
const root=ref(null)
import '../styles/deck.css'
import '../styles/adapter.css'
const {currentSlideNo}=useNav()
let fixture
const active=()=>Number(root.value?.closest('.slidev-page')?.className.match(/slidev-page-(\d+)/)?.[1])===currentSlideNo.value
watch(currentSlideNo,()=>fixture?.setActive(active()))
function applyText(){if(!root.value)return;for(const [selector,value] of [['.title',props.titleHtml],['.subtitle',props.subtitleHtml]]){const el=root.value.querySelector(selector);if(el&&value)el.innerHTML=value;}fixture?.setTitles([props.glyphTitle,props.patternTitle,props.frameworkTitle]);for(const [selector,value] of [['.title',props.title],['.principle-card-1 h2',props.evidenceTitle],['.principle-card-0 h2',props.cognitionTitle],['.principle-card-2 h2',props.controlTitle]]){const el=root.value.querySelector(selector);if(el&&value)el.textContent=value}}
watch(()=>[props.title,props.titleHtml,props.subtitleHtml,props.evidenceTitle,props.cognitionTitle,props.controlTitle,props.glyphTitle,props.patternTitle,props.frameworkTitle],applyText)
onMounted(async()=>{await loadAssets();const {mountFixture}=await import('../fixture.js');fixture=await mountFixture(root.value,props.scene);applyText();fixture.setActive(active())})
onBeforeUnmount(()=>fixture?.destroy())
</script>
<template><div ref="root" class="trial-stage" /></template>
