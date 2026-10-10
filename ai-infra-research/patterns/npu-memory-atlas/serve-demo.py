"""Serve only the communication demo and its explicit dependencies on loopback."""
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit
import mimetypes

ROOT = Path(__file__).resolve().parent
FILES = {
    '/' + name: ROOT / name for name in (
        'variants/index_comm.html', 'variants/index_comm/ep-model.js',
        'variants/index_comm/rank-model.js', 'variants/index_comm/rank-workbench.js',
        'variants/index_comm/rank-workbench.css', 'npu-memory-atlas-embed.js',
    )
}


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        if self.headers.get('Host', '').split(':')[0] not in ('127.0.0.1', 'localhost'):
            self.send_error(403)
            return
        path = urlsplit(self.path).path
        file = FILES.get(path)
        if file is None or not file.is_file() or file.resolve().parent not in (ROOT, ROOT / 'variants', ROOT / 'variants/index_comm'):
            self.send_error(404)
            return
        data = file.read_bytes()
        self.send_response(200)
        self.send_header('Content-Type', mimetypes.guess_type(file.name)[0] or 'application/octet-stream')
        self.send_header('Content-Length', str(len(data)))
        self.send_header('Cache-Control', 'no-store')
        self.end_headers()
        self.wfile.write(data)


if __name__ == '__main__':
    server = ThreadingHTTPServer(('127.0.0.1', 8769), Handler)
    print('Demo: http://127.0.0.1:8769/variants/index_comm.html', flush=True)
    server.serve_forever()
