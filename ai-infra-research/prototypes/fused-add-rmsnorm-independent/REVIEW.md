# 独立开发者算子迁移验证

## 表达约定
- 问题：整行预取与分块再读，何时保留、释放、再次使用输入及输出缓冲？
- 主图：MTE2 / Vector / MTE3 / Scalar-Sync 的源码顺序和数据使用区间。辅助图：buffer 内申请或显式内容生命周期。
- 横轴：等宽源码事件；纵轴资源泳道。内存图纵轴共享源码步骤，横轴逻辑占位和请求尺寸，不推定 TQue 物理槽。没有耗时或重叠比例。
- 身份：case/core/event index 组合成唯一事件 ID；生命周期实例另有 ID、buffer、row/chunk、已知显式 slot 和 source line。不得按显示名当作同一个实例。
- 颜色：默认灰；当前事件按 MTE 黄 #FFE300、Vector #0BB48E；当前区间按原 Pattern Tensor 角色色。峰值白色2px。
- 状态：默认并排；选择只改变焦点；退出分屏恢复上次主图视角；切换用例重算模型和发现，不把旧配置发现带入新配置。

## 来源
固定提交 7729cdf7bc37d77bd3c82448414b77cea3e96637，仓库 llrnb666-arch/HPC101-AscendC-FusedRMSNorm。
取 Kernel、Host、case_specs 三个文件；Git blob 哈希与固定提交递归 tree 全部相符。
未修改、执行或安装上游工程。README 的隐藏测试通过是作者声明，本轮没有复核设备结果。

## 迁移结果
复用原 RMSNorm Pattern 的 GridTensor、PtoSwimlaneTaskPattern 和 PtoMemoryReuseViewer；新建独立于 DOM 的固定版本模型适配器。没有改原 demo，也未注册 Library 或推送远端。
五个公开用例均为 H<=4096；新增 [4,4097]、[4,8193] 仅用于覆盖源码分块与尾块。不能称为上游已运行测试。
整行：首次加载 gamma；当前行迭代前预取下一行；输入由 TQue 分配/释放；输出用 row&1 显式 TBuf，隔两行等待写回后复用。展示前三行并保留窗口外下一行预取，截断不当作释放。
分块：第一遍转FP32、相加、归约并释放；第二遍重读X与residual、输出residual_out，再加载gamma并写y。输出改走TQue，不沿用整行显式输出槽。
InitBuffer 在两个分支之前统一分配，合计 46*tileElems+64 B；4096 tile 时为184.0625 KiB。包括当前分支未使用的另一分支缓冲。此值不是实测UB峰值。

## 有用的调查结果
1. 五个公开用例没有覆盖 ProcessChunkedRows。补充边界用例需要设备正确性测试。
2. 整行先 FP16 Add，分块先 Cast 再 FP32 Add；分支切换可能改变舍入。CPU小例可以证明算术差别，但不能证明当前用例超出容差。
3. 显式输出slot可从row&1定位，TQue槽不明；图中只按逻辑占位排布，不制造物理映射。
4. [1997,3037] 每行有效6074B，对齐6080B，padding3个FP16；归约和写回使用有效长度。

## 验证层级
- verify.py：公开配置、普通/尾块、源文件哈希、依赖顺序、唯一身份、容量及分核独立参考检查。
- app.js：node --check。
- 浏览器代表链：单独记录 browser-validation.json；不把静态检查当视觉验收。
- 未编译或运行NPU，不提供理论时延，不迁用950标定到910B。

## 对“稳定输出”的结论
这轮验证的是同一交互结构能迁移到第二个独立实现，以及一个固定版本适配器能覆盖7个配置；尚不能声称任意算子自动稳定生成。
阻力主要在语义适配：双分支、行预取、显示窗口截断、显式TBuf与队列生命周期、算术精度不同。只替换旧模型数字会丢失这些关系。
下一步可对第二个比赛项目按同样表达约定独立适配，再比较人工补模型的工作量、关系错误和交互返工；本轮不把经验直接写成通用解析能力。

## 运行
index.html 全部脚本和数据内嵌，可双击打开。源码外链需要网络。
python3 serve.py 仅在127.0.0.1:8820提供此单页，不暴露目录。
python3 build.py 重建；依赖本 checkout 中已定稿 RMSNorm Pattern 和共享 Memory Reuse Viewer CSS。

## UI contract repair

Restored shared liquid-glass resources and grouped controls. Audit uses a draggable side panel; locating a finding preserves the list. Info is an independent value/use/extend tutorial with a copyable prompt and accurate source/method boundaries. Object inspection supports editable investigation context and JSON export. Concurrent lifetimes use shared logical display bands and offsets in both views; these do not identify physical TQue slots. 973 model checks passed. Browser smoke verified audit locate/continue, Info structure and successful prompt copying; screenshot: `preview-ui-fixed.png`. Device memory correctness remains unverified.

## 910B 硬件对照补充
复用共享 memory-architecture 的 ascend910b preset（仅挂载一个 AIV 局部，不挂载草稿 AIC）。Liquid 紧凑可拖动/缩放浮层随当前事件 lane 关联 GM/L2/MTE2、UB/Vector、MTE3 或 Scalar/Sync；开关保持主体视角，配置切换更新当前事件与申请量。
来源：https://asc.gitcode.com/guide/programming_guide/advanced_programming/hardware_implementation/architecture_spec/npu_arch_2201.html ，2026-10-30 核对 A2 AIC/AIV 分离与 1:2 配比、UB 192 KiB/32B 对齐。可分配空间随工具链预留变化，未从标称容量推断本工程可编译。48 AIV 仍为分析参数；未移用 950 SIMT/ND-DMA Cache/性能标定。

## 地址与生命周期证据修正（2026-10-30）
当前图区间不能同时代表缓冲预留、数据有效期和指令访问。已分离 reservations、contentValidity 和 instructionAccesses；没有采集的地址、时间保持未知。显示终点改为 endLine，只有明确的 FreeTensor 才设置 queueReturnLine/freeLine，且不解释为 UB 预留释放。详见 CAPTURE.md。此前“申请/内容生命周期”的评价应限于源码步骤模型，不能证明执行时访问了同一物理地址。
