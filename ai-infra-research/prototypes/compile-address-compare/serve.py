from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlsplit, unquote
ROOT=Path(__file__).resolve().parent
ALLOWED={'/','/index.html','/model.json','/memory-reuse.js','/memory-reuse.css'}|{'/sources/'+p.name for p in (ROOT/'sources').iterdir()}
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*a,**kw): super().__init__(*a,directory=str(ROOT),**kw)
 def do_GET(self):
  if unquote(urlsplit(self.path).path) not in ALLOWED: self.send_error(404); return
  super().do_GET()
ThreadingHTTPServer(('127.0.0.1',8822),Handler).serve_forever()
