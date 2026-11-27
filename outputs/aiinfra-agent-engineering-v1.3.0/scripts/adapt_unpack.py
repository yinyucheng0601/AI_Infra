"""Validate source-derived case bindings before dispatching them to the workbench."""
import argparse
import json
import sys
from pathlib import Path

from validate_graph import validate
from adapters.unpack_source import project


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--kernel", type=Path, required=True)
    parser.add_argument("--configs", type=Path, required=True)
    args = parser.parse_args()
    try:
        configs = json.loads(args.configs.read_text())
        if not isinstance(configs, list) or not configs:
            raise ValueError("Expected a nonempty array of Unpack configurations")
        data = project(args.kernel.read_bytes(), configs)
        results = validate(data["graph"])
        if any(row["result"] != "VALID" for row in results):
            raise ValueError("An Unpack workbench binding lacks source evidence")
    except (OSError, ValueError) as exc:
        parser.exit(1, f"{exc}\n")
    json.dump(data, sys.stdout, ensure_ascii=False)


if __name__ == "__main__":
    main()
