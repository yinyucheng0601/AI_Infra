// Shared Atlas dial + Lingqu board arcs. State stays with the host selection.
let deploymentView='Top';
let deploymentPanelAnchor=null;
function anchorDeploymentPanel(event,node){
 const rect=node.getBoundingClientRect(),pointer=event.type==='click'&&event.detail!==0;
 deploymentPanelAnchor={x:pointer?event.clientX:rect.right,y:pointer?event.clientY:rect.top+rect.height/2};
 document.querySelector('#panel').dataset.followObject='';
}
function positionDeploymentPanel(){
 const panel=document.querySelector('#panel');
 if(current!==9||panel.hidden||!deploymentPanelAnchor)return;
 const {x,y}=deploymentPanelAnchor,gap=16,margin=12,rect=panel.getBoundingClientRect(),w=rect.width,h=rect.height;
 let left=x+gap;
 if(left+w>innerWidth-margin)left=x-gap-w;
 let top=y+gap;
 if(left<margin){left=Math.max(margin,(innerWidth-w)/2);if(top+h>innerHeight-margin)top=y-gap-h;}
 panel.style.setProperty('--object-panel-x',Math.max(margin,Math.min(innerWidth-w-margin,left))+'px');
 panel.style.setProperty('--object-panel-y',Math.max(margin,Math.min(innerHeight-h-margin,top))+'px');
}
function resetDeploymentPanelAnchor(){deploymentPanelAnchor=null;const p=document.querySelector('#panel');delete p.dataset.followObject;p.style.removeProperty('--object-panel-x');p.style.removeProperty('--object-panel-y');}
new ResizeObserver(positionDeploymentPanel).observe(document.querySelector('#panel'));
window.addEventListener('resize',positionDeploymentPanel);
const deploymentViewNames=['2.5D','Top','Front','Side'];
const deploymentDialHost=document.createElement('div');deploymentDialHost.className='view-dial';deploymentDialHost.hidden=true;document.body.append(deploymentDialHost);
const deploymentDial=AtlasControls.mountDial(deploymentDialHost,{center:true,onCenter:()=>setDeploymentView(deploymentView==='2.5D'?1:0),onSelect:setDeploymentView});
function syncDeploymentDial(){
 deploymentDialHost.hidden=current!==9;
 deploymentDial.update({centerActive:deploymentView!=='2.5D',views:['立体视图','顶视图','正视图','侧视图'],selected:deploymentViewNames.indexOf(deploymentView),name:deploymentView==='2.5D'?'2.5D':({Top:'顶视',Front:'正视',Side:'侧视'})[deploymentView]});
 // The host has one tooltip implementation, including keyboard focus.
 deploymentDialHost.querySelectorAll('button').forEach(b=>{b.dataset.tip=b.getAttribute('title')||b.getAttribute('aria-label');b.removeAttribute('title');b.removeAttribute('data-wb-tip');});
}
function setDeploymentView(index){
 if(current!==9||!deploymentViewNames[index])return;
 pausePlayback();deploymentView=deploymentViewNames[index];drawDeployment();
 deploymentCamera.z=1;deploymentCamera.x=deploymentCamera.y=0;applyDeploymentCamera();fitDeployment();
}
function deploymentProject(render){return RankMemoryView.geometry.withProjection(deploymentView,render);}
function deploymentOrthographicGlyph(rank,unknown=false){
 if(deploymentView==='2.5D')return rankCube(rank,true,unknown).replaceAll('data-unmapped-band ','data-unmapped-band="" ');
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');
 svg.innerHTML=deploymentProject(()=>rankCube(rank,true,unknown));
 // Wall labels belong to the isometric face; orthographic labels stay upright.
 svg.querySelectorAll('text').forEach(t=>t.remove());
 return svg.innerHTML;
}
function drawDeploymentTop(){physicalRender();}
function observationTop(){
 if(!physicalRender()){
  const warning=document.createElementNS('http://www.w3.org/2000/svg','text');warning.setAttribute('x','660');warning.setAttribute('y','-20');warning.setAttribute('text-anchor','middle');warning.setAttribute('class','deployment-board-label');warning.textContent='未提供设备映射';document.querySelector('#deployment-world').append(warning);
 }
}
