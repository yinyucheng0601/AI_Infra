(function (root) {
  'use strict';
  const topics = [
    {id:'all',label:'全部',description:'从技术理解到体验判断，按课题阅读首批精选内容。'},
    {id:'ecosystem',label:'计算生态',description:'理解平台分层、迁移边界与工具链的产品定位。'},
    {id:'operators',label:'算子与硬件',description:'建立算子开发、硬件执行与切分方式的心智模型。'},
    {id:'training',label:'模型训练',description:'串联训练任务、并行、通信与设备放置中的关键对象。'},
    {id:'inference',label:'模型推理',description:'理解模型迁移、Runtime、算子、Kernel、Serving 与集群之间的推理链路。'},
    {id:'competitive',label:'竞争分析',description:'从竞品对象、旅程和能力边界中提取产品与体验设计启发。'},
    {id:'experience',label:'产品体验',description:'从用户旅程、研究证据到工具体验与设计汇报。'},
    {id:'visual',label:'信息与交互表达',description:'学习如何表达复杂计算过程，以及跨 Web / TUI 的视觉语义。'}
  ];
  const projects = {pto:'PTO',pypto:'PyPTO · Insight',devkit:'DevKit · TUI','pangu-research':'盘古 · 用户研究','ai-infra':'AI Infra'};
  const escapeHtml = value => String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const encodePath = value => value.split('/').map(encodeURIComponent).join('/');
  function parseState(search, assets) {
    const q = new URLSearchParams(search);
    return {
      topic:topics.some(t=>t.id===q.get('topic'))?q.get('topic'):'all',
      domain:assets.some(a=>a.domains.includes(q.get('domain')))?q.get('domain'):'all',
      form:assets.some(a=>a.form===q.get('form'))?q.get('form'):'all',
      query:q.get('q')||'', asset:q.get('asset')||''
    };
  }
  function stateQuery(state) {
    const p = new URLSearchParams();
    for (const [key,value] of Object.entries({topic:state.topic,domain:state.domain,form:state.form,q:state.query,asset:state.asset})) {
      if(value && value!=='all')p.set(key,value);
    }
    return p.size?'?'+p.toString():'?';
  }
  function filterAssets(assets,state) {
    const words = state.query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    return assets.filter(a=>{
      const haystack=[a.title,a.author,a.summary,a.designValue,a.form,...a.topics,...a.domains,...a.outline,...a.sources.map(s=>s.repository+' '+s.path)].join(' ').toLocaleLowerCase();
      return (state.topic==='all'||a.topics.includes(state.topic))&&(state.domain==='all'||a.domains.includes(state.domain))&&(state.form==='all'||a.form===state.form)&&words.every(w=>haystack.includes(w));
    });
  }
  function sourceHref(asset,config) {
    const source=asset.sources[0];
    if(config.fileMode && config.fileRoots?.[source.repository])return encodePath(config.fileRoots[source.repository]+source.path);
    if(source.path.endsWith('.md'))return config.serviceBase+'read/'+encodeURIComponent(asset.id);
    if(config.mode==='standalone'&&source.repository==='ai-infra')return '../'+encodePath(source.path)+(source.sha256?'?v='+encodeURIComponent(source.sha256.slice(0,12)):'');
    const href=(source.repository==='pto'&&config.ptoBase ? config.ptoBase : config.serviceBase+'sources/'+source.repository+'/')+encodePath(source.path);
    return source.sha256 ? href+'?v='+encodeURIComponent(source.sha256.slice(0,12)) : href;
  }
  const api={topics,projects,escapeHtml,encodePath,parseState,stateQuery,filterAssets,sourceHref};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.CatalogCore=api;
})(typeof window!=='undefined'?window:globalThis);
