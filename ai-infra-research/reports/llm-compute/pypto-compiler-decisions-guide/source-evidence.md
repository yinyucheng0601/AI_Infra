# 第三篇来源与证据边界

核对日期：2026-10-10。本地 PyPTO HEAD：`87b129aaf31a1c3748d4dd8a485c74f3465ed692`。以下哈希标识实际读取的文件，避免只用 HEAD 代替工作区文件身份。源码仅用于只读研究，未运行编译器、模拟器或设备性能实验。

报告的数值、图形与调度步骤均为显式构造的教学示例；以下为来源原文摘录与解释，全文没有把教学数值当作编译导出。

<a id="tiling"></a>

## 分块与成本模型

来源：PyPTO3-main / `repo/pto/include/pypto/ir/transforms/utils/l0_tile_chooser.h`，行 22–37。

SHA-256：`c99ec82ae24d84b7f18050d13b4ba17250aadd9ba37a4c94fc3e2804394ec557`

解释：操作数驻留方式决定 A/B 的缓冲深度；不是独立搜索所有倍数。

```text
/**
 * @brief Which GEMM operand is pinned (held resident) across the L0 tiling loops.
 *
 * Axis 2 of the design space (loop permutation -> stationarity; see
 * DESIGN_SPACE.md). The choice fixes the per-operand double-buffer depth: the
 * stationary operand is single-buffered (depth 1, full L0 buffer); the moving
 * operand(s) are double-buffered (depth 2).
 *
 *   - kOutputStationary: pin the L0C accumulator (the base when k < K); both
 *     operands stream (dbA = dbB = 2).
 *   - kAStationary: pin the left operand A (k == K); A loaded once per row
 *     (dbA = 1), B streams (dbB = 2).
 *   - kBStationary: pin the right operand B (k == K); B loaded once per column
 *     (dbB = 1), A streams (dbA = 2).
 */
enum class Stationarity { kOutputStationary, kAStationary, kBStationary };
```

来源：PyPTO3-main / `repo/pto/docs/en/dev/passes/14-auto_tile_matmul_l0.md`，行 60–74。

SHA-256：`a28113ef86d22addb3feeec405e084801b38d271ce0754e76fcb809c04561e64`

解释：以本地文档的合法设计空间与成本估计为依据；报告不复现 chooser 或采用其硬件标定参数。

```text
The pass is a `ProgramPass` and walks each function with an `IRMutator`; functions are returned unchanged when no rewrite fires (no `MutableCopy` cost for matmul-free programs).

## Cost model & design space (`ChooseL0Tile`)

`ChooseL0Tile` picks the L0 GEMM tile by an **exhaustive roofline search**, not a closed form. For every legal aligned `(m, n, k)` — each a multiple of `GetL0FractalAlignment()`, fitting the L0a/L0b/L0c budgets — it estimates wall-clock in core cycles and returns the minimum:

- `wall ≈ max(C_load, C_mad) + C_drain` when the FIXPIPE L0C→L1 drain is exposed (single L0C), or
- `wall ≈ max(C_load, C_mad, C_drain) + min(compute, C_drain) / T` when the drain is hidden behind compute (double-buffered L0C, `T` output tiles). The `+ min(…)/T` term is the pipeline **fill/drain bubble** — the first tile's compute (or the last tile's drain) has no partner to overlap, so the ideal all-hidden `T·max` roofline undercounts by one tile's non-dominant pipe (≈25% of the smaller pipe at a 2×2 grid). This keeps dbC=2 from being over-picked on small grids.

`C_load` is the L1→L0A/L0B operand traffic under the chosen loop order, scaled by the per-buffer bandwidths from `GetL0CostModel()` (on-device MTE1 sweep: `bw_l0a≈130`, `bw_l0b≈85` B/cyc, ~1.52:1); `C_mad` is the cube MAD cost (per-`TMATMUL` issue overhead × K-fractal count). `C_drain` is the FIXPIPE L0C writeback, charged **per output tile** as a **per-M-row** cost: `⌈M/m⌉·⌈N/n⌉ · (drain_fixed + m·(max(drain_row, bytes_c·n/bw_drain) + drain_penalty·(odd(⌈n/N0⌉)−1)))`. A direct fit of an on-device FIXPIPE sweep: FIXPIPE addresses one M-row of the `N1 M1 M0 N0` FRACTAL_NZ accumulator at a time (so cost ∝ `m`), each row a grouped `nburst`/`loop` over the `N1 = ⌈n/N0⌉` N-fractals (`N0 = 32/bytes_c = 8` for the fp32 L0C). The per-row cost is `max(floor, throughput)` — a fixed burst-issue **floor** `drain_row` (row addressing/setup, N-independent) that dominates narrow N, or the fractal **throughput** `bytes_c·n/bw_drain` that dominates wide N (crossover ~n=131) — plus the **misalignment** residual: a non-power-of-two fractal count serializes the odd part `odd(N1)−1` into extra passes at `drain_penalty` per M-row (the predicate is a **non-power-of-two `N1`**, not literally `N%32`: `n=80 → odd(10)=5` is penalized, and so is `n=96 → odd(12)=3` even though `96%32=0`; aligned power-of-two `N1` such as `n=128 → 16` pays nothing). Because the drain count is `⌈M/m⌉·⌈N/n⌉`, **splitting the output (M/N) adds drains but splitting K does not** (partial sums accumulate in one L0C, drained once per `(m,n)` block). The per-M-row form makes the chooser prefer **wide-N / small-M** tiles (fewer FIXPIPE rows per drain) and correctly prices a misaligned-N tile so it is not over-selected — e.g. `320×320` lands an aligned `(160,128,64)` instead of the drain-bound `160×80`. Device-validated (drain 0.93–1.09×, loads R²=0.993). The search is exhaustive over **all** legal `k` per `(m, n)` (not the largest legal k — `⌈K/k⌉·⌈k/kt⌉` is non-monotone in `k` when `kt ≠ align_k`). Wall ties break lexicographically on `(padded_compute, ⌈K/k⌉, C_load, …)`. The search is exhaustive over **all** legal `k` per `(m, n)` (not the largest legal k — `⌈K/k⌉·⌈k/kt⌉` is non-monotone in `k` when `kt ≠ align_k`). Wall ties break lexicographically on `(padded_compute, ⌈K/k⌉, C_load, …)`; the `C_load` key picks the lower-hidden-load aspect among MAD-bound `(m,n)`↔`(n,m)` ties (L0B's slower bandwidth favours fewer m-blocks).

The search ranges over the **design space** `P = (m, n, k, stationarity, dbC)`:

- **stationarity** `{output, A, B}` — which operand is pinned across the L0 grid. This *derives* the per-operand double-buffer depths (`dbA`/`dbB`): the moving operand(s) double-buffer (depth 2), the stationary one single-buffers (depth 1). They are not searched independently.
- **dbC** `{1, 2}` — whether the L0C accumulator is double-buffered to overlap the FIXPIPE drain with the next tile's compute.
```

<a id="pipeline"></a>

## 流水展开

来源：PyPTO3-main / `repo/pto/docs/en/dev/passes/25-lower_pipeline_loops.md`，行 1–17。

SHA-256：`93b7a4b4b11ff5facc5423625bb9afcc393d34ed4edbea86f653fcb985afa03f`

解释：同核循环复制与 pipeline_membership；普通 Cube 累加器存在例外，不以所有存储乘 stage。

```text
# LowerPipelineLoops Pass

Lowers `pl.pipeline(N, stage=F)` at the tile level: replicates the loop body `F` times per outer iteration to enable ping-pong buffering, while keeping the outer loop sequential.

## Overview

`pl.unroll(N)` fully expands a loop into `N` body copies at slot #1 (before SSA). Users reach for this not because they want `N` copies but because they need distinct tile MemRefs — `MemoryReuse` would otherwise coalesce sequentially-live tiles into a single buffer, defeating ping-pong execution.

`pl.pipeline(N, stage=F)` is the user-facing surface for that targeted knob: replicate the body `F` times (typically 2–4) at the tile level, leaving an outer loop of `N/F` iterations. Each clone gets fresh def-vars (SSA preserved) and operates on independent tiles.

Fresh SSA vars are **not** by themselves enough to keep the clones in separate buffers: the `F` clones are sequential in program order, so their per-clone tiles have *disjoint* program-order lifetimes — exactly the condition under which `MemoryReuse` would coalesce them into one buffer (defeating the ping-pong). To make stage separation explicit, this pass tags each stage's tile-producing `Call`s in clone `k` with a `pipeline_membership` attr recording `(group, stage=k)` (see `include/pypto/ir/transforms/utils/attrs.h`). A tile inside a nested pipeline carries one membership pair per enclosing replicated region, so nested same-core pipelines stay separated at every level. (Historically this separation was an unreliable *side effect* of `CanonicalizeIOOrder` clustering sibling-clone loads to induce lifetime overlap; the explicit attr makes it a hard constraint independent of statement ordering.)

**Cube accumulators are the one exception — they are not tagged.** A pipeline stage double-buffers the operands it *loads*: their loads overlap the previous stage's compute, so two stages' operand buffers are genuinely co-live and must stay in separate buffers. An accumulator is not loaded; it is written by the single serialized cube (a `tile.matmul*` MAD), which retires one tile's MAD before starting the next regardless of how many stages the scheduler overlaps. So a stage's accumulator is never co-live with the next stage's, and tagging it would only make `MemoryReuse`'s capacity gate request one L0C buffer per stage and then shed it back onto one — a redundant separation that emits a spurious `PH-MR-001` and, for an accumulator nested `N` pipeline loops deep, balloons to `2^N` requested buffers. Left untagged, the drain-before-next accumulator coalesces by lifetime alone onto the single L0C buffer it needs (double-buffered L0C, when enabled, is driven by `AutoTileMatmulL0` emitting two genuinely co-live accumulators, not by a membership tag). The exception keys on the **producer op**, not on `Mem.Acc` alone: a data-movement op that also targets Acc (e.g. `tile.extract(..., target_memory=Acc)`) is a genuine per-stage buffer that overlaps across stages, so it stays tagged like any other loaded operand.

`MemoryReuse` consumes the attr with **role-aware granularity** — forbidding *all* cross-stage reuse (depth = `F`) would need `F` full copies of every intermediate and overflows the on-chip budget on real kernels (e.g. `stage=4` RMSNorm needs `4 × 67 KB > 188 KB` UB). Only **load buffers** genuinely need per-stage privacy so iteration `i+1`'s prefetch overlaps iteration `i`'s compute. So the legacy rule is: block a cross-stage buffer share iff the two tiles are same-group / different-stage **and at least one is a load** (`tile.load` / `tile.read`), with the L0 matmul spaces exempt entirely. The **default** path is the capacity gate (#1475): it separates the operand L0 spaces (Left/Right/Bias) per stage up to the affordable double-buffering depth, falling back to the legacy predicate only where a space's capacity is unknown. Accumulators (Acc) reach neither rule — `LowerPipelineLoops` leaves them untagged (see above), so they always coalesce onto the single L0C buffer the serialized cube needs.

Because the tag is a generic op-call attr, it is serialized through the python printer / parser (`attrs={"pipeline_membership": "..."}`) so it survives the print→parse round-trip the test harness runs after every pass.
```

<a id="memory"></a>

## 容量与诊断

来源：PyPTO3-main / `repo/pto/src/ir/transforms/memory_reuse_pass.cpp`，行 2094–2134。

SHA-256：`a0c9fd64997a99e37bc55f42cf6db78d2c8265fd2a3368a1aa942e437739cebd`

解释：每空间容量减去保留区；区分单份需求过大与共驻压力，诊断不等于实测性能。

```text
      const uint64_t cap = pack_be != nullptr ? pack_be->GetMemSize(key.first) : 0;
      // Effective (free) capacity is the total minus the reserved region — the same reserved_start the exact
      // SpaceFootprint fit begins at. Co-resident non-pipeline tiles and other pipeline groups also consume
      // the space, but they are not a single subtractable constant, so the byte threshold is only exact when
      // this operand's own footprint is the binding constraint. Distinguish the two shed causes so the fix
      // stays honest: (a) slot-bound — `slot*requested` overflows even an otherwise-empty free region, so
      // shrink to `free_cap/requested`; (b) space-pressure — it would fit alone, so the fix is to relieve the
      // co-residents, not shrink this tile (which already satisfies the per-slot bound).
      const uint64_t reserved =
          reserved_end_by_space.count(key.first) != 0 ? reserved_end_by_space.at(key.first) : 0;
      const uint64_t free_cap = cap > reserved ? cap - reserved : 0;
      // Use the *aligned* slot — the same per-buffer increment SpaceFootprint bumps by — so the slot-bound
      // vs space-pressure classification and the byte threshold match the real fit (raw `slot` under-counts
      // when the tile isn't an alignment multiple).
      const uint64_t aligned_slot =
          alloc_policy != nullptr ? alloc_policy->AlignAddress(slot, key.first) : slot;
      const uint64_t need = aligned_slot * static_cast<uint64_t>(requested);
      const bool slot_bound = free_cap == 0 || need > free_cap;
      // Source-agnostic wording: `pipeline_membership` is stamped both by an explicit `pl.pipeline(stage=)`
      // and by compiler-synthesized pipelines (e.g. #1900's cross-core skew clones), so blame "software
      // pipelining", not the user's `stage=`, and offer `pl.pipeline(stage=)` only as an example.
      std::ostringstream msg;
      msg << "software pipelining requested depth " << requested << " for pipeline group " << key.second
          << " in " << MemorySpaceToString(key.first) << ", but only " << achieved << " of " << requested
          << " buffers fit (" << aligned_slot << " B per stage, " << free_cap << " B free";
      if (reserved != 0) msg << " after " << reserved << " B reserved";
      msg << ") — stages " << achieved << " apart share storage and serialize. ";
      if (slot_bound) {
        msg << "This operand alone needs " << need << " B for depth " << requested
            << "; shrink the per-stage tile to <= "
            << (requested > 0 ? free_cap / static_cast<uint64_t>(requested) : free_cap)
            << " B, or reduce the pipeline depth (e.g. `pl.pipeline(stage=)`) to " << achieved << ".";
      } else {
        msg << "The operand would fit depth " << requested
            << " on its own, but co-resident buffers / other pipeline groups over-subscribe the space; "
            << "relieve the co-residents (smaller or fewer co-live tiles) or reduce the pipeline depth to "
            << achieved << ".";
      }
      out_hints->emplace_back(DiagnosticSeverity::PerfHint, "MemoryReuse", 0, "PH-MR-001", msg.str(),
                              func ? func->span_ : Span::unknown());
    }
```

<a id="deps"></a>

## 任务依赖

来源：PyPTO3-main / `repo/pto/src/ir/transforms/auto_derive_task_dependencies_pass.cpp`，行 1401–1408。

SHA-256：`eb8174eacb9bc8b824a6ab7139674514cdb3e790719719b8d9ca1443b4c13a25`

解释：MANUAL 范围及未启用 AUTO 分析的范围直接返回。

```text
  StmtPtr VisitStmt_(const RuntimeScopeStmtPtr& op) override {
    MarkCurrentScopeLayerUnsupported();
    if (op->manual_ || !analyze_auto_scopes_) {
      return op;
    }
    return AnalyzeRuntimeScopeBody(op->body_, op->name_hint_, op->span_, /*is_virtual_whole_body=*/false, op,
                                   op->leading_comments_, op->attrs_);
  }
```

来源：PyPTO3-main / `repo/pto/docs/en/dev/passes/35-auto_derive_task_dependencies.md`，行 81–89。

SHA-256：`4ea0515c5a4ee7aef3aad42e66bf19fd7a260727a8d5f9ed6ea949a458486743`

解释：按读写方向与区域重叠处理 RAW / WAR / WAW；读读不产生冒险边。

```text
   analysis-only; the final scope mode remains AUTO unless
   `MaterializeRuntimeScopes` later consumes compiler auto-manual markers for a
   fully covered default-mode region.
8. For every non-builtin call with resolved `arg_directions`, classify tensor
   arguments as read, write, or read-write. Accesses to the same storage root,
   or to MemRef roots that may alias, are considered for region overlap.
9. Skip dependency edges for statically proven disjoint regions. Otherwise, add
   a compiler edge from any prior producer TaskId when RAW, WAR, or WAW hazards
   exist. Read-read pairs do not produce edges. User-written edges are respected
```

<a id="sync"></a>

## 后端同步

来源：PyPTO3-main / `repo/pto/docs/en/dev/00-ecosystem.md`，行 111–126。

SHA-256：`9a1171720afbdaa09246e49464b64754c3e5344b3c2b95a350124db7ba041020`

解释：PTOAS 的职责包含同步插入；不能将后端同步步骤伪称为本地某个 PyPTO Pass。

```text
### PTOAS — PTO Assembler & Optimizer

An MLIR-based assembler that consumes `.pto` files produced by pypto's codegen and produces optimized C++ kernel code.

**Inputs:** `.pto` files (PTO-ISA MLIR dialect)

**Outputs:** C++ source files that `#include` pto-isa headers

**Responsibilities:**

- Parse PTO-ISA MLIR dialect
- Apply PTO-level optimization passes (sync insertion, memory planning)
- Lower PTO MLIR to C++ code that calls pto-isa tile instructions

**Interface with pypto:** The `.pto` file is the contract. pypto's PTO codegen emits MLIR using the PTO dialect (ops like `pto.tload`, `pto.tmul`, `pto.alloc_tile`, etc.), and PTOAS parses that dialect. The two repos must agree on the PTO MLIR dialect definition.

```

<a id="method"></a>

## 调优证据与成对实验

来源：PyPTO3-main / `Insight/PyPTO性能调优方法论_基于Toolkit与案例.md`，行 285–305。

SHA-256：`bd252bd1839daeedf4257ec2ad4fe56e361efac6102ad504abac6c818cacc7c5`

解释：固定比较条件、正确性与关键 shape 回归，收益不能由单次观测推导。

```text
### 步骤 9：以成对实验完成验证与交付

**需要看到**

- 同环境、同 manifest、同计时规则的 baseline / candidate 多次样本；
- 目标指标、Host/Device 拆分、关键路径变化、核心 busy 或 pipe cycle；
- 全量正确性和至少关键相邻 shape 的回归；
- 不受改动影响的大 scope 或指标作为噪声锚点。

**为什么看**

单次 DFX/benchmark 是单样本。只看最好的 wall，容易把随机波动、PMU 干扰或统计范围变化写成收益。

**验收规则**

1. 同 session 或等价环境成对运行 A/B，采用预先约定的中位数或稳健统计；
2. 目标指标改善，同时机制指标与假设一致，例如 MTE2 cycle 降低、关键路径缩短或 Host wall 降低；
3. 正确性通过，且没有未声明的 shape、精度、内存或吞吐回归；
4. 结果写清“对什么有效、对什么无效”，小 shape 无收益或回归不是失败数据，应保留；
5. 无稳定收益时，明确结论为“当前配置下未证实”，不要把候选手段写成 Recipe。

```

来源：PyPTO3-main / `Design/operator-tuning-console-v5/README.md`，行 5–15。

SHA-256：`24b4365db58d1c2ac88d9f5bb5974fdb0433c9dc3097c7b6d996d6fa09da8374`

解释：材料区分真实轨迹、另一构建的编译产物与构造的 PMU 桥接。

```text

```
Data/DeepseekV4/_jit_l3_decode_csa_20260903_010617/   decode_csa
Data/pypto_qwen3_profiles/                            qwen3_14b_fwd（由 Data/pypto_qwen3_profiles.zip 解压）
Data/_jit_decode_fwd_layers_20260625_184941/          qwen3_14b_fwd 的编译产物（旧构建，见「编译产物来自另一次构建」）
```

打开入口：`Design/operator-tuning-console/index.html`，也在 `launch.html` 的「内存与性能」分类里。

Case 菜单另有一个 **「模拟 PH-MR-001 · MemoryReuse」** 教学案例。它复用 `decode_csa` 的真实 L2 轨迹与 `decode_compressor_ratio4.py:110` 的真实 PH-MR-001（Right、depth 2→1、5 组、32 KB/stage、64 KB free），把它们关联到 `MemoryReuse`。L1 PMU 桥接是构造数据；提示与 L2 的因果关系仍是待验证假设，不代表已确认的编译器缺陷。案例集中在 `mock-pass-case.js`，真实数据生成器不会读取或覆盖它。

```

<a id="studio"></a>

## Decision Studio 的材料边界

来源：PyPTO3-main / `Design/pass-decision-studio/js/data.js`，行 374–379。

SHA-256：`da92f8bb4e9a47d1a470c72cb6e109037cb5d92b94c082c2c77b58011cc01a7f`

解释：SWIMLANE 含手写时间、counterfactual 等展示数据；本报告只参考关联方式，不使用示例速度或历史 issue 状态证明现状。

```text
  /* ---- 同步泳道：auto（复用后）vs 假设（撤销复用） ---- */
  var SWIMLANE = {
    pipes: ['MTE2', 'MTE1', 'M(cube)'],
    span: 200,
    current: {
      label: '当前 · 复用后（D-33-04 生效）',
```

## 外部核对

- [官网 AutoTileMatmulL0](https://www.pypto.ai/pypto/dev/passes/18-auto_tile_matmul_l0/)
- [官网 MemoryReuse](https://www.pypto.ai/pypto/dev/passes/36-memory_reuse/)
- [官网 PTO Codegen](https://www.pypto.ai/pypto/dev/codegen/00-pto_codegen/)

官网与本地快照的 Pass 编号和功能可能不同；本篇实现边界以所列本地文档和源码为准。原仓库的 Decision Studio、调优控制台与方法论未整体搬迁，相关摘录已随本报告保存，不创建依赖本机绝对路径的展示链接。

## 教学数值的定义

- GEMM：M=N=128、K=256，BF16×BF16→FP32；候选 (64,64,64) 和 (64,128,64)。总数学工作量相同，无边界块。仅计单份逻辑字节，不计布局额外占用、多个缓冲、其他分配。
- 成本：A=(60,100,40)、B=(100,75,25)，各项依次为搬运、计算、写回，使用归一化单位。与分块页没有实测对应，不代表 chooser 输出。
- 容量：虚拟单空间128 KiB、单流水组、每阶段一个等大且已对齐的缓冲区。图示64×3、32×3、64×2三种配置。
- 调度：等宽动作表示类别；无时间刻度。双缓冲仅消除所示迭代间 WAR 约束，未模拟其他硬件资源。
- 任务：同一 X 的静态一维访问区间，仅检查 T0 写、T1 读这一对访问，未展开其他依赖。
