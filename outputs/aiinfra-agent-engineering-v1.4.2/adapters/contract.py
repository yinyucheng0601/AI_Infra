"""Source references and stable identities for the inspection result."""
import hashlib
import json


def digest(data):
    return hashlib.sha256(data).hexdigest()


def identity(kind, form, namespace, native_id, scope):
    if not scope or native_id is None:
        raise ValueError("Native identity requires a scope and ID")
    return digest(json.dumps([kind, form, namespace, native_id, scope],
                             sort_keys=True).encode())


def member(path, raw, producer="unknown"):
    return {"path": path, "sha256": digest(raw), "bytes": len(raw),
            "producer": producer, "producer_version": "unknown", "revision": "unknown",
            "build": None, "run": None, "acquisition": "local-file",
            "integrity": "fingerprinted"}


def validate(result):
    """Validate the built-in result before export."""
    def index(rows, key):
        values = [key(row) for row in rows]
        if len(set(values)) != len(values):
            raise ValueError("Duplicate result identity")
        return set(values)

    sources = {row["path"]: row for row in result["sources"]}
    index(result["sources"], lambda row: row["path"])
    objects = index(result["objects"], lambda row: row["ref"]["id"])
    evidence = index(result["evidence"], lambda row: row["id"])
    if objects != index(result["native_records"], lambda row: row["id"]):
        raise ValueError("Native records do not match objects")
    for row in result["evidence"]:
        source = sources.get(row["source"])
        if not source or row["sha256"] != source["sha256"] or not row["locator"]:
            raise ValueError("Evidence is missing its source binding")
    for row in result["objects"]:
        if not row["evidence_ids"] or set(row["evidence_ids"]) - evidence:
            raise ValueError("Invalid object evidence references")
    if result["relations"]:
        raise ValueError("Record inspector does not emit confirmed semantic edges")
    for key, count in result["coverage"].items():
        if count != len(result[key]):
            raise ValueError("Coverage count differs from exported records")
