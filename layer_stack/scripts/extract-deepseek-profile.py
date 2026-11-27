"""Extract serving evidence; never reinterpret runtime dispatches as layer ops."""
import argparse, collections, hashlib, json
from pathlib import Path

def extract(path):
    raw=path.read_bytes()
    events=json.loads(raw)["traceEvents"]
    groups=collections.defaultdict(list)
    for e in events: groups[e["name"]].append(e)
    origin=min(e["ts"] for e in events if "ts" in e and e.get("ph")!="M")
    def record(e):
        return {"startUs":round(e["ts"]-origin,3),"durationUs":e.get("dur",0),"args":e.get("args",{})}
    requests=[]
    for e in groups["request.queued"]:
        a=e["args"]; rid=a["request_id"]
        finish=next((x for x in groups["http.stream_completion.finished"] if x["args"].get("request_id")==rid),None)
        add=next(x for x in groups["ReplicaEngineCore.add_request"] if x["args"].get("request_id")==rid)
        requests.append({"id":rid,"promptLength":a["prompt_tokens"],"maxNewTokens":add["args"]["max_new_tokens"],"queuedUs":e["ts"]-origin,"finishReason":finish["args"]["finish_reason"] if finish else None})
    dispatches=sorted(groups["DSparkModelRunner.prefill.l3_dispatch"]+groups["DSparkModelRunner.decode.l3_dispatch"],key=lambda e:e["ts"])
    steps=[]
    for i,e in enumerate(dispatches):
        phase="prefill" if ".prefill." in e["name"] else "decode"
        r=record(e);r.update(id="step-"+str(i),phase=phase)
        if phase=="prefill":
            parent=next((x for x in groups["WorkerProcess.batch_prefill"] if x["ts"]<=e["ts"]<=x["ts"]+x["dur"]),None)
            r["requestIds"]=parent["args"]["request_ids"] if parent else []
        else: r["requestIds"]=None
        steps.append(r)
    workers=[]
    for worker in sorted({e["args"]["worker_id"] for e in groups["node.dispatch"]}):
        workers.append({"id":worker,"dispatches":[record(e) for e in groups["node.dispatch"] if e["args"]["worker_id"]==worker]})
    return {"schema":"deepseek-serving-profile.v1","source":{"file":path.name,"sha256":hashlib.sha256(raw).hexdigest(),"timeUnit":"us"},"model":"dsv4-flash-dspark-w8a8","parallelism":{"tp":1,"dp":16,"basis":"capture filename; worker IDs verified in trace"},"eventCount":len(events),"counts":dict(collections.Counter(e["name"] for e in events)),"requests":requests,"steps":steps,"workers":workers,"schedulerOutputs":[record(e) for e in groups["scheduler.process_step_output"]],"runs":[record(e) for e in groups["chip.run"]],"cacheSnapshots":{"retain":len(groups["cache.snapshot.retain"]),"release":len(groups["cache.snapshot.release"])},"unavailable":["token text and IDs","per-layer duration","KV bytes and physical page mapping","decode request membership","physical rank to worker mapping"]}

if __name__=="__main__":
    parser=argparse.ArgumentParser();parser.add_argument("source",type=Path);parser.add_argument("output",type=Path);parser.add_argument("--html",type=Path);args=parser.parse_args()
    result=extract(args.source)
    assert len(result["requests"])==16 and all(r["promptLength"]==8192 for r in result["requests"])
    assert len(result["workers"])==16 and len(result["runs"])==512
    assert len(result["steps"])==26
    assert len({r for s in result["steps"] if s["phase"]=="prefill" for r in s["requestIds"]})==16
    args.output.write_text(json.dumps(result,ensure_ascii=False,separators=(",",":"))+"\n")
    print("Validated: 16 requests, 26 dispatch steps, 16 workers, 512 runtime calls")

    if args.html:
        html=args.html.read_text()
        a=html.index("const dsProfile=");b=html.index(";\nlet dsRequest=",a)
        compact={k:result[k] for k in ["source","requests","steps","workers","unavailable"]}
        args.html.write_text(html[:a]+"const dsProfile="+json.dumps(compact,ensure_ascii=False,separators=(",",":"))+html[b:])
