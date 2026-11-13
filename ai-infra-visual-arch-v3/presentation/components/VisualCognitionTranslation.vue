<script setup>
import {useCognitionContinuity} from './cognitionContinuity'
useCognitionContinuity()
import {computed,unref} from 'vue'
import {useNav,useSlideContext} from '@slidev/client'
const {currentSlideNo}=useNav()
const {$page,$renderContext}=useSlideContext()
const shared=computed(()=>Number(currentSlideNo.value)===Number(unref($page))&&['slide','presenter'].includes(unref($renderContext)))
const senses=[['空间定位','位置 · 顺序'],['视觉分组','邻近 · 边界'],['特征识别','形状 · 差异'],['变化感知','连续 · 转换'],['对象连续性','锚点 · 记忆']]
const domains=[{title:'空间结构与分组',context:'Layer / Rank / Core',lines:['保留层级、位置与真实归属','让结构成为持续定位的空间参照']},{title:'对象身份与关联',context:'Tensor → Tile → Core',lines:['表达派生、映射与证据来源','跨视图保留标识与上下文']},{title:'差异与变化编码',context:'Latency / DMA / Sync',lines:['对齐长度支持定量比较','可控时序表达执行、等待与变化']}]
const values=[{title:'快速定位',lines:['识别异常发生在哪一层、哪个 Core','从结构总览缩小调查范围']},{title:'连续理解',lines:['跨计算图、内存与运行时追踪对象','明确跨层变换，减少上下文重建']},{title:'深入核查',lines:['从异常摘要进入 IR / Trace 证据','支持定位、展开、暂停与回溯']}]
</script>
<template>
<svg viewBox="-20 -27 1360 790" role="img" aria-label="从感知基础到领域转译与设计价值" class="cognition-theory">
<defs><filter id="translation-shadow" x="-15%" y="-15%" width="130%" height="140%" color-interpolation-filters="sRGB"><feDropShadow dx="0" dy="3" stdDeviation="5" flood-color="#242424" flood-opacity="0.07"/></filter></defs>
<g font-family="sans-serif" fill="#242424">
<g class="translation-content" transform="translate(0,-64)">
<text x="0" y="140" class="label">01 / 感知基础</text>
<foreignObject v-for="(a,i) in senses" :key="a[0]" :x="150+i*237" y="112" width="222" height="70" overflow="visible"><div xmlns="http://www.w3.org/1999/xhtml" class="sense-summary t-resize" :data-cognition-card="i" :style="{viewTransitionName:shared?'cognition-card-'+i:'none'}"><h3 :style="{viewTransitionName:shared?'cognition-title-'+i:'none'}">{{a[0]}}</h3><p>{{a[1]}}</p></div></foreignObject>
<text x="150" y="218" class="body" fill="#727272">↓ 视觉编码需要对应真实的计算关系</text>
<text x="0" y="276" class="label">02 / 领域转译</text>
<g v-for="(d,i) in domains" :key="d.title" :transform="`translate(${150+i*395},242)`"><rect width="380" height="278" rx="12" fill="#fff" filter="url(#translation-shadow)"/><text x="18" y="34" class="ability-title" style="font-size:24px">{{d.title}}</text><text x="18" y="66" class="body" fill="#727272">{{d.context}}</text><text x="18" y="231" class="body">{{d.lines[0]}}</text><text x="18" y="256" class="body">{{d.lines[1]}}</text></g>
<!-- Topology expresses containment and allocation without treating Rank and Core as the same entity. -->
<g transform="translate(176,332)"><text y="15" class="tiny">Layer 7</text><path d="M0 24h326" stroke="#bcbcbc"/><g v-for="(n,i) in ['Rank 0','Rank 1']" :key="n" :transform="`translate(${i*170},33)`"><rect width="156" height="78" rx="8" fill="#f0f0f0"/><text x="12" y="23" class="tiny">{{n}}</text><rect x="12" y="35" width="61" height="28" rx="5" :fill="i===1?'#def46c':'#ddd'"/><rect x="83" y="35" width="61" height="28" rx="5" fill="#ddd"/><text x="42" y="53" text-anchor="middle" class="tiny">Core 0</text><text x="113" y="53" text-anchor="middle" class="tiny">Core 1</text></g></g>
<g transform="translate(571.5,356)"><g v-for="(n,i) in ['Tensor','Tile','Core']" :key="n" :transform="`translate(${i*111},0)`"><rect width="91" height="40" rx="8" :fill="i===0?'#def46c':'#f0f0f0'"/><text x="45.5" y="26" text-anchor="middle" class="body">{{n}}</text></g><path d="M91 20h20m-5-4 5 4-5 4M202 20h20m-5-4 5 4-5 4" fill="none" stroke="#727272"/><text x="103" y="63" text-anchor="middle" class="tiny">切分</text><text x="214" y="63" text-anchor="middle" class="tiny">映射</text><path d="M45 40v35h222V40" fill="none" stroke="#bcbcbc" stroke-dasharray="3 3"/></g>
<g transform="translate(961,333)"><text x="56" y="12" class="tiny">共同时间轴</text><path d="M55 20v101M55 121h263" fill="none" stroke="#bcbcbc"/><g v-for="(n,i) in ['DMA','Compute','Sync']" :key="n"><text x="0" :y="42+i*32" class="tiny">{{n}}</text></g><rect x="56" y="26" width="88" height="21" rx="4" fill="#ddd"/><rect x="144" y="58" width="130" height="21" rx="4" fill="#def46c"/><rect x="274" y="90" width="38" height="21" rx="4" fill="#ddd"/><path d="M144 47v11m130 21v11" stroke="#727272" stroke-dasharray="3 3"/></g>
<text x="150" y="558" class="body" fill="#727272">↓ 解决开发者的实际认知困难</text>
<text x="0" y="613" class="label">03 / 设计价值</text>
<g v-for="(v,i) in values" :key="v.title" :transform="`translate(${150+i*395},582)`"><rect width="380" height="148" rx="12" fill="#fff" filter="url(#translation-shadow)"/><text x="18" y="32" class="ability-title" style="font-size:24px">{{v.title}}</text><text x="18" y="66" class="body">{{v.lines[0]}}</text><text x="18" y="92" class="body" fill="#727272">{{v.lines[1]}}</text>
<path d="M18 105h344" stroke="#ededed"/>
<text x="18" y="130" style="font-size:14px" fill="#646464">{{['认知减负：减少搜索；证据驱动：定位有据','认知减负：保持上下文；证据驱动：映射可溯','证据驱动：深入核查；协同控制：掌握节奏'][i]}}</text></g>

<text x="150" y="754" class="tiny" fill="#727272">设计依据：Sweller 等（2019），认知负荷；Baldonado 等（2000），多视图协调。原则与价值的关联为设计推导。</text>
</g></g></svg>
</template>
<style scoped>
.cognition-theory{width:100%;height:100%;background:#f5f5f5}.label{font-size:18px;font-weight:600}.title{font-size:26px;font-weight:600}.intro{font-size:17px;fill:#727272}.ability-title{font-size:26px;font-weight:600}.heading{font-size:20px;font-weight:600}.body{font-size:16px}.small{font-size:13px;fill:#727272}.tiny{font-size:12px}.principle{font-size:17px;font-weight:600;fill:#646464}
.sense-summary{box-sizing:border-box;width:222px;height:70px;padding:12px 18px;background:#fff;border-radius:12px;color:#242424;font-family:sans-serif}.sense-summary h3{font-size:20px;line-height:26px;margin:0;font-weight:600;white-space:nowrap}.sense-summary p{font-size:16px;color:#727272;line-height:24px;margin:0}
</style>
