<script setup>
import {useCognitionContinuity} from './cognitionContinuity'
useCognitionContinuity()
import {computed,unref} from 'vue'
import {useNav,useSlideContext} from '@slidev/client'
const {currentSlideNo}=useNav()
const {$page,$renderContext}=useSlideContext()
const shared=computed(()=>Number(currentSlideNo.value)===Number(unref($page))&&['slide','presenter'].includes(unref($renderContext)))
const abilities=[
 {name:'空间定位',ability:['快速判断对象的位置','识别相对顺序与空间关系']},
 {name:'视觉分组',ability:['将相关对象组织为整体','邻近、相似、共同区域']},
 {name:'特征识别',ability:['快速识别形状、颜色','与方向的差异']},
 {name:'变化感知',ability:['识别变化、流动','与事件转换']},
 {name:'对象连续性',ability:['借助稳定锚点与视觉记忆','持续追踪对象及其变化']}
]
</script>
<template>
<svg viewBox="-20 -27 1360 790" role="img" aria-label="视觉认知理论：空间定位、视觉分组、特征识别、变化感知、对象连续性" class="cognition-theory">
<defs>
 <filter id="cognition-card-shadow" x="-15%" y="-15%" width="130%" height="140%" color-interpolation-filters="sRGB">
  <feDropShadow dx="0" dy="3" stdDeviation="5" flood-color="#242424" flood-opacity="0.07"/>
 </filter>
</defs>
<g font-family="sans-serif" fill="#242424">
 <text x="0" y="44" class="title">从人的视知觉出发：如何让复杂计算变得可理解？</text>
 <text x="0" y="85" class="intro">人的认知优势，是视觉组织的依据：让用户先识别结构与变化，再理解计算关系。</text>
 <text x="0" y="260" class="label">01 / 感知基础</text>
 <foreignObject v-for="(a,i) in abilities" :key="a.name" :x="150+i*237" y="225" width="222" height="294" overflow="visible">
 <div xmlns="http://www.w3.org/1999/xhtml" class="sense-card t-resize" :data-cognition-card="i" :style="{viewTransitionName:shared?'cognition-card-'+i:'none'}">
 <h3 :style="{viewTransitionName:shared?'cognition-title-'+i:'none'}">{{a.name}}</h3>
 <p>{{a.ability[0]}}<br/>{{a.ability[1]}}</p>
 <svg viewBox="0 0 196 132" class="sense-figure" aria-hidden="true">
<g v-if="i===0"><g transform="translate(8,8)">
  <text x="25" y="14" class="tiny">Core 0</text><text x="102" y="14" class="tiny">Core 1</text>
  <text x="-7" y="48" class="tiny">L₀</text><text x="-7" y="91" class="tiny">L₁</text>
  <g v-for="(y,i) in [25,68]" :key="y"><rect x="23" :y="y" width="63" height="33" rx="5" fill="#ebebeb"/><rect x="100" :y="y" width="63" height="33" rx="5" :fill="i===1?'#def46c':'#ebebeb'"/></g>
  <circle cx="132" cy="85" r="5" fill="#242424"/>
 </g></g>
<g v-if="i===1"><g transform="translate(8,8)">
  <rect x="0" width="82" height="98" rx="9" fill="#f0f0f0"/><rect x="94" width="82" height="98" rx="9" fill="#ededed"/>
  <text x="41" y="23" text-anchor="middle" class="tiny">Core 0</text><text x="135" y="23" text-anchor="middle" class="tiny">Core 1</text>
  <g v-for="x in [13,107]" :key="x"><rect :x="x" y="36" width="23" height="23" rx="4" fill="#def46c"/><rect :x="x+33" y="36" width="23" height="23" rx="4" fill="#def46c"/><rect :x="x" y="68" width="23" height="17" rx="4" fill="#d3d3d3"/><rect :x="x+33" y="68" width="23" height="17" rx="4" fill="#d3d3d3"/></g>
 </g></g>
<g v-if="i===2"><g transform="translate(8,8)">
  <g v-for="(n,i) in ['Tensor','OP','Memory']" :key="n" :transform="`translate(${i*62},0)`">
   <rect v-if="i===0" x="9" y="14" width="36" height="36" rx="3" fill="#cecece"/>
   <circle v-if="i===1" cx="27" cy="32" r="20" fill="#def46c"/>
   <g v-if="i===2" fill="#cecece"><path d="M7 24h40v30c0 12-40 12-40 0Z"/><ellipse cx="27" cy="24" rx="20" ry="7"/></g>
   <text x="27" y="89" text-anchor="middle" class="tiny">{{n}}</text>
  </g>
 </g></g>
<g v-if="i===3"><g transform="translate(8,8)">
  <text y="16" class="tiny">DMA / 数据搬运</text>
  <path d="M6 60h170m-6-5 6 5-6 5" fill="none" stroke="#c7c7c7" stroke-width="1.5"/>
  <g v-for="(x,i) in [14,77,140]" :key="x"><rect :x="x" y="48" width="24" height="24" rx="5" :fill="i===2?'#def46c':i===1?'#dddddd':'#ededed'"/><text :x="x+12" y="103" text-anchor="middle" class="tiny">t{{i}}</text></g>
 </g></g>
<g v-if="i===4"><g transform="translate(8,8)">
  <g v-for="(n,i) in ['计算图','内存视图']" :key="n" :transform="`translate(${i*96},0)`">
   <text x="39" y="15" text-anchor="middle" class="tiny">{{n}}</text>
   <rect y="28" width="78" height="66" rx="7" fill="#eeeeee"/><rect x="9" y="40" width="29" height="25" rx="5" fill="#def46c"/>
   <text x="23.5" y="57" text-anchor="middle" class="tiny">T₇</text><rect x="46" y="42" width="22" height="16" rx="3" fill="#d3d3d3"/><rect x="12" y="75" width="53" height="7" rx="3" fill="#d3d3d3"/>
  </g>
  <path d="M38 52h67" fill="none" stroke="#def46c" stroke-dasharray="3 3"/>
 </g>
</g>
 </svg></div></foreignObject>
 <text x="150" y="575" class="heading">理论来源</text>
 <text x="150" y="610" class="body" fill="#727272">知觉分组：Palmer（1992） · 图形感知：Cleveland &amp; McGill（1984）、Heer &amp; Bostock（2010）</text>
 <text x="150" y="640" class="body" fill="#727272">变化与动画：Tversky 等（2002） · 多视图与对象关联：Baldonado 等（2000）</text>
</g>
</svg>
</template>
<style scoped>
.cognition-theory{width:100%;height:100%;background:#f5f5f5}.label{font-size:18px;font-weight:600}.title{font-size:26px;font-weight:600}.intro{font-size:17px;fill:#727272}.ability-title{font-size:26px;font-weight:600}.heading{font-size:20px;font-weight:600}.body{font-size:16px}.small{font-size:13px;fill:#727272}.tiny{font-size:12px}.principle{font-size:17px;font-weight:600;fill:#646464}

.sense-card{box-sizing:border-box;width:222px;height:auto;padding:18px;background:#fff;border-radius:12px;box-shadow:0 3px 10px #0000000d;color:#242424;font-family:sans-serif}
.sense-card h3{font-size:26px;font-weight:600;line-height:1.3;margin:0 0 16px;white-space:nowrap}
.sense-card p{font-size:16px;line-height:1.7;margin:0}
.sense-figure{display:block;width:100%;height:auto;aspect-ratio:196/132;margin-top:24px;overflow:visible}
.t-resize{transition:width var(--resize-dur) var(--resize-ease),height var(--resize-dur) var(--resize-ease);will-change:width,height}
@media(prefers-reduced-motion:reduce){.t-resize{transition:none!important}}
</style>
<style>
:root{--resize-dur:300ms;--resize-ease:cubic-bezier(0.22,1,0.36,1)}
::view-transition-group(*){animation-duration:400ms;animation-timing-function:cubic-bezier(0.22,1,0.36,1)}
@media(prefers-reduced-motion:reduce){::view-transition-group(*),::view-transition-old(*),::view-transition-new(*){animation-duration:1ms!important}}
</style>
