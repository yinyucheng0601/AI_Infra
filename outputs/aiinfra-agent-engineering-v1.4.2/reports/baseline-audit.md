# Baseline audit

- Local repository HEAD at start: `8d201fa7c5256d06c034794a887489af4d7280c5`. The working tree had pre-existing modifications and untracked data. Those were left in place.
- The versioned checkout directory was absent. Used the local published v1.3.1 ZIP, SHA256 `4e9f1a4929c05acb7a45ae77c0a4ff169b26595d7f055c8b9fd4e5f2ef916bcf`. No Overlay was found in the checked locations.
- Python 3.14.4, Node 22.22.3. The initial regression failed with missing jsonschema. Installed the declared dependency in a temporary directory, extracted a fresh baseline, and reran.
- Baseline `scripts/run_regression.py` returned 0, including the package validator and 30 unit tests. Baseline `scripts/adapt_unpack.py` returned 0 using the pinned local source; `scripts/build_trace_example.py` returned 0 using the original local DeepSeek capture and verified exact SHA256 and event locators.
- Copied the complete archive before adding inspection and focused tests. Preserved original contract, schemas, rules, adapter implementations, locks and fixtures.
- Repeat v1.4.2 execution uses `/opt/homebrew/bin/python3` to match the installed rpds wheel. The alternate Python exposed an rpds import failure. With matching Python, the 34 tests passed and the Unpack output matched byte-for-byte.
