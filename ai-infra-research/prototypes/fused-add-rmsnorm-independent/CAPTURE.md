# Fused Add RMSNorm：编译与仿真证据接入

## 本轮状态
保留 910B 实现及固定版本 `7729cdf7bc37d77bd3c82448414b77cea3e96637`。本机 Darwin arm64，PATH 未发现 ccec、msprof、cannsim，常用 /usr/local/Ascend 目录不存在。尚未编译、仿真或采集；这不是远程环境不可用的判断。

## 三层模型
| 层 | 当前证据 | 不可推断 |
| --- | --- | --- |
| 缓冲预留 | InitBuffer 的 buffer、尺寸、源码行；reservations 单独记录 | 真实 UB 起址、运行期开始/释放时间 |
| 数据有效 | 当前 life 仍为源码使用/队列持有显示范围；contentValidity 起止为 null | DMA 发起即写完、末次读取即失效、等待结束即释放 |
| 指令访问 | instructionAccesses 为空，等待原始记录 | 从逻辑 offset 生成物理地址或从步骤宽度生成时长 |

FreeTensor 仅作为 queueReturnLine；freeLine 兼容字段仅允许显式 FreeTensor。endLine 表示显示终点；endpointKind 区分队列归还、复用等待、写回等待、窗口截断和最后建模使用。UB 预留不会随 FreeTensor 消失。数据有效范围还需要写入完成、覆盖、依赖和所属数据版本；只观察到访问不能自动得出完整有效期。

## 最小采集包
1. run manifest：源提交、Kernel/Host/tiling 哈希，准确 SOC 型号，CANN/编译器/仿真器版本，完整构建与采集命令、编译选项、环境容器标识。
2. 配置：shape、dtype、eps、种子、输入及 golden 哈希、实际 blockDim 和原始 tiling 数据；不要沿用页面默认 48 AIV 代替真实配置。
3. 编译产物：原始 kernel binary/object、符号和调试信息、反汇编、源码映射；保留 SHA256。
4. 原始报告：完整 dump、每核 instr_exe.csv、trace.json、code_exe.csv 及存在的访存请求日志；保留工具原始目录。不能只交截图、汇总带宽图或 RESULT.md。
5. 正确性输出：实际命令、退出码、误差/容差与完整校验日志。仿真通过和设备实测分开记录。

首个公开用例选 [1,4096] FP16、seed 1003、eps 1e-6，先确定单个活跃核的映射。随后 [32,4096] 观察行间队列复用；[4,4097] 是新增边界配置，必须标为 source-boundary，不能称为上游公开测试。

## 地址绑定与验收
- instr_exe.csv 的 addr 是 PC；作为 instructionPc 保存。detail 原样保留，按工具/ISA 版本解析 src/dst 和 memorySpace，不把 PC 当 Tensor 地址。
- CSV 含 call_count 等汇总字段；不能把每行当成单次带时间的访问。只有存在动态身份和时间的原始事件才能接时间轴。
- 访问身份至少含 run、kernel invocation、core、subcore、memorySpace 和动态事件 ID；数值相同的跨核 UB 地址不代表共享存储。
- 保留 burst、stride、重复次数、长度单位及原始字段。未知单位或不支持指令返回 unresolved，不默认连续字节范围。
- 将实际访存区间绑定到编译后的分配区间，需要地址映射/符号证据；只有源码行相同仍是候选绑定。同一地址在不同数据版本间的访问不能直接合并成一个 Tensor。
- 确认复用必须同时证明同一运行、核及地址空间的地址区间重叠，以及两个不同逻辑实例的对应关系和顺序。末次读不生成 release，窗口结束不生成 free。
- 解析器测试材料标记 fixture，不进入本算子的观测数据。没有原始格式样本前不编写猜测性的通用 detail 解析器。

## 备选采集路线与已核对来源
- Cryspia RMSNorm RESULT.md 记录 Ascend950PR_9599 构建、Ascend950 仿真，并列出 instr.bin、tracing JSON 和访存报告路径。这是作者结果摘要，不是本轮采集；950 结果不得绑定成当前 910B 结果。
  https://github.com/Cryspia/cann-api-explorer/blob/main/examples/ascendc/highlevel/rmsnorm/RESULT.md
- 若 910B 环境不可用，可用该项目 RMSNorm 建立独立 run 跑通接入；MatMul 再用于 L1/L0。先固定其提交、环境版本和产物哈希。
  https://github.com/Cryspia/cann-api-explorer
- msopprof 格式文档确认 addr=PC、detail 可包含源/目标地址、长度和 stride；trace.json 提供指令流水。实际接入还须核对所采工具版本。
  https://github.com/Ascend/msopprof/blob/master/docs/en/user_guide/msopprof_simulator_performance_data.md
