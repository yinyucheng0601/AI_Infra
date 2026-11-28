"""Project source-derived Compact FP16 Unpack tasks at one verified revision."""
import hashlib
import re

REVISION = "13baf5274751fcf46aa04905c53ad285d656ac74"
KERNEL_SHA256 = "a73d36b372bfa5f2c6d29f391896becf7625311ba503d609df855c107a74f4d1"
ORIGIN = (
    f"https://github.com/heiheiha798/Ascend-Kernels-S8/blob/{REVISION}"
    "/op/Unpack/op_kernel/unpack.cpp"
)
ANCHORS = {
    "partition": "L74-L89",
    "dispatch": "L441-L474",
    "copy-out": "L412-L433",
    "tail": "L441-L451",
    "fallback": "L498-L503",
}


def validate_config(config):
    if not isinstance(config, dict) or set(config) != {"id", "shape", "axis", "dtype", "bytes"}:
        raise ValueError("Expected id, shape, axis, dtype and bytes for each Unpack config")
    ident, shape = config["id"], config["shape"]
    if not isinstance(ident, str) or not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,63}", ident):
        raise ValueError("Expected a lowercase Unpack config ID")
    if (
        not isinstance(shape, list) or len(shape) != 2 or any(type(n) is not int for n in shape)
        or not (1 <= shape[0] <= 4096 and 2 <= shape[1] < 16)
        or type(config["axis"]) is not int or config["axis"] != 1
        or config["dtype"] != "FP16" or type(config["bytes"]) is not int or config["bytes"] != 2
    ):
        raise ValueError(f"{ident}: supported input is Compact FP16 [1–4096, 2–15], axis 1, 2 bytes")


def project(kernel, configs):
    if hashlib.sha256(kernel).hexdigest() != KERNEL_SHA256:
        raise ValueError("Unpack kernel SHA256 differs from the pinned source revision")
    text = kernel.decode("utf-8")
    constants = {
        key: int(value) * int(scale or 1)
        for key, value, scale in
        re.findall(r"constexpr uint32_t (kUnpack\w+) = (\d+)(?: \* (1024))?;", text)
    }
    cols_per_block = constants["kUnpackMatrixCols"]
    max_rows = constants["kUnpackMatrixOffsetBytes"] // 4
    tile_bytes = constants["kUnpackCompactTileBytes"]
    graph = {"schema_version": "1.2", "objects": [], "edges": [], "evidence": []}
    cases = {}
    for config in configs:
        validate_config(config)
        case = config["id"]
        if case in cases:
            raise ValueError(f"Duplicate Unpack configuration ID: {case}")
        rows, cols = config["shape"]
        rows_per_task = min(max_rows, tile_bytes // (cols * config["bytes"])) // cols_per_block * cols_per_block
        scope = f"unpack:{REVISION}:{case}:{rows}x{cols}:fp16:axis1"
        context = {"build": REVISION, "case": scope}

        def add_object(kind, ident):
            ref = {"scope": scope, "id": ident}
            graph["objects"].append({"ref": ref, "kind": kind, "context": context})
            return ref

        def add_edge(ident, relation, left, right, anchor):
            edge_id = f"{scope}/{ident}"
            evidence_id = f"{edge_id}/source"
            graph["edges"].append({"id": edge_id, "relation": relation, "from": left, "to": right,
                                   "mapping_status": "exact", "evidence_ids": [evidence_id]})
            graph["evidence"].append({"id": evidence_id, "level": "derived", "source": ORIGIN,
                                      "locator": ANCHORS[anchor], "context": context, "supports": [edge_id]})
            return edge_id

        case_ref = add_object("source_case", "case")
        candidate_ref = add_object("sync_candidate", "sync-1")
        bindings, gaps = [], []
        for task_index, start in enumerate(range(0, rows, rows_per_task)):
            end = min(start + rows_per_task, rows)
            vector_end = start + (end - start) // cols_per_block * cols_per_block
            task_ref = add_object("task", f"task-{task_index}")
            case_edge = add_edge(f"task-{task_index}", "case_partitions_into", case_ref, task_ref, "partition")
            if vector_end > start:
                step_ref = add_object("source_step", f"task-{task_index}/copy-out")
                step_edge = add_edge(f"step-{task_index}", "task_reaches_source_step", task_ref, step_ref, "dispatch")
                finding_edge = add_edge(f"candidate-{task_index}", "candidate_locates_source_step",
                                        candidate_ref, step_ref, "copy-out")
                bindings.append({"task": task_index, "o": 0, "p": start, "rowEnd": vector_end, "step": "copy-out",
                                 "edgeIds": [case_edge, step_edge, finding_edge], "sourceId": "sync-L430"})
            if vector_end < end:
                anchor = "fallback" if vector_end == start else "tail"
                gaps.append({"task": task_index, "rows": [vector_end, end], "source": ORIGIN + "#" + ANCHORS[anchor],
                             "reason": "scalar-fallback" if anchor == "fallback" else "vector-tail-unresolved"})
        cases[case] = {"config": config, "scope": scope, "bindings": bindings, "gaps": gaps}
    return {"revision": REVISION, "sourceSha256": KERNEL_SHA256, "graph": graph, "cases": cases}
