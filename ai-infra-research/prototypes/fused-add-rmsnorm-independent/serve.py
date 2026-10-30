from http.server import HTTPServer,BaseHTTPRequestHandler
from pathlib import Path
P=Path(__file__).resolve().parent
class Handler(BaseHTTPRequestHandler):
 def do_GET(self):
  if self.path.split('?')[0] not in ('/','/index.html'):
   self.send_error(404);return
  data=(P/'index.html').read_bytes();self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(data)
HTTPServer(('127.0.0.1',8820),Handler).serve_forever()
