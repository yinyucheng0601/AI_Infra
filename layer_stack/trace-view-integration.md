# 推理层栈接入 Traceview

接入位置：`inference-layer-stack.html` 的右上角 Traceview 控件，展开底部观察区。与 Token / Task、Lingqu 互斥；打开或关闭不修改画布 camera，不中断播放。Qwen 没有接入此份 DeepSeek Serving Trace，切换 Qwen 隐藏此入口。

## 复用来源

直接使用 `ai-infra-research/patterns/critical-path-swimlane/evidence-view.js`、`evidence-view.css`、`selector.js/css` 和 `patterns/sequence-navigation/navigation.js/css`。`scripts/sync-trace-view.cjs` 将这些规范源及 `trace-data.js` 嵌入离线 HTML。`trace-view-sources.json` 记录每个输入的 SHA256；不要手改嵌入区。

两份数据均来自 `trace_view_pto_tp1_dp16_8k_16b.json`，SHA256 为 `04acfb37b21f44f5225b48d2fc6c914cac95aa5cee093cd1dfdfa7bc713a19d2`。

## 关联依据与边界

- 推理阶段来自 DSparkModelRunner 的 26 个 `prefill/decode.l3_dispatch`。根据原始事件名称、起点、终点核对，容差 0.002 ms，每个阶段对应唯一 raw event。
- Traceview 的 32 个调用组来自 chip.run 的 inv 字段。P01 对应 inv 8–10，P02 对应 inv 11–13，P03 对应 inv 15–17；其余为 23 次 Decode。P01.8 表示第一组 Prefill 的 invocation 8，不是 L8 或 Token 8。
- Prefill 调用组依据 batch_prefill 时间包含关系归组；Decode 按原数据中的调用次序匹配。跨层调用归因仍是时间候选关系，不把它升级为因果 ID 关联。
- 播放仅在阶段改变时定位时间窗，层序动画不会制造各层执行耗时。用户缩放 Traceview 后，在同一阶段内播放层序保留时间窗。
- 点击调用组同步推理阶段。点击原始 dispatch 事件通过时间精确匹配同步；其他事件仅在直接或关联调用组唯一时定位，歧义不跳转。
- `worker_id` 仅作为逻辑 Worker 显示。Traceview 不修改 selectedRank，不高亮物理设备与网络路径。runner_run 仍是 Host 调用窗，不能当成芯片算子有效执行时间。

## 状态与验证

保存抽屉开关、高度、调用组、时间窗和选中 raw event；刷新恢复，与主画布状态同时保存。URL hash 由主体拥有，嵌入 Traceview 不改 hash。

运行 `node layer_stack/scripts/verify-trace-integration.cjs`：验证 26 个父事件与 32 个调用组覆盖、阶段及事件双向选择、逐层播放不重置时间窗、主画布 camera 保持、刷新恢复、键盘高度调整、1600×1000 与 800×900、Qwen 隔离、无页面异常。主题截图人工检查。
