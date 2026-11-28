import copy
import itertools
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

from scripts.validate_graph import assess_edge, ref_key, relation_rules, validate


def example():
    return json.loads((ROOT / "tests/fixtures/rmsnorm-relation-graph.json").read_text())


def pair_graph(relation, pair):
    context = {"run": "fixture-run", "rank": 0, "device": "fixture-npu", "build": "fixture-build"}
    left, right = [
        {"ref": {"scope": f"fixture:{i}", "id": "same-local-id"}, "kind": kind, "context": dict(context),
         "interval": {"clock": "fixture-clock", "unit": "us", "start": i, "end": 8 - i}}
        for i, kind in ((1, pair[0]), (0, pair[1]))
    ]
    if "case" in relation_rules()[relation].get("same", []):
        context["case"] = "fixture:source-case"
        for i, obj in enumerate((left, right)):
            obj["ref"] = {"scope": context["case"], "id": f"source-object-{i}"}
            obj["context"] = dict(context)
    return {
        "schema_version": "1.2", "objects": [left, right],
        "edges": [{"id": "r", "relation": relation, "from": left["ref"], "to": right["ref"],
                   "mapping_status": "exact", "evidence_ids": ["ev"]}],
        "evidence": [{"id": "ev", "source": "synthetic fixture", "locator": "row:1",
                      "level": "observed", "supports": ["r"], "context": dict(context)}],
    }


class RelationRulesTests(unittest.TestCase):
    def test_all_registered_kind_combinations(self):
        rules = relation_rules()
        kinds = sorted({kind for rule in rules.values() for pair in rule["pairs"] for kind in pair})
        checks = 0
        for relation, rule in rules.items():
            pairs = {tuple(pair) for pair in rule["pairs"]}
            self.assertTrue(pairs)
            self.assertLess(len(pairs), len(kinds) ** 2)
            for pair in itertools.product(kinds, repeat=2):
                graph = pair_graph(relation, pair)
                edge = graph["edges"][0]
                objects = {ref_key(obj["ref"]): obj for obj in graph["objects"]}
                result, _ = assess_edge(edge, objects, {"ev": graph["evidence"][0]}, rules)
                self.assertEqual(result, "VALID" if pair in pairs else "INVALID", (relation, pair))
                checks += 1
            graph = pair_graph(relation, next(iter(pairs)))
            graph["evidence"][0]["level"] = "assumed"
            self.assertEqual(validate(graph)[0]["result"], "INSUFFICIENT_EVIDENCE", relation)
        print(f"Relation compatibility: {len(rules)} relations × {len(kinds)} × {len(kinds)} = {checks} checks")

    def test_rmsnorm_output_preserves_uncertainty(self):
        self.assertEqual([r["result"] for r in validate(example())],
                         ["VALID", "CANDIDATE", "INSUFFICIENT_EVIDENCE", "AMBIGUOUS"])

    def test_invalid_kind_or_direction_is_rejected_even_for_candidate(self):
        graph = example()
        edge = graph["edges"][1]
        edge["from"], edge["to"] = edge["to"], edge["from"]
        with self.assertRaisesRegex(ValueError, "kind, direction or identity"):
            validate(graph)

    def test_context_conflicts(self):
        for field, value in {"run": "other-run", "rank": 3, "device": "different-npu", "step": "other-step"}.items():
            with self.subTest(field=field):
                graph = pair_graph("executes_on", ("kernel_launch", "npu"))
                graph["objects"][0]["context"]["step"] = "step"
                graph["objects"][1]["context"][field] = value
                with self.assertRaisesRegex(ValueError, f"Incompatible {field}"):
                    validate(graph)

    def test_missing_context_or_unrelated_evidence(self):
        graph = pair_graph("references", ("memref", "allocation"))
        del graph["objects"][1]["context"]["run"]
        self.assertEqual(validate(graph)[0]["result"], "INSUFFICIENT_EVIDENCE")
        graph["edges"][0]["evidence_ids"] = ["unknown-ref"]
        with self.assertRaisesRegex(ValueError, "evidence reference"):
            validate(graph)

    def test_incomparable_clock_and_disjoint_intervals(self):
        graph = pair_graph("overlaps", ("interval", "interval"))
        graph["objects"][1]["interval"]["clock"] = "independent"
        self.assertEqual(validate(graph)[0]["result"], "INSUFFICIENT_EVIDENCE")
        graph["objects"][1]["interval"].update(clock="fixture-clock", start=10, end=11)
        with self.assertRaisesRegex(ValueError, "do not overlap"):
            validate(graph)

    def test_distinct_scope_is_not_an_identity_merge(self):
        graph = pair_graph("maps_to", ("tensor", "ir_value"))
        self.assertEqual(validate(graph)[0]["result"], "VALID")
        graph["objects"][1]["ref"] = graph["objects"][0]["ref"]
        with self.assertRaisesRegex(ValueError, "Duplicate object ref"):
            validate(graph)

    def test_instance_definition_cardinality(self):
        graph = pair_graph("instance_of", ("kernel_launch", "kernel"))
        another = copy.deepcopy(graph["objects"][1])
        another["ref"]["id"] = "second-definition"
        graph["objects"].append(another)
        graph["edges"].append({**graph["edges"][0], "id": "r2", "to": another["ref"]})
        graph["evidence"][0]["supports"].append("r2")
        with self.assertRaisesRegex(ValueError, "exceed limit"):
            validate(graph)
        graph["edges"][1]["mapping_status"] = "candidate"
        self.assertEqual([r["result"] for r in validate(graph)], ["VALID", "CANDIDATE"])

    def test_machine_report_fails_for_unregistered_relation(self):
        graph = example()
        graph["edges"][0]["relation"] = "invented"
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / "graph.json"
            path.write_text(json.dumps(graph))
            run = subprocess.run([sys.executable, "-B", str(ROOT / "scripts/validate_graph.py"),
                                  "--json", str(path)], capture_output=True, text=True)
        self.assertEqual(run.returncode, 1, run.stderr)
        self.assertEqual(json.loads(run.stdout)[0]["relations"][0]["result"], "INVALID")


    def test_example_builder_blocks_invalid_output(self):
        with tempfile.TemporaryDirectory() as directory:
            graph_path = Path(directory) / "graph.json"
            out = Path(directory) / "view.html"
            graph_path.write_text(json.dumps(example()))
            cmd = [sys.executable, "-B", str(ROOT / "scripts/build_example.py"),
                   "--graph", str(graph_path), "--out", str(out)]
            run = subprocess.run(cmd, capture_output=True, text=True)
            self.assertEqual(run.returncode, 0, run.stderr)
            text = out.read_text()
            self.assertIn("INSUFFICIENT_EVIDENCE", text)
            self.assertIn("AMBIGUOUS", text)
            graph = example()
            graph["edges"][0]["to"] = graph["objects"][-1]["ref"]
            graph_path.write_text(json.dumps(graph))
            run = subprocess.run(cmd, capture_output=True, text=True)
            self.assertEqual(run.returncode, 1, run.stderr)
            self.assertEqual(out.read_text(), text)


    def test_source_scope_and_build_conflicts(self):
        graph = pair_graph("candidate_locates_source_step", ("sync_candidate", "source_step"))
        graph["objects"][1]["ref"]["scope"] = "different-config"
        with self.assertRaisesRegex(ValueError, "case and object scope differ"):
            validate(graph)
        graph = pair_graph("task_reaches_source_step", ("task", "source_step"))
        graph["objects"][1]["context"]["build"] = "other-revision"
        with self.assertRaisesRegex(ValueError, "Incompatible build"):
            validate(graph)
