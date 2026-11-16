"""Build the Slidev deck for the repository's branch-based GitHub Pages."""
from pathlib import Path
import re
import subprocess
import json
RELEASE = "20261116-r5"

ROOT = Path(__file__).resolve().parent
OUTPUT = ROOT.parent / "ppt"
BASE = "/AI_Infra/ai-infra-visual-arch-v3/ppt/"
subprocess.run(["npm", "run", "build", "--", "--base", BASE, "--router-mode", "hash", "--out", str(OUTPUT)], cwd=ROOT, check=True)
# Scene HTML and dynamically created script/iframe URLs bypass Vite's URL
# rewriting. Rebase those URLs in the published copy, keeping local sources.
pattern = re.compile(r"(?P<quote>[\"'`])/+(?P<path>(?:assets|scenes|cases|knowledge-glyphs|knowledge-mindmap)/|agent-human-collaboration-16x9\.html)")
for file in OUTPUT.rglob("*"):
    if file.is_file() and file.suffix in {".html", ".js", ".css", ".json"}:
        text = file.read_text()
        text = pattern.sub(lambda m: m["quote"] + BASE + m["path"], text)
        if file.suffix == ".html":
            text = re.sub(r'(src=["\'])([^"\']+\.html(?:\?[^"\']*)?)(["\'])', lambda m: m[1]+m[2]+("&" if "?" in m[2] else "?")+"release="+RELEASE+m[3], text)
        file.write_text(text)
(ROOT.parents[1] / ".nojekyll").touch()
print("Published directory:", OUTPUT)

(OUTPUT / "version.json").write_text(json.dumps({"release": RELEASE})+"\n")
