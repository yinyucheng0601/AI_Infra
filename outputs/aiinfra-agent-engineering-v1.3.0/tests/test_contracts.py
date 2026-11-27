import json, sys, unittest
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT))
from adapters.pypto_trace_adapter import normalize_event, normalize_trace
from adapters.catalog_adapter import route_semantic_object

class ContractTests(unittest.TestCase):
    def test_trace_normalization_preserves_unknowns(self):
        x=normalize_event({"name":"RMSNorm","layer":"operator","shape":[4,8]})
        self.assertEqual(x["name"],"RMSNorm")
        self.assertEqual(x["evidence_level"],"unknown")
        self.assertNotIn("physical_address",x)
    def test_trace_observed_when_timestamp_present(self):
        x=normalize_event({"name":"kernel","timestamp":10,"duration":2})
        self.assertEqual(x["evidence_level"],"observed")
    def test_invalid_layer_does_not_leak(self):
        x=normalize_event({"name":"x","layer":"made-up"})
        self.assertEqual(x["layer"],"runtime")
    def test_approved_mapping_candidate(self):
        x=route_semantic_object("tensor","tensor-lineage")
        self.assertEqual(x["glyph_id"],"system-value")
        self.assertTrue(x["requires_source_confirmation"])
    def test_unknown_mapping_stays_unresolved(self):
        x=route_semantic_object("mystery","new-task")
        self.assertEqual(x["status"],"unresolved")
        self.assertNotIn("glyph_id",x)
    def test_fixture_edges_resolve(self):
        d=json.loads((ROOT/"tests/fixtures/tensor-cross-layer.json").read_text())
        ids={o["object_id"] for o in d["objects"]}
        self.assertTrue(all(e["from"] in ids and e["to"] in ids for e in d["edges"]))
    def test_rank_collective_participants_exist(self):
        d=json.loads((ROOT/"tests/fixtures/rank-sharding-collective.json").read_text())
        ranks={x["rank"] for x in d["ranks"]}
        self.assertTrue(set(d["collective"]["participants"]).issubset(ranks))


class ScopedTraceTests(unittest.TestCase):
    def setUp(self):
        from adapters.deepseek_capture import CAPTURE_NAME, CAPTURE_SHA256, PATH_INDICES, REFERENCE_REVISION, project
        from scripts.validate_graph import validate
        self.excerpt = {
            "capture": {"source": CAPTURE_NAME, "sha256": CAPTURE_SHA256,
                        "reference_revision": REFERENCE_REVISION},
            "records": [
                {"index": index, "record": record}
                for index, record in zip(PATH_INDICES, [
                    {"name": "node.dispatch", "ph": "X", "pid": 10, "tid": 10,
                     "ts": 1, "dur": 3, "args": {"run_id": 1, "dispatch_id": 2}},
                    {"name": "chip.run", "ph": "X", "pid": 20, "tid": 20,
                     "ts": 5, "dur": 10, "args": {"run_id": 1, "dispatch_id": 2, "inv": 3}},
                    {"name": "chip.run.runner_run", "ph": "X", "pid": 20, "tid": 20,
                     "ts": 6, "dur": 2, "args": {"inv": 3}},
                ])
            ],
        }
        self.graph = project(self.excerpt)
        self.project = project
        self.validate = validate

    def test_same_name_without_ids_stays_distinct_in_batch(self):
        events = normalize_trace([{"name": "x", "timestamp": 10}, {"name": "x", "timestamp": 20}])
        self.assertNotEqual(events[0]["object_id"], events[1]["object_id"])

    def test_invalid_measurements_stay_unknown(self):
        for value in (None, True, "10", float("inf")):
            with self.subTest(value=value):
                self.assertEqual(normalize_event({"timestamp": value})["evidence_level"], "unknown")

    def test_projected_graph_has_two_confirmed_edges(self):
        self.validate(self.graph)
        self.assertEqual([edge["status"] for edge in self.graph["edges"]], ["confirmed", "confirmed"])

    def test_duplicate_identity_rejected(self):
        self.graph["objects"].append(self.graph["objects"][0])
        with self.assertRaisesRegex(ValueError, "Duplicate object ref"):
            self.validate(self.graph)

    def test_cross_scope_and_revision_rejected(self):
        edge = self.graph["edges"][0]
        edge["to"] = {**edge["to"], "scope": "different-run"}
        with self.assertRaisesRegex(ValueError, "cross-scope"):
            self.validate(self.graph)
        self.graph = self.project(self.excerpt)
        self.graph["capture"]["reference_revision"] = "0" * 40
        with self.assertRaisesRegex(ValueError, "revision"):
            self.validate(self.graph)

    def test_wrong_direction_rejected(self):
        edge = self.graph["edges"][0]
        edge["from"], edge["to"] = edge["to"], edge["from"]
        with self.assertRaisesRegex(ValueError, "direction"):
            self.validate(self.graph)

    def test_missing_evidence_cannot_confirm(self):
        self.graph["edges"][0]["evidence_ids"] = []
        with self.assertRaisesRegex(ValueError, "source proof"):
            self.validate(self.graph)

    def test_raw_records_must_support_the_mapping(self):
        self.excerpt["records"][1]["record"]["args"]["dispatch_id"] = 999
        graph = self.project(self.excerpt)
        self.validate(graph)
        self.assertEqual(graph["edges"][0]["status"], "unknown")
        graph["edges"][0]["status"] = "confirmed"
        graph["edges"][0]["evidence_ids"] = [obj["evidence_id"] for obj in graph["objects"][:2]]
        with self.assertRaisesRegex(ValueError, "source proof"):
            self.validate(graph)

    def test_cross_process_interval_cannot_confirm_containment(self):
        self.excerpt["records"][2]["record"]["pid"] = 999
        graph = self.project(self.excerpt)
        self.validate(graph)
        self.assertEqual(graph["edges"][1]["status"], "unknown")
        graph["edges"][1]["status"] = "confirmed"
        graph["edges"][1]["evidence_ids"] = [obj["evidence_id"] for obj in graph["objects"][1:]]
        with self.assertRaisesRegex(ValueError, "source proof"):
            self.validate(graph)

    def test_schema_rejects_incomplete_object_ref(self):
        del self.graph["objects"][0]["ref"]["scope"]
        with self.assertRaisesRegex(ValueError, "Schema error"):
            self.validate(self.graph)


    def test_source_rejects_edited_native_evidence(self):
        from scripts.validate_graph import validate_source
        from copy import deepcopy
        excerpt = deepcopy(self.excerpt)
        self.graph["evidence"][0]["record"]["args"]["worker_id"] = 999
        with self.assertRaisesRegex(ValueError, "pinned native event"):
            validate_source(self.graph, excerpt)


if __name__ == "__main__":
    unittest.main()
