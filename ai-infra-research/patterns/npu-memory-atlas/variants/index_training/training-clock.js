/* Pangu stepState's F 0→L-1 / B L-1→0 progression, adapted to host GA.
 * This is a process clock. Durations are not measured rank execution times.
 */
(function(root){
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),M=root.RankAtlasModel;
 function state(c,t){
  t=clamp(t,0,c.ga*3500+3000);const end=c.ga*c.layers*2;
  if(t>=c.ga*3500){const update=t>=c.ga*3500+1000;return {mb:c.ga-1,phase:update?'update':'accumulate',layer:null,backward:false,cursor:end+(update?1:0),progress:(t-c.ga*3500)/3000};}
  const mb=Math.floor(t/3500),local=t-mb*3500,backward=local>=1500,progress=clamp(backward?(local-1500)/2000:local/1500,0,.999999999);
  const index=Math.floor(progress*c.layers),layer=backward?c.layers-1-index:index;
  return {mb,phase:backward?'backward':'forward',backward,progress,layer,cursor:mb*c.layers*2+(backward?c.layers:0)+index};
 }
 function time(c,cursor){const end=c.ga*c.layers*2,n=clamp(Math.round(cursor),0,end+1);if(n>=end)return c.ga*3500+(n-end)*1500;const phase=Math.floor(n/c.layers),index=n%c.layers;return Math.floor(phase/2)*3500+(phase%2?1500+index/c.layers*2000:index/c.layers*1500)+.0001;}
 function rankTime(c,id,t){const s=state(c,t);if(s.layer===null)return s.phase==='accumulate'?c.ga*3500-.0001:c.ga*3500+(t-c.ga*3500-1000);const r=M.rank(id,c),span=c.layers/c.pp,offset=(s.backward?c.pp-1-r.pp:r.pp)*span,p=(s.progress*c.layers-offset)/span,base=s.mb*3500;
  const start=s.backward?1200+(c.pp-1-r.pp)*1900/c.pp:r.pp*1200/c.pp,duration=(s.backward?1900:1200)/c.pp;
  return base+start+clamp(p,-.000001,1.000001)*duration;
 }
 const memory=M.memory,execution=M.execution;
 M.memory=(id,c,t)=>memory(id,c,rankTime(c,id,t));M.execution=(id,c,t)=>execution(id,c,rankTime(c,id,t));
 root.TrainingClock={state,time,rankTime};
 if(typeof module!=='undefined')module.exports=root.TrainingClock;
})(globalThis);
