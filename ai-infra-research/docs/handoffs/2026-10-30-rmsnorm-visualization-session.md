# RMSNorm 可视化长会话交接

更新时间：2026-10-30。工作区：`/Users/yin/AI_Infra`。这是供新 session 继续工作的交接，不是设备性能报告。

## 先读这一段

原始目标是把 RMSNorm 的执行、数据驻留、重读和内存复用组织成可联动、可核查、可继续调查的可视化；进一步验证相同方法能否迁移到独立开发者的真实算子。

第一版基于 CANNBot 自带性能验证工程，已形成 RMSNorm Pattern。第二版使用独立开发者的 Fused Add RMSNorm，已完成固定源码适配、7 个配置、主图与内存图联动，以及最近一轮 UI 规范修复。当前可以证明“一个独立实现可迁移”，不能证明“任意源码自动稳定生成”。没有运行 NPU，也没有给 910B 套用 950 的性能数字。

最新用户反馈是：新 demo 丢失系统 Liquid 控件，核查误做成居中窗口，Info 不符合 Skill。已在本地修复并做代表性交互检查，尚待用户视觉验收。最新用户要求仅为整理本交接文档；不要据此自动发布、继续大改或推送全部工作区。

## 1. 原始目标与演进

1. 解释 RMSNorm 整行驻留与两遍分块重读的差异：什么被搬运、计算、保留、释放，再次使用。
2. 将主体执行图与内存复用图按具体事件和生命周期关联，而不是展示孤立统计或静态说明。
3. 对照 CANNBot 定量模型与 Kernel，给出有证据的差异、定位和继续调查入口，不能把理论时延当作实现结论。
4. 将成熟页面收录为 Library/Pattern，并将表达约定沉淀到 Skill；下载包与源文件同步需要单独构建检查。
5. 找独立开发者实现测试迁移，避免只对 Skill 自带验证工程有效。

## 2. 第一阶段：RMSNorm 驻留与重读 Pattern

源码原型：
- `/Users/yin/AI_Infra/ai-infra-research/prototypes/rmsnorm-performance-investigation/page.html`
- 同目录 `index.html`、`comparison.js`

正式 Pattern：
- `/Users/yin/AI_Infra/ai-infra-research/patterns/rmsnorm-residency-reuse/index.html`
- 同目录 `manifest.json`

已形成的交互约定：
- 主图横轴为等宽源码步骤，不是时间轴；解释通过横轴区域 hover tip 触发，不增加说明按钮。
- 打开“内存复用”直接左右分屏，右侧嵌入主舞台，没有额外窗口封装。
- 进入分屏左图默认 75%、左上对齐；退出恢复进入前视角。
- 多个队列放在可横向滚动的同一总览，纵向共用源码步骤。
- 默认去色，选中事件与关联 Tensor 染色；MTE2 黄 `#FFE300`，Vector 绿 `#0BB48E`。
- 内存图按 Tensor 关联染色；峰值线常开、白色 2px，不再保留开关和源码按钮。
- 图例、预留容量、最大同时申请、坐标口径集中到内存 Info。
- 核查按钮带数量 badge，定位只改焦点，不能让其他发现消失。
- Info 要交代源码来自 CANNBot 自带性能验证样例，并链接 `ops-theoretical-performance-estimation`；区别模型估算与 Kernel 证据。

第一版暴露的具体核查方向：gamma 请求次数、flow 与 Kernel 的归约粒度、模型 live 容量与实际队列分配口径。它们是模型适用性与实现可行性调查，不等于设备验证结果。

## 3. Skill 复盘中达成的原则

不要把一个 demo 的所有视觉决定写成普适限制。实现入口应先给出短“表达约定”：
- 本轮问题，主图和辅助图分别回答什么。
- 坐标语义及证据能支持的范围。
- Tensor、chunk、事件、队列、显式槽、生命周期实例的身份与关系。
- 类别色、数据色和选择态各代表什么。
- 默认、选中、分屏、退出恢复、切换配置等关键状态。

先做可操作骨架验证关系，再接完整数据与精修。具体事件要唯一 ID，不能因为都叫 X 或 vf 就当成同一个对象。发现集合由配置、实现与证据决定；选择只改变焦点，显式筛选才改变可见集合。不能把“全部去色”或“所有任务都用泳道”固定成唯一策略。

相关 Skill：`ai-infra-investigation`、`operator-mapping-investigation`、`design-spatial-systems-ui`、`observability-design-style`、`ai-infra-glyphs`。新 session 应按当前任务读取实际 SKILL.md，不应仅凭本交接猜测已完成了哪些 Skill 源文件变更。

## 4. 第二阶段：独立 Fused Add RMSNorm

当前入口：http://127.0.0.1:8820/ （服务可能随 session 结束停止）。

目录：`/Users/yin/AI_Infra/ai-infra-research/prototypes/fused-add-rmsnorm-independent/`

固定上游：
- https://github.com/llrnb666-arch/HPC101-AscendC-FusedRMSNorm
- commit `7729cdf7bc37d77bd3c82448414b77cea3e96637`
- Kernel：`src/ascendc/op_kernel/fused_add_rms_norm.cpp`
- Host：对应 `op_host` 文件；公开用例：`checker/case_specs.py`
- 三个源码文件 Git blob 哈希已对照固定提交 tree 校验。

这是个人课程实践项目，目标 Ascend 910B，不是已复核的比赛获奖工程。未修改、安装或执行上游工程；README 的隐藏测试通过仅是作者声明。

五个公开配置（FP16）：`[32,4096]`、`[256,1024]`、`[1,4096]`、`[1997,3037]`、`[2048,4096]`。另加 `[4,4097]`、`[4,8193]` 作为本轮源码边界配置，不能称为上游已运行用例。

模型使用 48 AIV/core 0 作为分析参数，不是实机探测结果；Host 实际使用 GetCoreNumAiv。

### 重建出的实现关系

- 整行分支：gamma 每核加载；处理当前行前预取下一行；输入由 TQue 分配释放；输出按 `row & 1` 使用两组显式 TBuf，隔两行等待 MTE3 写回后复用。
- 分块分支：第一遍转 FP32、相加、归约后释放；第二遍重读 X/residual，输出 residual_out，加载 gamma、归一化、输出 Y；输出改走 TQue。
- 主图只展示前三行，保留窗口外下一行预取；显示窗口截止不等于释放。
- InitBuffer 在分支前统一分配：`46 * tileElems + 64 B`，tile=4096 时为 `184.0625 KiB`。含当前分支未用的缓冲，不是实测 UB 峰值。
- TQue 的图上逻辑排布不代表已知物理槽；显式 TBuf slot 才由源码 row&1 支持。

### 有价值的发现

1. 公开用例 H 都不超过 4096，未覆盖分块分支。
2. 整行先 FP16 Add 再 Cast；分块先 Cast 再 FP32 Add。存在舍入路径差异，需要 H=4096/4097 的设备误差对照；CPU 算术例子不能证明用例超容差。
3. 显式输出槽与输入队列的证据不同，不能统一画成已知物理槽。
4. H=3037：每行有效 6074 B，对齐 6080 B、padding 3 个 FP16；归约及写回按有效长度。

本轮没有调用 CANNBot 950 性能引擎，没有 910B 定量性能预测，没有 NPU 正确性或 profiling 结果。

## 5. 当前文件职责与运行

以下文件均在独立 demo 目录中：

| 文件 | 职责 |
| --- | --- |
| `model.py` | 固定版本源码适配器、事件/生命周期、容量、发现、逻辑分轨 |
| `sources.json` | 固定版本源码全文及来源 |
| `model.json` | 7 配置生成模型 |
| `page.html` | 页面源模板、样式与控件壳 |
| `app.js` | 图形、选择联动、分屏、核查、Info、调查交接 |
| `build.py` | 嵌入数据、共享图元及 Liquid 资源生成 index.html |
| `index.html` | 独立页面产物，勿只改产物 |
| `verify.py` / `validation.json` | 模型检查及结果 |
| `browser-validation.json` | 浏览器实测链路与未验证项 |
| `REVIEW.md` | 表达约定、实现分析、证据范围 |
| `preview-ui-fixed.png` | 最近 UI 修复截图；图像内容格式以实际编码为准 |
| `serve.py` | 仅回环地址、文件白名单预览 |

从仓库根目录运行（所有 Shell 命令用 rtk 前缀）：

```sh
rtk proxy python3 ai-infra-research/prototypes/fused-add-rmsnorm-independent/build.py
rtk proxy python3 ai-infra-research/prototypes/fused-add-rmsnorm-independent/verify.py
rtk proxy node --check ai-infra-research/prototypes/fused-add-rmsnorm-independent/app.js
rtk proxy python3 ai-infra-research/prototypes/fused-add-rmsnorm-independent/serve.py
rtk proxy python3 ai-infra-research/scripts/validate_catalog.py
```

index.html 已内嵌脚本/数据，结构上可静态打开；本轮未完成 file:// 浏览器验证。源码外链仍需要网络。build.py 依赖本 checkout 的原 RMSNorm 渲染器和系统 Liquid 资源。

## 6. 最近 UI 回归与修复

用户指出新 demo 没复用 Liquid、核查变成居中 modal、Info 不合规范；截图还有同队列并发 Tensor 相互覆盖。

根因是复用了图表 renderer，却重新搭建了一套不符合原交互契约的壳；重叠则是主图未为并发生命周期分轨。不能把绘图重叠直接解释为设备内存踩踏。

已改：
- 引入共享 `methods/design-spatial-systems-ui/assets/liquid-glass-controls` CSS/JS。
- 底部控件统一分组 Liquid；顶部 icon 保持用户此前要求的灰色 fill，无文字 shadow。
- 核查改为可拖动侧边浮层，不打开居中 modal；定位后列表稳定。
- Info 独立说明窗口，按价值→使用→扩展→方法/来源，包含 prompt 复制及反馈。
- 当前对象面板带唯一 ID、固定源码、可编辑问题、交接预览、复制与 JSON 导出入口。
- 主图和内存图消费同一逻辑 displayBand/displayOffset；并发区间不互相遮盖。

验证：973 项模型检查通过；app.js 语法、git diff --check 通过。浏览器验证了核查定位仍保留三项、继续调查带入源码和可编辑问题、Info 结构与 prompt 复制成功、Liquid 样式。其他先前代表链见 browser-validation.json。

仍未验证：所有 7 配置的完整浏览器链路、用户截图分辨率下全面验收、设备正确性、实际 DMA 重叠、实际核数、file:// 打开。复制 prompt 已实测；导出 JSON 控件存在，不应把存在当成已完整测试。

## 7. Git / 发布状态，务必区分

本次整理时 HEAD 为 `3243150`（Exclude raw RSFA reference from Jekyll rendering），此前有 `70e7b07`（Refresh generated skill download archives）。本轮未重新核对远端与 Pages 部署。

独立 demo 整个目录当前 untracked，未注册 Library、未提交/推送。

工作区另有旧任务遗留修改：catalog/assets.json、首页/Pattern/Skill 生成页面、7 个 Skill zip、原 RMSNorm 原型与 Pattern 的 index/page/manifest。不要清理或覆盖它们，也不要把它们误归因于最近 UI 修复。要发布时先审阅 diff、区分源文件与生成物，再验证下载包和部署。

## 8. 新 session 建议从哪里接

1. 读本交接、仓库 AGENTS.md、独立 demo REVIEW.md 与两个 validation.json；核对当前 git status。
2. 先让用户确认最新 UI 修复是否达到预期；不再从零重搭壳。
3. 若继续验证稳定性：补齐 7 配置代表操作、边界/选择/退出恢复，记录实际失败与适配成本；不要只堆静态检查数量。
4. 若继续领域验证：优先做 4096/4097 精度与分块覆盖的最小设备实验（需可用硬件环境）。
5. 若要第二个独立项目：候选为 https://github.com/sinpeyw/flagos-kernel-challenge-shanghai-2026 ，Triton/FlagTree 的 Add+RMSNorm+GroupQuant；本轮未适配，不可当成已验证。
6. 只有用户要求收录/发布后，才走 Pattern 发布流程；当前新 demo 尚未收录。

## 9. 必须保留的用户约束

- 先复用正式 Pattern、图元和 Liquid 系统；不要仅搬图表、另造 UI。
- 主体选型依据要回答的问题，坐标不得暗示不存在的时间数据。
- 选择必须使用真实实例身份；颜色有语义，非选中对象默认克制。
- 无文字阴影；Tab 胶囊，选中 fill+深色字，不用边框/外圈/shadow 伪装选中。
- 核查是侧边检查；Info 教程是独立窗口；内存复用是嵌入分屏。这三类不能混用。
- Hover 解释直接绑定相关区域，单一 tip，键盘可达；避免多余按钮。
- 不使用“教学模拟/教学纹理”等话术；准确交代源码推导、模型估算与设备实测的区别。
- 不改上游实现，不凭模型给出设备结论，不把 950 标定迁到 910B。

## 可复制到新 session 的启动语

> 请先读取 `/Users/yin/AI_Infra/ai-infra-research/docs/handoffs/2026-10-30-rmsnorm-visualization-session.md`，再核对当前工作区与相关验证文件。这是 RMSNorm 可视化迁移的续作，保留已有交互契约和未提交改动。先告诉我已完成和未验证的边界，再按我的下一条要求继续，不自动重做或发布。
