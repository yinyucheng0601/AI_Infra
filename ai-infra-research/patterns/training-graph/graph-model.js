// Pure model/configuration layer: no DOM or SVG dependency.
const TRAINING_MODEL=Object.freeze({tokens:8,hidden:8,ffn:16,heads:4,experts:4});
function deriveTrainingConfig(stage,parameters){
 if(!Number.isInteger(stage)||stage<0||stage>8)throw Error('Unknown training stage');
 if(![1,2,4].includes(parameters.tp)||![1,2,4].includes(parameters.ep??1))throw Error('Invalid parallel degree');
 const moe=stage>=7&&parameters.ffn==='moe',ep=moe&&stage>=8?parameters.ep:1;
 const tp=stage>=4?parameters.tp:1,sp=stage>=5&&(parameters.sp||moe&&ep>1)&&tp>1;
 return Object.freeze({stage,moe,ep,tp,sp,seq:TRAINING_MODEL.tokens/(sp?tp:1),detailed:stage>=1,training:stage>=2,wgrad:stage>=3,recollect:stage>=6&&sp&&parameters.cache==='shard',worldSize:tp*ep});
}
function buildTrainingRows({detailed,tp,sp,seq,moe}){
 const rows=[],byId={};
 function add(id,kind,name,shape,extra={}){const r={id,kind,name,shape,...extra};rows.push(r);byId[id]=r;return r;}
 const val=(id,name,shape,extra)=>add(id,'value',name,shape,extra);
 const opR=(id,name,category,extra)=>add(id,'op',name,null,{category,...extra});
 val('model-input-H0','H₀',[seq,8]);
 opR('module-norm1','Norm 1','norm');val('full-input-X',sp?'Xᵣ':'X',[seq,8]);
 if(!detailed)opR('module-attn','Attention','attention');
 else{
 if(sp){opR('full-f-agq','AG(Xᵣ)','expand',{communication:true});val('full-value-f-0','X',[8,8]);}
 opR('full-f-qkv','QKV','linear',{linear:'qkv'});val('full-value-f-1','QKVᵣ',[8,24/tp]);
 opR('full-f-mha','MHA','attention');val('full-value-f-2','Oᵣ',[8,8/tp]);
 opR('full-f-proj','PROJ','linear',{linear:'proj'});
 if(tp>1){val('full-value-f-3','Zprojᵣ',[8,8]);opR('full-f-rsp',sp?'RS(R_Attn)':'AR(R_Attn)','reduce',{communication:true});}
 }
 val('model-attn-result',sp?'R_Attnᵣ':'R_Attn',[seq,8]);
 add('module-add1','add','Residual Add 1');val('model-boundary-Y',sp?'Hₐᵣ':'Hₐ',[seq,8]);
 opR('module-norm2','Norm 2','norm');val('full-value-f-4',sp?'Aᵣ':'A',[seq,8]);
 if(!detailed)opR('module-mlp','FFN','linear');
 else{
 if(sp){opR('full-f-agf','AG(Aᵣ)','expand',{communication:true});val('full-value-f-5','A',[8,8]);}
 if(moe)add('module-moe','moe','MoE');else{opR('full-f-fc1','FC1','linear',{linear:'fc1'});val('full-value-f-6','Uᵣ',[8,16/tp]);
 opR('full-f-gelu','GeLU','activation');val('full-value-f-7','Vᵣ',[8,16/tp]);
 opR('full-f-fc2','FC2','linear',{linear:'fc2'});
 }
 if(tp>1){val('full-value-f-8','Z2ᵣ',[8,8]);opR('full-f-rsf',sp?'RS(Y)':'AR(Y)','reduce',{communication:true});}
 }
 val('full-value-f-9',sp?'Yᵣ':'Y',[seq,8]);add('module-add2','add','Residual Add 2');val('model-output',sp?'H₁ᵣ':'H₁',[seq,8]);
 return {rows,byId};
}
function trainingGraphSnapshot(config,rows,positions,edges,registry){
 return {schema:'training-graph.v1',model:TRAINING_MODEL,config,
 nodes:Object.entries(registry).map(([id,n])=>({id,label:n.title,description:n.body,kind:n.role?'tensor':rows.find(r=>r.id===id)?.kind==='moe'?'module':positions[id]?'operation':'module',shape:n.shape||null,role:n.role||null,objectId:n.objectId||id,sources:[...(n.docs||[])],layout:positions[id]||null})),
 groups:config.moe?Array.from({length:config.ep},(_,ep)=>({id:'expert-group-'+ep,parallelism:'EP',ranks:Array.from({length:config.tp},(_,tp)=>ep*config.tp+tp),experts:Array.from({length:TRAINING_MODEL.experts/config.ep},(_,i)=>ep*TRAINING_MODEL.experts/config.ep+i)})):[],
 edges:edges.map(e=>({...e})),sequence:rows.map(r=>r.id)};
}
