"""Regression checks for freshness, integrity and committed-artifact validation."""
import json
from pathlib import Path
import tempfile
import unittest
import subprocess
import sys
from unittest.mock import patch

import collect_csa as csa


class CollectionTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        workspace = Path(self.temp.name)
        self.root = workspace / 'AI_Infra/ai-infra-research'
        self.source = workspace / 'PyPTO3-main/Design/csa-pass-field'
        self.source.mkdir(parents=True)
        for name in ('index.html', 'package.json', 'package-lock.json', 'vite.config.mjs',
                     'src/App.jsx', 'scripts/build.mjs'):
            path = self.source / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text('source')
        architecture = self.source.parents[1] / 'Design/architecture/deepseek_v4_flash_csa'
        architecture.mkdir(parents=True)
        for name in ('implementation-programs.js', 'mapping-registry.js', 'json-architecture.js', 'json-architecture.json'):
            (architecture / name).write_text('{}')
        run = self.source.parents[1] / 'Data/DeepseekV4' / csa.RUN
        for name in ('passes_dump/00_frontend.py', 'next_levels/decode_csa_test/ptoas/qk_pv.pto',
                     'next_levels/decode_csa_test/ptoas/qk_pv.cpp',
                     'dfx_outputs/rank0/d0/chip_swimlane_records.json',
                     'dfx_outputs/rank1/d0/chip_swimlane_records.json',
                     'dfx_outputs/rank0/d0/deps.json', 'dfx_outputs/rank0/d0/name_map.json',
                     'dfx_outputs/rank0/d0/dispatch_program.json',
                     'dfx_outputs/rank0/d0/merged_swimlane_1.json'):
            path = run / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text('{}')
        (self.root / 'catalog').mkdir(parents=True)
        (self.root / 'catalog/assets.json').write_text(json.dumps({'assets':[{'id':'csa-pass-field'}]}))
        (self.source / 'dist').mkdir()
        (self.source / 'dist/index.html').write_bytes(b'<html>built</html>')
        (self.source / 'dist/artifact-manifest.json').write_text(json.dumps({'htmlSha256':csa.digest(b'<html>built</html>')}))

    def collect(self):
        with patch.object(csa.subprocess, 'run') as build:
            self.assertTrue(csa.collect(self.root, self.source))
            build.assert_called_once()

    def test_freshness_and_external_input_change(self):
        self.collect()
        with patch.object(csa.subprocess, 'run') as build:
            self.assertFalse(csa.collect(self.root, self.source))
            build.assert_not_called()
        (self.source / 'src/App.jsx').write_text('changed')
        with self.assertRaisesRegex(RuntimeError, 'source changed'):
            csa.collect(self.root, self.source, check=True)
        self.collect()
        architecture = self.source.parents[1] / 'Design/architecture/deepseek_v4_flash_csa/json-architecture.json'
        architecture.write_text('changed input')
        with self.assertRaisesRegex(RuntimeError, 'source changed'):
            csa.collect(self.root, self.source, check=True)

    def test_html_integrity_and_missing_source(self):
        self.collect()
        (self.root / csa.REL / 'index.html').write_text('manual edit')
        with self.assertRaisesRegex(RuntimeError, 'HTML differs'):
            csa.collect(self.root, self.source, check=True)
        with self.assertRaisesRegex(RuntimeError, 'source/run missing'):
            csa.fingerprint(self.source / 'missing')

    def test_push_checks_committed_bytes_not_worktree(self):
        self.collect()
        target = self.root / csa.REL
        committed_manifest = (target / 'artifact-manifest.json').read_bytes()
        # Working-tree HTML is valid; outgoing commit has stale/tampered HTML.
        with patch.object(csa.subprocess, 'check_output', side_effect=[committed_manifest, b'old commit']):
            with self.assertRaisesRegex(RuntimeError, 'HTML differs'):
                csa.collect(self.root, self.source, revision='outgoing-sha')

    def test_commit_hook_stages_only_managed_artifacts_and_protects_unstaged_edits(self):
        scripts = self.root / 'scripts'
        scripts.mkdir()
        hook = scripts / 'collection_hook.py'
        hook.write_bytes((csa.ROOT / 'scripts/collection_hook.py').read_bytes())
        # Exercise the real hook's staging with a tiny build, in an isolated repo.
        from collection_hook import MANAGED
        (scripts / 'build.py').write_text(
            'from pathlib import Path\n'
            f'for name in {MANAGED!r}:\n'
            ' p=Path(name); p.parent.mkdir(parents=True,exist_ok=True); p.write_text("generated")\n')
        repo = self.root.parent
        def git(*args):
            return subprocess.check_output(['rtk', 'proxy', 'git', *args], cwd=repo).decode()
        git('init', '-q')
        (repo / 'unrelated.txt').write_text('keep unstaged')
        subprocess.run(['rtk', 'proxy', sys.executable, str(hook)], cwd=repo, check=True, capture_output=True)
        staged = git('diff', '--cached', '--name-only').splitlines()
        self.assertEqual(sorted(staged), sorted(MANAGED))
        (repo / MANAGED[0]).write_text('user unstaged edit')
        failed = subprocess.run(['rtk', 'proxy', sys.executable, str(hook)], cwd=repo, capture_output=True)
        self.assertNotEqual(failed.returncode, 0)
        self.assertIn(b'unstaged changes', failed.stderr)
        self.assertEqual(git('show', ':' + MANAGED[0]), 'generated')


if __name__ == '__main__':
    unittest.main()
