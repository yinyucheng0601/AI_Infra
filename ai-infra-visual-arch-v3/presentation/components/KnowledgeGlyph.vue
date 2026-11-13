<script setup>
import {computed} from 'vue'
import assets from './knowledgeGlyphAssets.json'
const props=defineProps({label:String,x:{type:Number,default:0},y:{type:Number,default:0}})
const glyph=computed(()=>assets[props.label])
</script>
<template>
<g :transform="`translate(${x},${y})`" :data-library-glyph="glyph?.source || 'unregistered-label'" :aria-label="label">
 <image v-if="glyph" :href="glyph.href" :x="-glyph.imageWidth/2" :y="-glyph.imageHeight/2" :width="glyph.imageWidth" :height="glyph.imageHeight" preserveAspectRatio="xMidYMid meet"/>
 <text v-else y="5" text-anchor="middle" style="font-size:14px;fill:#253344">{{label}}</text>
</g>
</template>
