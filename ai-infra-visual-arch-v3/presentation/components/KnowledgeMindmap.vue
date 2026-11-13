<script setup>
import {ref} from 'vue'
const selected=ref(-1)
const domains=[
 {name:'模型与算法',groups:['Model · Layer · Module','Attention · MLP · MoE','Loss · Optimizer · Gradient','Token · Embedding · KV cache']},
 {name:'张量与算子',groups:['Tensor · Shape · dtype','Stride · Layout · View','MatMul · Reduce · Softmax','Broadcast · Slice · Transpose']},
 {name:'编译与内核',groups:['IR · Operation · SSA Value','Pass · Lowering · Fusion','Kernel · Function · Loop','Tile · Tiling · Codegen']},
 {name:'指令与存储',groups:['Instruction · DMA · MMA','MemRef · Allocation · Address','HBM · L2 · L1 · Register','Lifetime · Alias · Reuse']},
 {name:'硬件与集群',groups:['Core · Device · GPU / NPU','Rank · Process · Device binding','Node · Server · Rack','Compute unit · Memory hierarchy']},
 {name:'并行与通信',groups:['DP · TP · PP · EP','SP · CP · Shard · Replica','Collective · P2P · Comm group','AllReduce · AllGather · AllToAll']},
 {name:'任务与运行',groups:['Request · Batch · Schedule','Task · Stream · Queue','Event · Barrier · Dependency','Launch · Execute · Wait']},
 {name:'观测与证据',groups:['Trace · Span · Timestamp','Metric · Counter · Sample','IR dump · Log · Diagnostic','Build ID · Source map · Validation']},
]
</script>
<template>
<svg viewBox="0 0 1320 742" class="knowledge-map" aria-label="智能计算领域知识导图">
 <text x="40" y="66" class="headline">领域知识：从对象清单到知识关联</text>
 <text x="40" y="100" class="muted">八个可交叉的知识视角 · 点击分支聚焦 · 代表性概念，不作互斥分类</text>
 <g v-for="(d,i) in domains" :key="d.name" :opacity="selected<0||selected===i?1:.28">
  <path :d="`M${i<4?580:740} 384H${i<4?545:775}V${182+i%4*132}H${i<4?500:820}`" class="branch"/>
  <g :transform="`translate(${i<4?430:890},${182+i%4*132})`" role="button" tabindex="0" :aria-label="`聚焦${d.name}`" :aria-pressed="selected===i" @click="selected=selected===i?-1:i" @keydown.enter.prevent="selected=selected===i?-1:i" @keydown.space.prevent="selected=selected===i?-1:i">
   <title>点击聚焦，再次点击恢复全部分支</title>
   <rect x="-70" y="-22" width="140" height="44" rx="22" :fill="selected===i?'#fff':'#e4e6eb'"/><text y="5" text-anchor="middle" class="domain">{{d.name}}</text>
   <g v-for="(group,k) in d.groups" :key="group">
    <path :d="i<4?`M-70 0H-92V${-42+k*28}H-110`:`M70 0H92V${-42+k*28}H110`" class="twig"/>
    <text :x="i<4?-120:120" :y="-38+k*28" :text-anchor="i<4?'end':'start'" class="leaf">{{group}}</text>
   </g>
  </g>
 </g>
 <rect x="580" y="352" width="160" height="64" rx="14" fill="#fff"/><text x="660" y="379" text-anchor="middle" class="domain">智能计算</text><text x="660" y="399" text-anchor="middle" class="muted">领域知识</text>
 <text x="660" y="710" text-anchor="middle" class="muted">同一概念可以跨域出现；关系还包括包含、数据依赖、编译映射、资源绑定与证据引用。</text>
</svg>
</template>
<style scoped>
.knowledge-map{width:100%;height:100%;font-family:Inter,'PingFang SC',sans-serif;fill:#17242e}.headline{font-size:30px;font-weight:600}.muted{font-size:13px;fill:#657180}.domain{font-size:16px;font-weight:600}.leaf{font-size:12px}.branch{fill:none;stroke:#b69ad8;stroke-width:1.6}.twig{fill:none;stroke:#b8c0cb;stroke-width:1}g[role=button]{cursor:pointer}g[role=button]:focus-visible{outline:none}g[role=button]:focus-visible>.domain{text-decoration:underline;text-underline-offset:5px}
</style>
