# Critical Path Swimlane

Rendered pattern · 基于 Execution Triage 的单步路径视图；Spatial Systems UI 呈现。

## 设计意图

开发者先判断时间消耗在哪里，再展开事件证据。默认将大量 task 收敛成 Serving、Host、Device 三层共享时间轴，保留 16 条 lane 的持续时间、起点差异、间隙和并行关系。文字仅标识层、稀疏行号和当前最晚进入路径；不逐条铺满 task 名称。此形式用于定界和提出调查方向，不替代原始 trace 的算子与因果验证。

## 来源链

固定版本和每个输入文件的 SHA256 在 `provenance.json`。

1. `PyPTO3/Data/serving-strace-swimlane(2).json`：DSpark GBS1 服务端采集；API / Scheduler / Worker 和 16 条 Simpler Host STRACE lane 使用同一 CLOCK_MONOTONIC。
2. `Design/execution-triage-workbench/build-data.cjs`：按 `args.invocation` 聚合；按 `tid` 对应 lane；从 `simpler_run`、`bind`、`runner_run` 事件提取窗口并确定 step。
3. `build-home-data.cjs → home-data.js → home.js`：转为相对上一步结束的毫秒、Worker 行与前后步骤上下文；原图由 JS 绘制 SVG，不能只提取 CSS。
4. `export-data.cjs`：读取这些产物并逐一回查原始事件；导出 54 个 step / 864 条 lane。额外从原始 runner_run 取 `rrEnd`，避免将外层 simpler_run 结束冒充 runner_run 结束。`end` 保留原外层结束语义。

重新提取：`node export-data.cjs /path/to/PyPTO3-checkout`。脚本只写本目录，不运行或改动来源仓库脚本。独立预览使用普通 script 加载数据，支持 file://，不依赖来源 checkout。

## 数据契约

`{version:1, run:{title,sub,workerRows}, steps:[{id,t0,t1,periodMs,end,lanes,serving,worker}]}`。

- 所有时间为毫秒；0 是上一步 16 条外层 simpler_run 全部结束。负数表示本步准备与上一步重叠。
- lane：`{dev,bindStart,bindEnd,rrStart,rrEnd,end}`。`dev` 在 step 内唯一；时间必须有限；各窗口起点不晚于终点。`end` 为外层 simpler_run 结束。
- Serving / Worker：`{n,s,d,kind,t?}`；`s` 是开始，`d` 为持续时间。Worker 的 `t` 是 prepare / dispatch / reclaim；未知角色须在上游适配，不猜测因果。
- 最晚进入 lane 按 `max(rrStart)` 重算。红色表示调查关注路径，不证明该 lane 是唯一因果瓶颈。step 结束取全 lane 外层 end 的最大值。
- 所有 lane 同一线性时间比例。bind 合计并行时长不可加到周期；Device 行仅表示 Host 记录的 runner_run 调用窗，不是 device_wall。
- 不导入原 demo 的 `deviceExec` / `waitEstimate` 公式拆分，也不导入分配 / H2D 比例。没有独立采集字段就不画执行与等待分段。

## 交互与复用

见 `pattern.html` 的嵌入示例。`CriticalPathSwimlane.mount(root,data,{step:'D09',syncHash:false})` 返回 `setStep(id)`、`getState()`、`destroy()`。`syncHash` 只应由独占 URL 的顶层页面启用。可重复 mount 不同容器；clip ID 独立，监听随 destroy 清理。

- Hover：预览 lane 配对与精确读数；离开后回到固定选择。背景只保留最晚进入路径。
- Click / Enter / Space：固定 lane，检查器可持续读取。选择为白色轮廓，关注路径同时保留红色。
- 检查器关闭保留 lane、step、缩放。检查器默认收起，打开为右侧悬浮面板；关闭不改变主体边界，窄屏使用底部浮层。运行信息、图例、快捷键与数据口径统一收进右上 info 按钮。
- ← / → 与文字结合的阶段导航：切换 step，重置至该 step 完整范围并保留 lane 身份。
- 滚轮或 ＋ / − 缩放；拖动空白平移；完整范围恢复所有关键端点。没有动画，减少动态效果设置不影响使用。
- 视图始终保留全部层；缩放与 Fit 独立悬浮于右下，与导航垂直对齐。

## 与来源差异及验证

保留原始三层、16 lane、单时间轴、上下配对、按需标签及最晚进入路径；改为中性灰、白色选择、橙红关注。去掉来源图中常驻的 16 条配对连线，仅强调当前 lane 与关键 lane；不复制整套业务工作台。修正默认范围裁切、bind/H2D 混称、等待混称和同步屏障的确定性断言。与来源是语义和交互提取，不要求像素一致。

`node verify.cjs` 验证全 step 数据约束、D09 读数、关键路径和范围边界。`export-data.cjs` 回查原始事件。浏览器交互、桌面 / 窄屏、视觉对比度尚待用户验收（遵循仓库约定，未运行浏览器自动化）。内容成熟度为 reviewed：2026-10-20 用户多轮截图评审后明确要求收录 Library / Pattern；不代表已完成全量浏览器回归。主库通过 catalog/assets.json 登记并由 scripts/build.py 生成。

## 视口与控件布局

画布填满宿主视口（默认 100dvh，最小 560px），SVG 按实际容器宽高重算几何，不以固定高度居中留空。顶部与底部预留悬浮操作安全区。字体保持屏幕像素大小，行间距随可用高度伸展。底部为紧凑操作栏与真实周期导航，右上为检查器与 info 按钮。复用库内 liquid-glass-controls 的 control / panel / icon 预设和 MIT 许可证。面板默认收起且互斥打开，不影响视角。浏览器视觉验收待完成。

阶段导航合并 selector：选中段固定加宽并显示英文名称，其他段悬停或键盘聚焦显示名称。未选中段之间保留周期比例，选中段宽度用于交互焦点，不能以其屏幕宽度比较耗时。

## All Steps Overview

总览交互更新：数据区 hover 同时定位当前 lane 行及 step 列；上下同号 lane 配对高亮。行头 hover 仅定位行，列头 hover 仅定位列。红色 `!` 行头表示至少一个 step 最晚进入 runner_run，不代表已确认硬件故障。点击行头或数据行保持总览并打开 lane 专项分析；只有点击列头或底部阶段导航进入单步。专项分析包含全 54 step 的 bind 均值排名、逐步中位均值对比、runner_run 调用窗均值、最晚进入次数、bind 趋势和阶段分布，不使用执行或等待估计。视觉及真实指针交互待用户验收。

右上 All Steps 切换完整请求泳道。按上一步外层结束累积绝对时间，共享轴保留流水重叠；每 step 展示 16 lane 的 bind 与 runner_run 窗口，红色为该步最晚进入 lane。Serving 只显示各步 own 事件，避免把前后上下文重复画入。悬停给 step 读数，点击或 Enter 进入单步；导航也可直接进入。全程支持缩放、平移和 Fit，hash view=all 可恢复。总览不拆分执行与等待。

视觉密度调整：三层标题 23px、右对齐并配结构图标；移除横向分隔线和 step 竖向网格，改为交替 step 底色。底色只编码 step 分区，不编码性能或异常。hover 行列高亮在分区底色上叠加。

### Continuous timeline

Overview and step detail share one absolute time axis. Wheel zoom is anchored to the pointer; dragging pans. Step navigation animates to a local range and Fit returns to the full run. Critical and hovered lane connectors fade in as each step gains screen width. Device rows retain Host-observed runner_run windows.

### Server outputs and slow steps

Serving diamonds/ticks come from scheduler.process_step_output start timestamps inside http.completions. Times share the request origin with lane events; these are server processing events, not client delivery or token counts. Navigation dots mark Decode periods strictly above the empirical P90 (sorted index floor(0.9*(n-1))); hover compares to the same-scope median. Prefill and DI are excluded from this baseline.

### Worker phase linkage

Raw Worker intervals are preserved without merging. Phase membership uses Worker step_id. Cross-layer candidates use STRACE group start after dispatch start and latest completion before reclaim end, checked one-to-one across all 53 Worker groups. These are temporal candidates, not causal flow IDs. Prefill and Draft Init share a batch containment context. D53 is retained as an unshown boundary group. Hover links both directions; clicking a Worker event pins its group and opens a shared-axis phase chart.

## DeepSeek V4 Trace 默认数据（2026-11-25）

index.html 默认加载 trace-data.js；pattern.html 与 data.js 保留原示例。
输入：trace_view_pto_tp1_dp16_8k_16b.json，SHA256 与 PID 对照见 trace-provenance.json。
重建：`rtk node import-trace.cjs /path/to/trace_view_pto_tp1_dp16_8k_16b.json`。

新版 chip.run 按 args.inv 聚合为 32 组、512 条 lane；3 次 batch_prefill 包含 9 组调用，另有 23 组 Decode。
完整采集涉及多个请求，Serving 为全采集的 24 次 scheduler.process_step_output。
起点取最早完整事件；每组坐标相对上一组结束，保留调用间隔和重叠。
lane 编号为 chip child PID 排序序号，不能据此确认物理 device ID。
Worker 仅呈现满足时间包含条件的候选关联；没有匹配时不强行绑定。
原始数据目录只读，不依赖绝对路径加载，也不生成未经确认的远端来源链接。

验证：新版数据全量窗口约束、Worker 候选唯一性、旧示例回归与目录校验通过。
浏览器验证（1600×1000）：两套数据往返切换两次、运行信息开关、Fit 与检查器通过，无页面异常；已检查渲染截图。页面顶部 selector 支持 DeepSeek V4 / 原始示例切换，切换时重置视角与选择。


## Trace 证据视图升级（2026-11-25）

本轮复用现有数据 selector、三层泳道结构、深色画布与浮层检查方式；DeepSeek 数据由 evidence-view.js / evidence-view.css 呈现，原始示例继续由 pattern.js 呈现。没有发布远端或修改输入仓库。

表达约定：
- 问题：实际请求负载、Host 调度与 Runner 的时间关系及关联证据。
- 主图：线性真实时间；Overview 为完整采集，Step Detail 为一组 invocation；底部 Overview 始终保留全程和当前视口。
- 身份：raw-N 指向原 JSON traceEvents[N]；Prefill ID 增加 invocation 后缀以保证唯一性。
- 关联：run_id / dispatch_id / worker_id / step_id 与 request_id 只按实际字段匹配；同线程包含单列为 nesting，跨层时间候选单列为 temporal-candidate。
- 颜色：灰色实测窗口、浅黄选中和字段关联、棕橙时间候选；橙色表示时间偏差。当前无已确认异常，因此不使用红色告警。
- 状态：默认 Overview；选调用进入 Detail；选事件打开原始字段与关系；Esc 清选择并保持视角，Fit 恢复当前层级范围，切换数据集清理监听。

Serving 轨道：16 个 request_id 的起始/queued/stream finished；26 个实际 batch 样本（3 次 WorkerProcess.batch_prefill.batch_size，23 次 DSparkModelRunner.decode.l3_dispatch.actual_batch）；24 次 scheduler.process_step_output.new_tokens，计数属于服务端，不对应客户端送达时间。

Host 的 API Scheduler、共享 Executor、WorkerProcess prepare / dispatch / reclaim 分行。Per-worker Runtime 使用 node.submit / dispatch / frame_submit / complete 的 worker_id 分行；chip bind 另按 PID 分行，禁止将排序序号当成硬件映射。

Entry Skew = max(rrStart) - min(rrStart)。Completion Skew = max(rrEnd) - min(rrEnd)。末端尾差 = 最晚 rrEnd - 次晚 rrEnd。Critical-path Impact 没有因果证据，显示未确认；不把尾差推算为可获收益。

Deployment × Lingqu：通过冒泡 trace-evidence-selection 事件暴露观测 Runtime worker_id（仅 node.* 选中时）、runId、dispatchId、时间窗和 physicalMappingVerified:false。当前没有物理映射，因此没有驱动硬件选中；不发送网络、MoE 或 Layer 进度数据。这是联动契约，未接入实际 Deployment 消费端。

核验：verify-evidence.cjs 支持原始输入路径，逐事件核对字段、SHA256、生命周期、唯一 ID、窗口和关联依据；旧 verify.cjs 保留旧数据回归。浏览器覆盖 Overview、Detail、事件选择与关联检查器、Help、Fit、两套数据切换；1600×1000 渲染截图已检查。无芯片内部事件及设备实测验收。


### 样式回归修正（2026-11-25）

数据集与调用组 selector 统一使用 selector.js / selector.css 的深色胶囊菜单；原生 select 仅保留为状态输入。菜单支持键盘、Escape、选中填充与完整名称提示。
DeepSeek 底部重新复用原 SequenceNavigation（时间窗口拖动、端点缩放、方向键平移），右下恢复原位缩放工具栏；去掉新增 Overview SVG 及其浏览器焦点外框。
Host / Runtime / Bind / Runner task 统一恢复 1.4 屏幕像素细线，命中区域单独加宽，不改变时间比例。
lane 标签简化为 Requests / Batch Size / Token Output / Scheduler / Executor / Prepare / Dispatch / Reclaim / Runtime / Bind / Runner。悬停与键盘聚焦均显示完整来源名。
浏览器核验：1600×1000 实际菜单选择、深色菜单、共享导航、无焦点外框、task 屏幕高度 1.4px、标签 hover/focus、导航方向键和两套数据往返切换通过；截图已检查。


### 字体与画布利用率修正（2026-11-25）

删除固定 740 高 viewBox 的非等比拉伸。SVG viewBox 与容器实际像素一致，仅对几何 y 坐标重排；标题、标签和行号保持正常像素字形，task 仍保持 1.4px。画布底部预留从 106px 缩至 82px，同时将诊断信息下移并与刻度分开，腾出的空间用于泳道。已核查 1600×1000 / 1600×1200 下的文字变换均为 1:1，标题字号保持 23px。

## 工作台入口

打开 [泳道工作台](index.html)，可切换 DeepSeek V4 与 DSpark 采集。页面加载的脚本和 CSS 都在仓库中。旧 `pattern.html` 和 `CriticalPathSwimlane.mount` 继续提供独立嵌入。

```js
const call = {
  version: 1,
  pattern: 'critical-path-swimlane',
  layout: 'investigation-workbench',
  axis: 'trace-time',
  controls: {
    zoom: 'required',
    inspector: 'required',
    eventEvidence: 'optional',
    playback: 'optional',
  },
};
const instance = CriticalPathWorkbench.mount(root, data, call);
```

调用方从 `pattern.json` 的 `workbench` 及正式页面核对入口与加载顺序。数据使用 `data.js` 或 `trace-data.js` 的原生形状。可用 `step` 指定当前采集的初始调用组。任何必选能力无法满足时抛出包含字段名的错误。实例的 `omitted` 列出无法启用的可选能力。两份采集支持检查器、缩放、Fit、调用组定位及销毁。DeepSeek 额外支持原始事件核查、`trace-evidence-selection` 和调用组播放。播放是按采集中的调用组推进，间隔用于阅读，时间轴仍保持原采集比例。跳步、缩放、切换数据和销毁都会停止播放。源码步骤轴、跨采集时钟比较、物理设备映射和芯片内执行均超出本接口输入范围。

DeepSeek 选择事件使用 `{scope, id}`。作用域为原始 Trace 的 SHA256，ID 为原始事件序号。例如 `raw-1110`（Host `node.dispatch`）经 `run_id=8, dispatch_id=8` 关联 `raw-1112`（`chip.run`），后者经 PID 2983083 与 `inv=8` 关联 `raw-1269`（`chip.run.runner_run`）。这是两个分别可核查的关联。面板保留事件 ID、原始字段、指纹链接和关联类别。物理设备与因果耗时保持未知。DSpark 继续使用固定 revision 的调用组和 lane 窗口，可在运行信息查看来源指纹。

`verify-evidence.cjs <原始 Trace 路径>` 检查原始证据、范围、关系与调用约束。设置 `AI_INFRA_DOM_CHECK=1` 并使 Node 可解析 jsdom，可加跑两套数据的 DOM 挂载、点选、证据、视角、播放和销毁。 `verify.cjs` 验证 DSpark 数据回归。DOM 检查与浏览器视觉验收分别记录。
