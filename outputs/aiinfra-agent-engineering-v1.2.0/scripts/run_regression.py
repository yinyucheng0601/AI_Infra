import subprocess,sys,json,datetime
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
checks=[
 ("package_structure_and_json",[sys.executable,"-B","scripts/validate_package.py"]),
 ("graph_schema_and_semantics",[sys.executable,"-B","scripts/validate_graph.py"]),
 ("python_syntax",[sys.executable,"-B","-c","from pathlib import Path; files = [p for root in ('adapters', 'scripts', 'tests') for p in Path(root).rglob('*.py')]; [compile(p.read_bytes(), str(p), 'exec') for p in files]"]),
 ("contract_unit_tests",[sys.executable,"-B","-m","unittest","discover","-s","tests","-v"])
]
results=[]
for name,cmd in checks:
    p=subprocess.run(cmd,cwd=ROOT,text=True,capture_output=True)
    results.append({"name":name,"status":"passed" if p.returncode==0 else "failed","returncode":p.returncode,"stdout":p.stdout.strip(),"stderr":p.stderr.strip()})
report={"package_version":(ROOT/"VERSION").read_text().strip(),"executed_at_utc":datetime.datetime.now(datetime.timezone.utc).isoformat(),"checks":results,"passed":sum(x["status"]=="passed" for x in results),"failed":sum(x["status"]=="failed" for x in results),"upstream_pypto_data_scan":"not_run_inventory_use_scan_pypto_data","scoped_graph_tests":"synthetic records; raw capture validation is a separate command","browser_visual_validation":"not_run","device_runtime_validation":"not_run"}
(ROOT/"reports/regression-report.json").write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding="utf-8")
md=["# Regression report","",f"- Passed: {report['passed']}",f"- Failed: {report['failed']}","- Upstream PyPTO3-main/data scan: not run (inventory scan is separate)","- Browser visual validation: not run","- Device runtime validation: not run",""]
for x in results: md += [f"## {x['name']}: {x['status']}", "```text", x["stdout"], x["stderr"], "```",""]
(ROOT/"reports/regression-report.md").write_text("\n".join(md),encoding="utf-8")
for x in results: print(x["name"],x["status"],x["stdout"],x["stderr"])
sys.exit(1 if report["failed"] else 0)
