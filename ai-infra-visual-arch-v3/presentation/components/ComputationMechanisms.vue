<script setup>
const emit=defineEmits(['open-hardware'])
// Relative causal comparison, not sampled trace. Equal compute intervals;
// both inputs are ready at the same point, while resource availability differs.
const cases=[{name:'A · 资源及时可用',y:493,start:140,end:440},{name:'B · 资源排队延迟',y:594,start:330,end:630}]
const origin=440,ready=140
const lanes=['数据就绪','资源状态','AIC 计算']
const constraints=[{name:'访存',x:250,y:187},{name:'通信',x:435,y:187},{name:'同步',x:250,y:268},{name:'调度',x:435,y:268}]
</script>
<template>
<g class="mechanism-scene" aria-label="计算机制、执行映射与运行结果：五类机制相互制约，执行等待影响完成时延">
<defs>
<marker id="mechanism-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto"><path d="M1 1L9 5L1 9" fill="none" stroke="var(--line-color)" stroke-width="1.5"/></marker>
<pattern id="mechanism-wait" width="7" height="7" patternUnits="userSpaceOnUse"><rect width="3" height="7" fill="#aaa"/></pattern>
</defs>
<rect x="40" y="174" width="1240" height="137" rx="16" class="panel"/>
<text x="60" y="202" class="section">01 / 计算机制</text><text x="60" y="227" class="muted">什么决定开始执行？</text>
<!-- Integrate the accepted mutual-constraint graph into the restored first band. -->
<g class="constraint-links"><path d="M290 215L475 268M290 268L475 215"/></g>
<g v-for="item in constraints" :key="item.name" :transform="`translate(${item.x},${item.y})`"><rect width="80" height="28" rx="5" fill="#eee"/><text x="40" y="19" text-anchor="middle" class="constraint">{{item.name}}</text></g>
<rect x="342" y="228" width="80" height="27" rx="5" class="compute"/><text x="382" y="247" text-anchor="middle" class="constraint">计算</text>
<text x="548" y="245" class="small">相互制约</text>
<path d="M620 242H650" class="dependency"/>
<text x="714" y="207" text-anchor="middle" class="small">数据就绪</text><circle cx="714" cy="220" r="4" fill="#888"/>
<text x="714" y="290" text-anchor="middle" class="small">资源可用</text><circle cx="714" cy="273" r="4" fill="#888"/>
<path d="M718 220H767V242H805M718 273H767V242M915 242H950M1100 242H1140" class="dependency"/>
<rect x="805" y="222" width="110" height="40" rx="5" fill="#eee"/><text x="860" y="247" text-anchor="middle" class="constraint">依赖满足</text>
<rect x="950" y="222" width="150" height="40" rx="5" class="compute"/><text x="1025" y="247" text-anchor="middle" class="constraint">计算执行</text>
<text x="1160" y="246" class="strong">结果可用</text>
<rect x="40" y="326" width="1240" height="151" rx="16" class="panel"/>
<text x="60" y="355" class="section">02 / 执行映射</text><text x="60" y="380" class="muted">任务在哪里执行？</text>
<rect x="232" y="355" width="175" height="36" rx="5" class="compute"/><text x="319" y="378" text-anchor="middle" class="constraint">计算逻辑</text>
<rect x="435" y="355" width="90" height="36" rx="5" class="compute"/><text x="480" y="378" text-anchor="middle" class="constraint">任务</text>
<path d="M407 373H435" class="dependency"/><text x="408" y="343" class="small" text-anchor="middle">拆分为任务</text>
<path d="M525 373H584V386H610M584 373H855" class="mapping"/>
<g class="core-container" aria-label="Core 计算资源">
<g class="hardware-trigger" role="button" tabindex="0" aria-label="查看 Core 硬件执行结构" @click.stop="emit('open-hardware','Core')" @keydown.enter.stop.prevent="emit('open-hardware','Core')" @keydown.space.stop.prevent="emit('open-hardware','Core')">
<title>查看 Core 硬件执行结构</title>
<rect x="610" y="333" width="220" height="137" rx="8" class="core-surface"/>
<text x="621" y="350" class="core-title">Core</text>
<rect x="625" y="365" width="190" height="40" rx="3" class="compute"/><text x="720" y="390" text-anchor="middle" class="core-label">AIC · 矩阵计算</text>
<rect x="625" y="416" width="190" height="40" rx="3" class="compute"/><text x="720" y="441" text-anchor="middle" class="core-label">AIV · 向量计算</text>
</g></g>
<g transform="translate(855,352)"><rect width="175" height="42" rx="6" class="soft"/><text x="88" y="19" class="node dark">存储 / 搬运</text><text x="88" y="34" class="small" text-anchor="middle">数据驻留与搬运</text></g>
<path d="M525 373H570V464H1122V394" class="mapping"/>
<g transform="translate(1060,352)"><rect width="175" height="42" rx="6" class="soft"/><text x="88" y="19" class="node dark">通信资源</text><text x="88" y="34" class="small" text-anchor="middle">跨设备交换</text></g>
<g transform="translate(0,45)">
<rect x="40" y="447" width="1240" height="229" rx="16" class="panel"/>
<text x="60" y="477" class="section">03 / 运行结果</text><text x="60" y="503" class="muted">相同计算，不同资源等待</text>
<g v-for="item in cases" :key="item.name">
<text x="270" :y="item.y-18" class="strong">{{item.name}}</text>
<g v-for="(lane,i) in lanes" :key="lane"><text x="420" :y="item.y+5+i*22" text-anchor="end" class="small">{{lane}}</text></g>
<path :d="`M440 ${item.y-9}V${item.y+52}H1190`" class="lane"/>
<path :d="`M${origin+ready} ${item.y-9}V${item.y+52}`" class="event"/><circle :cx="origin+ready" :cy="item.y" r="5" fill="#888"/>
<rect :x="origin" :y="item.y+15" :width="item.start" height="14" rx="3" fill="#ddd"/>
<rect v-if="item.start>ready" :x="origin+ready" :y="item.y+37" :width="item.start-ready" height="14" fill="url(#mechanism-wait)"/>
<rect :x="origin+item.start" :y="item.y+37" :width="item.end-item.start" height="14" rx="2" class="compute"/>
<text :x="origin+(item.start+item.end)/2" :y="item.y+49" text-anchor="middle" class="small dark">计算</text>
<path :d="`M${origin+item.end} ${item.y+33}V${item.y+55}`" stroke="var(--line-color)" stroke-width="1.5"/>
</g>
<g v-for="(item,i) in [{label:'资源占用',fill:'#ddd'},{label:'排队等待',fill:'url(#mechanism-wait)'}]" :key="item.label" :transform="`translate(60,${623+i*24})`"><rect width="16" height="8" y="-7" rx="1" :fill="item.fill"/><text x="23" class="small">{{item.label}}</text></g>
<path d="M880 549V669H1070V650" class="delta"/><text x="975" y="662" text-anchor="middle" class="small dark">完成延迟 Δt</text><text x="1200" y="649" class="small">时间 →</text>
<text x="660" y="711" text-anchor="middle" class="conclusion">以计算与硬件约束为基础，关联执行行为和运行证据，解释性能差异的形成机制。</text>
</g>
</g>
</template>
<style scoped>
.mechanism-scene{--compute-color:#def46c;--line-color:#d8dadd;font-family:Inter,'PingFang SC',sans-serif;fill:#202020}.panel{fill:white}.section{font-size:18px;font-weight:600}.muted{font-size:13px;fill:#777}.strong{font-size:14px;font-weight:600}.small{font-size:12px;fill:#777}.constraint{font-size:14px}.constraint-links{fill:none;stroke:var(--line-color);stroke-width:1.3;stroke-dasharray:5 4}.node{font-size:13px;text-anchor:middle}.soft{fill:#efefef}.dark{fill:#222}.dependency{fill:none;stroke:var(--line-color);stroke-width:1.4;marker-end:url(#mechanism-arrow)}.mapping{fill:none;stroke:var(--line-color);stroke-width:1.2;stroke-dasharray:3 4}.lane{fill:none;stroke:var(--line-color);stroke-width:1}.event{fill:none;stroke:var(--line-color);stroke-width:1;stroke-dasharray:2 3}.delta{fill:none;stroke:var(--line-color);stroke-width:1}.conclusion{font-size:17px;font-weight:500}
.hardware-trigger{cursor:pointer}.hardware-trigger:focus{outline:none!important}.compute{fill:var(--compute-color)}.core-surface{fill:#efefef}.core-title{font-size:12px;font-weight:600}.core-label{font-size:12px}.hardware-trigger:hover .core-surface,.hardware-trigger:focus-visible .core-surface{fill:#e3e3e3}.hardware-trigger:focus-visible text{text-decoration:underline}
</style>
