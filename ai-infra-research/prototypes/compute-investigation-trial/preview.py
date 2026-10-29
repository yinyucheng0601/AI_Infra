"""Serve only the three generated HTML files on loopback."""
from http.server import BaseHTTPRequestHandler,ThreadingHTTPServer
from pathlib import Path
ROOT=Path(__file__).resolve().parent
class Handler(BaseHTTPRequestHandler):
 def do_GET(self):
  name=self.path.split('?')[0].lstrip('/') or 'index.html'
  if self.headers.get('Host','').split(':')[0] not in ('127.0.0.1','localhost') or name not in ('index.html','unpack.html','expand.html'):
   self.send_error(404);return
  data=(ROOT/name).read_bytes()
  if self.path.endswith('?viewport=390'):
   data=('<!doctype html><title>390px responsive preview</title><body style="margin:0;background:#333"><iframe title="390px tool viewport" src="/'+name+'" style="display:block;width:390px;height:844px;border:0;margin:auto"></iframe></body>').encode()
  self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.send_header('Content-Length',str(len(data)));self.send_header('Cache-Control','no-store');self.end_headers();self.wfile.write(data)
ThreadingHTTPServer(('127.0.0.1',8778),Handler).serve_forever()
