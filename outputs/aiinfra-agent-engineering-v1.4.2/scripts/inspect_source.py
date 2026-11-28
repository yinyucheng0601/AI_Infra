"""Inventory local inputs and extract conservatively supported evidence."""
import argparse
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from adapters.contract import validate
from adapters.pipeline import inspect


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--root", required=True, type=Path)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("inputs", nargs="+", type=Path)
    args = parser.parse_args()
    try:
        result = inspect(args.root, args.inputs)
        validate(result)
    except ValueError as error:
        parser.error(str(error))
    args.output.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n")
    print(result["extraction_status"], result["coverage"])
    return 0 if result["extraction_status"] == "complete" else 1


if __name__ == "__main__":
    sys.exit(main())
