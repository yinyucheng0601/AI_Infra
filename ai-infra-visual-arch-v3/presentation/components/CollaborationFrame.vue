<script setup>
import {computed,unref} from 'vue'
import {useNav,useSlideContext} from '@slidev/client'
const props=defineProps({color:{type:String,default:'#d3d3d3'},label:String})
const {currentSlideNo}=useNav()
const {$page,$renderContext}=useSlideContext()
const shared=computed(()=>Number(currentSlideNo.value)===Number(unref($page))&&['slide','presenter'].includes(unref($renderContext)))
</script>
<template>
<svg class="collaboration-frame" viewBox="0 0 1440 810" preserveAspectRatio="none" aria-hidden="true" :style="{color,viewTransitionName:shared?'collaboration-frame':'none'}">
<path fill="currentColor" fill-rule="evenodd" d="M0 0H1440V810H0Z M28.8 15.84H1411.2Q1424.16 15.84 1424.16 28.8V750.06Q1424.16 763.02 1411.2 763.02H28.8Q15.84 763.02 15.84 750.06V28.8Q15.84 15.84 28.8 15.84Z"/>
<text v-if="label" x="20" y="795" fill="#151b1a" font-family="Inter, PingFang SC, sans-serif" style="font:500 21.6px Inter, PingFang SC, sans-serif!important">{{label}}</text>
</svg>
</template>
<style scoped>.collaboration-frame{position:absolute;inset:0;width:100%;height:100%;z-index:50;pointer-events:none}</style>
<style>
::view-transition-group(collaboration-frame){animation-duration:500ms;animation-timing-function:cubic-bezier(.22,1,.36,1)}
::view-transition-old(collaboration-frame),::view-transition-new(collaboration-frame){animation-duration:500ms;mix-blend-mode:normal}
@media(prefers-reduced-motion:reduce){::view-transition-group(collaboration-frame),::view-transition-old(collaboration-frame),::view-transition-new(collaboration-frame){animation-duration:1ms!important}}
</style>
