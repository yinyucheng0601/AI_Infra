# AI Infra Agent Engineering

A source-locked semantic and visual engineering package for Codex/Claude Code-style agents.

## Quick start
```bash
python3 -m pip install -r requirements.txt
python3 scripts/validate_package.py
python3 scripts/run_regression.py
python3 scripts/build_example.py
```

## Package layout
- `config/`: immutable source and fixture lock
- `skills/`: six callable agent skills with explicit routing boundaries
- `specs/`: cross-layer identity and evidence contract
- `schemas/`: JSON schemas for evidence, mappings and visualization plans
- `adapters/`: normalization for PyPTO/Ascend-like traces and pattern catalog records
- `workflows/`: end-to-end task routing and output contract
- `examples/`: sample request and generated visual output
- `tests/fixtures/`: deterministic regression fixtures
- `scripts/`: validators, fixture scanner, regression runner and example builder
- `reports/`: regression outputs

## Evidence levels
`observed` = directly present in source/trace; `derived` = deterministic calculation from observed inputs; `assumed` = explicit scenario assumption; `unknown` = not available. Never upgrade evidence level silently.

## Runtime source scan
The package supports scanning a local `PyPTO3-main/data` tree:
```bash
python3 scripts/scan_pypto_data.py /path/to/PyPTO3-main/data --out reports/pypto-data-scan.json
```
No upstream runtime data is bundled or claimed as scanned unless supplied at execution time.

## v1.1.0 · Scoped execution profile

The legacy example and schema remain available. Single-event legacy normalization
uses an unresolved placeholder when no source identity is supplied; use batch
normalization to distinguish anonymous records within an input.

Generate a local inspector with
`python3 scripts/build_trace_example.py --trace /path/to/full-trace.json`.
The builder verifies the original SHA256, extracts the indexed events, and
writes the inspector and graph under `examples/`. Capture inputs and generated
outputs are kept local. See [Example commands](examples/README.md) and the
[semantic contract](specs/cross-layer-identity-contract.md).

## v1.2.0 · Relation validation

Use the same validator on a scoped relation graph before selecting a Pattern
or generating a view:

```sh
python3 scripts/validate_graph.py --json tests/fixtures/rmsnorm-relation-graph.json
python3 scripts/build_example.py --graph tests/fixtures/rmsnorm-relation-graph.json --out /tmp/relation-check.html
```

The single [rule table](specs/relation-rules.json) records allowed ordered pairs
and required context. It covers 14 relation kinds and 14 object kinds for this
initial projection. The supplied v1.1.0 package has no 39-kind or 48-relation
registry to migrate. The 1.0 legacy and 1.1 pinned-capture formats retain their
existing behavior. See the [contract](specs/cross-layer-identity-contract.md)
for the result semantics and evidence limits.

## v1.3.1 · Unpack source adapter

Project configurations from the pinned Compact FP16 Unpack kernel and validate
case, Task, source-step and candidate bindings before handing them to a view:

```sh
python3 scripts/adapt_unpack.py --kernel /path/to/unpack.cpp --configs examples/unpack-configs.json
```

The kernel must match the reference revision and full-file SHA256 declared in
the adapter. The configuration format is rank 2, axis 1, FP16, with rows
1–4096 and columns 2–15. The result includes scoped references, validated
edges and explicit tail gaps. The AI_Infra checkout's existing Unpack builder
consumes this output when given `--unpack-configs` and `--unpack-out`. These
are source-derived relationships. Device timings and new review results
require separate evidence.

## Design System 接入

`patterns.html` 是 JavaScript 目录入口。普通读取器可能只取得外壳。资产发现从
`ai-infra-research/catalog/assets.json` 开始。用工程包的扫描器读取有权访问的 AI_Infra checkout。
按需重复传入 `--asset <catalog-id>`，省略时登记全目录。

```sh
rtk python3 scripts/register_design_assets.py \
  --repository /path/to/AI_Infra \
  --sources /path/to/AI_Infra/ai-infra-research/.local/sources.json \
  --output /tmp/design-assets.json
```

`--sources` 是显式跨仓映射，省略时仅解析 AI_Infra。输出记录 catalog 指纹、入口、变体、
来源声明与当前字节 SHA256、静态依赖、Glyph inventory、Renderer、Tokens、组件及已声明的
交互 API。仓库 HEAD 用于定位快照，实际字节取自工作区。目录中的 revision 和验证记录保留为
来源声明，工作区哈希匹配不证明仓库 revision，也不继承历史浏览器验收。
`--strict` 在存在缺失、排除、漂移或外链时返回非零，仍写出报告。输出只包含引用和指纹。
原始资产的复制、修改或衍生须先取得授权。

在装有 Playwright 和 Chromium 的环境运行两项桌面交互回归：

```sh
rtk node tests/design_assets_browser.cjs /path/to/AI_Infra /tmp/design-assets.json
```

可用 `PLAYWRIGHT_MODULE` 指定已有 Playwright 模块绝对路径，以 `CHROMIUM_EXECUTABLE`
指定本机 Chrome。回归按登记哈希加载本地文件，阻断未登记请求并输出独立结果。
静态扫描覆盖可发现的字面引用和已声明资源。运行时拼接 URL、延迟交互分支及未声明依赖
需单独验证。浏览器结果按入口记录，一个变体通过不表示整个资产组通过。

## v1.4.2 local inspection

Run from the package root:

```sh
python3 scripts/inspect_source.py --root /path/to/materials --output /tmp/inspection.json source.py trace.json
```

The CLI reads inputs without importing their code and records member hashes and native locators. It exports static Python syntax, JSON/JSONL and Chrome Trace records, plus limited C/C++ and IR line inventories. It returns nonzero with a report for partial, unsupported or failed extraction. Relations require independently sourced evidence and the existing graph validator. See the capability assessment for acceptance boundaries.

[Scope gap review](reports/scope-gap-review.md) tracks the three original engineering gaps.
