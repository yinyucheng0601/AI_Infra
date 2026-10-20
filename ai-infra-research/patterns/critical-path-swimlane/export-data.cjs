// Usage: node export-data.cjs /path/to/PyPTO3-checkout
// Read-only source adapter; output is restricted to this pattern directory.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto'),cp=require('node:child_process'),assert=require('node:assert/strict');
const source=path.resolve(process.argv[2]);global.window={};
const modulePath='Design/execution-triage-workbench/';
require(path.join(source,modulePath,'data.js'));require(path.join(source,modulePath,'home-data.js'));
const r=window.TRIAGE_HOME.runs[0],raw=JSON.parse(fs.readFileSync(path.join(source,'Data/serving-strace-swimlane(2).json')));
const events=raw.traceEvents.filter(e=>e.ph==='X');
const lanePid=raw.traceEvents.find(e=>e.ph==='M'&&e.name==='process_name'&&/STRACE/.test(e.args.name)).pid;
const end=e=>e.ts+e.dur,round=n=>Math.round(n*100)/100;
let origin=events.find(e=>e.name==='http.completions').ts,verified=0;
const steps=window.TRIAGE_DATA.runs[0].steps.map(s=>{
  const id=s.id==='Prefill'?'P':s.id==='Draft init'?'DI':s.id;
  const f=r.flows[id],spans=events.filter(e=>e.pid===lanePid&&e.args?.invocation===s.inv);
  const phase=e=>e.name.split(' |')[1]?.trim();
  const lanes=f.lanes.map(({deviceExec,waitEstimate,...l})=>{
    const own=spans.filter(e=>e.tid===l.dev),bind=own.find(e=>phase(e)==='bind'),rr=own.find(e=>phase(e)==='runner_run'),run=own.find(e=>phase(e)==='simpler_run');
    for(const [key,t] of Object.entries({bindStart:bind.ts,bindEnd:end(bind),rrStart:rr.ts,end:end(run)}))assert.ok(Math.abs(l[key]-round((t-origin)/1000))<.021,`${s.id}/${l.dev}/${key}`);
    verified++;return {...l,rrEnd:round((end(rr)-origin)/1000)};
  });
  origin=Math.max(...spans.filter(e=>phase(e)==='simpler_run').map(end));
  return {id,...f,lanes};
});
const out={version:1,run:{title:r.title,sub:r.sub,workerRows:r.workerRows},steps};
fs.writeFileSync(path.join(__dirname,'data.js'),'window.SWIMLANE_DATA = '+JSON.stringify(out)+';\n');
const revision=cp.execFileSync('git',['-C',source,'rev-parse','HEAD'],{encoding:'utf8'}).trim();
const sources=['Data/serving-strace-swimlane(2).json',...['build-data.cjs','build-home-data.cjs','data.js','home-data.js','home.js','home.css'].map(p=>modulePath+p)].map(p=>({path:p,sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(source,p))).digest('hex'),url:`https://github.com/yinyucheng0601/PyPTO3/blob/${revision}/${encodeURI(p)}`}));
fs.writeFileSync(path.join(__dirname,'provenance.json'),JSON.stringify({repository:'https://github.com/yinyucheng0601/PyPTO3',revision,sources,excluded:['deviceExec','waitEstimate'],adaptations:['rrEnd read directly from raw runner_run event; end remains outer simpler_run endpoint'],validation:{rawLaneComparisons:verified,browser:'not run; visual acceptance reserved for user'}},null,2)+'\n');
console.log(`${steps.length} steps / ${verified} lanes checked against raw STRACE`);
