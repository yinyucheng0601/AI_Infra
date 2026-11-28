# Real-data coverage

- Local PyPTO RMSNorm and MatMul Python paths were read directly by the new CLI. It extracted 48 and 40 static records, respectively. No operator relation was inferred from syntax.
- The pinned v1.3.1 Unpack and DeepSeek inputs passed the original dedicated scripts in a clean baseline extraction.
- Local DFX materials exist under `PyPTO3-main/Data`. Matching the required two complete and independently annotated same-build/source/IR/run bundles was not established. New cross-source semantic acceptance is BLOCKED. Precision, recall, false merge rate and confirmed end-to-end path coverage are N/A without independent ground truth.
- Strict scan of Unpack and the DeepSeek architecture group found four matching source entries and seven unmapped repository entries. Strict pass for both groups is BLOCKED by source mapping. No device execution was performed.
- Chrome browser harness passed the Unpack layout inspector and the DeepSeek V4 variant under the V4.1 catalog group. Raw browser results are in `browser-regression.json`.
