/* Step 10 only: reuse the Rank renderer, camera, navigation and inspector. */
let observationImported=null,observationData=null,observationRank=null,observationMetric=null,observationOccurrence=null,observationCategory='all';
const observationControl=document.createElement('div');observationControl.id='observation-controls';observationControl.hidden=true;
observationControl.innerHTML='<select id="observation-session" aria-label="数据会话" data-tip="选择配置或观测数据集；规模与通信覆盖由数据决定"><option value="">部署配置</option><option value="baseline">EP 专项 · 均衡</option><option value="skew">EP 专项 · 负载倾斜</option></select><select id="observation-occurrence" aria-label="通信操作" data-tip="选择一次通信操作" hidden></select><button id="observation-import" data-tip="导入 communication-observation.v1 数据">导入数据</button><input id="observation-file" type="file" accept=".json,application/json" hidden><span id="observation-error" role="status"></span>';
document.body.append(observationControl);
const deploymentControlDock=document.createElement('section');deploymentControlDock.id='deployment-control-dock';deploymentControlDock.hidden=true;deploymentControlDock.setAttribute('aria-label','部署与通信控制');
const deploymentControlRow=document.createElement('div');deploymentControlRow.className='deployment-control-row';
deploymentControlRow.append(observationControl,physicalPath);deploymentControlDock.append(deploymentControlRow,deploymentModes);document.body.append(deploymentControlDock);
const deploymentSettingsButton=document.createElement('button');deploymentSettingsButton.id='deployment-settings-toggle';deploymentSettingsButton.hidden=true;deploymentSettingsButton.type='button';deploymentSettingsButton.setAttribute('aria-label','部署设置');deploymentSettingsButton.setAttribute('aria-expanded','false');deploymentSettingsButton.setAttribute('aria-controls','deployment-settings');deploymentSettingsButton.dataset.tip='部署设置';
deploymentSettingsButton.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 3h6l.6 2.7 2.3 1.3 2.6-.8 3 5.2-2 1.9v2.7l2 1.9-3 5.2-2.6-.8-2.3 1.3L15 26H9l-.6-2.7-2.3-1.3-2.6.8-3-5.2 2-1.9V13l-2-1.9 3-5.2 2.6.8 2.3-1.3Z" transform="translate(2 0) scale(.83)"/><circle cx="12" cy="12" r="3"/></svg>';
document.querySelector('#info-icon').before(deploymentSettingsButton);
const deploymentSettingsPanel=document.createElement('aside');deploymentSettingsPanel.id='deployment-settings';deploymentSettingsPanel.hidden=true;deploymentSettingsPanel.setAttribute('aria-label','部署设置');deploymentSettingsPanel.innerHTML='<header><span>部署设置</span><button id="deployment-settings-close" aria-label="收起部署设置" data-tip="收起部署设置">×</button></header>';
deploymentSettingsPanel.append(deploymentControlRow);document.body.append(deploymentSettingsPanel);
function setDeploymentSettings(open){deploymentSettingsPanel.hidden=!open;deploymentSettingsButton.setAttribute('aria-expanded',String(open));if(open){document.querySelector('#info-panel').hidden=true;document.querySelector('#info-icon').setAttribute('aria-expanded','false');}}
deploymentSettingsButton.onclick=()=>setDeploymentSettings(deploymentSettingsPanel.hidden);document.querySelector('#deployment-settings-close').onclick=()=>setDeploymentSettings(false);
document.addEventListener('click',e=>{if(current===9&&!deploymentSettingsPanel.hidden&&!deploymentSettingsPanel.contains(e.target)&&!deploymentSettingsButton.contains(e.target))setDeploymentSettings(false);});
document.addEventListener('keydown',e=>{if(current===9&&e.key==='Escape'&&!deploymentSettingsPanel.hidden){setDeploymentSettings(false);deploymentSettingsButton.focus();}});

const deploymentTokenHome=document.createComment('token control home');document.querySelector('#token-controls').before(deploymentTokenHome);
function syncDeploymentControlLayout(active=current===9){
 deploymentSettingsButton.hidden=!active;if(!active)setDeploymentSettings(false);
 deploymentControlDock.hidden=!active;if(!active)document.body.classList.remove('deployment-trace-open');
 const token=document.querySelector('#token-controls');
 if(active){if(token.parentElement!==deploymentControlRow)deploymentControlRow.append(token);}
 else if(token.previousSibling!==deploymentTokenHome)deploymentTokenHome.after(token);
}

function observationSync(){if(typeof syncDeploymentTrace==='function')syncDeploymentTrace();syncDeploymentControlLayout();observationControl.hidden=current!==9;document.querySelector('#observation-occurrence').hidden=!observationData||observationOccurrences().length<=1;document.body.classList.toggle('observation-session',current===9&&!!observationData);}
const observationCategories=[['all','全部'],['tp','TP/SP'],['cache','缓存 · AG'],['dispatch','EP · Dispatch'],['return','EP · Return'],['dp','DP'],['edp','专家副本']];
function observationOccurrences(){return observationData.occurrences.filter(o=>observationCategory==='all'||CommunicationObservation.communicationKind(observationData,o)===observationCategory);}
function observationResolve(){
 const choices=observationOccurrences();
 if(!choices.some(o=>o.id===observationOccurrence))observationOccurrence=(choices.find(o=>observationData.groups.find(g=>g.id===o.groupId)?.membership.value?.includes(observationRank))||choices[0])?.id||null;
 const available=observationData.metricDefinitions.filter(m=>m.applicableTargetTypes.includes('rank')&&observationData.observations.some(o=>o.metricId===m.id&&o.occurrenceId===observationOccurrence));
 // One primary value on the canvas; all available values remain in the inspector.
 // No summary from another category may leak into an uncovered filter.
 observationMetric=observationCategory!=='all'&&!choices.length?null:available.find(m=>m.id==='logical.received.tokens')?.id||available.find(m=>m.id==='event.elapsed')?.id||available[0]?.id||null;
}
function observationFilter(category){observationCategory=category;observationResolve();observationDraw();positionDeploymentPanel();}
function observationColor(){const o=observationData.occurrences.find(o=>o.id===observationOccurrence);return deploymentColors[CommunicationObservation.communicationKind(observationData,o)]||'#aaa';}
function observationCategoryNav(){
 const supported=new Set(observationData.occurrences.map(o=>CommunicationObservation.communicationKind(observationData,o)));
 const extra=[['ep','EP'],['pp','PP'],['cp','CP'],['unknown','未分类']].filter(([id])=>supported.has(id));
 deploymentModes.innerHTML=[...observationCategories,...extra].map(([id,label])=>`<button data-observation-category="${id}" data-covered="${id==='all'||supported.has(id)}" aria-pressed="${id===observationCategory}" style="--mode-color:${deploymentColors[id]||'#eee'}" data-tip="${esc(label)} · ${id==='all'?'查看数据集中全部通信类型':supported.has(id)?'筛选该类通信操作':'本数据集未提供该类通信记录'}">${label}</button>`).join('');
}
function observationUse(d){
 if(d){CommunicationObservation.validate(d);const family=d.run.stack.deviceFamily?.value,backend=d.run.stack.backend?.value;
 // GPU fixtures remain usable by parsers, but cannot enter the NPU canvas.
 if(/nvidia|cuda/i.test(family||'')||/nccl/i.test(backend||''))throw Error('NCCL/CUDA 样本仅支持独立解析，不接入 NPU 画布');
 if(!d.ranks.length)throw Error('没有可展示的 Rank');
 for(const occurrence of [null,...d.occurrences.map(o=>o.id)])for(const metric of d.metricDefinitions)CommunicationObservation.rankValues(d,metric.id,occurrence);
 }
 resetPhysicalView();observationData=d;observationRank=d?.ranks[0].id||null;observationOccurrence=d?.occurrences[0]?.id||null;
 observationCategory='all';observationMetric=null;if(d)observationResolve();
 document.querySelector('#observation-error').textContent='';
 document.querySelector('#panel').hidden=true;deploymentInspector=false;
 observationSync();if(current===9){drawDeployment();deploymentCamera.z=1;deploymentCamera.x=deploymentCamera.y=0;applyDeploymentCamera();fitDeployment();}
}
function observationDraw(){
 observationSync();const d=observationData;if(!d)return;
 const values=CommunicationObservation.rankValues(d,observationMetric,observationOccurrence),def=d.metricDefinitions.find(m=>m.id===observationMetric);
 const known=[...values.values()].filter(o=>o.value!==null),max=Math.max(1,...known.map(o=>o.value));
 const occurrence=d.occurrences.find(o=>o.id===observationOccurrence);
 const ranks=d.ranks,idx=Math.max(0,ranks.findIndex(r=>r.id===observationRank)),start=Math.floor(idx/8)*8,slice=ranks.slice(start,start+8);
 const label=o=>o?.value===null||!o?'—':Number(o.value.toFixed(2)).toLocaleString('en-US');
 let body=`<text x="660" y="12" text-anchor="middle" class="deployment-board-label">${esc(def?.name||'未提供 Rank 指标')} ${esc(def?.unit||'')} · ${known.length}/${ranks.length}</text>`;
 // Logical overview: eight per row is a navigation slice, never a server claim.
 ranks.forEach((r,i)=>{const x=45+(i%8)*157,y=38+Math.floor(i/8)*40,o=values.get(r.id),width=o?.value===null||!o?0:Math.max(0,o.value/max)*135;
 body+=`<g role="button" tabindex="0" class="observation-rank" data-observation-rank="${esc(r.id)}" aria-pressed="${r.id===observationRank}" data-tip="Rank ${r.rankIndex} · ${esc(def?.name||'指标')} ${label(o)} ${esc(def?.unit||'')}"><rect x="${x}" y="${y}" width="145" height="34" rx="5" fill="${r.id===observationRank?'#eee':'#222'}"/><text x="${x+5}" y="${y+14}" fill="${r.id===observationRank?'#111':'#eee'}" font-size="11">R${r.rankIndex} · ${label(o)}</text><rect x="${x+5}" y="${y+22}" width="${width}" height="4" fill="${r.id===observationRank?'#555':'#aaa'}"/></g>`;
 });
 const top=65+Math.ceil(ranks.length/8)*40;
 body+=`<text x="660" y="${top}" text-anchor="middle" class="deployment-board-label">Rank ${slice[0].rankIndex}–${slice.at(-1).rankIndex}</text>`;
 slice.forEach((r,i)=>{const x=(i%4)*330+15,y=top+25+Math.floor(i/4)*315,o=values.get(r.id);
 // Unknown tensor bindings remain neutral. Exact inherited isometric geometry.
 const glyph=deploymentOrthographicGlyph({id:r.rankIndex,bands:[{id:'weights'},{id:'activation'},{id:'gradient'},{id:'communication'}]},true);
 body+=`<g role="button" tabindex="0" class="observation-rank" data-observation-rank="${esc(r.id)}" aria-pressed="${r.id===observationRank}" data-tip="Rank ${r.rankIndex} · 查看指标与来源"><svg x="${x}" y="${y}" width="300" height="245" viewBox="345 222 460 553">${glyph}</svg><text x="${x+150}" y="${y+258}" text-anchor="middle" fill="#eee" font-size="16">Rank ${r.rankIndex} · ${label(o)} ${esc(def?.unit||'')}</text><rect x="${x+70}" y="${y+271}" width="160" height="5" fill="#333"/><rect x="${x+70}" y="${y+271}" width="${o?.value==null?0:Math.max(0,o.value/max)*160}" height="5" fill="#ccc"/></g>`;
 });
 updateGraphSvg(document.querySelector('#deployment-world'),'<svg xmlns="http://www.w3.org/2000/svg">'+body+'</svg>');applyDeploymentCamera();
 const choices=observationOccurrences(),select=document.querySelector('#observation-occurrence');select.hidden=choices.length<=1;
 select.innerHTML=choices.map(o=>`<option value="${esc(o.id)}" ${o.id===observationOccurrence?'selected':''}>${esc((d.groups.find(g=>g.id===o.groupId)?.semanticAxis.value||'')+' · '+(o.operation.value||o.id))}</option>`).join('');
 observationCategoryNav();
 const kind=occurrence?CommunicationObservation.communicationKind(d,occurrence):observationCategory;
 const group=d.groups.find(g=>g.id===occurrence?.groupId),axis=group?.semanticAxis.value||'';
 const uncovered=observationCategory!=='all'&&!choices.length;
 document.querySelector('#impact').innerHTML='<div class="step-number">10</div><b>'+esc(uncovered?([...observationCategories].find(([id])=>id===kind)?.[1]||kind):occurrence?.operation.value||'通信指标')+'</b><span>'+esc(uncovered?'本数据集未提供该类通信记录':ranks.length+' Rank'+(axis?' · '+axis:''))+'</span>';
 document.querySelector('#config').textContent=(d.run.worldSize.value??'—')+' Rank · '+d.run.captureCoverage.observedIds.length+' 已采集';
 if(deploymentView==='Top')observationTop();
 if(deploymentInspector)observationPanel();
 if(!document.querySelector('#info-panel').hidden)observationInfo();
}
function observationPanel(){document.querySelector('#panel').hidden=true;}
function observationInfo(){document.querySelector('#info-content').innerHTML='<h3>2.5D 指标观测</h3><p>选择总览中的 Rank 展开对应逻辑切片；通信类型用于筛选记录；主体自动显示当前操作的接收 token 或耗时，点击器件切换关联，数据来源在本说明中核对。切回“部署配置”恢复原配置。</p><h3>数据来源</h3><p>'+esc(observationData.run.id)+'</p><p>内置两份数据是 64 Rank 的 EP 专项构造样本，不是完整训练配置；TP/DP 等分类根据通信域及显式语义识别，未提供的类别不生成记录。两组样本均由确定性规则构造；倾斜场景将每四个 token 的首位专家改为 E0，未推导性能惩罚。阶段时间保持相同，不能据此判断网络故障。两份内置会话采用显式连续落位配置：每板 8 NPU、每 POD 8 板；顶视复用灵衢 Pattern 的 POD/板/设备与互联，点击板行展开，面包屑返回 POD。该配置及外围设备来自可追溯模板，不是驱动采集。导入数据不自动套用此落位。立体图元高度不表示容量。</p><p>导入使用 communication-observation.v1；支持无逐事件时间的 Rank 指标。NCCL/CUDA 输入不进入 NPU 画布。本版本不绘制未核验的物理路径或跨 Rank 等待。</p>'+physicalRelationLegend();}
document.querySelector('#observation-session').onchange=e=>{try{observationUse(e.target.value==='imported'?observationImported:e.target.value?CommunicationObservation.mock(e.target.value==='skew'):null);}catch(err){document.querySelector('#observation-error').textContent=err.message;}};
document.querySelector('#observation-occurrence').onchange=e=>{observationOccurrence=e.target.value;observationResolve();observationDraw();positionDeploymentPanel();};
document.querySelector('#observation-import').onclick=()=>document.querySelector('#observation-file').click();
document.querySelector('#observation-file').onchange=async e=>{try{const f=e.target.files[0];if(!f)return;if(f.size>25*1024*1024)throw Error('文件超过 25 MB');const imported=JSON.parse(await f.text());observationUse(imported);observationImported=imported;const s=document.querySelector('#observation-session');s.querySelector('[value="imported"]')?.remove();const opt=document.createElement('option');opt.value='imported';opt.textContent=f.name;s.append(opt);s.value='imported';}catch(err){document.querySelector('#observation-error').textContent=err.message;}finally{e.target.value='';}};
function observationSelect(e){if(current!==9||!observationData)return;const r=e.target.closest('[data-observation-rank]'),m=e.target.closest('[data-observation-category]');if(r&&deploymentMoved)return;if(r){anchorDeploymentPanel(e,r);observationRank=r.dataset.observationRank;observationResolve();deploymentInspector=true;observationDraw();observationPanel();positionDeploymentPanel();}if(m){observationFilter(m.dataset.observationCategory);}}
document.addEventListener('click',observationSelect);
document.addEventListener('keydown',e=>{if(['Enter',' '].includes(e.key)&&e.target.closest('[data-observation-rank]')){e.preventDefault();observationSelect(e);}});
