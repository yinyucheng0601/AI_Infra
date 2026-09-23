"""Loopback-only, read-only preview with curated source and dependency allowlists."""
import argparse
import hashlib
import html
from html.parser import HTMLParser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
import json
import mimetypes
from pathlib import Path
import re
from urllib.parse import unquote, urlsplit, quote

ROOT = Path(__file__).resolve().parents[1]
STATIC_EXT = {'.html', '.htm', '.css', '.js', '.mjs', '.json', '.svg', '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.woff', '.woff2', '.ttf', '.otf', '.mp4', '.webm', '.wasm'}


def safe_file(root, relative):
    p = Path(relative)
    if p.is_absolute() or not p.parts or any(part.startswith('.') or part in ('..', '') for part in p.parts):
        return None
    base = Path(root).resolve()
    candidate = (base / p).resolve()
    return candidate if candidate.is_relative_to(base) and candidate.is_file() else None


class ResourceParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.refs = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag in ('script', 'img', 'iframe', 'source', 'video', 'audio') and a.get('src'):
            self.refs.append(a['src'])
        if tag == 'link' and a.get('href') and a.get('rel') in ('stylesheet', 'icon', 'preload', 'modulepreload'):
            self.refs.append(a['href'])
        if a.get('style'):
            self.refs.extend(re.findall(r'url\([\s\'"]*([^\)\'"\s]+)', a['style']))


def dependency_refs(file):
    if file.suffix.lower() not in ('.html', '.htm', '.css', '.js', '.mjs'):
        return []
    text = file.read_text(encoding='utf-8', errors='replace')
    refs = []
    if file.suffix.lower() in ('.html', '.htm'):
        parser = ResourceParser()
        parser.feed(text)
        refs.extend(parser.refs)
        # Some source articles create figures from JS template literals. Discover
        # their literal URLs without executing the article or admitting folders.
        refs.extend(re.findall(r'<(?:img|script|iframe|source|video)\b[^>]*?\bsrc=[\'"]([^\'"]+)', text, re.I))
    refs.extend(re.findall(r'url\([\s\'"]*([^\)\'"\s]+)', text))
    refs.extend(re.findall(r'@import\s+[\'"]([^\'"]+)', text))
    if file.suffix.lower() in ('.html', '.htm', '.js', '.mjs'):
        refs.extend(re.findall(r'(?:fetch\s*\(|(?:import|from)\s*)[\'"]([^\'"]+)', text))
    return refs


def collect_files(root, entries):
    root = Path(root).resolve()
    allowed, missing, external = {}, [], []
    queue = list(entries)
    seen = set()
    while queue:
        rel = queue.pop()
        if rel in seen:
            continue
        seen.add(rel)
        if len(seen) > 3000:
            raise ValueError('dependency graph too large; inspect before exposing more files')
        file = safe_file(root, rel)
        if file is None:
            missing.append(rel)
            continue
        allowed[rel] = file
        for ref in dependency_refs(file):
            if not ref or ref.startswith(('#', 'data:', 'blob:')) or '${' in ref:
                continue
            url = urlsplit(ref)
            if url.scheme or url.netloc:
                external.append(ref)
                continue
            raw = unquote(url.path)
            if not raw:
                continue
            candidate = (root / raw.lstrip('/')) if raw.startswith('/') else (file.parent / raw)
            candidate = candidate.resolve()
            if not candidate.is_relative_to(root):
                missing.append(ref)
                continue
            child = candidate.relative_to(root).as_posix()
            if candidate.suffix.lower() in STATIC_EXT:
                queue.append(child)
    return allowed, sorted(set(missing)), sorted(set(external))


def inline(text):
    # Escape first; raw HTML is never trusted by the Markdown reader.
    text = html.escape(text)
    text = re.sub(r'`([^`]+)`', r'<code>\1</code>', text)
    text = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', text)
    def link(match):
        label, href = match.groups()
        if not href.startswith(('https://', 'http://', '#')):
            return label + ' <code>(' + href + ')</code>'
        return f'<a href="{href}" rel="noopener noreferrer">{label}</a>'
    return re.sub(r'\[([^\]]+)\]\(([^)]+)\)', link, text)


def markdown(text):
    """Small safe reader: headings, prose, lists, code and tables; no raw HTML."""
    result, code, table = [], None, False
    for line in text.splitlines():
        if line.startswith('```'):
            if code is None:
                code = []
            else:
                result.append('<pre><code>' + html.escape('\n'.join(code)) + '</code></pre>')
                code = None
            continue
        if code is not None:
            code.append(line)
            continue
        if line.strip().startswith('|'):
            if not table:
                result.append('<div class="table-scroll"><table>')
                table = True
            cells = line.strip().strip('|').split('|')
            if all(re.fullmatch(r'\s*:?-+:?\s*', c) for c in cells):
                continue
            result.append('<tr>' + ''.join('<td>' + inline(c.strip()) + '</td>' for c in cells) + '</tr>')
            continue
        if table:
            result.append('</table></div>')
            table = False
        heading = re.match(r'^(#{1,6})\s+(.*)', line)
        if heading:
            level = min(len(heading[1]) + 1, 6)
            result.append(f'<h{level}>' + inline(heading[2]) + f'</h{level}>')
        elif re.match(r'^\s*[-*]\s+', line):
            result.append('<p class="list-item">• ' + inline(re.sub(r'^\s*[-*]\s+', '', line)) + '</p>')
        elif line.strip() in ('---', '***'):
            result.append('<hr>')
        elif line.strip():
            result.append('<p>' + inline(line) + '</p>')
    if code is not None:
        result.append('<pre><code>' + html.escape('\n'.join(code)) + '</code></pre>')
    if table:
        result.append('</table></div>')
    return '\n'.join(result)


class Preview:
    def __init__(self, config):
        self.config = config
        self.assets = json.loads((ROOT / 'catalog/assets.json').read_text())['assets']
        self.files, self.diagnostics, self.asset_checks = {}, {}, {}
        report_entries = [a['sources'][0]['path'].removeprefix('ai-infra-research/') for a in self.assets if a['sources'][0]['repository'] == 'ai-infra' and a['sources'][0]['path'].startswith('ai-infra-research/reports/')]
        report_files, _, _ = collect_files(ROOT, report_entries)
        self.files.update({'/' + p: file for p, file in report_files.items()})
        skill_files = ['skills.html', 'methods/llm-compute-diagrams.zip', 'methods/llm-compute-diagrams/assets/reference-guide.html']
        skill_files.append('methods/observability-design-style/observability-design-system.md')
        skill_files.extend(a['downloadUrl'] for a in self.assets if a.get('packagePath'))
        self.files.update({'/' + p: ROOT / p for p in skill_files if (ROOT / p).is_file()})
        for repo, root in config.get('repositories', {}).items():
            entries = [s['path'] for a in self.assets for s in a['sources'] if s['repository'] == repo]
            allowed, missing, external = collect_files(root, entries)
            self.files.update({f'/sources/{repo}/{p}': file for p, file in allowed.items()})
            self.diagnostics[repo] = {'missing': missing, 'external': external, 'allowedFiles': len(allowed)}
            for asset in self.assets:
                source = asset['sources'][0]
                if source['repository'] == repo:
                    _, absent, remote = collect_files(root, [source['path']])
                    self.asset_checks[asset['id']] = {'missingDependencies': absent, 'externalDependencies': len(remote)}
        if config.get('designSystem'):
            allowed, missing, external = collect_files(config['designSystem'], ['tokens/foundation.css', 'tokens/semantic.css', 'tokens/components.css', 'css/style.css'])
            self.files.update({f'/design-system/{p}': file for p, file in allowed.items()})
            self.diagnostics['design-system'] = {'missing': missing, 'external': external, 'allowedFiles': len(allowed)}

    def health(self):
        result = {}
        for a in self.assets:
            s = a['sources'][0]
            file = self.files.get(f"/sources/{s['repository']}/{s['path']}")
            root = self.config.get('repositories', {}).get(s['repository'])
            exists = bool(file and root and safe_file(root, s['path']) == file.resolve())
            result[a['id']] = {'available': exists, 'changed': exists and hashlib.sha256(file.read_bytes()).hexdigest() != s['sha256'], **self.asset_checks.get(a['id'], {})}
        return {'assets': result, 'diagnostics': self.diagnostics}

    def reader(self, asset):
        s = asset['sources'][0]
        file = self.files.get(f"/sources/{s['repository']}/{s['path']}")
        root = self.config.get('repositories', {}).get(s['repository'])
        if not file or not root or file.suffix != '.md' or safe_file(root, s['path']) != file.resolve():
            return None
        title = html.escape(asset['title'])
        body = markdown(file.read_text())
        return f'''<!doctype html><html lang="zh-CN" data-theme="light"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>{title}</title><link rel="stylesheet" href="/design-system/css/style.css"><style>
body{{height:auto;overflow:auto;display:block}}main{{max-width:960px;margin:auto;padding:var(--space-6);font:var(--type-body)}}h1{{font:var(--type-display)}}h2,h3,h4{{margin-block:var(--space-6) var(--space-3)}}p{{margin-block:var(--space-3)}}a{{color:var(--primary)}}pre,.table-scroll{{overflow:auto;max-width:100%;padding:var(--space-4);background:var(--surface-2);border-radius:var(--radius-lg)}}pre,code{{font:var(--type-mono)}}table{{border-collapse:collapse}}td{{padding:var(--space-2);border-bottom:1px solid var(--border-subtle)}}hr{{border:0;border-top:1px solid var(--border-subtle)}}.list-item{{padding-left:var(--space-4)}}.note{{color:var(--foreground-secondary)}}
</style><main><a class="btn btn-sm" href="/?asset={quote(asset['id'])}">← 返回条目</a><h1>{title}</h1><p class="note">源 Markdown 阅读视图 · 原文保留在 {html.escape(s['repository'])} · 图表代码按原文显示，未转换为可视化</p>{body}</main></html>'''


def handler_for(preview):
    class Handler(BaseHTTPRequestHandler):
        def do_HEAD(self):
            self.do_GET()

        def send(self, data, content_type='text/html; charset=utf-8', status=200, cors=False):
            if isinstance(data, str):
                data = data.encode('utf-8')
            self.send_response(status)
            self.send_header('Content-Type', content_type)
            self.send_header('Content-Length', str(len(data)))
            self.send_header('Cache-Control', 'no-store')
            self.send_header('X-Content-Type-Options', 'nosniff')
            if cors:
                origin = self.headers.get('Origin', '')
                parsed = urlsplit(origin)
                if parsed.scheme == 'http' and parsed.hostname in ('127.0.0.1', 'localhost'):
                    self.send_header('Access-Control-Allow-Origin', origin)
                    self.send_header('Vary', 'Origin')
            self.end_headers()
            if self.command != 'HEAD':
                self.wfile.write(data)

        def do_GET(self):
            # Reject DNS-rebinding hosts and traversal before allowlist lookup.
            host = self.headers.get('Host', '').split(':')[0]
            if host not in ('127.0.0.1', 'localhost'):
                return self.send('Forbidden host', 'text/plain', 403)
            route = unquote(urlsplit(self.path).path)
            if any(part.startswith('.') for part in route.split('/') if part) or '\\' in route:
                return self.send('Not found', 'text/plain', 404)
            if route in ('/', '/index.html', '/whitepaper-gallery.html'):
                return self.send((ROOT / 'index.html').read_bytes())
            if route == '/api/health':
                return self.send(json.dumps(preview.health()), 'application/json', cors=True)
            if route.startswith('/read/'):
                asset = next((a for a in preview.assets if a['id'] == route[6:]), None)
                body = preview.reader(asset) if asset else None
                return self.send(body or 'Source unavailable', status=200 if body else 404)
            file = preview.files.get(route)
            if file and file.is_file():
                # Recheck containment in case a file was replaced by an out-of-root symlink.
                if route.startswith('/design-system/'):
                    base, rel = preview.config.get('designSystem'), route[len('/design-system/'):]
                else:
                    _, _, repo, rel = route.split('/', 3)
                    base = preview.config['repositories'].get(repo)
                if base and safe_file(base, rel) == file.resolve():
                    mime = mimetypes.guess_type(file.name)[0] or 'application/octet-stream'
                    if file.suffix == '.md':
                        mime = 'text/plain; charset=utf-8'
                    return self.send(file.read_bytes(), mime)
            self.send('此文件未纳入预览白名单，或来源未连接。', 'text/plain; charset=utf-8', 404)
    return Handler


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--config', type=Path, default=ROOT / '.local/sources.json')
    parser.add_argument('--port', type=int, default=8766)
    args = parser.parse_args()
    config = json.loads(args.config.read_text()) if args.config.exists() else {}
    preview = Preview(config)
    server = ThreadingHTTPServer(('127.0.0.1', args.port), handler_for(preview))
    print(f'AI Infra knowledge preview: http://127.0.0.1:{args.port}/', flush=True)
    print(f'{len(preview.files)} allowlisted files; no directory browsing; Ctrl-C to stop.', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
