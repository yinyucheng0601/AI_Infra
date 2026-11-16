<script setup>
import {computed} from 'vue'
import {useNav} from '@slidev/client'
const {currentFrontmatter,currentSlideNo,clicks}=useNav()
const label=computed(()=>currentFrontmatter.value.chapterLabel)
const english=computed(()=>currentFrontmatter.value.chapterLabelEn)
const dark=computed(()=>currentSlideNo.value===5
 || currentSlideNo.value===11&&clicks.value>=1&&clicks.value<=3
 || [8,9,10].includes(currentSlideNo.value)&&clicks.value>0)
</script>
<template>
<div v-show="label" class="deck-chapter-label" :class="{'on-dark':dark}" aria-label="当前章节">
 <span class="deck-chapter-label__text">{{label}}</span><span class="deck-chapter-label__english">{{english}}</span>
</div>
</template>
<style>
/* One persistent layer, in the same 1440 × 810 canvas coordinate system. */
.deck-chapter-label{position:absolute;top:37px;left:54px;right:54px;z-index:100;display:flex;justify-content:space-between;align-items:baseline;pointer-events:none;color:#3f4952;font:500 12px/1.4 SFMono-Regular,Consolas,monospace;letter-spacing:.12em}
.deck-chapter-label__english{font-size:10px;letter-spacing:.1em;color:#737e89}
.deck-chapter-label.on-dark{color:#c6c9cc}
.deck-chapter-label.on-dark .deck-chapter-label__english{color:#9a9ea2}
/* Keep the old elements' layout space so titles and diagrams do not reflow. */
.slidev-page :is(.trial-stage .launch-head .brand,.trial-stage .chapter-theory .theory-brand,.basis-header>small,.method-brand,.asset-series-head>div>small:first-child){visibility:hidden!important}
</style>
