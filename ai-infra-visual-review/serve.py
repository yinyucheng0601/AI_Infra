"""Serve this deck directory only, bound to loopback."""
import argparse
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--port',type=int,default=8847)
args=parser.parse_args()
root=Path(__file__).resolve().parent
handler=partial(SimpleHTTPRequestHandler,directory=str(root))
server=ThreadingHTTPServer(('127.0.0.1',args.port),handler)
print(f'http://127.0.0.1:{server.server_port}/index.html',flush=True)
server.serve_forever()
