import argparse,json,hashlib
from pathlib import Path
p=argparse.ArgumentParser()
p.add_argument("data_dir",type=Path); p.add_argument("--out",type=Path,default=Path("reports/pypto-data-scan.json"))
a=p.parse_args()
if not a.data_dir.is_dir():
    raise SystemExit(f"Expected an existing input directory: {a.data_dir}")
rows=[]
for f in sorted(x for x in a.data_dir.rglob("*") if x.is_file()):
    h=hashlib.sha256()
    try:
        with f.open("rb") as stream:
            for chunk in iter(lambda:stream.read(1024*1024),b""): h.update(chunk)
        rows.append({"path":str(f.relative_to(a.data_dir)),"size":f.stat().st_size,"sha256":h.hexdigest(),"suffix":f.suffix.lower()})
    except OSError as e: rows.append({"path":str(f),"error":str(e)})
out={"root":str(a.data_dir),"file_count":len(rows),"files":rows,"note":"Inventory only; no runtime semantics inferred from filenames or bytes."}
a.out.parent.mkdir(parents=True,exist_ok=True); a.out.write_text(json.dumps(out,indent=2),encoding="utf-8")
print(f"Scanned {len(rows)} files -> {a.out}")
