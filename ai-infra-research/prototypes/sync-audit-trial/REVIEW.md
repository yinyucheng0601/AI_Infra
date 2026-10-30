# 同步证据链试验复盘

本轮不安装算子开发环境、不修改真实算子、不发布。使用固定版本原始扫描器，图中关系只来自 `buffer_dependencies` / `sync_coverages`；没有实测事件，不绘制真实时间轴。

## 执行结果

| 配置 | 结构候选 | 图候选 | 解释 |
|---|---:|---:|---|
| 索引不同源 | 4 | 2 | 固定来源快照 |
| 仅统一索引源 | 3 | 1 | 本地试验副本 |
| 统一 region 表达式 | 1 | 0 | 本地试验副本 |
| 等价索引好例 | 1 | 0 | 固定来源快照 |
| 同源不同 region · 依赖 | 1 | 1 | 固定来源快照 |
| 搬入后直接计算 | 2 | 0 | 固定来源快照 |
| 补齐 MTE2→V | 0 | 0 | 本地试验副本 |
| 标准队列好例 | 0 | 0 | 固定来源快照 |
| Unpack · 真实源码 | 3 | 0 | 固定来源快照 |

上游 L0 基准：缺陷条例与行号命中 15/15，正确例零输出 6/6，图证据回归 4/4。命令与输出见 benchmark.txt。没有执行外部 submodule 的 L1 全量语料；不据 L0 推广真实复杂代码上的误报率。

## 可验证改动

- 流水坏例 sources/bad-pipeline.asc:26：在 DataCopyPad 与 Adds 之间补充 `SetFlag<HardEvent::MTE2_V>(EVENT_ID0)` / `WaitFlag<HardEvent::MTE2_V>(EVENT_ID0)`，见 pipeline.patch。仅在 fixture 副本执行；结构候选 2→0，图分析 0→0，未编译和运行。
- 索引坏例 sources/bad-index.cpp:37：将 bias 地址使用的 buffer index 改为与输出同步相同的 compute-loop modulo 表达式，见 index.patch。图候选 2→0，结构 4→1；剩余 SYNC-04 Set/Wait 不配对没有被隐藏。此文件是 producer 地址片段，不能补造 consumer 来凑通过。
- 中间方案 root-only-index.cpp:30 仅改 alias 的 root，图候选 2→1。剩余 same_root_different_region 显示：当前分析器尚未从 alias 展开 modulo。这个结果既不能证明中间改动错误，也不能被描述成已经验证完整等价；需要更精确的 alias/region 传播分析。
- 256 个非负整数检查 `i & 3 == i % 4`，并检查最小例 idx=1 时错误/预期地址槽和 producer/consumer region 区别。这些 CPU 检查不覆盖模板、设备同步或复杂控制流。

## 真实 Unpack：保留所有 3 条候选

固定版本 13baf5274751fcf46aa04905c53ad285d656ac74，源码快照 sources/unpack.cpp。SDK 两个头文件未安装；不进行设备语义和完整跨函数证明。

### (1) SYNC-08 · 红线 · L366

原始 message：SetFlag 前存在提前退出（可能跳过 Set → 死锁）: SetFlag<HardEvent::MTE2_V>

原始 detail：同函数 __aicore__ inline void RunUnpackCompactMatrixTask 内未被兜底的 return/break: [355]；确认所有路径都触发 SetFlag | 历史 case: cann/ops-transformer PR#3140 (flag_pair) | 修复提示: 补齐缺失的 SetFlag 或 WaitFlag，确保所有路径都触发 SetFlag | diff证据: @@ -166,6 +166,7 @@ __aicore__ inline void DLIKLLossVector2Service<DLIT>::DeterSumLoss()
     if (co...

### (2) SYNC-02 · 红线 · L430

原始 message：疑似计算后未同步即搬出 GM: 搬出@430 (计算@420)

原始 detail：候选：Vector 计算后、DataCopy 出 GM 前需 V→MTE3 同步 | 历史 case: cann/ops-math PR#703 (pipe_barrier_missing) | 修复提示: 在异步搬出后、SetFlag 释放 buffer 前加 PipeBarrier<PIPE_ALL>() | diff证据: @@ -38,6 +38,14 @@ private:
     __aicore__ inline void valueMove(uint64_t valueOffset, uint64_t ubV...

### (3) SYNC-08 · 红线 · L554

原始 message：SetFlag 前存在提前退出（可能跳过 Set → 死锁）: SetFlag<HardEvent::MTE2_V>

原始 detail：同函数 __aicore__ inline void RunUnpackPackedMatrixTask 内未被兜底的 return/break: [526, 531, 536]；确认所有路径都触发 SetFlag | 历史 case: cann/ops-transformer PR#3140 (flag_pair) | 修复提示: 补齐缺失的 SetFlag 或 WaitFlag，确保所有路径都触发 SetFlag | diff证据: @@ -166,6 +166,7 @@ __aicore__ inline void DLIKLLossVector2Service<DLIT>::DeterSumLoss()
     if (co...

### 下一步验证与方案

1. L366 / L554 的提前退出候选：逐条核对 L355、L526、L531、L536 的路径是否也跳过相应 Wait、是否存在调用方 outstanding event。先建立“分支条件 → 实际 Set/Wait 序列”的测试，不直接在 return 前插入 SetFlag。代表边界为 rowCount<16、rowCount=16、validCols<16 与 sizeof(T)=1 的 fallback；再覆盖调用循环的首轮/末轮。验收关注 flag 序列与共享 buffer 的生命周期，不以扫描清零作为唯一判据。
2. L430 的计算后搬出候选：源码 L423–425 已调用 SetUnpackMatrixVMte3 / WaitUnpackMatrixVMte3；定义在 L228–246，以 bufferIndex 选择 EVENT_ID0/1/2。先核对 bufferIndex 取值、相应分支是否成对执行，以及 Gather→helper→DataCopyPad 的完整调用链。可验证改进方案是让分析器支持同文件 helper 摘要，将 API 方向、flag 选择和调用条件关联到候选，保留扫描器原始结果；不要为了让正则识别而重复插入同步。
3. 两条路径确认后，才给出真实算子的修改 diff，结合 CPU 输出参考、设备正确性及 profiler 对比验证。当前没有足够依据承诺真实算子修复或性能收益，因此未生成猜测性补丁、未改真实源码。

## 接口与设计自检

- 第 1 轮：将结构与图扫描分开计数；保留所有候选原文；图只画有实际端点的关系；不存在的 consumer 标为未在证据链确认。源码字段赋址不是已执行的 producer 事件。
- 第 2 轮：补充 producer / consumer / access / sync / coverage 对照；源码打开后定位当前行；检查开关面板和点选不改变 view，问题、预览与导出共用序列化结果。教程按价值、使用、扩展、实现分工组织，代码可复制；统一右上角按钮和单一 hover/focus tip。
- 自动证据：verify.cjs 的独立数值与原始输出断言、所有关系端点、候选完整性、交付脚本的 DOM 替身操作路径；_shared/verify_consistency.py 的最终页一致性与语法。
- 未验证：真实浏览器布局、遮挡、点击/剪贴板、桌面与窄屏光学表现；设备编译/执行、CANN 版本兼容及性能。两轮代码/结构自检不冒充视觉验收。

## 复用建议

下一次再用第二个真实实现验证适配器后，才考虑把同步审计路由沉淀到总 workflow。本轮先验证接口，不安装或复制整套 CANNBot Skill，不改现有总 workflow 的诊断能力声明，也不自动收录 Pattern。
