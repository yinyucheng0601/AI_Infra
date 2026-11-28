import json
from pathlib import Path
from tempfile import TemporaryDirectory
import unittest
from adapters.contract import identity, validate
from adapters.legacy_bridge import unwrap, wrap
from adapters.pipeline import inspect


class InspectionTests(unittest.TestCase):
    def test_multi_input_and_physical_locators(self):
        with TemporaryDirectory() as temp:
            root = Path(temp)
            (root / 'a.jsonl').write_text('\n{"v":1}\ninvalid\n')
            (root / 'b.json').write_text('[{"v":2}]')
            (root / 'c.mlir').write_text('unrecognized syntax')
            (root / 'd.json').write_text('{bad')
            data = inspect(root, [root])
            validate(data)
            self.assertEqual(data['extraction_status'], 'partial')
            self.assertEqual([x['locator'] for x in data['evidence']],
                             [{'line': 2}, {'pointer': '/0'}])
            self.assertFalse(data['relations'])
            self.assertEqual(data, inspect(root, [root]))

    def test_identity_separates_run_and_form(self):
        a = identity('task', 'instance', 'producer', 1, {'run': 'a'})
        self.assertNotEqual(a, identity('task', 'instance', 'producer', 1, {'run': 'b'}))
        self.assertNotEqual(a, identity('task', 'definition', 'producer', 1, {'run': 'a'}))

    def test_legacy_fixture_round_trip(self):
        path = Path(__file__).parent / 'fixtures/rmsnorm-relation-graph.json'
        graph = json.loads(path.read_text())
        self.assertEqual(unwrap(wrap(graph)), graph)

    def test_invalid_trace_and_unpaired_flow_stay_unresolved(self):
        with TemporaryDirectory() as temp:
            root = Path(temp)
            (root / 'trace').write_text(json.dumps({'traceEvents': [
                {'ph': 'X', 'ts': 1, 'dur': -2}, {'ph': 's', 'id': 1}]}))
            result = inspect(root, [Path('trace')])
            validate(result)
            self.assertEqual(result['extraction_status'], 'partial')
            self.assertEqual(len(result['unresolved']), 2)
            self.assertFalse(result['relations'])
