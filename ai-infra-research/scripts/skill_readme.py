"""Render the documented README subset safely for offline Skill detail pages."""
import html
import re
from pathlib import PurePosixPath
from urllib.parse import urlsplit
import posixpath

def render(text, source):
    def inline(value):
        # Escape all source HTML; only generated links and inline code are allowed.
        tokens = []
        pattern = r"`([^`]+)`|\[([^\]]+)\]\(([^)]+)\)"
        last = 0
        for match in re.finditer(pattern, value):
            tokens.append(html.escape(value[last:match.start()]))
            if match[1] is not None:
                tokens.append("<code>" + html.escape(match[1]) + "</code>")
            else:
                label, target = match[2], match[3]
                parsed = urlsplit(target)
                if parsed.scheme and parsed.scheme not in ("http", "https"):
                    tokens.append(html.escape(label))
                else:
                    if not parsed.scheme and not target.startswith("#"):
                        target = posixpath.normpath(str(PurePosixPath(source).parent / target))
                        if target.startswith("../") or target.startswith("/"):
                            raise ValueError("README link outside library: " + target)
                    tokens.append('<a href="' + html.escape(target, quote=True) + '">' + html.escape(label) + '</a>')
            last = match.end()
        tokens.append(html.escape(value[last:]))
        return "".join(tokens)
    out, code, prose, listing, table = [], None, [], False, False
    def flush():
        if prose:
            out.append("<p>" + inline(" ".join(prose)) + "</p>")
            prose.clear()
    for line in text.splitlines() + [""]:
        if line.startswith("```"):
            flush()
            if code is None:
                code = []
            else:
                out.append('<div class="readme-code"><button class="skill-prompt-copy" aria-label="复制代码" title="复制代码">⧉</button><pre><code>' + html.escape("\n".join(code)) + '</code></pre><span class="readme-copy-status" aria-live="polite"></span></div>')
                code = None
            continue
        if code is not None:
            code.append(line)
            continue
        is_list = line.startswith("- ")
        is_table = line.startswith("|")
        if listing and not is_list:
            out.append("</ul>"); listing = False
        if table and not is_table:
            out.append("</tbody></table></div>"); table = False
        if is_table:
            flush()
            cells = line.strip().strip("|").split("|")
            if all(re.fullmatch(r"\s*:?-+:?\s*", x) for x in cells):
                continue
            if not table:
                out.append('<div class="readme-table"><table><thead><tr>' + ''.join('<th>' + inline(x.strip()) + '</th>' for x in cells) + '</tr></thead><tbody>'); table = True
            else:
                out.append('<tr>' + ''.join('<td>' + inline(x.strip()) + '</td>' for x in cells) + '</tr>')
        elif re.fullmatch(r"!\[([^\]]*)\]\(([^)]+)\)", line.strip()):
            flush()
            image = re.fullmatch(r"!\[([^\]]*)\]\(([^)]+)\)", line.strip())
            target = posixpath.normpath(str(PurePosixPath(source).parent / image[2]))
            if urlsplit(image[2]).scheme or target.startswith(("../", "/")):
                raise ValueError("README images must be repository-local")
            out.append('<figure class="readme-figure"><img loading="lazy" src="' + html.escape(target, quote=True) + '" alt="' + html.escape(image[1], quote=True) + '"><figcaption>' + html.escape(image[1]) + '</figcaption></figure>')
        elif is_list:
            flush()
            if not listing: out.append("<ul>"); listing = True
            out.append("<li>" + inline(line[2:]) + "</li>")
        elif line.startswith("#") and re.match(r"^#{1,6} ", line):
            flush(); level = len(line.split(" ", 1)[0]); label = line.split(" ", 1)[1]
            attr = ' id="detailTitle"' if level == 1 else ''
            out.append(f"<h{level}{attr}>" + inline(label) + f"</h{level}>")
        elif not line.strip(): flush()
        else: prose.append(line.strip())
    if code is not None: raise ValueError("Unclosed README code fence")
    return "".join(out)
