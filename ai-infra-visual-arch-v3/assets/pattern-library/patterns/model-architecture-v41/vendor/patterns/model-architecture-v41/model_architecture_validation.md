# DeepSeek V4.1 Flash 1017 · 架构解析

## 输入与范围

- 输入：用户提供的 DeepSeek-V4.1-Flash-1017 本地源码目录。
- 来源清单 revision：`1bae0e1088993b9b82de08f59de5be5a34e42170`。
- 清单中 28 个源码、配置、说明和编码样例文件全部逐一核对 SHA256；无差异。清单本身为额外元数据文件。
- `inference/config.json` 决定发布模型的执行形状，`config.json` 交叉核对 HF 配置。没有采用 `ModelArgs` 的小模型尺寸默认值。
- 静态源码解析覆盖模型主干、视觉、Engram、跨层共享、DSpark 前向。没有加载权重或执行 GPU 推理；不包含性能观测或编译映射。
- `inventory.json` 记录全部文件、角色和 Python AST 符号行区间。页面的源码抽屉读取 `sources/` 中已打包的内容，不依赖采集目录。

## 主干与 V4 的关键差异

| 结构 | V4.1 实际配置 / 路径 | 证据 |
| --- | --- | --- |
| 主干 | 40 层；隐藏维度 5120；词表 129280；mHC 4 路 | inference/config.json；Transformer.__init__ |
| 注意力 | 64 个 Q heads，head_dim 512，Q LoRA 1280，RoPE 尾部 64；输出分 8 组，秩 1024 | Attention.__init__ |
| 窗口 | 所有层保留 128 token 的窗口；Prefill 直接使用当前块的 KV，Decode 使用环形缓存 | Attention._window_kv |
| 压缩策略 | L0–1 为窗口；L2–19 ratio 2；L20–39 ratio 1；3 个 DSpark stage ratio 0 | compress_ratios；Compressor.forward |
| KV 来源 | L2、L8、L14、L20 产生压缩 KV；消费者读取最近一个来源层；ratio 1 仅投影和归一化，不做软池化 | Attention._compress_kv |
| 索引来源 | L2、L8、L14、L20、L24、L28、L32、L36；索引 K 从 KV 源层的未旋转 latent 派生；其他层复用位置结果 | Indexer.forward；Attention._compress_topk_idxs |
| 两级候选 | L20 按 8 个位置一组，保留最多 2048 个候选块并保留最新块；后续索引源层使用候选掩码，再取 512 个位置 | select_candidate_blocks；Indexer.forward |
| mHC | 当前 Attention 的 pre 系数给当前 FFN；当前 FFN 的 pre 系数给下一层 Attention；post/comb 用于当前残差合并 | Block.forward 973–996 |
| MoE | 所有主干层 384 路由专家、每 token 6 个，另有 1 个共享专家；sqrtsoftplus、归一化路由权重、1.5 倍缩放；视觉 token 有独立选择偏置 | Gate、Expert、MoE |
| Engram | 进入 L1、L14 前注入；2/3/4-gram ×8 heads ×256；图像 span 不参与 n-gram，不获得 Engram 注入 | Transformer.forward；Engram.forward；NgramHashState |
| 视觉 | 14×14 patch，32 层 ViT，1024 维、16 heads；双向 SDPA 与二维 RoPE；3×3 空间合并后通过 Aligner 映射到 5120 | vision.py；image_processor.py |
| 输出 | 最后 HC Pre → RMSNorm → LM Head，默认仅末位置 logits；模型 forward 内采样，并返回 output_ids、logits、main_hidden | Transformer.forward；ParallelHead.forward |
| DSpark | 独立 forward_spec，3 阶段、block size 5；草稿专家 128 选 3；Markov 秩 256；读取 L37–39 注意力前输入的 HC 均值拼接 | DSparkBlock；Transformer.forward_spec |

## 条件和精度口径

- `B`、`T`、运行时缓存容量 `S`、TP、每次专家分配数量均为动态量；`C` 表示已完成的压缩位置数量，ratio 随层变化。图上的形状是源码推导，不是实测张量。
- HF 配置的最大位置为 1,048,576；ModelArgs 的 `max_seq_len=4096` 是缓存分配运行时默认值，二者不能混为同一容量。
- 本参考实现中量化函数可能对 BF16 张量执行原地量化再反量化；图上的 FP4/FP8 标记描述量化操作，不声称所有缓存物理存储都是打包的 4/8 bit。
- Compressor ratio 2 的不完整组在 `kv_state/score_state` 中跨 Decode step 保留；图中包含状态写入，历史读取的递归时间语义在状态属性和源码中保留，不展开无限时间轴。
- Indexer 必须先消费 Pre-RoPE latent，再由 Attention 原地旋转和量化以更新压缩缓存。
- DSpark Prefill 只填窗口缓存，start_pos=0 的 forward_spec 返回 None；Decode 才执行完整草稿 block 和预测 head。
- `generate.py` 未调用 forward_spec；本页面保留独立调用分支，不画成普通自回归生成的必经路径。
- Embedding 和 LM Head 参数各保持一个身份，在主干与草稿前向之间共享；每个调用仍有独立计算节点。

## 图形实现

- `model_architecture.json` 是静态事实层；`model_architecture_graph.json` 是完整含层级的输入契约，含 40 个具体主干层。
- `adapter.js` 仅做折叠投影、前后层范围聚合和布局；所有连接由 JSON 端点解析，不从视觉顺序推断拓扑。
- V4 定稿 CSS 和 Model Graphviz 直接引用；网格与 hover 装饰来自定稿呈现，路由增加了通道以容纳 V4.1 的共享依赖。
- 逐层切换、L0/L1/L2、模块原位展开/折叠、残差整线高亮、拖拽、缩放、深浅色与源码定位。
- 本页独立交付，未更改 V4 定稿或其 Library 快照。

## 验证

- 28 文件 SHA256 和主干/HF 配置交叉校验。
- 事实 JSON、层级 JSON 的唯一 ID、端点、来源与无环检查。
- `validate.cjs` 覆盖 40 层 ×3 层级、局部折叠以及视觉/DSpark 全展开，共 127 组；检查图元一致高度、图元重叠、正交路线缺失和连线穿越节点。
- 浏览器检查基于 1280×720：首屏、L0/L1/L2、Query 模块展开/折叠、L20 切换、HC Pre 源码定位到 959–962 行、深浅主题、Vision / Engram / DSpark 分支定位、画布拖拽平移和滚轮缩放；控制台无错误。
- 不将以上结构验证等同于模型数值或 GPU 执行验证。未穷举所有模块折叠组合。

## L0 single-layer navigation (2026-10-23)

Keep the paper’s Causal Encoder (L0–19) and Decoder (L20–39) grouping, with only the selected layer expanded. Non-selected layers remain compact range placeholders; do not combine Full/Reuse/Reindex layers into operator-like capsules. L1/L2 expand the same selected layer. External cache/index producers folded in a range are shown by source-layer-labelled input tensors; metadata.externalReferences retains the corresponding canonical edge IDs. No topology is invented.

The reference Transformer.forward executes all 40 layers sequentially; the viewer does not claim optimized CED prefill scheduling.
