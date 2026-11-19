# 文案与语义核对 · 2026-11-18

| 内容 | 官方来源 | 本例取舍与验证 |
|---|---|---|
| Pre-Norm、Attention/FFN、残差 | [PyTorch TransformerEncoderLayer](https://docs.pytorch.org/docs/2.15/generated/torch.nn.TransformerEncoderLayer.html) | 选择norm_first；不是PyTorch默认值。保留两个Norm、残差及其反向路径。 |
| 线性层、形状 | [PyTorch Linear](https://docs.pytorch.org/docs/2.15/generated/torch.nn.Linear.html) | 按Y=XW写公式，W为输入×输出；与nn.Linear存储转置。T8/H8/F16/4heads是案例配置。 |
| 输入梯度、参数梯度、缓存 | [PyTorch Autograd mechanics](https://docs.pytorch.org/docs/2.15/notes/autograd.html) | dX=dYWᵀ、dW=XᵀdY为代数推导。有限差分独立核对。两者是同次反向，不是两次训练阶段。 |
| 注意力、Mask | [PyTorch SDPA](https://docs.pytorch.org/docs/2.15/generated/torch.nn.functional.scaled_dot_product_attention.html) | 因果Mask、每头宽2，无Dropout；QKV/P是数学依赖而非强制存储清单。 |
| GELU | [PyTorch GELU](https://docs.pytorch.org/docs/2.15/generated/torch.nn.GELU.html) | V=UΦ(U)，反向依赖U，形状不变。 |
| TP与SP | [Megatron Core layers](https://docs.nvidia.com/megatron-core/developer-guide/latest/apidocs/core/core.tensor_parallel.layers.html) | 列/行并行配对；无SP时输入梯度AllReduce；SP时AG输入、RS输入梯度。TP可取1/2/4，SP在TP>1时启用。 |
| AG/AR/RS | [NCCL Collectives](https://docs.nvidia.com/deeplearning/nccl/user-guide/docs/usage/collectives.html) | 激活AG不是参数AG。RS明确为sum后按token行分片。数值代数与TP1/2/4分片用独立脚本验证。 |

所有当前可点击节点都由training-graph.js生成文案与docs字段；content.js拒绝缺少核对来源的节点。官方链接进入阶段说明与节点检查器。旧报告中的措辞不再作为详情fallback。

反向取数阶段是本例的缓存策略比较：完整输入可保留，或仅保留序列分片后重新AG。图不宣称所有训练实现都必须重新AG。没有接入Trace，因此节点位置、主进度和动画不编码耗时或实际执行顺序。

范围：省略batch维、偏置梯度、Norm参数梯度；展开Norm输入梯度及两个残差分支梯度。模型源码为本例model.py，不是用户真实模型的抽取。

## 专家规模参数

新增列定义 Wr[j,e]=2sin((e+1)(j+2)1.37)，j=0..2，e>=4，其他特征权重为0；原四列不变。该路由样本与符号训练图独立。每专家 H×F+F×H=256 参数，Router H×E=8E，Top-2 单 token 使用 2×256+8E。负载仅统计样本8行，分配总数16；EP 并未改变该统计口径。
