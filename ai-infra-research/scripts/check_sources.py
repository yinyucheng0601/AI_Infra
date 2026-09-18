"""Report source existence, fingerprint drift and statically discoverable dependencies."""
import argparse
import json
from pathlib import Path
from serve import Preview, ROOT

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--config', type=Path, default=ROOT / '.local/sources.json')
    args = parser.parse_args()
    config = json.loads(args.config.read_text()) if args.config.exists() else {}
    health = Preview(config).health()
    print(json.dumps(health, ensure_ascii=False, indent=2))
    raise SystemExit(0 if all(x['available'] and not x['changed'] for x in health['assets'].values()) else 1)
