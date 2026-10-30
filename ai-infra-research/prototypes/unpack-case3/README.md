# Unpack public case3

Open `index.html` directly. Self-contained, offline. Build: `rtk python3 build.py`.

Pinned source: heiheiha798/Ascend-Kernels-S8 @ 13baf5274751fcf46aa04905c53ad285d656ac74. Files and SHA-256 evidence are stored in sources/ and evidence.json. No upstream code executed or modified.

Case: shape [31,17,33], axis 1, INT32. Y[j][i,k] = X[i,j,k]; input element offset = (i*17+j)*33+k; addresses are relative byte offsets, not device allocation addresses. 17 outputs, each [31,33], 4092 B. Input 69564 B.

Host: outputSize=1023, innerSize=33, outerSize=31, blockDim=8, perCoreSize=128. Kernel uses Row burst rather than perCoreSize to schedule: rowBytes=132, paddedRowBytes=160, rightPadding=7 int32, rowsPerTask=min(31,floor(32768/160))=31. One task per output, 17 total. Core c owns [floor(c*17/8),floor((c+1)*17/8)). DataCopyExtParams input: {31,132,2112,0,0}; output: {31,132,0,0,0}. UB tile=4960 B. Padding is UB storage, not extra logical input elements. These are source parameters; API semantics and physical transfers were not validated against a CANN installation or device.

Verification: `rtk python3 verify.py`; `rtk node verify-interactions.cjs`; results in verification.json. Independent nested CPU tensor selection compared with delivered JS mapping for all 17391 elements, relative addresses, uniqueness, task/core coverage, and a deliberately shifted index mutation. Numeric input uses Python Random(3003), values 1..10; not the original NumPy sample. No NumPy, PyTorch, torch_npu or custom_ops_lib execution; no operator development environment installed.

UI reuses compute-investigation-trial/spatial.html, model adapter, formal VisualSystem task renderer, Liquid Glass assets, pointer zoom, pan, Fit, movable evidence/source windows, keyboard selection, JSON export. Case3 is the sole supported configuration in this delivery. Existing pattern and catalog are unchanged.

Validation boundaries: model and CPU reference passed; DOM-substitute interaction checks passed; catalog validation passed (49 assets). Real browser smoke was attempted but file:// navigation was blocked by browser security policy; layout, optical quality, actual clipboard/download, and real browser interactions remain unverified. No NPU execution, profiling or performance conclusion. No commit or push.
