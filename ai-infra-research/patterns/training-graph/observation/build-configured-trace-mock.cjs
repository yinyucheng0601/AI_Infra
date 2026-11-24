const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),ctx=vm.createContext({window:{},console});
for(const f of ['canonical.js','content.js','graph-model.js','graph-layout.js','expert-glyph.js','training-graph.js','rank-pattern/planner.js','rank-model.js','deployment-model.js'])vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),ctx);
const params={tp:4,sp:true,cache:'shard',ffn:'moe',ep:2,experts:4,token:0};
const state=vm.runInContext('trainingDeploymentState('+JSON.stringify(params)+',0,"dispatch")',ctx);
const data=require('./configured-trace-mock.js').build(state,params,{tp:'#808080',cache:'#B1EF6B',dispatch:'#FF9500',return:'#FF9500',dp:'#79D4F2',edp:'#79D4F2'});
fs.writeFileSync(path.join(__dirname,'configured-trace-mock.v1.json'),JSON.stringify(data,null,2)+'\n');console.log(data.rows.length+' Rank / '+data.events.length+' mock events');
