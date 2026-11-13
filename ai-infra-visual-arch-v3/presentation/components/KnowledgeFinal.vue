<script setup>
import scenes from "./knowledgeSourceScenes.json"
const cards=[{title:"包含关系",hint:"Kernel 函数体包含 OP",scene:scenes.containment},{title:"数据依赖",hint:"值与操作的生产、消费",scene:scenes.data},{title:"编译映射",hint:"降级与融合",scene:null},{title:"证据引用",hint:"IR 不变量与运行记录",scene:scenes.facets[3]}]
</script>
<template>
<g class="source-relations"><g v-for="(card,i) in cards" :key="card.title" :transform="`translate(${i%2?668:40},${i<2?123:389})`"><rect width="612" height="250" rx="18" fill="#e4e6eb"/><text x="22" y="35" class="title">{{card.title}}</text><text x="588" y="34" text-anchor="end" class="hint">{{card.hint}}</text><image v-if="card.scene" :href="card.scene.href" x="24" y="64" width="562" height="165" preserveAspectRatio="xMidYMid meet"/><g v-else><text x="30" y="78" class="hint">一对多降级</text><text x="325" y="78" class="hint">多对一融合</text><image :href="scenes.facets[1].href" x="24" y="95" width="270" height="135" preserveAspectRatio="xMidYMid meet"/><image :href="scenes.facets[2].href" x="316" y="95" width="270" height="135" preserveAspectRatio="xMidYMid meet"/></g></g></g>
</template>
<style scoped>.title{font-size:21px;font-weight:600;fill:#17242e}.hint{font-size:12px;fill:#738096}</style>
