"""Loopback-only preview with a task-specific path allowlist."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from urllib.parse import unquote, urlsplit
ROOT=Path(__file__).resolve().parents[5]
BASE='ai-infra-research/patterns/npu-memory-atlas/'
EXTRA={'ai-infra-research/patterns/training-graph/expert-glyph.js','ai-infra-research/patterns/training-graph/graph-layout.js'}
class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*a,**kw):super().__init__(*a,directory=str(ROOT),**kw)
    def do_GET(self):
        p=unquote(urlsplit(self.path).path).lstrip('/')
        if p=='':self.send_response(302);self.send_header('Location','/'+BASE+'variants/index_training.html');self.end_headers();return
        target=(ROOT/p).resolve()
        if not target.is_relative_to(ROOT) or not(p.startswith(BASE) or p in EXTRA) or target.is_dir():self.send_error(404);return
        super().do_GET()
    def log_message(self,*a):pass
if __name__=='__main__':
    print('Training preview: http://127.0.0.1:8907/',flush=True)
    ThreadingHTTPServer(('127.0.0.1',8907),Handler).serve_forever()
