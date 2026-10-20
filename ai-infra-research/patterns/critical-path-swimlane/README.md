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
- 检查器关闭保留 lane、step、缩放。桌面预留右侧检查区，关闭不改变主体边界；窄屏排至图下。
- ↑ / ↓、前后按钮、选择框、真实时长导航：切换 step，重置至该 step 完整范围并保留 lane 身份。
- 滚轮或 ＋ / − 缩放；拖动空白平移；完整范围恢复所有关键端点。没有动画，减少动态效果设置不影响使用。
- Host / Device 切换仅弱化非关注层，不删除跨层关系。

## 与来源差异及验证

保留原始三层、16 lane、单时间轴、上下配对、按需标签及最晚进入路径；改为中性灰、白色选择、橙红关注。去掉来源图中常驻的 16 条配对连线，仅强调当前 lane 与关键 lane；不复制整套业务工作台。修正默认范围裁切、bind/H2D 混称、等待混称和同步屏障的确定性断言。与来源是语义和交互提取，不要求像素一致。

`node verify.cjs` 验证全 step 数据约束、D09 读数、关键路径和范围边界。`export-data.cjs` 回查原始事件。浏览器交互、桌面 / 窄屏、视觉对比度尚待用户验收（遵循仓库约定，未运行浏览器自动化）。内容成熟度为 draft，不宣称已验收。主库通过 catalog/assets.json 登记并由 scripts/build.py 生成。
