const fs=require('fs'),vm=require('vm'),crypto=require('crypto'),path=require('path');
module.exports=function(sources,items){
 const source='logic-catalog-source.js',file='reports/llm-compute/diagram-legend-library/'+source;
 sources.push({id:'pypto-logic-glyphs',title:'PyPTO 算子逻辑图元 · 规范化收录',file,url:'./README.md',kind:'demo',sha256:crypto.createHash('sha256').update(fs.readFileSync(path.join(__dirname,source))).digest('hex')});
 const ctx={window:{}};vm.createContext(ctx);for(const f of ['logic-glyphs.js',source])vm.runInContext(fs.readFileSync(path.join(__dirname,f),'utf8'),ctx);
 const names=['有效区（valid_shape）','标量','Array（片上定长数组）','依赖汇合 / 栅栏','跨核管道','编译期辅助','循环携带','索引 / 寻址','跨核通信'];
 const ids=['valid-region','scalar','array','barrier','pipe','static','carry','index','xcore'];
 names.forEach((name,i)=>{
 const c=ctx.window.LogicCards.find(c=>c.name===name && (name!=='循环携带' || c.group==='R'));if(!c)throw Error(name);
 const [body,w,h]=c.g();const G=ctx.window.LogicGlyphs;
 const css=fs.readFileSync(path.join(__dirname,'logic-glyphs.css'),'utf8');
 let svg=G.wrap(body,w,h,name).replace('<svg ','<svg xmlns="http://www.w3.org/2000/svg" width="'+w*1.4+'" height="'+h*1.4+'" ').replace('<defs>','<style>'+css+'</style><defs>');
 svg=require('./logic-refined.cjs')(ids[i])||svg;
 items.push({id:'logic-'+ids[i],title:name,cat:c.group==='R'?'关系':'对象',layer:'system',desc:ids[i]==='pipe'?'C2V 与 V2C 两条反向通道分别展示槽位；默认两槽，每槽 16 KB。槽数随在飞头块数变化，取自 hardware-native-ide 的 CSA 硬件映射。':c.what,note:'来源：PyPTO hardware-native-ide-ui；按正式库灰阶、数据角色色和公共比例归一化。'+c.split.join(' / '),refs:[{id:'pypto-logic-glyphs'}],legacy:[],svg});
 });
};
