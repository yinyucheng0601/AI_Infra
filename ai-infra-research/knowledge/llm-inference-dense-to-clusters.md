# LLM 推理全流程：从单卡到集群

从单卡 Dense 模型逐 Token 生成出发，以 23 节图解解释 KV cache、多卡协作、MoE 与生产推理服务。

## 阅读提纲

- Prefill 与连续 Decode
- Dense 模型层内计算与 KV cache
- 多卡 Dense 的 TP、PP 与副本
- MoE 专家路由与多卡执行
- 生产集群、资源池与请求调度

## 来源与验证

来源：`reports/llm-compute/llm-inference-dense-to-clusters-v1.html`。
2026-09-21：按用户要求收录并发布，封面直接提取源页面的 Prefill / Decode SVG 并转为浅色；未独立复审技术结论。
