<script setup>
import KnowledgeGlyph from './KnowledgeGlyph.vue'
// Causal comparison, not measured trace: equal compute work, relative event order only.
// Input transfer and inter-device receive can overlap. Dispatch waits for both data
// readiness and resource availability; synchronization is a dependency gate, not a core.
const cases=[
 {name:'供给及时 · 资源可用',y:477,transfer:[0,190],comm:[15,145],queue:[0,90],start:190,end:390},
 {name:'供给延后 · 资源排队',y:579,transfer:[0,280],comm:[15,240],queue:[0,330],start:330,end:530},
]
const origin=610
const lanes=['搬运 / 通信','资源队列','AIC 计算']
</script>
<template>
<g class="mechanism-scene" aria-label="计算机制、执行映射与运行结果：相同计算量在数据依赖与资源约束下形成不同延迟">
<defs>
 <marker id="mechanism-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M1 1L9 5L1 9" fill="none" stroke="#777" stroke-width="1.5"/></marker>
 <pattern id="mechanism-wait" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M-1 1L1 -1M0 6L6 0M5 7L7 5" stroke="#c2c2c2" stroke-width="1"/></pattern>
</defs>
<!-- 01: a dependency graph, not a row of independent icons. -->
<rect x="40" y="174" width="1240" height="137" rx="16" class="panel"/>
<text x="60" y="202" class="section">01 / 计算机制</text>
<text x="60" y="227" class="muted">什么决定开始执行？</text>
<g class="dependency">
 <path d="M400 210H450M400 270H450M590 210H650V240H690M590 270H650V240M830 240H890M1030 240H1080"/>
 <path d="M960 275V260"/>
</g>
<g transform="translate(260,192)"><rect width="140" height="36" rx="18" class="capsule"/><text x="70" y="24" class="node">访存 · GM → 片上</text></g>
<g transform="translate(260,252)"><rect width="140" height="36" rx="18" class="comm"/><text x="70" y="24" class="node">通信 · 跨设备输入</text></g>
<g transform="translate(450,192)"><rect width="140" height="36" rx="18" class="soft"/><text x="70" y="24" class="node dark">本地数据就绪</text></g>
<g transform="translate(450,252)"><rect width="140" height="36" rx="18" class="soft"/><text x="70" y="24" class="node dark">远端数据就绪</text></g>
<g transform="translate(690,220)"><rect width="140" height="40" rx="20" class="capsule"/><text x="70" y="26" class="node">同步 · 依赖满足</text></g>
<g transform="translate(890,220)"><rect width="140" height="40" rx="20" class="compute"/><text x="70" y="26" class="node dark">计算 · MatMul</text></g>
<text x="1110" y="235" class="strong">结果可用</text><text x="1110" y="257" class="muted">交给后续任务</text>
<text x="678" y="205" class="small">输入共同约束</text>
<rect x="705" y="275" width="360" height="28" rx="14" class="soft"/><text x="885" y="294" text-anchor="middle" class="small dark">资源调度 · 排队后获得可用计算资源</text>
<!-- 02: retain cross-layer mapping as a subordinate resource binding. -->
<rect x="40" y="326" width="1240" height="106" rx="16" class="panel"/>
<text x="60" y="355" class="section">02 / 执行映射</text><text x="60" y="380" class="muted">任务在哪里执行？</text>
<g transform="translate(313,373) scale(.75)"><KnowledgeGlyph label="Operator"/></g>
<g transform="translate(480,373) scale(.75)"><KnowledgeGlyph label="Task"/></g>
<path d="M365 373H420" class="dependency"/><text x="392" y="354" class="small" text-anchor="middle">编译 / 任务拆分</text>
<path d="M540 373H584V350H620M584 373V402H620M584 373H855" class="mapping"/>
<g transform="translate(620,337)"><rect width="195" height="28" rx="6" class="soft"/><text x="98" y="19" class="small dark" text-anchor="middle">AIC · 矩阵计算</text></g>
<g transform="translate(620,389)"><rect width="195" height="28" rx="6" class="soft"/><text x="98" y="19" class="small dark" text-anchor="middle">AIV · 向量后处理</text></g>
<g transform="translate(855,352)"><rect width="175" height="42" rx="6" class="soft"/><text x="88" y="19" class="node dark">Memory / DMA</text><text x="88" y="34" class="small" text-anchor="middle">数据驻留与搬运</text></g>
<path d="M540 373H570V422H1122V394" class="mapping"/>
<g transform="translate(1060,352)"><rect width="175" height="42" rx="6" class="soft"/><text x="88" y="19" class="node dark">通信资源</text><text x="88" y="34" class="small" text-anchor="middle">跨设备交换</text></g>
<!-- 03: aligned evidence with equal compute duration and different start times. -->
<rect x="40" y="447" width="1240" height="229" rx="16" class="panel"/>
<text x="60" y="477" class="section">03 / 运行结果</text>
<text x="60" y="503" class="muted">同一 MatMul</text><text x="60" y="525" class="muted">计算区间相同</text>
<text x="60" y="562" class="strong">开始时间不同</text><text x="60" y="585" class="muted">数据就绪 + 资源可用</text>
<text x="60" y="622" class="small">Trace 关联：Task ID · 资源 · 起止事件</text>
<g v-for="(item,index) in cases" :key="item.name">
 <text x="270" :y="item.y+4" class="strong">{{item.name}}</text>
 <g v-for="(lane,i) in lanes" :key="lane"><text x="585" :y="item.y+5+i*22" text-anchor="end" class="small">{{lane}}</text><path :d="`M610 ${item.y+i*22}H1190`" class="lane"/></g>
 <rect :x="origin+item.transfer[0]" :y="item.y-8" :width="item.transfer[1]" height="7" rx="2" fill="#929292"/>
 <rect :x="origin+item.comm[0]" :y="item.y+1" :width="item.comm[1]" height="7" rx="2" fill="#ccc"/>
 <rect :x="origin" :y="item.y+15" :width="item.queue[1]" height="14" fill="url(#mechanism-wait)"/>
 <rect :x="origin+item.queue[1]" :y="item.y+37" :width="item.start-item.queue[1]" height="14" fill="url(#mechanism-wait)"/>
 <rect :x="origin+item.start" :y="item.y+37" :width="item.end-item.start" height="14" rx="2" class="compute"/>
 <text :x="origin+item.start+100" :y="item.y+48" text-anchor="middle" class="small dark">MatMul</text>
 <path :d="`M${origin+item.start} ${item.y+9}V${item.y+36}`" class="event"/>
 <path :d="`M${origin+item.end} ${item.y-10}V${item.y+53}`" class="event"/>
 <text :x="origin+item.end+9" :y="item.y+49" class="small">完成</text>
</g>
<g v-for="(item,i) in [{label:'搬运',fill:'#929292'},{label:'通信',fill:'#ccc'},{label:'等待',fill:'url(#mechanism-wait)'},{label:'计算',fill:'#def46c'}]" :key="item.label" :transform="`translate(${270+i*78},650)`"><rect width="16" height="8" y="-7" rx="1" :fill="item.fill"/><text x="22" class="small">{{item.label}}</text></g>
<path d="M1000 530V661M1140 632V661M1000 657H1140" class="delta"/>
<text x="1070" y="650" text-anchor="middle" class="small dark">总时延增加</text>
<path d="M610 666H1190" class="lane"/><text x="1210" y="669" class="small">时间 →</text>
<text x="660" y="711" text-anchor="middle" class="conclusion">以计算与硬件约束为基础，关联执行行为和运行证据，解释性能差异的形成机制。</text>
</g>
</template>
<style scoped>
.mechanism-scene{font-family:Inter,'PingFang SC',sans-serif;fill:#202020}.panel{fill:white}.section{font-size:18px;font-weight:600}.muted{font-size:13px;fill:#777}.strong{font-size:14px;font-weight:600}.small{font-size:12px;fill:#777}.capsule{fill:#555}.comm{fill:#555;stroke:#888;stroke-dasharray:4 3}.node{font-size:13px;fill:#fff;text-anchor:middle}.soft{fill:#efefef}.compute{fill:#def46c}.dark{fill:#222}.dependency{fill:none;stroke:#888;stroke-width:1.4;marker-end:url(#mechanism-arrow)}.mapping{fill:none;stroke:#aaa;stroke-width:1.2;stroke-dasharray:3 4}.lane{fill:none;stroke:#e1e1e1;stroke-width:1}.event{fill:none;stroke:#888;stroke-width:1;stroke-dasharray:2 3}.delta{fill:none;stroke:#999;stroke-width:1}.conclusion{font-size:17px;font-weight:500}
</style>
