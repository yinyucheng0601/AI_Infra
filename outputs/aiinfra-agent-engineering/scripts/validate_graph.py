"""Validate graph shape separately from executable relationship rules."""
import argparse
import json
import sys
from pathlib import Path

from jsonschema import Draft202012Validator

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from adapters.deepseek_capture import CAPTURE_NAME, CAPTURE_SHA256, REFERENCE_REVISION, matching_fields, observed_time, read_excerpt

PROFILES = {
    "1.0": "evidence-graph.schema.json",
    "1.1": "scoped-execution-graph.schema.json",
}
ENDPOINTS = {
    "dispatch_corresponds_to_call": ("node.dispatch", "chip.run"),
    "call_contains_runner": ("chip.run", "chip.run.runner_run"),
}


def unique(items, key, label):
    result = {}
    for item in items:
        identity = key(item)
        if identity in result:
            raise ValueError(f"Duplicate {label}: {identity}")
        result[identity] = item
    return result


def ref_key(ref):
    return ref["scope"], ref["id"]


def validate(graph):
    version = graph.get("schema_version") if isinstance(graph, dict) else None
    if not isinstance(version, str) or version not in PROFILES:
        raise ValueError(f"Unsupported graph schema_version: {version}")
    schema = json.loads((ROOT / "schemas" / PROFILES[version]).read_text())
    Draft202012Validator.check_schema(schema)
    error = next(Draft202012Validator(schema).iter_errors(graph), None)
    if error:
        raise ValueError(f"Schema error at {error.json_path}: {error.message}")

    if version == "1.0":
        objects = unique(graph["objects"], lambda obj: obj["object_id"], "object ID")
        for edge in unique(graph["edges"], lambda edge: edge["edge_id"], "edge ID").values():
            if edge["from"] not in objects or edge["to"] not in objects:
                raise ValueError("Dangling legacy edge")
        return

    capture = graph["capture"]
    if (capture["source"], capture["sha256"], capture["reference_revision"]) != (
        CAPTURE_NAME, CAPTURE_SHA256, REFERENCE_REVISION
    ):
        raise ValueError("Capture or reference revision does not match the supported profile")
    scope = "trace:sha256:" + capture["sha256"]
    evidence = unique(graph["evidence"], lambda ev: ev["id"], "evidence ID")
    unique(graph["evidence"], lambda ev: ev["locator"]["index"], "native record index")
    objects = unique(graph["objects"], lambda obj: ref_key(obj["ref"]), "object ref")
    for obj in objects.values():
        anchor = evidence.get(obj["evidence_id"])
        if anchor is None:
            raise ValueError("Missing object evidence")
        if ref_key(obj["ref"]) != (scope, f"raw-{anchor['locator']['index']}"):
            raise ValueError("Object ref does not match the capture scope and native record")
        record = anchor["record"]
        if obj["kind"] != record["name"] or obj["time"] != observed_time(record):
            raise ValueError("Object kind or time contradicts its native record")

    edges = unique(graph["edges"], lambda edge: edge["id"], "edge ID")
    unique(graph["edges"], lambda edge: (ref_key(edge["from"]), ref_key(edge["to"]), edge["relation"]),
           "typed edge")
    for edge in edges.values():
        left, right = (objects.get(ref_key(edge[side])) for side in ("from", "to"))
        if left is None or right is None:
            raise ValueError("Dangling or cross-scope relationship")
        relation = edge["relation"]
        if (left["kind"], right["kind"]) != ENDPOINTS[relation]:
            raise ValueError(f"Invalid endpoint kind or direction for {relation}")
        ids = edge["evidence_ids"]
        if len(ids) != len(set(ids)) or any(i not in evidence for i in ids):
            raise ValueError("Invalid edge evidence references")
        if edge["status"] == "unknown":
            continue
        left_id, right_id = left["evidence_id"], right["evidence_id"]
        if set(ids) != {left_id, right_id} or not matching_fields(
            relation, evidence[left_id]["record"], evidence[right_id]["record"]
        ):
            raise ValueError(f"Missing or incompatible source proof for {relation}")


def validate_source(graph, excerpt):
    if graph["capture"] != excerpt["capture"]:
        raise ValueError("Evidence capture does not match the pinned excerpt")
    originals = {item["index"]: item["record"] for item in excerpt["records"]}
    for ev in graph["evidence"]:
        if ev["record"] != originals.get(ev["locator"]["index"]):
            raise ValueError("Evidence differs from the pinned native event")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("graph", nargs="*", type=Path)
    parser.add_argument("--trace", type=Path, help="Local pinned capture for validating scoped graphs")
    args = parser.parse_args()
    if args.graph:
        paths = args.graph
    else:
        paths = [path for path in sorted((ROOT / "tests/fixtures").glob("*.json"))
                 if "objects" in json.loads(path.read_text())]
    for path in paths:
        try:
            graph = json.loads(path.read_text())
            validate(graph)
            if graph["schema_version"] == "1.1":
                if args.trace is None:
                    raise ValueError("Pass --trace to validate the graph against its original capture")
                validate_source(graph, read_excerpt(args.trace))
        except (ValueError, TypeError, OSError) as exc:
            parser.exit(1, f"{path.name}: {exc}\n")
    print(f"PASS structure and graph semantics: {len(paths)} graphs")


if __name__ == "__main__":
    main()
