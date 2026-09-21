import copy
import importlib.util
import json
from pathlib import Path
import sys
import tempfile
import threading
import unittest
from urllib.request import Request, urlopen
from urllib.error import HTTPError
from http.server import ThreadingHTTPServer

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / 'scripts'))
from serve import Preview, handler_for, safe_file, collect_files, markdown
from validate_catalog import validate


class CatalogTests(unittest.TestCase):
    def setUp(self):
        self.data = json.loads((ROOT / 'catalog/assets.json').read_text())

    def test_valid(self):
        self.assertEqual(validate(self.data), 22)

    def test_duplicate_rejected(self):
        self.data['assets'].append(copy.deepcopy(self.data['assets'][0]))
        with self.assertRaises(AssertionError):
            validate(self.data)

    def test_public_without_review_rejected(self):
        self.data['assets'][0]['visibility'] = 'public'
        with self.assertRaises(AssertionError):
            validate(self.data)

    def test_out_of_scope_rejected(self):
        self.data['assets'][0]['sources'][0]['path'] = 'model_skill-dss3.2new/report/index.html'
        with self.assertRaises(AssertionError):
            validate(self.data)

    def test_raw_html_not_executed(self):
        rendered = markdown('# Hello\n<script>alert(1)</script>\n[x](javascript:alert)\n```\n<b>code</b>\n```')
        self.assertNotIn('<script>', rendered)
        self.assertNotIn('href="javascript:', rendered)
        self.assertIn('&lt;b&gt;', rendered)

    def test_containment_and_dependencies(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / 'index.html').write_text('<link rel="stylesheet" href="style.css"><a href="secret.txt">x</a>')
            (root / 'style.css').write_text('body{}')
            (root / 'secret.txt').write_text('private')
            self.assertIsNone(safe_file(root, '../secret.txt'))
            self.assertIsNone(safe_file(root, '.git/config'))
            allowed, missing, _ = collect_files(root, ['index.html'])
            self.assertEqual(set(allowed), {'index.html', 'style.css'})
            self.assertEqual(missing, [])

    def test_template_literal_image_dependency(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            (root / 'index.html').write_text('<script>const x=`<img src="figure.svg">`;</script>')
            (root / 'figure.svg').write_text('<svg/>')
            allowed, missing, _ = collect_files(root, ['index.html'])
            self.assertIn('figure.svg', allowed)
            self.assertEqual(missing, [])


class HTTPTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        config = json.loads((ROOT / '.local/sources.json').read_text()) if (ROOT / '.local/sources.json').exists() else {}
        cls.preview = Preview(config)
        cls.server = ThreadingHTTPServer(('127.0.0.1', 0), handler_for(cls.preview))
        cls.url = 'http://127.0.0.1:' + str(cls.server.server_port)
        cls.thread = threading.Thread(target=cls.server.serve_forever, daemon=True)
        cls.thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()
        cls.thread.join()

    def test_home(self):
        with urlopen(self.url + '/') as r:
            self.assertIn('AI Infra'.encode(), r.read())

    def test_cors_is_only_for_loopback_health(self):
        with urlopen(Request(self.url + '/api/health', headers={'Origin': 'http://127.0.0.1:8765'})) as r:
            self.assertEqual(r.headers['Access-Control-Allow-Origin'], 'http://127.0.0.1:8765')
        with urlopen(Request(self.url + '/api/health', headers={'Origin': 'https://example.com'})) as r:
            self.assertIsNone(r.headers['Access-Control-Allow-Origin'])

    def test_private_and_directory_requests_denied(self):
        for route in ['/sources/pto/', '/.git/config', '/.local/sources.json', '/sources/pto/%2e%2e/README.md', '/sources/pypto/Insight/09lingqu.md']:
            with self.assertRaises(HTTPError) as ctx:
                urlopen(self.url + route)
            self.assertEqual(ctx.exception.code, 404)
            ctx.exception.close()

    def test_foreign_host_denied(self):
        with self.assertRaises(HTTPError) as ctx:
            urlopen(Request(self.url + '/', headers={'Host': 'attacker.example'}))
        self.assertEqual(ctx.exception.code, 403)
        ctx.exception.close()

    def test_missing_reader_explicit(self):
        with self.assertRaises(HTTPError) as ctx:
            urlopen(self.url + '/read/not-a-real-id')
        self.assertEqual(ctx.exception.code, 404)
        ctx.exception.close()


if __name__ == '__main__':
    unittest.main()
