# 通信观测数据 Schema

版本：`communication-observation.v1` · 日期：2026-11-23\
状态：规范草案；已实现 JavaScript 适配与核心校验（`observation/model.js`），不是完整 JSON Schema 校验器。配套方案见 [OBSERVABILITY-UPGRADE.md](OBSERVABILITY-UPGRADE.md)。

## 1. 设计目标

同一数据集支持 2.5D Rank 叠加、对象详情、交换矩阵与按需时间线。数据不包含固定泳道、绘图坐标、颜色或八 Rank 限制。Ascend 会话使用 Ascend 证据；公开 NCCL/CUDA 样本保留自己的技术栈，仅作为独立解析验证输入。

基本关系：Run → Rank/Group/Resource；Context → Occurrence → RankEvent；MetricObservation 指向任意一个被观测对象。物理网络与逻辑通信分别建模，通过有证据的映射连接。

## 2. 文档信封与公共类型

顶层必填：`schemaVersion, run, sources, evidence, clocks, ranks, groups, contexts, occurrences, events, relations, resources, placements, topologyLinks, physicalPaths, exchanges, expertLoads, routeSamples, metricDefinitions, observations, capabilities, objectBindings`。集合可以为空；空数组只表示未提供记录，不表示已证明“没有通信/链路/专家”。

所有对象使用 session 内唯一且稳定的字符串 `id`；原始 ID 单独保留，避免不同 Rank 的同名 ID 冲突。`*Id`/`*Ids` 必须可解析。rankIndex 是运行中的 global Rank 编号，不是设备号。

### Fact<T>：语义与结构字段的来源

```json
{"value": null, "status": "unknown", "evidenceIds": [], "reason": "未取得通信域配置"}
```

`status`：`measured | derived | configured | mock | unknown`。已知值必须有证据；unknown 值必须为 null 并说明原因。适用字段包括硬件身份、group 语义、shape/dtype、并行配置、阶段标签、层/数据对象绑定。原始事件名、原始参数和 ID 通过事件 evidence 追溯，不给每个原始字符串重复包裹 Fact。

来源不能只用一个全局 real/mock 标识：真实设备事件可能消费构造路由；逻辑字节可能由 shape 推导；设备布局可能来自配置。

### Coverage：覆盖范围

`{expectedIds: string[] | null, observedIds: string[], completeness: complete | partial | unknown, evidenceIds}`。

完整性需要期望集合证据。未知 expectedIds 不得声称 complete。运行采集覆盖、通信组事件覆盖、指标有效样本覆盖分别保存，不相互替代。

### Source / Evidence

- Source：`id, uri, revision, sha256, license, format, producer, producerVersion, capturedAt`；未知元信息用 null。producer 区分 profiler、统计导出、配置、生成器。
- Evidence：`id, sourceId, locator, method, inputEvidenceIds`。locator 可为 JSON pointer、数组索引、CSV 行/列或源码位置；derived 项保存算法/版本及输入引用；mock 项指向生成规则/参数/seed。
- 未取得的文档或不存在的原始文件不能构造 sourceRef。字段来源强度与是否完整是不同维度。

### Clock / Alignment

Clock：`id, domain, unit, origin, rankIds, evidenceIds`，unit 显式为 ns/us/ms；不凭同单位认定同钟。

Alignment 记录在 Run 的 `clockAlignments`：`id, clockIds, targetClockId, transforms, maxErrorUs, validRange, evidenceIds`。只有经过核验的变换才能用于跨 Rank 比较；变换模型、偏移/漂移和误差需保留。未知误差不显示成精确晚到差。

## 3. 运行、参与者与物理结构

| 对象 | 字段 | 约束 |
|---|---|---|
| Run | id、scope、stack、worldSize、captureCoverage、config、clockAlignments、evidenceIds | scope 为 training/communication-benchmark/parser-fixture；stack 含 deviceFamily、backend、runtime 及版本 Fact；worldSize 为 Fact，不取文件数 |
| Rank | id、rankIndex、captureStatus、evidenceIds | captureStatus 为 captured/missing/unknown；不等同 device 在线状态 |
| Group | id、membership: Fact<rankId[]>、localRankMap: Fact、semanticAxis: Fact、evidenceIds | TP/DP/EP 等语义需配置证据；本地 Rank 与 global Rank 分开 |
| Resource | id、kind、identity: Fact、parentId、evidenceIds | kind 为 supernode/pod/server/board/npu/die/device/port/switch；层级取实际证据，不假设每 Rank 一个 NPU |
| Placement | id、rankId、resourceId、contextId、evidenceIds | 有效范围为一次运行或明确 context；逻辑画布坐标不属于 Placement |
| TopologyLink | id、endpointResourceIds、transport: Fact、capacity: Fact、evidenceIds | 描述存在的物理连接，不证明某操作实际经过它 |
| PhysicalPath | id、occurrenceId、eventIds、linkIds、direction、evidenceIds | 必须有该操作/事件到路径的采集或可核验推导；仅凭 Placement 不生成 |

captureCoverage 的 expectedIds 可能未知：worldSize=64、只提供八份 Trace，并不自动提供全部 64 个实际成员 ID 或子组成员表。

## 4. 执行身份与原始事件

| 对象 | 字段 | 约束 |
|---|---|---|
| ExecutionContext | id、iteration: Fact、microbatch: Fact、layer: Fact、direction: Fact、phase: Fact、evidenceIds | 未提供训练上下文时保留未知；Demo 的 step 不充当 iteration |
| Occurrence | id、contextId、groupId、operation: Fact、sequence: Fact、tensorSpec: Fact、match、eventCoverage、evidenceIds | 一次逻辑操作，非算子类型汇总；groupId 可 null；match 保存方法/输入证据与 verified/partial/unmatched 状态；可选 communicationKind: Fact 明确分类 |
| RankEvent | id、rankId、contextId、occurrenceId、rawName、category、backend、time、streamId、rawIds、attributes、evidenceIds | occurrenceId 可 null，允许只有真实本地事件；category 为 framework/runtime/device-communication/device-compute/counter/other/unknown |
| Relation | id、fromEventId、toEventId、kind、evidenceIds | kind 为 correlation/dependency/contains；ID 关联不能自动升级为执行依赖；相邻上下文不生成 dependency |

Event.time 为 `{clockId, start, end}` 或 null，保留原单位和原值；汇总统计不伪装成逐事件。异步 host 返回与设备完成分别为事件，不用 CPU API 时长替代设备耗时。rawIds 保存原字段名/值，包括 correlation、task、stream 等，适配器不能把不同体系 ID 当作同一语义。

匹配跨 Rank occurrence 时优先使用 run/group/operation sequence，并校验实际规格；其他策略必须有可验证证据。不按“第 N 个 AllReduce”、相同名字或最近时间配对。多个底层 kernel 可属于一个逻辑操作，一个融合 kernel 也可通过有证据的 relations/attributes 描述，不能硬拆成虚构事件。

## 5. 指标定义与观测值：2.5D 叠加的数据核心

MetricDefinition 与 MetricObservation 分离：定义说明“测什么”，观测说明“哪个对象、哪个范围、实际多少”。不预设每份数据都有 Trace。

MetricDefinition 必填：

- `id, name, unit, quantity, applicableTargetTypes`。
- `meaning, numeratorDefinition, denominatorDefinition`：非比值指标后两项为 null；明确包含/排除什么。
- `comparabilityKeys`：比较所需条件，如 phase、shape、dtype、计时 pass、设备、统计方式。
- `allowedAggregations`：允许 sum/max/min/mean/percentile 等；不是对每个指标开放全部方式。

MetricObservation 必填：

- `id, metricId, target: {type, id}`；type 为 rank/event/occurrence/group/exchange/expertLoad/topologyLink/resource。
- `contextId, occurrenceId, eventIds`：不适用用 null/[]，不以一个 Rank 的值冒充全组。
- `value, status, reason, evidenceIds`：status 同 Fact；缺失 value=null，真实零 value=0。
- `scope: {kind, memberIds, timeRange, iterationIds, passId, sampleCount, aggregation}`。kind 为 single-event/occurrence/window/iteration/summary；未知成员或样本数为 null，不猜测。
- `coverage`；聚合记录实际有效成员，缺失成员不以零参加均值。
- `derivation`：直接采集为 null；推导保存 formula、inputObservationIds 及所用 alignmentId。

| 建议 metricId | 口径 | 展示边界 |
|---|---|---|
| event.elapsed | 同一事件同钟 end-start | 本地执行时长，不是纯传输时间 |
| comm.wait | 来源明确给出的等待定义 | 没有该定义/采集不能用总耗时反推 |
| arrival.skew | 同 occurrence 中已对时的指定进入点 max-min | 必须定义进入点、覆盖与误差；部分覆盖仅报告已采集成员跨度 |
| logical.activation.bytes | dtype/shape 或去重 token 推导的激活 payload | 不含 padding/元数据/协议，不能标成物理字节 |
| transfer.bytes | 指定层级、方向的实际传输计数 | 区分 Rank/算法/端口层级，不能跨层相加 |
| link.throughput | 同链路、同时间窗的字节/时间 | 不是 collective 算法带宽，不由 kernel elapsed 推导 |
| expert.assigned.tokens | 指定 context/expert 的专家命中次数 | 与目的 Rank 去重 token 数分开 |

单位与口径由 definition 决定，不允许 UI 按字段名字猜测。候选异常只在有明确基线/阈值规则时产生派生 observation，并保留比较输入，不根据最长 kernel 自动诊断网络故障。

## 6. 逻辑交换与 EP 扩展

- ExchangeRecord：`id, contextId, occurrenceId, phase: Fact, srcRankId, dstRankId, tokenCounting: Fact, evidenceIds`。计数和字节统一放 observations，避免一个 payloadBytes 同时表示推导和实测。逻辑关系不是物理传输路径。
- ExpertLoad：`id, contextId, expertId, ownerRankId: Fact, computeEventIds, evidenceIds`。routed/assigned/padded/dropped token 使用不同 metric；无 GEMM 不补事件或时长。
- RouteSample：`id, contextId, tokenId, sourceRankId, expertIds, destinationRankIds, evidenceIds`。只在有路由快照时提供；token 身份限定 context，不跨 batch 复用。
- 同一 token 去同一目的 Rank 一次，可能命中多个专家；目的地去重 token 数与专家展开数不能混算。Dispatch 与 Combine 不默认字节完全相同，不伪造反向矩阵。
- EP64 不足以反推 TP、服务器数、专家数、top-k 或 NPU 数；每项从实际配置取得。

## 7. 能力判断与视图绑定

Capability：`id, state: supported | partial | unsupported | unknown, scopeRef, evidenceIds, reason`。建议能力项 local-events、rank-metrics、verified-occurrence、cross-rank-timing、logical-exchange、placement、physical-path、compute-dependency、model-binding。supported 需满足实际条件，不能让声明绕过事实校验；同一 session 不同组可以能力不同。

| 视图行为 | 最低输入 |
|---|---|
| Rank 数值/短条叠加 | rank 目标 observation、明确口径与覆盖；多 Rank 比较需满足 comparabilityKeys |
| 内部色带关联高亮 | 明确的数据角色 ObjectBinding；不能由 AllReduce 名称猜为 DP 梯度 |
| 通信组参与高亮 | Group.membership；不自动画所有点对点流量 |
| 定向交换关系与矩阵 | ExchangeRecord 与相应 observation |
| 灵衢物理路径/链路负载 | 有证据的资源映射、TopologyLink，操作路径另需 PhysicalPath |
| 本地时间线 | 有 time 的 RankEvent 与 Clock；关联箭头按 Relation.kind 区分 |
| 跨 Rank 到达/等待比较 | verified occurrence、对时、定义明确的进入点；等待另需指标证据 |

ObjectBinding：`id, targetRef, semanticObjectRef, role: Fact, evidenceIds`。连接来源对象与已核验的模型/数据角色，不允许把 NCCL 事件绑定到 Ascend 设备。图元实体 ID 由视图生成，不写回采集数据。

ViewState 独立保存 `sessionId, selectedContextId, selectedOccurrenceId, selectedRankIds, selectedMetricId, expandedResourceIds, timeWindow, categoryFilter`；允许只选本地 event。现有“全部”通信类别过滤保留，与观测焦点是不同维度。坐标、相机和布局为视图状态；不构造假的 Placement。

一次只显示一个性能指标；保留现有语义色，用中性短条和白色数值表达指标。Traceview 是消费者之一，不是 schema 的必需输入。

## 8. 两类合法的最小输入

**Ascend 聚合样本（尚未取得）**：Run.stack 对应 Ascend；Rank + 统计来源 + event.elapsed 或来源明确定义的阶段指标，scope=summary 且保留轮次/pass/聚合。events 可以为空；允许 Rank 指标叠加，不允许虚构时间条、跨 Rank 晚到或物理路径。

**已审计的 HTA 本地链（GPU 独立验证）**：worldSize=64，八份文件覆盖；Rank0 三条已关联 CPU/Runtime/GPU 事件；backend=nccl。可建立本地 correlation；group/跨 Rank occurrence/对时/模型绑定保持未知。可验证本地事件展示，不能填进 Ascend session。具体输入见离线输出目录 trace-audit；本规范不重复复制原始数据。

## 9. 校验与迁移

核心校验已覆盖身份/引用、事件时间、来源与缺失值、指标目标/聚合和技术栈冲突；以下为完整验收要求，跨时钟变换、依赖环与所有扩展对象尚未完成自动校验：

1. 版本、类型、全局唯一 ID、引用完整；未知与零分开，状态与 evidence 一致。
2. 技术栈兼容：设备/事件/backend 的冲突被拒绝；不能通过重命名将 CUDA 变成 CANN。
3. 事件 end≥start 且 clock 存在；跨时钟计算必须有有效 alignment 与误差范围。
4. group 完整性和采集完整性分开；verified occurrence 不允许仅按同名/序位匹配。
5. metric target、单位、比较条件、聚合方法与定义一致；重复覆盖不能重复求和。
6. 逻辑/算法/物理字节不同 metric；带宽分子分母同范围；不默认 elapsed=wait+transfer。
7. 无 Placement 不显示硬件归属；仅有拓扑不显示实际路径；仅 correlation 不宣布计算依赖。
8. 派生输入引用可回溯、无循环；原始字段和文件哈希保持可追踪。
9. 缺少 event/time 时仍能加载聚合指标；缺失字段不填造事件或设备关系。

现有 `observation/ep_exchange.py` 与 `mock-ep64-baseline.json` 是旧 EP Mock 格式，保持原文件及生成规则；后续通过 adapter 转换，不声称旧校验器验证本契约。迁移时构造路由映射为 mock，逻辑字节映射为 derived（输入仍可追溯到 mock），空物理对象保持空。

`trace-audit/real-rank0-allreduce.json` 通过 `fromRawLinked()` 转换；sourceIndex/哈希映射为 Evidence，原始事件原样保留。转换结果仅供独立 GPU 解析验证，NPU 画布拒绝导入。已实现 2.5D Rank 指标叠加与详情；实际浏览器连接超时，视觉与设备验证未完成。

## 10. 通信类型与指标导航

观测视图的主筛选为通信类别，不以指标名充当主导航。`Occurrence.communicationKind` 可选枚举：`tp/cache/dispatch/return/dp/edp/ep/pp/cp/unknown`，使用 Fact 保存来源；unknown 时 value=null。缓存取数需显式分类证据，不能仅凭 AllGather 名称判为缓存。没有显式分类时，从 group.semanticAxis 识别 TP/SP、DP、EDP、PP、CP；EP 的 dispatch/combine/return 名称用于分阶段，其他 EP 操作归 ep，语义缺失归 unknown。worldSize 不参与分类。

类型、组与数据角色分开：DP 域不能自动证明是梯度；主筛选使用 DP 名称，实际用途进入有证据的对象绑定。未覆盖类别保留筛选入口，结果为空且不沿用上一类的指标、操作或连线；unknown 不填零。主体选取当前操作的一个关键指标（接收 token 优先，其次本地阶段耗时），其余有效指标一起进入 Rank 详情，不再使用三项指标 Tab。

## 11. 显式拓扑模板配置

内置 Mock 在 `run.config.deployment` 保存 `{profile: "lingqu-950-template", evidenceIds}`，并在 resources/placements 保存有来源的 NPU 身份与 Rank 映射。NPU.identity.value 包含 index、slot、boardIndex、podIndex；连续落位规则是 configured，不是 measured。模板配置包含外围 CPU/DPU/NIC 与交换层的结构定义，渲染器直接复用来源 Pattern；不把模板连接当成 PhysicalPath 或传输测量。

导入不根据 worldSize 自动补此配置。宿主需要可解析的 profile、每个 Rank 的唯一设备映射及兼容坐标身份；没有这些字段不生成灵衢物理视图。不同设备与非连续映射需要显式配置，而不是改 Rank 编号伪装。
