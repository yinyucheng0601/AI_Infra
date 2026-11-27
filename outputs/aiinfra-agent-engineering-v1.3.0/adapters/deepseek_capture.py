"""Project one pinned, documented DeepSeek V4 execution path from native records."""
import hashlib
import json

from adapters.pypto_trace_adapter import valid_number

REFERENCE_REVISION = "781de42dabfbedbb284553d689129737c237e06e"
CAPTURE_SHA256 = "04acfb37b21f44f5225b48d2fc6c914cac95aa5cee093cd1dfdfa7bc713a19d2"
CAPTURE_NAME = "trace_view_pto_tp1_dp16_8k_16b.json"
PATH_INDICES = (1110, 1112, 1269)


def observed_time(record):
    start, duration = record.get("ts"), record.get("dur")
    pid = record.get("pid")
    if (
        record.get("ph") == "X" and type(pid) is int
        and valid_number(start) and valid_number(duration) and duration >= 0
    ):
        # Compare only inside an observed process timeline.
        return {"clock_domain": f"pid:{pid}", "unit": "us", "start": start, "duration": duration}
    return None


def read_excerpt(trace_path):
    raw = trace_path.read_bytes()
    if hashlib.sha256(raw).hexdigest() != CAPTURE_SHA256:
        raise ValueError("Trace SHA256 differs from the pinned capture")
    events = json.loads(raw)["traceEvents"]
    return {
        "capture": {"source": CAPTURE_NAME, "sha256": CAPTURE_SHA256,
                    "reference_revision": REFERENCE_REVISION},
        "records": [{"index": index, "record": events[index]} for index in PATH_INDICES],
    }


def field_match(left, right, fields):
    def value(record, field):
        return record.get("args", {}).get(field[5:]) if field.startswith("args.") else record.get(field)

    return all(type(value(left, field)) is int and type(value(right, field)) is int
               and value(left, field) == value(right, field) for field in fields)


def same_clock(left, right):
    return (left is not None and right is not None
            and left["clock_domain"] == right["clock_domain"] and left["unit"] == right["unit"])


def enclosed(parent, child):
    return (same_clock(parent, child) and parent["start"] <= child["start"]
            and child["start"] + child["duration"] <= parent["start"] + parent["duration"])


def matching_fields(relation, left, right):
    if relation == "dispatch_corresponds_to_call":
        return field_match(left, right, ("args.run_id", "args.dispatch_id"))
    return field_match(left, right, ("pid", "tid", "args.inv")) and enclosed(
        observed_time(left), observed_time(right)
    )


def project(excerpt):
    capture = excerpt["capture"]
    scope = "trace:sha256:" + capture["sha256"]
    evidence = [{"id": f"trace:{row['index']}", "locator": {"index": row["index"]},
                 "record": row["record"]} for row in excerpt["records"]]
    objects = [{"ref": {"scope": scope, "id": f"raw-{row['locator']['index']}"},
                "kind": row["record"]["name"], "evidence_id": row["id"],
                "time": observed_time(row["record"])} for row in evidence]
    by_index = {row["locator"]["index"]: (obj, row["record"]) for obj, row in zip(objects, evidence)}
    dispatch, call, runner = (by_index[index] for index in PATH_INDICES)
    mappings = [
        ("dispatch_corresponds_to_call", dispatch, call,
         "原始 run_id、dispatch_id 一致。", "缺少匹配的 run_id 或 dispatch_id。"),
        ("call_contains_runner", call, runner,
         "原始 PID、TID、inv 一致，同一进程时间窗包含 Runner。",
         "PID、TID、inv 或同一时钟下的包含区间未得到证实。"),
    ]
    edges = []
    for relation, (left, left_record), (right, right_record), basis, gap in mappings:
        confirmed = matching_fields(relation, left_record, right_record)
        edges.append({
            "id": relation, "from": left["ref"], "to": right["ref"], "relation": relation,
            "status": "confirmed" if confirmed else "unknown",
            "evidence_ids": [left["evidence_id"], right["evidence_id"]] if confirmed else [],
            "reason": basis if confirmed else gap,
        })
    return {"schema_version": "1.1", "capture": capture,
            "objects": objects, "edges": edges, "evidence": evidence}
