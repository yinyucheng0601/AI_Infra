const assert=require('node:assert/strict');
const fs=require('node:fs');
const crypto=require('node:crypto');
const M=require('./model.js');
const sources=JSON.parse(fs.readFileSync(__dirname+'/sources.json','utf8'));
// Independent reference: enumerate a contiguous tensor, decode coordinates by divisions.
const reference=Array.from({length:2067},()=>[]);
for(let n=0;n<390663;n++) reference[n%2067].push(n);
let outputs=0, memberChecks=0;
for(let c=0;c<53;c++)for(let d=0;d<39;d++) {
  const xs=M.members(c,d);
  assert.equal(xs.length,189);assert.equal(new Set(xs.map(x=>x.offset)).size,189);
  assert.deepEqual(xs.map(x=>x.offset),reference[c*39+d]);
  for(const x of xs) {
    assert.ok(x.offset>=0&&x.offset<390663);
    assert.equal(x.bytes,4*(x.a*55809+x.b*2067+c*39+d));
    const e=M.element(c,d,x.a,x.b);
    assert.equal(e.offset,x.offset);assert.equal(e.local,e.work*8+d%8);
    memberChecks++;
  }
  outputs++;
}
for(let c=0;c<53;c++)assert.deepEqual(M.comparison(c).map(r=>[r.requestColumns,r.computeColumns,r.writeBytes]),[[8,8,32],[8,7,28]]);
assert.deepEqual(M.decode(M.offset(0,0,0,39)),[0,0,1,0]);
assert.equal(M.decode(M.offset(6,26,52,39)),null);
// The output warning is ownership of the tail-copy group, not a numerical failure.
let affectedOutputs=0;
for(let c=0;c<53;c++)for(let d=0;d<39;d++) {
  const status=M.outputStatus(c,d);
  assert.equal(status.investigate,Math.floor(d/8)===4);
  if(status.investigate)affectedOutputs++;
}
assert.equal(affectedOutputs,371);
// Parse the actual source loop increments, rather than importing model tile constants.
const code=sources.kernel.lines.join('\n');
const active=code.slice(code.indexOf('\nclass KernelLogSumExp2 {'));
assert.ok(active.includes('UpdateOuter(outerTileLen);'));
assert.ok(active.includes('ComputeSum(innerTailTileLen * tileElemBase, outerTailTileLen);'));
const inner=Number(active.match(/this->innerTileLen = (\d+);/)[1]);
const block=Number(code.match(/constexpr int BLOCK_SIZE = (\d+);/)[1]);
const width=block/4;
const counts=new Uint8Array(390664),consumed=new Uint8Array(390663),writes=new Uint8Array(2067);
let calls=0,requests=0,extras=0,unwrittenLocalReadSlots=0;
for(let c=0;c<53;c++)for(let d0=0;d0<39;d0+=width) {
  const outlen=Math.min(width,39-d0);
  for(let b0=0;b0<27;b0+=inner) {
    const len=Math.min(inner,27-b0), g=M.group(c,d0/width,b0===0?0:1);
    // Independent SliceInfo Cartesian interpreter, least significant axis first.
    const expected=[];
    for(let a=0;a<7;a++)for(let b=b0;b<b0+len;b++)for(let d=d0;d<d0+width;d++) {
      expected.push(a*55809+b*2067+c*39+d);
    }
    assert.deepEqual(g.slots.map(x=>x.offset),expected);
    assert.equal(new Set(g.slots.map(x=>x.local)).size,g.requested);
    assert.equal(Math.max(...g.slots.map(x=>x.local)),g.requested-1);
    assert.equal(g.src[0][1],d0+7);assert.equal(g.dst[2][4],len);
    for(const x of g.slots) {
      counts[x.offset]++; requests++;
      if(x.consumed){assert.ok(x.legalCoordinate);consumed[x.offset]++;}
      else extras++;
    }
    const readRows=g.repeat*8;
    assert.equal(readRows,len===16?112:80);
    for(let lane=0;lane<outlen;lane++) {
      const mask=(0x01010101*2**lane)>>>0,selected=[];
      for(let local=0;local<g.repeat*64;local++)
        if((mask>>>(local%32))&1)selected.push(local);
      assert.equal(selected.length,readRows);
      const used=selected.slice(0,len*7);
      assert.deepEqual(used,g.slots.filter(x=>x.lane===lane).map(x=>x.local));
      assert.ok(selected.slice(len*7).every(x=>x>=g.requested&&x<896));
    }
    unwrittenLocalReadSlots+=(readRows-len*7)*8;
    calls++;
  }
  for(let lane=0;lane<outlen;lane++)writes[c*39+d0+lane]++;
}
assert.ok(consumed.every(x=>x===1));assert.ok(writes.every(x=>x===1));
assert.equal(counts.filter(x=>x===2).length,10016);
assert.equal(counts[390663],1);assert.equal(extras,10017);assert.equal(requests,400680);
assert.equal(calls,530);assert.equal(unwrittenLocalReadSlots,6360);
// CPU-only arithmetic check with deterministic [-3,3] inputs and stable reference.
const value=n=>3*Math.sin(n*0.013+0.4);
let maxError=0;
for(let c=0;c<53;c++)for(let d=0;d<39;d++) {
  const vals=reference[c*39+d].map(value),max=Math.max(...vals);
  const ref=max+Math.log(vals.reduce((s,v)=>s+Math.exp(v-max),0));
  let sum=0;
  for(let k=0;k<2;k++) {
    const g=M.group(c,Math.floor(d/8),k);
    sum+=g.slots.filter(x=>x.lane===d%8&&x.consumed).reduce((s,x)=>s+Math.exp(value(x.offset)),0);
  }
  maxError=Math.max(maxError,Math.abs(Math.log(sum)-ref));
}
assert.ok(maxError<1e-12);
// Copy payload: every output and every supported object kind, including user Unicode.
let contextChecks=0;
for(let c=0;c<53;c++)for(let d=0;d<39;d++)for(const kind of Object.keys(M.evidence)) {
  if(kind==='tail'&&d<32)continue;
  const s={c,d,a:c%7,b:d%27,kind,question:'请检查此分组 <&> "尾块"'};
  const payload=JSON.parse(M.context(s,sources));
  assert.equal(payload.output.index,c*39+d);assert.equal(payload.selection.kind,kind);
  assert.equal(payload.selection.element.offset,(s.a*27+s.b)*2067+c*39+d);
  if(kind==='tail'){assert.equal(payload.selection.selectedRequest.offset,(s.a*27+s.b)*2067+c*39+39);assert.equal(payload.selection.selectedRequest.consumed,false);}
  assert.equal(payload.question,s.question);assert.equal(payload.commit,M.commit);
  assert.ok(payload.sources.every(x=>x.url.includes(M.commit)&&x.start>0));contextChecks++;
}
// Human-readable investigation code includes the selected request, not a hidden payload.
for(const state of [
 {c:12,d:34,a:2,b:8,kind:'element',question:'核对当前输入'},
 {c:52,d:38,a:6,b:26,kind:'tail',question:'核对末尾请求'}
]) {
 const code=M.investigation(state,sources),description=M.describe(state);
 const selected=description.selection.selectedRequest||description.selection.element;
 assert.ok(code.includes(`output     = y[${state.c}, ${state.d}]`));
 assert.ok(code.includes(`GM.element = ${selected.offset}`));
 assert.ok(code.includes(`GM.byte    = ${selected.bytes}`));
 assert.ok(code.includes(state.question));
 assert.ok(code.includes(M.commit));
 assert.ok(code.includes('basic/logsum_exp/'));
}
const html=fs.readFileSync(__dirname+'/index.html','utf8');
assert.ok(html.includes(fs.readFileSync(__dirname+'/model.js','utf8').trim()));
assert.ok(!/<script[^>]+src=|<link[^>]+stylesheet/.test(html));
const result={scope:'Conditional source request model; CPU double arithmetic; not CANN/NPU execution',outputs,affectedOutputs,memberChecks,copyInCalls:calls,requestedSlots:requests,requiredConsumedSlots:consumed.length,missingRequired:0,duplicateConsumed:0,extraRequestSlots:extras,duplicateLegalAddresses:10016,outOfAllocationRequests:1,tailGatherUnwrittenSlotsAcrossCalls:unwrittenLocalReadSlots,outputWrites:writes.length,contextChecks,cpuReferenceMaxAbsError:maxError,sourceCommit:M.commit,htmlSha256:crypto.createHash('sha256').update(html).digest('hex')};
fs.writeFileSync(__dirname+'/validation.json',JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result,null,2));
