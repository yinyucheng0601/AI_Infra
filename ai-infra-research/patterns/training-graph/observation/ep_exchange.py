"""EP observation contract generator and validator; standard library only."""
import json
from pathlib import Path

SCHEMA = "ep-exchange-observation.v1"

def generate():
    ranks = list(range(64))
    transfers = []
    loads = {r: 0 for r in ranks}
    # Each source has 64 tokens, Top-2, 256 experts. Every assignment is explicit.
    routes = []
    for src in ranks:
        for token in range(64):
            experts = [(src * 64 + token) % 256, (src * 64 + token + 67) % 256]
            routes.append(dict(sourceRank=src, token=token, experts=experts))
            for expert in experts:
                loads[expert // 4] += 1
    counts = {}
    for route in routes:
        for dst in {e // 4 for e in route["experts"]}:
            key = (route["sourceRank"], dst)
            counts[key] = counts.get(key, 0) + 1
    for (src, dst), count in sorted(counts.items()):
        transfers.append(dict(sourceRank=src, destinationRank=dst, tokens=count,
                              logicalActivationBytes=count * 7168 * 2))
    return dict(schema=SCHEMA, id="mock-ep64-baseline-v1", backend="mock",
                scope="communication-benchmark", worldSize=64, group=dict(id="ep0", ranks=ranks),
                capturedRanks=ranks, provenance=dict(kind="mock", generatorVersion=1),
                clock=dict(id="scenario", unit="us", crossRankComparable=True),
                config=dict(experts=256, topK=2, tokensPerRank=64, hidden=7168, dtype="bf16"),
                routes=routes, exchange=transfers,
                expertAssignments={str(r): loads[r] for r in ranks},
                events=[dict(id=f"{phase}-{r}", occurrence=phase+"-0", phase=phase, rank=r,
                             start=start, end=end, clockId="scenario", provenance="mock")
                        for phase,start,end in [("dispatch",1000,1200),("combine",1500,1700)] for r in ranks],
                placement=[], physicalTransfers=[], dependencies=[],
                timingRule="Constructed synchronous intervals; gap is unspecified, not measured expert compute.")

def validate(data):
    def require(ok, message):
        if not ok: raise ValueError(message)
    require(data["schema"] == SCHEMA, "schema")
    ranks=data["group"]["ranks"]
    require(len(ranks)==len(set(ranks)) and len(ranks)>1, "group membership")
    require(all(type(r) is int and 0<=r<data["worldSize"] for r in ranks), "rank range")
    require(set(data["capturedRanks"])==set(ranks), "complete capture required")
    require(data["backend"]=="mock" and data["provenance"]["kind"]=="mock", "generator contract is mock only")
    cfg=data["config"]; require(cfg["experts"]%len(ranks)==0, "expert partition")
    owners=cfg["experts"]//len(ranks); counts={}; loads={r:0 for r in ranks}; seen=set()
    for route in data["routes"]:
        src=route["sourceRank"]; token=route["token"]; key=(src,token)
        require(src in ranks and 0<=token<cfg["tokensPerRank"] and key not in seen, "route identity")
        seen.add(key); experts=route["experts"]
        require(len(experts)==cfg["topK"] and len(set(experts))==len(experts), "topk")
        require(all(0<=e<cfg["experts"] for e in experts), "expert range")
        for e in experts: loads[ranks[e//owners]]+=1
        for dst in {ranks[e//owners] for e in experts}:
            counts[(src,dst)]=counts.get((src,dst),0)+1
    require(len(seen)==len(ranks)*cfg["tokensPerRank"], "route coverage")
    observed={}
    for edge in data["exchange"]:
        key=(edge["sourceRank"],edge["destinationRank"])
        require(key not in observed, "duplicate exchange")
        observed[key]=edge["tokens"]
        require(edge["logicalActivationBytes"]==edge["tokens"]*cfg["hidden"]*2, "BF16 activation accounting")
    require(observed==counts, "exchange differs from routes")
    require(data["expertAssignments"]=={str(r):v for r,v in loads.items()}, "expert load mismatch")
    event_keys=set(); ids=set()
    for e in data["events"]:
        key=(e["phase"],e["rank"])
        require(key not in event_keys and e["id"] not in ids, "duplicate event")
        event_keys.add(key); ids.add(e["id"])
        require(e["start"]<=e["end"] and e["clockId"]==data["clock"]["id"], "event time")
        require(e["provenance"]=="mock", "event provenance")
    require(event_keys=={(p,r) for p in ("dispatch","combine") for r in ranks}, "event coverage")
    return dict(ranks=len(ranks), routes=len(seen), exchanges=len(counts), events=len(ids), expertAssignments=sum(loads.values()))

if __name__ == "__main__":
    data=generate()
    print(json.dumps(validate(data)))
    Path(__file__).with_name("mock-ep64-baseline.json").write_text(json.dumps(data, ensure_ascii=False, indent=2)+"\n")
