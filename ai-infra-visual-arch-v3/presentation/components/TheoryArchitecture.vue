<template>
<svg viewBox="-20 -27 1360 790" role="img" aria-label="以 Agent 为执行主线的人机协同视觉设计架构">
<defs><linearGradient id="theory-line-fade" gradientUnits="userSpaceOnUse" x1="125" y1="0" x2="1345" y2="0"><stop offset="0" stop-color="#bfc1c3" stop-opacity="0"/><stop offset=".035" stop-color="#bfc1c3"/><stop offset=".965" stop-color="#bfc1c3"/><stop offset="1" stop-color="#bfc1c3" stop-opacity="0"/></linearGradient><marker id="theory-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8" fill="none" stroke="#82909d"/></marker></defs>
<g font-family="sans-serif" fill="#17242e">
<rect x="150" y="0" width="1170" height="70" rx="12" fill="#e7def4"/>
<text x="0" y="41" style="font-size:18px" font-weight="600">体验目标</text><text x="735" y="43" text-anchor="middle" style="font-size:23px" font-weight="600">从「传统计算领域视觉组织与呈现」转向「复杂计算系统的认知与决策辅助」</text>
<text x="0" y="123" style="font-size:18px" font-weight="600">设计依据</text>
<g v-for="(item,i) in bases" :key="item.name" :transform="`translate(${150+i*390},80)`">
<rect width="365" height="76" rx="12" fill="#e4e6eb"/>
<g transform="translate(18,13)" fill="none" stroke="#34434e" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round" v-html="basisIcons[i]"/><text x="52" y="31" style="font-size:20px" font-weight="600">{{item.name}}</text>
<text x="18" y="54" style="font-size:14px" fill="#53616f">{{item.desc}}</text>

</g>
<g v-for="(s,i) in stages" :key="s.name" :transform="`translate(${150+i*390},231) translate(195,195) scale(.86) translate(-195,-195)`">
<path d="M0 195 Q0 175 20 155 L150 25 Q195 -20 240 25 L370 155 Q390 175 390 195 Z" :fill="i===1 ? '#ebebed' : '#f5f6f8'"/>
<path d="M0 195 H390 Q390 215 370 235 L240 365 Q195 410 150 365 L20 235 Q0 215 0 195 Z" :fill="i===1 ? '#f5f6f8' : '#ebebed'"/>
<path d="M20 155 L150 25 Q195 -20 240 25 L370 155 M370 235 L240 365 Q195 410 150 365 L20 235" fill="none" stroke="#fff" stroke-width="2.6"/>
<path v-if="i===0" d="M20 155 Q-20 195 20 235" fill="none" stroke="#fff" stroke-width="2.6"/>
<path v-if="i===2" d="M370 155 Q410 195 370 235" fill="none" stroke="#fff" stroke-width="2.6"/>
<g text-anchor="middle">
<g v-for="(role,j) in (i===1 ? ['agent','human'] : ['human','agent'])" :key="role" :transform="`translate(195,${j===0?55:330})`">
<g v-if="role==='human'" fill="#000"><circle cy="-4" r="8"/><ellipse cy="11" rx="14" ry="7"/></g>
<g v-else><circle r="16" fill="#000"/><path d="M-6 -3V3M6 -3V3" stroke="#fff" stroke-width="4" stroke-linecap="round"/></g>
<text :y="j===0?78:-52" style="font-size:16px">{{role==='human'?s.human:s.agent}}</text>
</g>
<g :transform="`translate(${i===0?96:i===1?72:62},174) scale(1.5)`" fill="none" stroke="#17242e" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round" v-html="stageIcons[i]"/><text x="195" y="204" style="font-size:30px" font-weight="500">{{s.name}}</text>
</g></g>
<path d="M125 426 H140 Q150 426 157.1 418.9 L299.2 276.8 Q345 231 390.8 276.8 L689.2 575.2 Q735 621 780.8 575.2 L1079.2 276.8 Q1125 231 1170.8 276.8 L1312.9 418.9 Q1320 426 1330 426 H1345" fill="none" stroke="url(#theory-line-fade)" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/>
<g v-for="(s,i) in stages" :key="s.result" :transform="`translate(${345+i*390},617)`"><text text-anchor="middle" style="font-size:13px" fill="#677482">{{s.result}}</text></g>
<text x="0" y="325" style="font-size:18px" font-weight="600">三钻模型</text><text x="0" y="353" style="font-size:13px" fill="#677482"><tspan x="0">可循环的人机协同</tspan><tspan x="0" dy="21">分析机制</tspan></text>
<g v-for="(x,i) in [540,930]" :key="x" :transform="`translate(${x},426)`"><circle r="25" fill="#f0f1f3"/><path d="M-10 -10L10 10M-10 10L10 -10" stroke="#000" stroke-width="1.8" fill="none"/></g>
<g v-for="(s,i) in principles" :key="s.name" :fill="i<2 ? '#fff' : '#17242e'" :style="{color:i<2 ? '#fff' : '#17242e'}" :transform="`translate(${150+i*390},166)`"><rect width="365" height="72" rx="12" :fill="s.color"/><g transform="translate(18,13)" fill="none" stroke="currentColor" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round" v-html="principleIcons[i]"/><text x="52" y="31" style="font-size:20px" font-weight="600">{{s.name}}</text><text x="18" y="56" style="font-size:15px">{{s.desc}}</text></g>
<text x="0" y="207" style="font-size:18px" font-weight="600">设计原则</text>
<text x="0" y="677" style="font-size:18px" font-weight="600">落地实现</text>
<g v-for="(item,i) in foundations" :key="item.name" :transform="`translate(${150+i*390},637)`">
<rect width="365" height="102" rx="12" fill="#e4e6eb"/>
<text x="18" y="31" style="font-size:20px" font-weight="600">{{item.name}}</text>
<text x="18" y="59" style="font-size:15px">{{item.main}}</text>
<text x="18" y="84" style="font-size:13px" fill="#677482">{{item.detail}}</text>
</g>
</g></svg>
</template>
<script setup>
const stageIcons=["<path d=\"M8 3H3v5m13-5h5v5m0 8v5h-5m-8 0H3v-5M12 9v6m-3-3h6\"/>", "<circle cx=\"12\" cy=\"6\" r=\"2\"/><circle cx=\"6\" cy=\"17\" r=\"2\"/><circle cx=\"18\" cy=\"17\" r=\"2\"/><path d=\"m11 8-4 7m6-7 4 7M8 17h8\"/>", "<path d=\"M3 12h17m-6-6 6 6-6 6\"/>"]
const basisIcons=["<path d=\"M12 6c-2-2-5-2.5-8-2v14c3-.5 6 0 8 2 2-2 5-2.5 8-2V4c-3-.5-6 0-8 2v14\"/>", "<rect x=\"6\" y=\"6\" width=\"12\" height=\"12\" rx=\"2\"/><rect x=\"9\" y=\"9\" width=\"6\" height=\"6\" rx=\"1\"/><path d=\"M9 3v3m6-3v3M9 18v3m6-3v3M3 9h3m-3 6h3m12-6h3m-3 6h3\"/>", "<path d=\"M2.5 12s3.5-5.5 9.5-5.5 9.5 5.5 9.5 5.5-3.5 5.5-9.5 5.5S2.5 12 2.5 12Z\"/><circle cx=\"12\" cy=\"12\" r=\"2.5\"/>"]
const principleIcons=["<path d=\"M5 3h14v18H5zM8 13l2 2 5-5\"/>", "<path d=\"M3 5h18l-7 8v5l-4 2v-7z\"/>", "<path d=\"M3 6h18M3 12h18M3 18h18M8 3v6m8 0v6m-7 0v6\"/>"]
const bases=[{name:'领域知识',desc:'多对象 · 跨层级 · 语义关系',impact:'决定需要表达什么'},{name:'计算机制',desc:'计算通信 · 时序状态 · 资源映射',impact:'决定关系如何变化'},{name:'认知机制',desc:'视觉感知 · 空间理解 · 判断任务',impact:'决定人如何理解'}]
const stages=[{name:'Focus',human:'表达意图 · 限定范围',agent:'匹配知识 · 检索候选证据',result:'调查对象与判断问题',color:'#c19cf0'},{name:'Uncover',human:'比较关系 · 核查解释',agent:'追踪映射 · 组织视图与假设',result:'证据支持的解释与疑点',color:'#9189ed'},{name:'Intervene',human:'调整条件 · 决定下一步',agent:'继承上下文 · 执行与验证',result:'可执行、可复核的任务',color:'#d9f550'}]
const foundations=[{name:'逻辑',main:'领域对象 · 跨层映射 · 计算机制',detail:'问题与证据约束表达推导'},{name:'表达',main:'原子图元 · Pattern · 无限画布',detail:'多维度分层交互 · 对象身份与上下文'},{name:'能力',main:'Agent / Skill · 工程编排与验证',detail:'数据绑定 · 渲染交互 · 来源与版本'}]
const principles=[{name:'证据驱动',desc:'按判断需要展开证据',color:'#c19cf0'},{name:'认知减负',desc:'选择最小充分的表达',color:'#9189ed'},{name:'协同控制',desc:'支持核查、调整与交接',color:'#d9f550'}]
</script>
