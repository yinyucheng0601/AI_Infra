from http.server import BaseHTTPRequestHandler,HTTPServer
from pathlib import Path
P=Path(__file__).resolve().parent
class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        name=self.path.split('?')[0]
        if name not in ['/','/index.html','/model.json','/provenance.json']:
            self.send_error(404);return
        p=P/('index.html' if name=='/' else name[1:]);data=p.read_bytes()
        self.send_response(200);self.send_header('Content-Type','application/json' if p.suffix=='.json' else 'text/html; charset=utf-8');self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)
HTTPServer(('127.0.0.1',8818),Handler).serve_forever()
