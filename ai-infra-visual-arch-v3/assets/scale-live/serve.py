"""Loopback-only preview; one-file allowlist, no directory listings."""
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
PAGE = Path(__file__).resolve().with_name('index.html')
class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.path.split('?')[0] not in ('/', '/index.html'):
            self.send_error(404)
            return
        data = PAGE.read_bytes()
        self.send_response(200)
        self.send_header('Content-Type', 'text/html; charset=utf-8')
        self.send_header('Content-Length', str(len(data)))
        self.end_headers()
        self.wfile.write(data)
HTTPServer(('127.0.0.1', 8798), Handler).serve_forever()
