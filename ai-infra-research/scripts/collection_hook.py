"""Generate collection artifacts before a user-initiated commit."""
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
MANAGED = [
    'ai-infra-research/patterns/csa-pass-field/index.html',
    'ai-infra-research/patterns/csa-pass-field/artifact-manifest.json',
    'ai-infra-research/catalog/assets.json',
    'ai-infra-research/index.html',
    'ai-infra-research/skills.html',
    'ai-infra-research/patterns.html',
]


def run(*args):
    return subprocess.run(['rtk', 'proxy', *args], cwd=ROOT.parent, check=True)


if __name__ == '__main__':
    # Do not silently stage users' unstaged edits to shared catalog/gallery files.
    result = subprocess.run(['rtk', 'proxy', 'git', 'diff', '--quiet', '--', *MANAGED], cwd=ROOT.parent)
    if result.returncode:
        sys.exit('Collection files have unstaged changes. Review and stage them before committing; unrelated changes will not be staged by this hook.')
    run(sys.executable, str(ROOT / 'scripts/build.py'))
    run('git', 'add', '--', *MANAGED)
