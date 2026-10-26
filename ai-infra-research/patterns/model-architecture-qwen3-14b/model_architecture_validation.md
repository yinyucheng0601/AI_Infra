# Qwen3-14B 架构来源与验证

## 模型事实

- 官方模型配置固定到 Qwen/Qwen3-14B 的 d17b97ca036704c156b50686b3f4551e224bbe03；源码来自 Transformers v4.51.3。
- 40 个 Decoder 层，hidden 5120，FFN 17408；40 Q heads / 8 KV heads，head_dim 128，GQA 比例 5。
- 每层：Input RMSNorm → Attention → Residual Add → Post Attention RMSNorm → Dense SwiGLU → Residual Add。
- Attention：Q/K/V Projection → Q/K head-wise RMSNorm → Q/K RoPE → 按层 KV 状态 → GQA → Output Projection。
- GQA 的展开采用官方 eager_attention_forward 数学路径；实际 backend 可用 SDPA / Flash Attention，图不声称这些算子独立启动。
- LM Head 与 Embedding 不共享权重；vocab 151936。S 是包含历史的 KV 序列长度，T 是当前输入长度；decode 通常 T=1。
- 选择单层时只投影该层，不同时绘制其他层；X/Z 的第二行标明来自/送入层。模型输入与最终输出保留作上下文，不虚构跨越未显示层的直接边。

## 用户提供的 Paged Attention

`06_paged_attention_dynamic.py` 是独立实现根：Page Lookup / K,V Slice → QK Matmul → Valid Columns → Softmax Prepare → PV Matmul → Online Update。初始化 m/l/o，按物理 KV block 迭代，末块写出 o/l。

Softmax Prepare 将 exp 先转 BF16 再转 FP32 求和；CUBE 执行 QK/PV，VECTOR 执行归一化与累积。当前 orchestration 向 Softmax Prepare 传入 scale=1.0，不能直接当成官方 Qwen3 的 128^-0.5 缩放。示例接口没有显式 Qwen3 GQA KV-head 轴，未建立与采集内核的一一映射。

## 采集来源

`collect_qwen3_profiles.py:108` 加载 get_contract("qwen3", "14b").load_kernels()；163 行调用 prefill_fwd，181 行调用 decode_fwd。保留 TP=1 运行入口作为独立根。

所提供本地树中没有找到 contract.registry、pypto_qwen3_adapter 或 fused 内核源码。不能由采集脚本或同名示例推断 fused kernel 内部。

Toolkit Studio 的 demo-v2.js:1216 指向 Paged Attention 示例；邻近 qwen3_jit/config.py 明确是 Qwen3-32B（8192 hidden / 64 heads），不作为 14B 配置来源。

## 校验

- canonical model_architecture.v1 校验通过；所有节点及边有来源。
- 三种视图的 L0/L1/L2 投影：节点有界、路由失败数为零。
- 采用已确认 V4.1 的图元、圆形残差加号、两行张量、OP 图标、折叠与源码检查。
- 未运行模型推理、未采集新的性能数据。未提供对应运行期输入，因此张量 B/T/S 为符号维度。

浏览器验收：单层切换至 L24、L1/L2 展开、Attention 折叠往返、源码面板、浅色主题、PA 与运行入口切换均通过。0/24/39 × L0/L1/L2 九组投影无节点重叠、无路由失败。
