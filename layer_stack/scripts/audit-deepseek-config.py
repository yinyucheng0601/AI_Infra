"""Reproduce trace observations and isolate the reference layout arithmetic.

No torch/PyPTO import, compilation, device access or inference is performed.
The frozen source snapshots are reference revisions, NOT the proven trace build.
"""
import ast
import collections
import dataclasses
import hashlib
import json
import pathlib
import sys
import types

ROOT = pathlib.Path(__file__).resolve().parents[1]
AUDIT = ROOT / "audits" / "deepseek-config-20261125"
TRACE = pathlib.Path("/Users/yin/PyPTO3-main/Data/DeepseekV4/推理数据prof/trace_view_pto_tp1_dp16_8k_16b.json")


def reference_layouts(source):
    tree = ast.parse(source.read_text())
    module = types.ModuleType("_audit_dspark_layout")
    sys.modules[module.__name__] = module
    env = module.__dict__
    env.update(dataclass=dataclasses.dataclass, field=dataclasses.field)
    # Only evaluate arithmetic/literal constant assignments. Never execute imports,
    # kernel functions or top-level calls from the downloaded source.
    allowed = (ast.Expression, ast.Constant, ast.Name, ast.Load, ast.BinOp,
               ast.UnaryOp, ast.Add, ast.Sub, ast.Mult, ast.Div, ast.FloorDiv,
               ast.Mod, ast.Pow, ast.USub, ast.UAdd, ast.LShift, ast.RShift)
    for node in tree.body:
        if not isinstance(node, ast.Assign) or len(node.targets) != 1:
            continue
        target = node.targets[0]
        if not isinstance(target, ast.Name) or not target.id.startswith("DSPARK_"):
            continue
        expression = ast.Expression(node.value)
        if not all(isinstance(n, allowed) for n in ast.walk(expression)):
            continue
        try:
            env[target.id] = eval(compile(expression, str(source), "eval"), {"__builtins__": {}}, env)
        except NameError:
            pass
    cls = next(n for n in tree.body if isinstance(n, ast.ClassDef) and n.name == "DSparkCacheLayout")
    # Retain dataclass fields and ONLY its arithmetic factory, not runtime methods.
    cls.body = [n for n in cls.body if isinstance(n, ast.AnnAssign)
                or isinstance(n, ast.FunctionDef) and n.name == "for_ranks"]
    code = ast.Module(body=[ast.ImportFrom(module="__future__", names=[ast.alias(name="annotations")], level=0), cls], type_ignores=[])
    exec(compile(ast.fix_missing_locations(code), str(source), "exec"), env)
    values = [dataclasses.asdict(env["DSparkCacheLayout"].for_ranks(16, tp_size=t, lm_head_tp_size=4)) for t in (1, 2, 4)]
    assert [(x["tp_size"], x["partitions"], x["decode_batch"], x["moe_tokens"]) for x in values] == [(1, 16, 16, 128), (2, 8, 32, 128), (4, 4, 64, 128)]
    return values


def main():
    raw = TRACE.read_bytes()
    data = json.loads(raw)
    events = data["traceEvents"]
    names = collections.Counter(e.get("name") for e in events)
    targets = {"DSparkModelRunner.prefill.l3_dispatch", "DSparkModelRunner.decode.l3_dispatch",
               "request.queued", "process_name", "node.dispatch"}
    observed = []
    for index, event in enumerate(events):
        if event.get("name") in targets:
            observed.append({"sourcePointer": f"/traceEvents/{index}", "name": event["name"],
                             "pid": event.get("pid"), "args": event.get("args", {})})
    groups = [e["args"]["requests_per_group"] for e in observed if e["name"] == "DSparkModelRunner.prefill.l3_dispatch"]
    workers = sorted({e["args"]["worker_id"] for e in observed if e["name"] == "node.dispatch"})
    assert len(events) == 16170 and len(groups) == 3 and all(len(g) == 16 for g in groups)
    assert workers == list(range(16))
    assert names["DSparkModelRunner.decode.l3_dispatch"] == 23
    assert all(e["args"].get("one_l2") is True for e in observed if e["name"] == "DSparkModelRunner.decode.l3_dispatch")
    proof = [e for e in events if e.get("name") in ("chip.run.proof.record", "chip.run.proof.consume")]
    # ep is an invocation/epoch-shaped field, not an Expert Parallel size.
    assert all(e["args"]["ep"] == e["args"]["gen"] == e["args"]["disp"] for e in proof)
    result = {"trace": str(TRACE), "traceSha256": hashlib.sha256(raw).hexdigest(),
              "eventCount": len(events), "rootKeys": list(data),
              "observed": {"cacheGroupArrayLengths": [len(g) for g in groups],
                           "requestsPerGroup": groups, "deviceWorkerIds": workers,
                           "prefillDispatches": 3, "decodeDispatches": 23,
                           "allDecodeOneL2": True, "chipRuns": names["chip.run"],
                           "proofEpRange": sorted({e["args"]["ep"] for e in proof}),
                           "proofEpEqualsGenAndDispatch": True},
              "notRecovered": ["actual argv", "startup environment", "checkpoint config.json",
                               "Serving/Lib/PyPTO runtime revisions", "kernel artifact hashes",
                               "physical device IDs/order", "direct TP/DP/EP config snapshot"],
              "referenceOnlyLayouts": reference_layouts(AUDIT / "serving-0764/pypto_serving/model/deepseek_dspark/npu_runner.py")}
    (AUDIT / "observations.json").write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    (AUDIT / "trace-evidence.json").write_text(json.dumps(observed, ensure_ascii=False, indent=2) + "\n")
    print(json.dumps(result, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
