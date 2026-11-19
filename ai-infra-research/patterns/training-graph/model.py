"""Demo architecture baseline: Pre-Norm, dense MHA + GeLU MLP."""
import torch
from torch import nn
class Block(nn.Module):
    def __init__(self, hidden=8, heads=4, ffn=16):
        super().__init__()
        self.norm1 = nn.LayerNorm(hidden)
        self.attention = nn.MultiheadAttention(hidden, heads, batch_first=True)
        self.norm2 = nn.LayerNorm(hidden)
        self.mlp = nn.Sequential(nn.Linear(hidden, ffn), nn.GELU(), nn.Linear(ffn, hidden))
    def forward(self, x):
        z = self.norm1(x)
        mask = torch.ones(z.size(1), z.size(1), device=z.device, dtype=torch.bool).triu(1)
        x = x + self.attention(z, z, z, attn_mask=mask, need_weights=False)[0]
        return x + self.mlp(self.norm2(x))
class Transformer(nn.Module):
    def __init__(self, vocab=32000, hidden=8, layers=12):
        super().__init__()
        self.embedding = nn.Embedding(vocab, hidden)
        self.blocks = nn.Sequential(*(Block(hidden) for _ in range(layers)))
        self.norm = nn.LayerNorm(hidden)
        self.head = nn.Linear(hidden, vocab, bias=False)
    def forward(self, tokens):
        return self.head(self.norm(self.blocks(self.embedding(tokens))))
