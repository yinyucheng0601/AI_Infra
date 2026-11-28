# Generated from ai-infra-research/scripts/serve.py by scripts/build_package.py.
# Source SHA256: 6197ef0080cb04e63f7375a014713143d9873205f9dc5844e3cdf56e35c0a50c
from html.parser import HTMLParser
from pathlib import Path
import re
from urllib.parse import unquote, urlsplit

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
        if tag == 'link' and a.get('href'):
            related = a.get('rel')
            if related in ('stylesheet', 'icon', 'preload', 'modulepreload') or (
                related == 'alternate' and a.get('type') == 'application/json'
            ):
                self.refs.append(a['href'])
        if a.get('style'):
            self.refs.extend(re.findall(r'url\([\s\'"]*([^\)\'"\s]+)', a['style']))


def dependency_refs(file, *, document_fetches=None):
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
        refs.extend(re.findall(r'''(?:import|from)\s*['"]([^'"]+)''', text))
        fetches = re.findall(r'''fetch\s*\(\s*['"]([^'"]+)''', text)
        (refs if document_fetches is None else document_fetches).extend(fetches)
    return refs


def collect_files(root, entries, *, exclude=None, browser_resolution=False):
    root = Path(root).resolve()
    allowed, missing, external = {}, [], []
    queue = [(entry, None) for entry in entries]
    seen = set()
    while queue:
        rel, document = queue.pop()
        if (rel, document) in seen:
            continue
        seen.add((rel, document))
        if len(seen) > 3000:
            raise ValueError('dependency graph too large; inspect before exposing more files')
        file = safe_file(root, rel)
        if file is None or (exclude and exclude(file)):
            missing.append(rel)
            continue
        allowed[rel] = file
        if browser_resolution and file.suffix.lower() in ('.html', '.htm'):
            document = file.parent
        fetches = []
        refs = dependency_refs(file, document_fetches=fetches if document else None)
        for ref, base in [(ref, file.parent) for ref in refs] + [(ref, document) for ref in fetches]:
            if not ref or ref.startswith(('#', 'data:', 'blob:')) or '${' in ref:
                continue
            url = urlsplit(ref)
            if url.scheme or url.netloc:
                external.append(ref)
                continue
            raw = unquote(url.path)
            if not raw:
                continue
            candidate = (root / raw.lstrip('/')) if raw.startswith('/') else (base / raw)
            candidate = candidate.resolve()
            if not candidate.is_relative_to(root):
                missing.append(ref)
                continue
            child = candidate.relative_to(root).as_posix()
            if candidate.suffix.lower() in STATIC_EXT:
                queue.append((child, document))
    return allowed, sorted(set(missing)), sorted(set(external))
