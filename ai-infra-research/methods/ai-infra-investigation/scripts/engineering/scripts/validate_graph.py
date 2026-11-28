"""Validate graph shape separately from executable relationship rules."""
import argparse
from collections import Counter
import json
import sys
from pathlib import Path
from math import isfinite

try:
    from jsonschema import Draft202012Validator
except ModuleNotFoundError as exc:
    raise SystemExit(
        f"Missing engineering dependency ({exc.name}). Install with "
        f"python3 -m pip install -r {Path(__file__).resolve().parents[1] / 'requirements.txt'}"
    ) from exc

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from adapters.deepseek_capture import CAPTURE_NAME, CAPTURE_SHA256, REFERENCE_REVISION, matching_fields, observed_time, read_excerpt

PROFILES = {
    "1.0": "evidence-graph.schema.json",
    "1.1": "scoped-execution-graph.schema.json",
    "1.2": "relation-graph.schema.json",
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


def validate(graph, *, report_invalid=False):
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

    if version == "1.2":
        results = assess_relations(graph)
        invalid = [row for row in results if row["result"] == "INVALID"]
        if invalid and not report_invalid:
            raise ValueError("; ".join(f"{row['id']}: {row['reason']}" for row in invalid))
        return results

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


def relation_rules():
    return json.loads((ROOT / "specs/relation-rules.json").read_text())


def assess_relations(graph):
    rules = relation_rules()
    kinds = {kind for rule in rules.values() for pair in rule["pairs"] for kind in pair}
    objects = unique(graph["objects"], lambda obj: ref_key(obj["ref"]), "object ref")
    evidence = unique(graph["evidence"], lambda item: item["id"], "evidence ID")
    edges = unique(graph["edges"], lambda edge: edge["id"], "edge ID")
    unique(edges.values(), lambda edge: (ref_key(edge["from"]), ref_key(edge["to"]), edge["relation"]),
           "typed edge")
    for obj in objects.values():
        if obj["kind"] not in kinds:
            raise ValueError(f"Unregistered object kind: {obj['kind']}")
        interval = obj.get("interval")
        if interval and (
            not all(type(interval[key]) is int or isfinite(interval[key]) for key in ("start", "end"))
            or interval["start"] > interval["end"]
        ):
            raise ValueError(f"Invalid interval for {obj['ref']}")
    for item in evidence.values():
        if any(edge_id not in edges for edge_id in item["supports"]):
            raise ValueError(f"Dangling evidence support: {item['id']}")

    results = []
    for edge in edges.values():
        result, reason = assess_edge(edge, objects, evidence, rules)
        results.append({"id": edge["id"], "result": result, "reason": reason})
    outgoing = Counter(
        (edges[row["id"]]["relation"], ref_key(edges[row["id"]]["from"]))
        for row in results if row["result"] == "VALID"
    )
    for row in results:
        if row["result"] != "VALID":
            continue
        edge = edges[row["id"]]
        limit = rules[edge["relation"]].get("max_targets")
        if limit is not None and outgoing[edge["relation"], ref_key(edge["from"])] > limit:
            row.update(result="INVALID", reason=f"Multiple confirmed targets exceed limit {limit}")
    return results


def assess_edge(edge, objects, evidence, rules):
    rule = rules.get(edge["relation"])
    if rule is None:
        return "INVALID", "Unregistered relation"
    source_ref, target_ref = (ref_key(edge[key]) for key in ("from", "to"))
    left, right = objects.get(source_ref), objects.get(target_ref)
    if left is None or right is None:
        return "INVALID", "Dangling object reference"
    if source_ref == target_ref or [left["kind"], right["kind"]] not in rule["pairs"]:
        return "INVALID", "Invalid endpoint kind, direction or identity"

    cited = [evidence.get(key) for key in edge["evidence_ids"]]
    if any(item is None or edge["id"] not in item["supports"] for item in cited):
        return "INVALID", "Invalid or unrelated evidence reference"

    left_context, right_context = left.get("context", {}), right.get("context", {})
    required = rule.get("same", []) + [
        key for key in rule.get("when_shared", []) if key in left_context and key in right_context
    ]
    if "case" in required and (
        left_context.get("case") != source_ref[0] or right_context.get("case") != target_ref[0]
    ):
        return "INVALID", "Source case and object scope differ"
    context = {}
    gaps = []
    for field in required:
        a, b = left_context.get(field), right_context.get(field)
        if a is None or b is None:
            gaps.append(f"Missing shared {field} context")
        elif a != b:
            return "INVALID", f"Incompatible {field} context"
        else:
            context[field] = a

    if rule.get("time"):
        a, b = left.get("interval"), right.get("interval")
        if not a or not b or (a["clock"], a["unit"]) != (b["clock"], b["unit"]):
            gaps.append("Comparable clock and intervals required")
        elif rule["time"] == "within" and not (b["start"] <= a["start"] <= a["end"] <= b["end"]):
            return "INVALID", "Interval is outside its target window"
        elif rule["time"] == "overlap" and max(a["start"], b["start"]) >= min(a["end"], b["end"]):
            return "INVALID", "Intervals do not overlap"

    status = edge["mapping_status"]
    if status in {"candidate", "ambiguous"}:
        return status.upper(), edge.get("reason", "Mapping is unconfirmed")
    if status == "unknown":
        return "INSUFFICIENT_EVIDENCE", edge.get("reason", "Mapping is unknown")
    levels = {"observed"} if rule.get("evidence") == "observed" else {"observed", "derived"}
    if not any(item["level"] in levels and all(item.get("context", {}).get(key) == value
                                                for key, value in context.items()) for item in cited):
        gaps.append("Matching source evidence required")
    if gaps:
        return "INSUFFICIENT_EVIDENCE", "; ".join(gaps)
    return "VALID", "Registered endpoints, context and evidence references passed"


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
    parser.add_argument("--json", action="store_true", help="Emit graph and per-edge results as JSON")
    args = parser.parse_args()
    if args.graph:
        paths = args.graph
    else:
        paths = [path for path in sorted((ROOT / "tests/fixtures").glob("*.json"))
                 if "objects" in json.loads(path.read_text())]
    reports = []
    for path in paths:
        try:
            graph = json.loads(path.read_text())
            relations = validate(graph, report_invalid=args.json)
            if graph["schema_version"] == "1.1":
                if args.trace is None:
                    raise ValueError("Pass --trace to validate the graph against its original capture")
                validate_source(graph, read_excerpt(args.trace))
            invalid = any(row["result"] == "INVALID" for row in relations or [])
            reports.append({"path": str(path), "valid": not invalid, "relations": relations or []})
            if relations is not None and not args.json:
                for row in relations:
                    print(f"{row['id']}: {row['result']} — {row['reason']}")
        except (ValueError, TypeError, OSError) as exc:
            if not args.json:
                parser.exit(1, f"{path.name}: {exc}\n")
            reports.append({"path": str(path), "valid": False, "error": str(exc), "relations": []})
    if args.json:
        print(json.dumps(reports, ensure_ascii=False, indent=2))
        return 1 if any(not report["valid"] for report in reports) else 0
    print(f"PASS structure and graph semantics: {len(paths)} graphs")


if __name__ == "__main__":
    sys.exit(main())
