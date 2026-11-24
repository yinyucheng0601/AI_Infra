// Usage: node convert.cjs --mock baseline|skew output.json
//        node convert.cjs input.json output.json
const fs=require('node:fs'),m=require('./model.js');
const args=process.argv.slice(2);let data,output;
if(args[0]==='--mock'){
 if(!['baseline','skew'].includes(args[1])||!args[2])throw Error('Usage: --mock baseline|skew output.json');
 data=m.mock(args[1]==='skew');output=args[2];
}else{
 if(!args[0]||!args[1])throw Error('Usage: input.json output.json');
 const input=JSON.parse(fs.readFileSync(args[0],'utf8'));
 data=input.schemaVersion?m.validate(input):input.schema==='raw-linked-communication.v1'?m.fromRawLinked(input):m.fromLegacy(input);output=args[1];
}
fs.writeFileSync(output,JSON.stringify(data,null,2)+'\n');
console.log(JSON.stringify({output,run:data.run.id,ranks:data.ranks.length,events:data.events.length,observations:data.observations.length}));
