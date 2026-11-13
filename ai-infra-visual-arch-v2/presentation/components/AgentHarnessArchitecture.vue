<script setup>
import { computed, ref, nextTick } from 'vue'
const props = defineProps({ detail: Boolean })
const selected = ref('Tile')
const filePicker=ref(null), rawEvidence=ref({})
function escapeXml(v){return v.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('\"','&quot;')}
async function loadEvidence(e){const file=e.target.files?.[0];if(!file)return;const object=selected.value;rawEvidence.value={...rawEvidence.value,[object]:{name:file.name,text:await file.text()}};e.target.value=''}
const ink='#17242e', muted='#657381', gray='#e1e5ea', lime='#dbf35b', white='#fafbfc', human='#f5edc6', agent='#e4d9f1'
const objects={Source:['源码对象 · Source','检查 RMSNorm 定义与源码位置','待绑定：file / symbol / revision'],IR:['编译对象 · IR','检查降低结果与变换记录','待绑定：IR op / pass / build_id'],Tile:['调度对象 · Tile','检查分块、索引与数据范围','待绑定：tile_id / shape / build_id'],Memory:['存储对象 · Memory','检查地址映射、搬运与驻留','待绑定：buffer_id / memory scope'],Device:['设备对象 · Device','检查执行位置与设备上下文','待绑定：device_id / execution_id']}
function r(x,y,w,h,c=gray,rad=10){return `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${rad}" fill="${c}"/>`}
function t(x,y,v,size=16,c=ink,weight=400,anchor='start'){return `<text x="${x}" y="${y}" font-size="${size}" fill="${c}" font-weight="${weight}" text-anchor="${anchor}">${v}</text>`}
function line(d,dashed=false,arrow=true,c='#8e9ba8'){return `<path d="${d}" stroke="${c}" stroke-width="1.5" fill="none" ${dashed?'stroke-dasharray="5 4"':''} ${arrow?`marker-end="url(#ah-arrow-${props.detail?2:1})"`:''}/>`}
function card(x,y,w,h,title,sub,fill=white){return r(x,y,w,h,fill)+t(x+16,y+27,title,17,ink,600)+t(x+16,y+50,sub,13,muted)}
function tag(x,y,w,v,c=gray){return r(x,y,w,24,c,6)+t(x+10,y+17,v,12,ink,500)}
function heading(x,y,n,title,en){return t(x,y,title,20,ink,650)+t(x,y+22,en,12,muted)}
function selectable(x,y,w,h,name,sub){const active=selected.value===name;return `<g data-object="${name}" role="button" tabindex="0" aria-label="检查 ${name}" aria-pressed="${active}">`+r(x,y,w,h,active?lime:white,7)+t(x+14,y+26,name,17,ink,600)+t(x+14,y+46,sub,12,active?ink:muted)+`</g>`}
const svg=computed(()=>{
 let s=`<svg viewBox="0 0 1440 810" role="group" aria-label="${props.detail?'RMSNorm 诊断任务、计算对象映射与统一工作空间':'以语义和证据模型为中心的 AI Infra 诊断架构'}"><defs><marker id="ah-arrow-${props.detail?2:1}" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto"><path d="M0 0L7 3.5L0 7" fill="#8e9ba8"/></marker></defs>`
 s+=t(48,36,props.detail?'02 / AGENT-NATIVE HUMAN–AI INTERACTION':'01 / MULTI-LAYER AGENT EXECUTION',12,muted,600)
 s+=tag(1015,20,135,'人 · 委托 / 介入',human)+tag(1160,20,105,'Agent',agent)+tag(1275,20,117,'数据 / 系统',gray)
 s+=t(48,77,props.detail?'面向 AI 计算的 Agent-Native 人机交互架构':'AI Agent 多层循环计算架构',32,ink,650)
 s+=t(48,101,props.detail?'Agent-Native Human–AI Interaction Architecture for AI Computing':'Multi-Layer Agent Execution Architecture',16,muted)
 s+=t(48,126,props.detail?'定义计算对象、执行上下文、证据模型与可视化 Pattern 的关联机制，支持开发者与 Agent 协同调查、验证和干预。':'定义应用 Agent、Agent Runtime、LLM 与 AI Infra 四层执行循环，以及跨层能力依赖和不同尺度的状态推进。',15,muted)
 if(!props.detail){
  s+=r(48,148,298,106,human)+heading(65,177,'01','工程意图与控制','Engineer Intent')+t(65,224,'目标 · 范围 · 预算 · 完成依据',15)+t(65,244,'运行中可改约束、补充材料',12,muted)
  s+=r(405,148,987,106,agent)+heading(425,177,'02','Agent 编排','Agent Orchestration')+card(672,164,282,72,'Harness · 迭代执行','上下文 → 决策 → 工具 → 反馈',white)
  s+=t(985,189,'计划 / 子任务 / 进展检查',16,ink,550)+t(985,217,'调用模型与工具，直至完成、预算或阻塞',13,muted)+line('M346 208H405')+t(375,196,'委托',12,muted,400,'middle')+line('M1375 305V254',true)+t(1360,283,'介入：调整 / 暂停 / 接管',12,muted,400,'end')
  s+=r(48,305,298,329,gray)+heading(65,335,'04','基础设施采集','AI Infra Instrumentation')+card(65,383,264,69,'静态资料','Source / IR / Tile / Buffer')+card(65,465,264,69,'运行记录','Trace / Profile / Log / 实验产物')
  s+=t(65,569,'保留原始来源与采集条件',15,ink,550)+t(65,593,'build · execution · device · version',12,muted)
  s+=r(405,305,587,329,gray)+heading(425,335,'03','语义与证据模型','Semantic &amp; Evidence Model')
  s+=card(425,383,229,65,'Compute Object · 对象','有身份的源码 / IR / Tile / 设备')+card(741,383,231,65,'Execution · 执行','一次有上下文的工具或计算执行')+line('M741 414H654')+t(697,402,'作用于',12,muted,400,'middle')
  s+=card(741,487,231,65,'Observation · 观测','执行中记录的事实与采集条件')+line('M856 448V487')+t(866,472,'产生',12,muted)
  s+=card(425,487,229,65,'Evidence · 证据','可追溯的观测片段 / 原始产物')+line('M654 520H741')+t(697,508,'引用',12,muted,400,'middle')+line('M770 487V466H539V448',true)+t(659,460,'定位对象',11,muted,400,'middle')
  s+=r(425,579,547,39,white,7)+t(442,604,'Finding · 发现',16,ink,600)+t(615,604,'注明类型、适用对象与验证状态',13,muted)+line('M539 579V552')+t(550,570,'引用证据',12,muted)
  s+=line('M346 475H405')+t(376,451,'记录',12,muted,400,'middle')+t(376,467,'输入',12,muted,400,'middle')
  s+=line('M700 254V305')+t(713,279,'写入任务 / 工具执行记录',12,muted)
  s+=line('M992 343H1011V269H944V254',true)+t(1022,283,'提供证据供重规划',12,muted)
  s+=r(1052,305,340,329,human)+heading(1072,335,'05','专业诊断工作空间','Pattern-Driven Workspace')
  s+=tag(1072,377,92,'Operator',white)+tag(1172,377,94,'Training',white)+tag(1274,377,98,'Inference',white)+t(1072,433,'人 · 核查、介入与采纳',17,ink,600)
  s+=t(1072,468,'Object Navigation',16)+t(1072,497,'Cross-layer Trace',16)+t(1072,526,'Inspector',16)+t(1072,555,'Evidence Interaction',16)+t(1072,605,'三个领域复用上述交互能力',13,muted)
  s+=line('M992 473H1052')+t(1022,446,'视图',12,muted,400,'middle')+t(1022,463,'投影',12,muted,400,'middle')
  s+=t(48,671,'共享基础 / SHARED FOUNDATIONS',12,muted,600)
  s+=r(48,686,422,77,gray)+t(65,714,'Semantic Contract',18,ink,600)+t(65,741,'约束：采集身份、编排记录、语义关系、视图绑定',13)
  s+=r(482,686,435,77,gray)+t(499,714,'Interaction Contract',18,ink,600)+t(499,741,'工作空间：关联选择、原位展开、证据检查',13)
  s+=r(929,686,463,77,gray)+t(946,714,'Pattern Registry',18,ink,600)+t(946,741,'为工作空间提供视图；声明所需字段与交互',13)
 }else{
  s+=t(48,154,'诊断任务 / RMSNorm 性能诊断',17,ink,600)+t(1392,154,'尚未载入执行数据',12,muted,400,'end')
  const ns=[['Goal','界定 RMSNorm 问题',48,150,human],['Task','定位算子 / 选择对照',222,155,agent],['Tool Execution','读取 IR / 采集 Trace',401,183,agent],['Evidence','IR / Trace / 实验产物',608,174,gray],['Hypothesis','候选解释 · 待提出',806,174,agent],['Validation','同配置对照 · 待执行',1004,174,agent],['Finding','待形成的工程判断',1202,190,gray]]
  ns.forEach(([a,b,x,w,c])=>{s+=card(x,185,w,69,a,b,c)})
  ;[[198,222,'分解'],[377,401,'执行'],[584,608,'采集']].forEach(([a,b,v])=>{s+=line(`M${a} 218H${b}`)+t((a+b)/2,177,v,11,muted,400,'middle')})
  s+=line('M806 218H782')+t(794,177,'引用',11,muted,400,'middle')+line('M980 218H1004')+t(992,177,'检验',11,muted,400,'middle')+line('M1178 218H1202')+t(1190,177,'归纳',11,muted,400,'middle')
  s+=line('M1285 254V276H705V254',true)+t(930,270,'引用证据 · 可复用',12,muted,400,'middle')
  s+=line('M1091 254V302H299V254',true)+t(657,297,'不足则调整任务 / 重采集 / 再验证',12,muted,400,'middle')
  // A single object map lives inside the workspace, rather than repeating it above and below.
  s+=r(48,328,1344,424,gray)+r(48,328,1344,50,human)
  s+=t(68,360,'统一诊断工作空间',19,ink,650)+t(1372,360,'人 · 核查 / 补证 / 调整约束 / 暂停或接管',14,ink,500,'end')
  s+=r(64,390,223,344,white,7)+t(80,421,'Task Progress',17,ink,600)+t(80,449,'Agent 托管推进',13,muted)
  ;['明确 shape / dtype','关联 IR / Tile / Trace','构造对照并验证','评估修改与取舍'].forEach((v,i)=>{s+=t(80,493+i*43,`0${i+1}`,12,muted)+t(106,493+i*43,v,14)})
  s+=tag(80,691,188,'Task Status：待执行','#dce6ed')
  s+=r(299,390,629,344,white,7)+t(315,421,'Compute Graph',17,ink,600)+t(911,421,'点击对象 · 原位检查',12,muted,400,'end')
  const names=['Source','IR','Tile','Memory','Device'], subs=['RMSNorm 定义','归约 / 逐元素','行 / 归约维','Buffer / 驻留','执行位置'], gx=[315,435,555,675,795]
  names.forEach((v,i)=>{s+=selectable(gx[i],450,104,60,v,subs[i]);if(i<4)s+=line(`M${gx[i]+104} 480H${gx[i+1]}`,i===3)+t(gx[i]+112,530,['降低','分块','地址映射','运行定位'][i],11,muted,400,'middle')})
  s+=r(315,547,597,64,'#eff1f4',6)+t(328,572,objects[selected.value][1],15,ink,550)+t(328,595,objects[selected.value][2],12,muted)
  s+=t(315,649,'Execution Timeline',15,ink,600)+t(911,649,`${selected.value} · 无执行记录`,12,muted,400,'end')+line('M328 685H895',false,false)+line('M328 666V697',false,false)+t(350,679,'按 execution_id 定位时间区间',12,muted)
  s+=r(940,390,436,344,white,7)+t(956,421,'Evidence Inspector',17,ink,600)+t(956,460,objects[selected.value][0],16,ink,600)
  const raw=rawEvidence.value[selected.value]
  if(raw){s+=t(956,493,escapeXml(raw.name.slice(0,48)),12,muted)+`<foreignObject x="956" y="508" width="404" height="122"><div xmlns="http://www.w3.org/1999/xhtml" class="ah-raw" tabindex="0" aria-label="原始证据内容"><pre>${escapeXml(raw.text)}</pre></div></foreignObject>`}
  else s+=t(956,501,'原始材料 · 来源版本 · 采集条件',14,muted)+t(956,528,'此对象暂无关联证据',13,muted)
  s+=`<g data-evidence="true" role="button" tabindex="0" aria-label="载入并检查原始证据">`+r(956,raw?704:555,404,29,'#e8ebef',5)+t(968,raw?723:574,raw?'替换此对象的原始证据':'载入并检查原始证据 · 本机文本文件',12,ink,550)+'</g>'
  s+=tag(956,652,190,'Finding Type：未归类','#e3e8ed')+tag(1154,652,206,'Validation Status：未执行','#e6ece7')
  s+=t(68,777,'实线：静态转换 / 映射　虚线：按文字标注引用、反馈或运行定位',11,muted)+t(1392,777,'联动键：object_id · execution_id · build_id',11,muted,400,'end')

 }
 s+=t(1392,803,props.detail?'02 / 02':'01 / 02',10,muted,400,'end')
 return s+'</svg>'
})
const tooltip=ref(null)
function hint(e){const el=e.target.closest('[data-object], [data-evidence]');if(el){const bounds=el.getBoundingClientRect();tooltip.value={label:el.dataset.object?`检查 ${el.dataset.object}：联动图、时间线与证据`:'读取本机文本文件，仅保存在当前页面内存中',x:Math.min(bounds.left,window.innerWidth-300),y:bounds.bottom+6}}}
async function choose(e){if(e.target.closest('[data-evidence]')){tooltip.value=null;filePicker.value?.click();return}const el=e.target.closest('[data-object]');if(!el)return;const root=e.currentTarget,nodes=[...root.querySelectorAll('[data-object]')],index=nodes.indexOf(el);selected.value=el.dataset.object;tooltip.value=null;await nextTick();if(e.type==='keydown')root.querySelectorAll('[data-object]')[index]?.focus()}

</script>
<template><div class="ah-slide" @click="choose" @keydown.enter.prevent="choose" @keydown.space.prevent="choose" @mouseover="hint" @mouseout="tooltip=null" @focusin="hint" @focusout="tooltip=null" v-html="svg"></div><Teleport to="body"><input v-if="detail" ref="filePicker" type="file" accept=".txt,.log,.json,.jsonl,.csv,.md,.mlir,.ir,.py,.cpp,.c,.h,.yaml,.yml" hidden @change="loadEvidence"/><div v-if="tooltip" class="ah-tooltip" role="tooltip" :style="{left:tooltip.x+'px',top:tooltip.y+'px'}">{{ tooltip.label }}</div></Teleport></template>
<style>
.ah-raw{height:100%;overflow:auto;background:#eff1f4;padding:6px;color:#17242e;font:11px/1.5 monospace}.ah-raw pre{margin:0;white-space:pre-wrap;overflow-wrap:anywhere}.ah-raw:focus-visible{background:#e7ddf2;outline:none}.ah-tooltip{position:fixed;z-index:9999;padding:7px 11px;background:#17242e;color:#fff;font:13px Inter,'PingFang SC',sans-serif;border-radius:5px;pointer-events:none}.ah-slide{position:absolute;inset:0;background:#eff0f3;color:#17242e;font-family:Inter,'PingFang SC',sans-serif}.ah-slide svg{width:100%;height:100%;display:block}.ah-slide [data-object],.ah-slide [data-evidence]{cursor:pointer}.ah-slide [data-object]:hover text,.ah-slide [data-object]:focus-visible text,.ah-slide [data-evidence]:hover text,.ah-slide [data-evidence]:focus-visible text{text-decoration:underline}.ah-slide [data-object]:focus-visible,.ah-slide [data-evidence]:focus-visible{outline:none}
</style>
