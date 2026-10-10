import * as THREE from 'three';
import { OrbitControls } from './vendor/OrbitControls.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';
import { DRACOLoader } from './vendor/DRACOLoader.js';
import { RoomEnvironment } from './vendor/RoomEnvironment.js';

const $ = id => document.getElementById(id);
const stage = $('stage');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const scene = new THREE.Scene();
scene.background = new THREE.Color('#171b1c');
scene.fog = new THREE.Fog('#171b1c', 240, 560);
const camera = new THREE.PerspectiveCamera(3, 1, .1, 600);
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;
const environmentGenerator = new THREE.PMREMGenerator(renderer);
const roomEnvironment = new RoomEnvironment();
scene.environment = environmentGenerator.fromScene(roomEnvironment, .04).texture;
scene.environmentIntensity = .65;
roomEnvironment.dispose(); environmentGenerator.dispose();
renderer.domElement.setAttribute('aria-label', 'Atlas 950 三维概念模型。可使用硬件选择器切换部件，右上圆盘切换观察方向。');
stage.prepend(renderer.domElement);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = .065;
controls.minDistance = .15;
controls.maxDistance = 200;
controls.maxPolarAngle = Math.PI * .88;
controls.autoRotateSpeed = .65;
scene.add(new THREE.HemisphereLight(0xf0f0f0, 0x353535, 2.4));
const key = new THREE.DirectionalLight(0xffffff, 3.2); key.position.set(3, 5, 4); scene.add(key);
const fill = new THREE.DirectionalLight(0xd4e4eb, 2.1); fill.position.set(-3, 2, -2); scene.add(fill);
const rim = new THREE.DirectionalLight(0xe0e0e0, .8); rim.position.set(1, 2, -4); scene.add(rim);
const grid = new THREE.GridHelper(80, 200, 0x585858, 0x414141);
grid.material.transparent = true; grid.material.opacity = .65; grid.position.y = -.012; scene.add(grid);
const floor = new THREE.Mesh(new THREE.PlaneGeometry(200, 200), new THREE.MeshBasicMaterial({color:0x1c2122}));
floor.rotation.x = -Math.PI / 2; floor.position.y = -.018; scene.add(floor);
const rack = new THREE.Group(); scene.add(rack);
const detailRoot = new THREE.Group(); detailRoot.visible = false; scene.add(detailRoot);
const shell = new THREE.Group(); rack.add(shell);
const computeGroup = new THREE.Group(); rack.add(computeGroup);
const networkGroup = new THREE.Group(); rack.add(networkGroup);
const powerGroup = new THREE.Group(); rack.add(powerGroup);
const coolingGroup = new THREE.Group(); rack.add(coolingGroup);
let selectedView = 'rack', loaded = false, exploded = false, transition = null, tourStep = -1;
let frameOutline, singleCompute, singleNetwork, singlePower, npuAssembly;
let poppedUnit, popOutline;
const popItems=[];let patchUnit;
const cache = {}, computeUnits = [], clickTargets = [];
const manager = new THREE.LoadingManager();
manager.onProgress = (url, done, total) => $('load-progress').textContent = `${done} / ${total} 资源就绪`;
const loader = new GLTFLoader(manager);
const draco = new DRACOLoader(manager).setDecoderPath('./draco/');
loader.setDRACOLoader(draco);
const textures = new THREE.TextureLoader(manager);
const perforation = textures.load('./models/perforations.png');
perforation.flipY = false;
perforation.anisotropy = renderer.capabilities.getMaxAnisotropy();
const pcb = textures.load('./models/cosmo/pcb.png'); pcb.flipY = false; pcb.colorSpace = THREE.SRGBColorSpace;
const green = new THREE.MeshStandardMaterial({color:0x00b886, metalness:.35, roughness:.4});
const metal = new THREE.MeshStandardMaterial({color:0x8c9792, metalness:.7, roughness:.32});
const graphite = new THREE.MeshStandardMaterial({color:0x242e2a, metalness:.35, roughness:.5});
const copper = new THREE.MeshStandardMaterial({color:0xa88a59, metalness:.7, roughness:.37});
const coolBlue = new THREE.MeshStandardMaterial({color:0x358aa0, metalness:.5, roughness:.35});
const warmGold = new THREE.MeshStandardMaterial({color:0xc48651, metalness:.5, roughness:.35});

function box(w,h,d, material, x=0,y=0,z=0) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material); mesh.position.set(x,y,z); return mesh;
}
function tube(points, radius, material) {
  const curve = new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
  return new THREE.Mesh(new THREE.TubeGeometry(curve,32,radius,8,false),material);
}
function textPlane(text, width, height, {color='#98e4b0',bg=null,font=90,sub=''}={}) {
  const canvas = document.createElement('canvas');canvas.width=1024;canvas.height=384;
  const ctx = canvas.getContext('2d');
  if(bg){ctx.fillStyle=bg;ctx.fillRect(0,0,1024,384);}
  ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font=`500 ${font}px "PingFang SC", "Microsoft YaHei", sans-serif`;
  ctx.fillText(text,512,sub?156:192);
  if(sub){ctx.font=(font>200?'56px':'30px')+' sans-serif';ctx.fillText(sub,512,font>200?326:266);}
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  return new THREE.Mesh(new THREE.PlaneGeometry(width,height),new THREE.MeshBasicMaterial({map:texture,transparent:true,side:THREE.DoubleSide,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-2}));
}
function cloneModel(name) { return cache[name].clone(true); }
function mark(group, view){group.userData.view=view;group.traverse(o=>{if(o.isMesh){o.userData.view=view;clickTargets.push(o);}});}
function setMaterials(root, modelName){
  root.traverse(o=>{
    if(!o.isMesh)return;
    const mats=Array.isArray(o.material)?o.material:[o.material];
    for(const m of mats){
      if(/Perforations/i.test(m.name)){
        const solid=modelName==='powerPerforations';
        m.alphaMap=solid?null:perforation;m.map=null;m.alphaTest=solid?0:.5;
        m.opacity=1;m.color.set('#080808');m.metalness=0;m.roughness=1;
        m.side=THREE.FrontSide;m.transparent=false;m.depthWrite=true;
        m.alphaToCoverage=!solid;m.polygonOffset=true;m.polygonOffsetFactor=-1;m.polygonOffsetUnits=-2;m.needsUpdate=true;
      }
      if(m.isMeshStandardMaterial){m.envMapIntensity=.12;}
      if(/Aluminum_Black|Steel|Paint/i.test(m.name)){m.roughness=.85;m.metalness=.15;}
      if(/Aluminum_(Warm|Cold|Rough)/i.test(m.name)){m.color.set('#73777a');m.metalness=.65;m.roughness=.6;}
      if(/PCB_Texture/i.test(m.name)){m.map=pcb;}
      if(/green/i.test(m.name)){m.color.set('#C31D20');m.roughness=.55;m.metalness=0;}
    }
  });
}
async function build(){
  const files={cpu:'cpu/processor',body:'rack-frame/lod1/body',core:'rack-frame/lod1/core',housing:'rack-frame/lod1/cosmo-housing',patchHousing:'rack-frame/lod1/patch-housing',powerHousing:'rack-frame/lod1/power-housing',exterior:'cosmo/lod1/exterior',perforations:'cosmo/lod1/perforations',interior:'cosmo/lod1/interior',heatsink:'cosmo/lod1/heatsink',shroud:'cosmo/lod1/shroud',memory:'cosmo/lod1/memory',fans:'cosmo/lod1/fans',switch:'sidecar/lod1/exterior',switchCover:'sidecar/lod1/cover',switchPerforations:'sidecar/lod1/perforations',switchInside:'sidecar/lod1/interior',power:'power-shelf/lod1/shelf',powerPerforations:'power-shelf/lod1/perforations',patch:'patch-panel/lod1/panel'};
  await Promise.all(Object.entries(files).map(async([name,path])=>{const gltf=await loader.loadAsync(`./models/${path}.glb`);cache[name]=gltf.scene;setMaterials(gltf.scene,name);}));
  shell.add(cloneModel('body'));
  rack.add(cloneModel('core'),cloneModel('housing'),cloneModel('patchHousing'),cloneModel('powerHousing'));
  const logoTexture=await textures.loadAsync('./ascend-mark.svg');logoTexture.colorSpace=THREE.SRGBColorSpace;
  const brand=new THREE.Mesh(new THREE.PlaneGeometry(.23,.283),new THREE.MeshBasicMaterial({map:logoTexture,transparent:true,depthWrite:false,side:THREE.DoubleSide,polygonOffset:true,polygonOffsetFactor:-2}));brand.rotation.y=Math.PI/2;brand.position.set(.317,1.18,.04);shell.add(brand);
  const brandLeft=brand.clone();brandLeft.rotation.y=-Math.PI/2;brandLeft.position.x=-.317;shell.add(brandLeft);
  const frontLabel=textPlane('ATLAS 950',.29,.045,{font:88,color:'#9faea7'});frontLabel.position.set(0,2.19,.45);rack.add(frontLabel);
  for(const top of [.86,2.084])for(let i=0;i<8;i++)for(const x of [-.13,.13]){
    const g=new THREE.Group();g.position.set(x,top-(7-i)*.1,.035);g.add(cloneModel('exterior'),cloneModel('perforations'));computeGroup.add(g);computeUnits.push(g);mark(g,'compute');
  }
  for(const y of [.99,1.26]){const g=new THREE.Group();g.position.set(0,y,.015);g.add(cloneModel('switch'),cloneModel('switchCover'),cloneModel('switchPerforations'));networkGroup.add(g);mark(g,'network');}
  for(const y of [1.115,1.1623]){const g=new THREE.Group();g.position.set(0,y,.095);g.add(cloneModel('power'),cloneModel('powerPerforations'));powerGroup.add(g);mark(g,'power');}
  const patch=cloneModel('patch');patch.position.set(0,2.2,.15);rack.add(patch);mark(patch,'patch');
  poppedUnit=computeUnits[16];
  for(const [id,unit] of [['compute',poppedUnit],['network',networkGroup.children[1]],['power',powerGroup.children[1]],['patch',patch]]){const outline=new THREE.BoxHelper(unit,0xffffff);outline.visible=false;rack.add(outline);popItems.push({id,unit,outline,base:unit.position.z});}
  
  singleCompute=new THREE.Group();singleCompute.add(cloneModel('exterior'),cloneModel('perforations'),cloneModel('interior'),cloneModel('memory'),cloneModel('fans'));
  const heatsink=cloneModel('heatsink');heatsink.name='heatsink';singleCompute.add(heatsink);
  singleCompute.children[3].name='memory';singleCompute.children[4].name='fans';
  const cpu=cloneModel('cpu');cpu.name='cpu';
  const cpuBounds=new THREE.Box3().setFromObject(cpu),cpuSize=cpuBounds.getSize(new THREE.Vector3()),cpuScale=.07/Math.max(cpuSize.x,cpuSize.z);
  const cpuHolder=new THREE.Group();cpuHolder.name='processor';cpuHolder.add(cpu);cpu.position.sub(cpuBounds.getCenter(new THREE.Vector3()));cpuHolder.scale.setScalar(cpuScale);cpuHolder.position.set(0,-.03,0);singleCompute.add(cpuHolder);
  const shroud=cloneModel('shroud');shroud.name='shroud';singleCompute.add(shroud);
  singleNetwork=new THREE.Group();singleNetwork.add(cloneModel('switch'),cloneModel('switchPerforations'),cloneModel('switchInside'));
  tuneNetworkDetail(singleNetwork);
  singlePower=new THREE.Group();singlePower.add(cloneModel('power'),cloneModel('powerPerforations'));

  frameOutline=new THREE.BoxHelper(shell,0xffffff);frameOutline.material.transparent=true;frameOutline.material.opacity=.8;rack.add(frameOutline);
  loaded=true;$('loading').classList.add('done');
  window.__atlas={ready:true,view:'rack',models:Object.keys(cache).length,sourceBrandRemoved:true};
  selectView('rack',true);
}

function tuneNetworkDetail(root){
  // Independent materials: changing the open switch must not recolor rack instances.
  const copies=new Map();
  root.traverse(mesh=>{
    if(!mesh.isMesh)return;
    const adapt=source=>{
      if(copies.has(source))return copies.get(source);
      const m=source.clone();copies.set(source,m);
      if(!m.isMeshStandardMaterial)return m;
      m.envMapIntensity=.06;
      if(m.name==='Copper'){m.color.set('#a86743');m.metalness=.65;m.roughness=.72;}
      else if(m.name==='PCB'){m.color.set('#25483c');m.metalness=0;m.roughness=.9;}
      else if(/Plastic_Black/.test(m.name)){m.metalness=0;m.roughness=.82;}
      else if(/Aluminum_(Cold|Warm|Rough)/.test(m.name)){m.color.set('#64676a');m.metalness=.45;m.roughness=.78;}
      return m;
    };
    mesh.material=Array.isArray(mesh.material)?mesh.material.map(adapt):adapt(mesh.material);
  });
}

// Detail-only material copies keep rack materials untouched when selecting parts.
const detailMaterials=new WeakMap();
const partRegions={
  disks:{center:[0,0,.35],size:[.27,.11,.09]},
  'power-connector':{center:[.085,-.03,-.35],size:[.055,.05,.065]},
  'network-connectors':{center:[-.0325,-.03,-.35],size:[.155,.05,.065]}
};
function focusComputePart(id){
  const focused={cpu:'processor',ram:'memory',fans:'fans','airflow-shroud':'shroud'}[id];
  const region=partRegions[id],active=!!focused||!!region;
  singleCompute.getObjectByName('heatsink').visible=id!=='cpu';
  singleCompute.getObjectByName('processor').visible=id==='cpu';
  singleCompute.updateWorldMatrix(true,true);
  const inverseRoot=singleCompute.matrixWorld.clone().invert();
  for(const part of singleCompute.children)part.traverse(mesh=>{
    if(!mesh.isMesh)return;
    if(!detailMaterials.has(mesh)){
      const sources=Array.isArray(mesh.material)?mesh.material:[mesh.material];
      const normal=sources.map(source=>{const m=source.clone();if(m.name==='Copper'){m.color.set('#a86743');m.metalness=.65;m.roughness=.65;}return m;});
      detailMaterials.set(mesh,{normal,array:Array.isArray(mesh.material),variants:new Map()});
    }
    const state=detailMaterials.get(mesh);
    const variant=!active||part.name===focused?'normal':region?id:'dim';
    if(variant!=='normal'&&!state.variants.has(variant)){
      const local=new THREE.Matrix4().multiplyMatrices(inverseRoot,mesh.matrixWorld);
      const materials=state.normal.map(source=>{
        const m=source.clone();
        m.onBeforeCompile=shader=>{
          if(region){
            shader.uniforms.atlasLocal={value:local};
            shader.vertexShader='uniform mat4 atlasLocal; varying vec3 atlasPosition;\n'+shader.vertexShader;
            shader.vertexShader=shader.vertexShader.replace('#include <project_vertex>',`#include <project_vertex>
              vec4 atlasVertex=vec4(transformed,1.0);
              #ifdef USE_INSTANCING
                atlasVertex=instanceMatrix*atlasVertex;
              #endif
              atlasPosition=(atlasLocal*atlasVertex).xyz;`);
            shader.fragmentShader='varying vec3 atlasPosition;\n'+shader.fragmentShader;
            const vec=values=>'vec3('+values.map(v=>Number(v).toFixed(7)).join(',')+')';
            shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>',`
              vec3 atlasDelta=abs(atlasPosition-${vec(region.center)});
              vec3 atlasHalf=${vec(region.size.map(v=>v*.5))};
              float atlasInside=step(atlasDelta.x,atlasHalf.x)*step(atlasDelta.y,atlasHalf.y)*step(atlasDelta.z,atlasHalf.z);
              outgoingLight*=mix(0.28,1.0,atlasInside);
              #include <opaque_fragment>`);
          }else shader.fragmentShader=shader.fragmentShader.replace('#include <opaque_fragment>','outgoingLight *= 0.28;\n#include <opaque_fragment>');
        };
        m.customProgramCacheKey=()=> 'atlas-focus-v3-'+variant;
        return m;
      });state.variants.set(variant,materials);
    }
    const materials=variant==='normal'?state.normal:state.variants.get(variant);
    mesh.material=state.array?materials:materials[0];
    mesh.userData.focusVariant=variant;
  });
}
function placeDetail(object){
  // Compute bounds at the model origin, never in the previous view's world frame.
  object.removeFromParent();object.position.set(0,0,0);object.updateWorldMatrix(true,true);
  const bounds=new THREE.Box3().setFromObject(object),center=bounds.getCenter(new THREE.Vector3());
  object.position.copy(center).negate();detailRoot.position.set(0,.8,0);detailRoot.add(object);detailRoot.updateWorldMatrix(true,true);
  return {bounds,center};
}
function setDetailLighting(detail){
  renderer.toneMappingExposure=detail?1.0:1.15;
  scene.children.filter(o=>o.isLight).forEach(light=>{
    if(light.userData.originalIntensity===undefined)light.userData.originalIntensity=light.intensity;
    light.intensity=light.userData.originalIntensity*(detail?.7:1);
  });
}

const views=Object.fromEntries([
 ['rack','计算机柜'],['compute','计算节点'],['inner','Inner'],['disks','Disks'],['cpu','CPU（示意）'],['ram','DRAM'],['power-connector','Power Connector'],['network-connectors','Network Connectors'],['fans','Fans'],['airflow-shroud','Airflow Shroud'],['network','灵衢互联'],['switch-inner','Inner'],['power','供电系统'],['patch','配线面板']
].map(([id,title])=>[id,{title}]));
const innerViews=['inner','disks','cpu','ram','power-connector','network-connectors','fans','airflow-shroud'];
function resize(){
  const w=stage.clientWidth,h=stage.clientHeight;renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(stage);resize();
function moveCamera(position,target,immediate=false){
  const targetVector=new THREE.Vector3(...target);position=new THREE.Vector3(...position).sub(targetVector).multiplyScalar(11.64).add(targetVector).toArray();
  controls.autoRotate=false;$('auto-rotate').checked=false;
  if(immediate||reducedMotion){camera.position.fromArray(position);controls.target.fromArray(target);controls.update();transition=null;return;}
  transition={start:performance.now(),from:camera.position.clone(),to:new THREE.Vector3(...position),targetFrom:controls.target.clone(),targetTo:new THREE.Vector3(...target)};
}
function rackCamera(immediate=false){
  const mobile=stage.clientWidth<550;
  moveCamera(mobile?[3.05,3.25,5.75]:[2.40,3.05,4.45],[0,1.16,0],immediate);
}
function clearDetail(){while(detailRoot.children.length)detailRoot.remove(detailRoot.children[0]);}
function selectView(id,immediate=false){
  if(!loaded)return;
  selectedView=id;window.__atlas.view=id;
  const inner=innerViews.includes(id);
  setDetailLighting(inner||id==='switch-inner');

  document.querySelectorAll('[data-parent]').forEach(b=>{b.hidden=b.dataset.parent==='compute'?!(['compute',...innerViews].includes(id)):b.dataset.parent==='inner'?!inner:!['network','switch-inner'].includes(id);});
  document.querySelectorAll('[data-view]').forEach(b=>{b.classList.toggle('active',b.dataset.view===id);b.setAttribute('aria-current',String(b.dataset.view===id));});
  $('crumb').textContent=inner?'计算节点 / Inner'+(id==='inner'?'':' / '+views[id].title):id==='switch-inner'?'灵衢互联 / Inner':views[id].title;
  syncNavigation(id);
  clearDetail();detailRoot.visible=false;rack.visible=!inner&&id!=='switch-inner';
  shell.visible=$('show-shell').checked;computeGroup.visible=true;networkGroup.visible=true;powerGroup.visible=true;frameOutline.visible=id==='rack';
  grid.position.y=-.012;
  for(const item of popItems)item.outline.visible=item.id===id;
  if(id==='rack'){rackCamera(immediate);return;}
  if(rack.visible){const item=popItems.find(p=>p.id===id);const y=item.unit.position.y;moveCamera([1.9,y+1.15,3.6],[0,y,.15],immediate);return;}
  const object=inner?singleCompute:singleNetwork;detailRoot.visible=true;
  if(inner)singleCompute.getObjectByName('shroud').visible=id==='airflow-shroud';
  const {bounds,center}=placeDetail(object);
  if(inner)focusComputePart(id);
  grid.position.y=.8-bounds.getSize(new THREE.Vector3()).y/2-.035;
  const focus={disks:[0,0,.35],cpu:[0,0,0],ram:[0,0,0],'power-connector':[.085,-.03,-.35],'network-connectors':[-.0325,-.03,-.35],fans:[0,.05,-.25],'airflow-shroud':[0,0,0]}[id];
  const target=focus?new THREE.Vector3(...focus).sub(center).add(detailRoot.position):new THREE.Vector3(0,.8,0);
  const dir=['fans','power-connector','network-connectors'].includes(id)?new THREE.Vector3(1,1,-1.2):new THREE.Vector3(1.5,1,1.5);
  const distance=Math.max(...bounds.getSize(new THREE.Vector3()).toArray())*(focus?1.12:2.0)*(stage.clientWidth<550?1.5:1);
  moveCamera(dir.normalize().multiplyScalar(distance).add(target).toArray(),target.toArray(),immediate);
}

function syncNavigation(id){
  const inner=innerViews.includes(id);
  const parent=inner?'compute':id==='switch-inner'?'network':id;

  const path=id==='rack'?['rack']:inner?['rack','compute','inner',...(id==='inner'?[]:[id])]:id==='switch-inner'?['rack','network','switch-inner']:['rack',id];
  $('path-nav').replaceChildren();
  path.forEach((key,i)=>{if(i){const sep=document.createElement('span');sep.className='path-separator';sep.textContent='/';$('path-nav').append(sep);}const b=document.createElement('button');b.textContent=views[key].title;b.onclick=()=>selectView(key);if(i===path.length-1)b.setAttribute('aria-current','location');$('path-nav').append(b);});
  // Keep the legacy breadcrumb target available for the next scene change.
  const crumb=document.createElement('span');crumb.id='crumb';crumb.hidden=true;$('path-nav').append(crumb);

  document.querySelectorAll('#navigation [data-view]:not([data-parent])').forEach(b=>{b.classList.toggle('active',b.dataset.view===parent);b.setAttribute('aria-current',b.dataset.view===parent?'true':'false');});
  document.querySelectorAll('#navigation [data-view=inner],#navigation [data-view=switch-inner]').forEach(b=>b.querySelector('span').textContent=(inner||id==='switch-inner')?'内部结构 · Inner':'查看内部 · Inner');
  setDirection('iso');
}
function setDirection(direction){
  document.querySelectorAll('[data-angle]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.angle===direction)));
  $('direction-label').textContent={iso:'轴测',front:'前视图',back:'后视图',left:'左视图',right:'右视图',free:'自由视角'}[direction];
}
document.querySelectorAll('[data-angle]').forEach(b=>b.onclick=()=>{
  if(!loaded)return;
  const angle=b.dataset.angle;
  const direction={iso:[2.4,1.89,4.45],front:[0,0,1],back:[0,0,-1],left:[-1,0,0],right:[1,0,0]}[angle];
  const target=controls.target.clone(),distance=camera.position.distanceTo(target);
  const destination=new THREE.Vector3(...direction).normalize().multiplyScalar(distance/11.64).add(target);
  moveCamera(destination.toArray(),target.toArray());setDirection(angle);
});
controls.addEventListener('start',()=>setDirection('free'));
document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>{tourStep=-1;$('tour').innerHTML='<span>⌘</span> 导览模式 <span>→</span>';selectView(b.dataset.view);}));
$('brand').onclick=()=>selectView('rack');
$('reset').onclick=()=>selectView(selectedView);
$('tour').onclick=()=>{
  const order=Object.keys(views);tourStep=(tourStep+1)%order.length;selectView(order[tourStep]);
  $('tour').innerHTML=`<span>⌘</span> ${tourStep+1} / ${order.length} · ${tourStep===order.length-1?'重新导览':'下一站'} <span>→</span>`;
};
$('options-toggle').onclick=()=>{const open=$('options').hidden;$('options').hidden=!open;$('options-toggle').setAttribute('aria-expanded',String(open));};
$('auto-rotate').onchange=e=>controls.autoRotate=e.target.checked;
$('show-grid').onchange=e=>grid.visible=e.target.checked;
$('show-shell').onchange=e=>shell.visible=e.target.checked&&selectedView!=='cooling';
$('options-reset').onclick=()=>{$('show-grid').checked=true;$('show-shell').checked=true;grid.visible=true;selectView('rack');};
$('about-open').onclick=()=>$('about').showModal();
$('about').addEventListener('click',e=>{if(e.target===$('about')){const b=$('about').getBoundingClientRect();if(e.clientX<b.left||e.clientX>b.right||e.clientY<b.top||e.clientY>b.bottom)$('about').close();}});
$('expand').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{$('expand').title='当前浏览器不支持全屏';}};
document.addEventListener('keydown',e=>{if(e.key==='Escape'){$('options').hidden=true;$('options-toggle').setAttribute('aria-expanded','false');}if(e.key==='Home'&&!$('about').open)selectView('rack');});
controls.addEventListener('start',()=>transition=null);
const raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();let pointerStart=null;
function hitAt(e){const rect=renderer.domElement.getBoundingClientRect();pointer.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(pointer,camera);return raycaster.intersectObjects(clickTargets,false).find(h=>{let p=h.object;while(p){if(!p.visible)return false;p=p.parent;}return true;});}
renderer.domElement.addEventListener('pointerdown',e=>pointerStart=[e.clientX,e.clientY]);
renderer.domElement.addEventListener('pointerup',e=>{if(pointerStart&&Math.hypot(e.clientX-pointerStart[0],e.clientY-pointerStart[1])<5&&(selectedView==='rack'||selectedView==='cooling')){const h=hitAt(e);if(h)selectView(h.object.userData.view);}pointerStart=null;});
renderer.domElement.addEventListener('pointermove',e=>{
  if(!loaded||selectedView!=='rack'||e.buttons){$('hover-label').hidden=true;return;}
  const h=hitAt(e);$('hover-label').hidden=!h;renderer.domElement.style.cursor=h?'pointer':'grab';
  if(h){const rect=stage.getBoundingClientRect();$('hover-label').textContent=views[h.object.userData.view].title+' ↗';$('hover-label').style.left=Math.min(e.clientX-rect.left+14,rect.width-140)+'px';$('hover-label').style.top=(e.clientY-rect.top+14)+'px';}
});
renderer.domElement.addEventListener('pointerleave',()=>$('hover-label').hidden=true);
renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();$('loading').classList.remove('done');$('loading').querySelector('strong').textContent='3D 画面已暂停';$('load-progress').textContent='请刷新页面重新加载';});
function animate(now){
  requestAnimationFrame(animate);
  if(transition){const t=Math.min(1,(now-transition.start)/850),v=1-Math.pow(1-t,3);camera.position.lerpVectors(transition.from,transition.to,v);controls.target.lerpVectors(transition.targetFrom,transition.targetTo,v);if(t===1)transition=null;}
  for(const p of popItems){p.unit.position.z=THREE.MathUtils.lerp(p.unit.position.z,p.base+(selectedView===p.id ? .18 : 0),reducedMotion?1:.12);if(p.outline.visible)p.outline.update();}
  controls.update();
  const focusDistance=camera.position.distanceTo(controls.target);
  camera.near=Math.max(.02,focusDistance-5);
  camera.far=focusDistance+65;
  camera.updateProjectionMatrix();
  renderer.render(scene,camera);
}
camera.position.set(2.4,2.6,4.65);controls.target.set(0,1.16,0);animate(0);
build().catch(error=>{console.error(error);$('loading').querySelector('strong').textContent='模型加载失败';$('load-progress').textContent='请刷新重试：'+error.message;});
