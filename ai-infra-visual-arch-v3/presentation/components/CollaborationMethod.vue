<template>
<div class="method-page">
<header><small>人机协同方法 / HUMAN–AGENT COLLABORATION</small><h1>聚焦问题，理解证据，介入并验证</h1><p>人明确判断与行动，Agent 组织证据并执行；阶段成果持续传递，必要时返回核查。</p></header>
<svg viewBox="0 0 1440 720" role="img" aria-label="Focus、Uncover、Intervene 三钻人机协同方法及返回核查闭环">
<defs><marker id="method-return" markerWidth="10" markerHeight="10" refX="8" refY="5" orient="auto"><path d="M1 1L8 5L1 9" fill="none" stroke="#929ba4" stroke-width="1.6"/></marker></defs>
<g font-family="sans-serif" fill="#17242e">
<g v-for="(s,i) in stages" :key="s.name" :transform="`translate(${35+i*460},100) translate(195,195) scale(1.05) translate(-195,-195)`">
<path d="M0 195 Q0 175 20 155 L150 25 Q195 -20 240 25 L370 155 Q390 175 390 195 Z" :fill="i===1 ? '#ebebed' : '#f5f6f8'"/>
<path d="M0 195 H390 Q390 215 370 235 L240 365 Q195 410 150 365 L20 235 Q0 215 0 195 Z" :fill="i===1 ? '#f5f6f8' : '#ebebed'"/>
<path d="M20 155 L150 25 Q195 -20 240 25 L370 155 M370 235 L240 365 Q195 410 150 365 L20 235" fill="none" stroke="#fff" stroke-width="2.6"/>
<path v-if="i===0" d="M20 155 Q-20 195 20 235" fill="none" stroke="#fff" stroke-width="2.6"/>
<path v-if="i===2" d="M370 155 Q410 195 370 235" fill="none" stroke="#fff" stroke-width="2.6"/>
<g text-anchor="middle">
<g v-for="(role,j) in (i===1 ? ['agent','human'] : ['human','agent'])" :key="role" :transform="`translate(195,${j===0?55:330})`">
<g v-if="role==='human'" fill="#000"><circle cy="-4" r="8"/><ellipse cy="11" rx="14" ry="7"/></g>
<g v-else><circle r="16" fill="#000"/><path d="M-6 -3V3M6 -3V3" stroke="#fff" stroke-width="4" stroke-linecap="round"/></g>
<text :y="j===0?78:-52" style="font-size:19px">{{role==='human'?s.human:s.agent}}</text>
</g>
<g :transform="`translate(${i===0?96:i===1?72:62},174) scale(1.5)`" fill="none" stroke="#17242e" stroke-width="1.45" stroke-linecap="round" stroke-linejoin="round" v-html="stageIcons[i]"/><text x="195" y="204" style="font-size:30px" font-weight="500">{{s.name}}</text>
</g></g>

<path d="M-30 295 H-14 Q-1 295 8.45 285.55 L182.75 111.25 Q230 64 277.25 111.25 L642.75 476.75 Q690 524 737.25 476.75 L1102.75 111.25 Q1150 64 1197.25 111.25 L1371.55 285.55 Q1381 295 1394 295 H1420" fill="none" stroke="#bfc1c3" stroke-width="2"/>
<g v-for="x in [460,920]" :key="x" :transform="`translate(${x},295)`"><circle r="25" fill="#f0f1f3"/><path d="M-11 -11L11 11M-11 11L11 -11" fill="none" stroke="#17242e" stroke-width="2"/></g>
<g v-for="(s,i) in outputs" :key="s.title" :transform="`translate(${230+i*460},550)`" text-anchor="middle"><text style="font-size:23px" font-weight="600">{{s.title}}</text><text y="32" style="font-size:18px" fill="#677482">{{s.detail}}</text></g>
<g fill="none" stroke="#929ba4" stroke-width="1.8" stroke-dasharray="6 7" marker-end="url(#method-return)">
<path d="M690 598 V614 Q690 628 676 628 H244 Q230 628 230 614 V598"/>
<path d="M1150 598 V678 Q1150 692 1136 692 H704 Q690 692 690 678 V654"/>
</g>
<g text-anchor="middle" style="font-size:19px" fill="#677482"><rect x="320" y="612" width="280" height="32" fill="#f0f1f3"/><text x="460" y="635">调查范围不对 / 证据不足</text><rect x="772" y="676" width="296" height="32" fill="#f0f1f3"/><text x="920" y="699">验证不符合预期 / 返回核查</text></g>
</g></svg></div>
</template>
<script setup>
const outputs=[{title:'调查任务',detail:'判断问题 · 对象与范围 · 候选证据'},{title:'证据支持的判断',detail:'关系与解释 · 依据 · 待核查疑点'},{title:'行动与复核记录',detail:'执行结果 · 验证结论 · 保留上下文'}]
const stageIcons=["<path d=\"M8 3H3v5m13-5h5v5m0 8v5h-5m-8 0H3v-5M12 9v6m-3-3h6\"/>", "<circle cx=\"12\" cy=\"6\" r=\"2\"/><circle cx=\"6\" cy=\"17\" r=\"2\"/><circle cx=\"18\" cy=\"17\" r=\"2\"/><path d=\"m11 8-4 7m6-7 4 7M8 17h8\"/>", "<path d=\"M3 12h17m-6-6 6 6-6 6\"/>"]
const basisIcons=["<path d=\"M12 6c-2-2-5-2.5-8-2v14c3-.5 6 0 8 2 2-2 5-2.5 8-2V4c-3-.5-6 0-8 2v14\"/>", "<rect x=\"6\" y=\"6\" width=\"12\" height=\"12\" rx=\"2\"/><rect x=\"9\" y=\"9\" width=\"6\" height=\"6\" rx=\"1\"/><path d=\"M9 3v3m6-3v3M9 18v3m6-3v3M3 9h3m-3 6h3m12-6h3m-3 6h3\"/>", "<path d=\"M2.5 12s3.5-5.5 9.5-5.5 9.5 5.5 9.5 5.5-3.5 5.5-9.5 5.5S2.5 12 2.5 12Z\"/><circle cx=\"12\" cy=\"12\" r=\"2.5\"/>"]
const principleIcons=["<path d=\"M5 3h14v18H5zM8 13l2 2 5-5\"/>", "<path d=\"M3 5h18l-7 8v5l-4 2v-7z\"/>", "<path d=\"M3 6h18M3 12h18M3 18h18M8 3v6m8 0v6m-7 0v6\"/>"]
const bases=[{name:'领域知识',desc:'多对象 · 跨层级 · 语义关系',impact:'决定需要表达什么'},{name:'计算机制',desc:'计算通信 · 时序状态 · 资源映射',impact:'决定关系如何变化'},{name:'认知机制',desc:'视觉感知 · 空间理解 · 判断任务',impact:'决定人如何理解'}]
const stages=[{name:'Focus',human:'表达意图 · 限定范围',agent:'匹配知识 · 检索候选证据',result:'调查对象与判断问题',color:'#c19cf0'},{name:'Uncover',human:'比较关系 · 核查解释',agent:'追踪映射 · 组织视图与假设',result:'证据支持的解释与疑点',color:'#9189ed'},{name:'Intervene',human:'调整条件 · 决定下一步',agent:'继承上下文 · 执行与验证',result:'可执行、可复核的任务',color:'#d9f550'}]
const foundations=[{name:'逻辑',main:'领域对象 · 跨层映射 · 计算机制',detail:'问题与证据约束表达推导'},{name:'表达',main:'原子图元 · Pattern · 无限画布',detail:'多维度分层交互 · 对象身份与上下文'},{name:'能力',main:'Agent / Skill · 工程编排与验证',detail:'数据绑定 · 渲染交互 · 来源与版本'}]
const principles=[{name:'证据驱动',desc:'按判断需要展开证据',color:'#c19cf0'},{name:'认知减负',desc:'选择最小充分的表达',color:'#9189ed'},{name:'协同控制',desc:'支持核查、调整与交接',color:'#d9f550'}]
</script>

<style scoped>
.method-page{width:100%;height:100%;padding:26px 30px 12px;background:#f0f1f3;box-sizing:border-box}header small{font-size:15px;letter-spacing:2px;color:#677482}header h1{font-size:38px;margin:16px 0 10px;line-height:1.2;font-weight:600}header p{font-size:19px;color:#677482;margin:0}svg{width:100%;height:calc(100% - 130px);display:block;overflow:visible}
</style>
