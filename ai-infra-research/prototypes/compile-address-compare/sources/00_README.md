# merge_rope_pack — Vec UB usable size appears to be ~184 KB, not 192 KB

**Platform:** target `a2a3` / SoC `Ascend910B1`. **Device runs (the NaN) use CANN `cann-9.0.0`** (active `ASCEND_HOME_PATH`/`LD_LIBRARY_PATH`/`PATH`). `cann-8.5.1` was used *only* for the in-core op-simulator profiling (it needs a TL-capable `bisheng`); it does not touch the device NaN.
**Kernel:** `merge_rope_pack` — a pure-Vector kernel from dsv4 sparse attention
(online-softmax merge across sparse blocks + inverse-RoPE + per-head pack into `o_packed`).

## TL;DR

Two compiles of the **same kernel**, identical in every way **except the hidden
dimension** (which only scales the Vec tile sizes / footprint):

| case | hidden dim | Vec footprint | # Vec buffers | device output |
| ---- | ---------- | ------------- | ------------- | ------------- |
| `HD512_WRONG_NaN/` | 512 | **188.8 KB** / 192 KB | 81 | **NaN** (112 NaNs in `o_packed`) |
| `HD496_CORRECT/`   | 496 | **183.3 KB** / 192 KB | 81 | **correct** (0 NaN) |

Both **fit** the compiler's 192 KB Vec-UB budget, so **neither errors at compile**.
But the 188.8 KB layout **silently corrupts on device**, while the 183.3 KB layout
is correct. A footprint sweep (HEAD_DIM in steps of 16) shows the corruption
switches on **between 183.3 KB (clean) and 188.8 KB (NaN)** — i.e. right around
**184 KB**.

## Hypothesis we want PTO-ISA to confirm/correct

The **real usable Vec UB is ~184 KB, not 192 KB** — i.e. there is an **~8 KB
reservation** at the top of the 192 KB Vec UB. We see `ReserveBufferOp` /
`PTOInferValidatePipeInitPass` in PTOAS, which suggests PTOAS reserves UB for
pipe-init/validate buffers. The PyPTO allocator's budget (192 KB) does **not**
subtract this reservation, so it emits a `.pto` whose `pto.alloc_tile` addresses
reach 188.8 KB — past the real usable limit — without any error. The top ~5 KB of
buffers (the `m_oi_nope` accumulator) then land in the reserved/unusable region
→ silent NaN corruption at runtime.

## Evidence the NaN is memory corruption (not numerics, not a logic bug)

- **Localized**: every NaN is in the **NOPE half** of `o_packed` (d < NOPE_DIM) =
  the `m_oi_nope` `[8, NOPE_DIM]` accumulator (the dominant high-address tiles).
  **None** in the ROPE half. 8 NaNs per affected (token, head), in 16-aligned
  `d`-blocks.
- **Footprint-causal**: drop the footprint below ~184 KB (HD=496, or set the inner
  pipeline to `stage=1`) → 0 NaN. Same kernel, only the footprint changed.
- **Not a numerical artifact**: with valid positive softmax-sum inputs (so the
  divisor `n_denom = li + exp(...)` can never reach 0), HD=512 **still** produces
  NaN — so the NaN comes from corrupted buffer *data*, not from a division.
- **Data-dependent cells**: different input seed → different NaN cells (88 vs 112),
  consistent with a high-address buffer that overlaps a reserved/garbage region.

## What's in each case folder

| file | what it is |
| ---- | ---------- |
| `merge_rope_pack.pto` | **PTOAS input IR.** `pto.alloc_tile addr = %cN_i64 ...` lines show the Vec UB layout (HD512 reaches addr ~188.8 KB). |
| `merge_rope_pack.cpp` | PTOAS-generated AscendC. |
| `memory_report.txt`   | per-space footprint + per-buffer **address ranges** (PyPTO allocator's view; budget shown as 192 KB). |
| `pypto_ir_after_MemoryReuse.py` | PyPTO IR after buffer-reuse — shows the 81 distinct Vec buffers (`mem_vec_*`). |
| `pypto_ir_after_AllocateMemoryAddr.py` | PyPTO IR with assigned addresses. |

## Diff to look at first

`diff HD512_WRONG_NaN/merge_rope_pack.pto HD496_CORRECT/merge_rope_pack.pto`
— same structure (81 buffers, identical op sequence), only the tile column sizes
and resulting `addr` values differ. The wrong case's top `alloc_tile` addresses
cross ~184 KB; the correct case's stay below it.

## Questions for PTO-ISA

1. Is there a Vec UB region reserved by PTOAS (pipe-init/validate, or runtime
   scratch) that a kernel's `alloc_tile` allocations must **not** cross? What is
   the **real usable Vec UB** for `a2a3` / `Ascend910B1`?
2. We were told this reservation "was removed" — but 188.8 KB (< 192 KB) still
   corrupts here. Is the reservation still in effect on this CANN/SoC, or is this
   a different PTOAS bug at near-full footprint?
3. If the reservation is real and fixed, the PyPTO allocator should subtract it
   from the 192 KB budget so an over-tall layout **errors at compile** instead of
   silently corrupting. Can you confirm the exact reserved size?

See `reproducer/HOW_TO_RUN.txt` to reproduce on device.
