
// Technical copy: audited against official docs on 2026-11-18.
// Matrix convention here is Y=XW (W is input×output), unlike nn.Linear's stored W.
const DOCS={
 moe:['Megatron Core · Mixture of Experts','https://docs.nvidia.com/megatron-core/developer-guide/latest/user-guide/features/moe.html'],
 parallel:['Megatron Core · Parallelism strategies','https://docs.nvidia.com/megatron-core/developer-guide/latest/user-guide/parallelism-guide.html'],
 model:['PyTorch · TransformerEncoderLayer','https://docs.pytorch.org/docs/2.15/generated/torch.nn.TransformerEncoderLayer.html'],
 linear:['PyTorch · Linear','https://docs.pytorch.org/docs/2.15/generated/torch.nn.Linear.html'],
 grad:['PyTorch · Autograd','https://docs.pytorch.org/docs/2.15/notes/autograd.html'],
 attention:['PyTorch · Scaled dot-product attention','https://docs.pytorch.org/docs/2.15/generated/torch.nn.functional.scaled_dot_product_attention.html'],
 gelu:['PyTorch · GELU','https://docs.pytorch.org/docs/2.15/generated/torch.nn.GELU.html'],
 tp:['Megatron Core · Parallel linear layers','https://docs.nvidia.com/megatron-core/developer-guide/latest/apidocs/core/core.tensor_parallel.layers.html'],
 nccl:['NCCL · Collective operations','https://docs.nvidia.com/deeplearning/nccl/user-guide/docs/usage/collectives.html'],
 zero:['DeepSpeed · ZeRO','https://deepspeed.readthedocs.io/en/latest/zero3.html']};
const STAGE_DOCS=[['model'],['linear','attention'],['grad','linear'],['grad','linear'],['tp'],['tp','nccl'],['tp','grad']];
const STAGE_FORMULAS=[
 'Y = X + Attention(Norm₁(X))\nZ = Y + FFN(Norm₂(Y))',
 'P = softmax(mask(QKᵀ / √dₖ))\nAttention(Q,K,V) = PV',
 '前向：Y = XW\n输入梯度：dX = dY · Wᵀ',
 '前向：Y = XW\n参数梯度：dW = Xᵀ · dY',
 'Wqkvᵣ [8,6] · Wprojᵣ [2,8]\nW1ᵣ [8,4] · W2ᵣ [4,8]',
 'AG：[2,8] × 4 → [8,8]\nRS：Σᵣ Zᵣ[8,8] → [2,8]',
 'DGRAD 读取 dY 与 W\nWGRAD 读取 dY 与前向 X'];
function docLinks(keys){return [...new Set(keys)].map(key=>`<a href="${DOCS[key][1]}" target="_blank" rel="noopener">${esc(DOCS[key][0])} ↗</a>`).join('');}
function auditedNode(id,d){if(!d.audited||!d.docs?.length)throw Error('Missing verified copy: '+id);return {title:d.title,body:d.body,docs:d.docs};}

STAGE_DOCS.push(['moe','gelu'],['moe','parallel','nccl']);
STAGE_FORMULAS.push('rₜ = Σᵢ αₜ,ᵢ Eᵢ(aₜ)','专家组内 TP；专家组间 EP');
