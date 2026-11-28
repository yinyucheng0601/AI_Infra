# Capability assessment

| Dimension | Level | Evidence and remaining gate |
| --- | --- | --- |
| Source Manifest | L2 extension, legacy source locks retained | `adapters/contract.py` hashes actual members. New inputs lack verified producer/version and Build/Run information. |
| Adapter contract | L2 | `schemas/adapter-result.schema.json`, `adapters/legacy_bridge.py`, `tests/test_inspection.py`. The legacy envelope round-trips original data. It does not project legacy data to uniform semantic fields. |
| Adapter SDK | L1 | Built-in descriptors and read-only inspection. Independently approved runtime extensions and lifecycle are outstanding. |
| Discovery | L2 | Multiple local input paths, JSON/JSONL and trace signatures, Python and limited lexical paths. Adapter conflicts and producer/version routing are outstanding. |
| Source extraction | L2 | Real RMSNorm and MatMul Python files tested for AST extraction. C/C++ uses lexical matching. Domain semantics and independent labels are outstanding. |
| IR extraction | L1 | Text inventory only. SSA, module/region/block identity, and Pass transformation semantics are outstanding. |
| Trace extraction | L2 | Fixed DeepSeek baseline passed. Built-in Chrome inspection retains raw event locators and detects missing flow semantics. PyPTO3 DFX recognition remains an unverified candidate. |
| Identity | L2 | File-scoped record IDs and tests for Run and definition/instance separation. Real cross-source binding is outstanding. |
| Cross-source extraction | L0 in new pipeline | No inferred semantic edges. Matched Build/Run evidence and extractors are outstanding. |
| Relation validation | L3 retained | Original 17 rules and regression retained. New inspector exports native records without relaxing the validator. |
| Adapter lifecycle | L0 | No independent approval or automatic runtime registration performed. |
| Design assets | L3 for the two verified entries | Catalog scan and original browser harness retained. See real-data coverage for execution results. |
| Evidence status | L2 extension | Exported observations describe original material only. Derived cross-source proof is outstanding. |
| Device validation | NOT_RUN | No device execution. |
| Whole-package regression | Local framework verification | See regression and archive checks. Synthetic fixtures and real syntax inputs do not establish semantic precision or recall. |
