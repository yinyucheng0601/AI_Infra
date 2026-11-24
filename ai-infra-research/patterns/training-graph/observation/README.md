# EP 交换采集与样本契约

新版通用设计见 [OBSERVABILITY-SCHEMA.md](../OBSERVABILITY-SCHEMA.md)。本目录保留旧 Mock 格式；生成器与校验器尚未迁移，不验证新版契约。公开 NCCL 样本在离线输出的 trace-audit 目录，不能接作 Ascend 观测数据。

状态：旧确定性 Mock 保留；新增 v1 核心 adapter/校验及 2.5D 指标叠加，见 [IMPLEMENTATION.md](IMPLEMENTATION.md)。未实现 Ascend 实测 adapter。未发现本机 npu-smi，未执行设备采集；这不是对远程硬件可用性的判断。

运行 `python3 ep_exchange.py` 生成并校验 mock-ep64-baseline.json。校验器目前专用于本 Mock 契约，不宣称验证任意真实 Trace。

## 样本口径

64 Rank、256 专家、Top-2、每 Rank 64 token、BF16 hidden7168。编号与专家连续分配均为构造规则，不代表某次生产部署。路由确定性生成，无随机数。

exchange 记录 Dispatch 的逻辑 source→destination token 数；同一 token 发往同一目的 Rank 只计一次。expertAssignments 则计专家命中次数，两者不能混算。logicalActivationBytes 仅计算 BF16 激活，不含权重、索引、padding、协议或实际链路流量。Combine 仅有构造阶段事件，没有伪造反向传输字节矩阵。

128 个事件为两阶段的构造时间，跨 Rank 共用场景时钟。两阶段之间的间隔没有专家 GEMM 证据，不表示专家计算实测。placement、physicalTransfers、dependencies 留空。

## 真实采集导出清单

采集应单独保存 run manifest、group membership、routing snapshot、exchange counters、raw profiler events、placement 和 source references。manifest 必须包含仓库 commit、工具链、设备型号、模式、seed、输入规格、轮次、计时 pass、原始文件哈希。

每条原始事件至少保留 rank、phase、iteration、pass、原始事件 ID、clockId、开始/结束及单位。跨 Rank 时钟校验前不能计算晚到差。不同 profiling pass 不拼成一次执行。

在计时区外导出 topk 与 handle 计数，记录对应轮次。读取主机/设备身份，不以启动进程数推导 NPU 数或物理路径。训练接入另外记录 layer、microbatch、专家 GEMM 和消费者依赖。

真实通信测试使用构造路由时：路由来源为 generated/configured，设备事件为 measured，逻辑交换矩阵为 derived；禁止以一个全局 real 标签覆盖全部字段。

## 验收

已运行正向校验，以及缺成员、错误交换量、错误负载、缺阶段事件四种拒绝检查。此结果只证明样本内部一致，不证明设备性能或浏览器效果。下一步为实现真实采集适配器并取得设备输出；本目录尚无真实样本。
