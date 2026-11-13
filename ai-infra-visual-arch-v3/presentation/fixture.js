import captions from './captions.json';
import {mountChapterDiamonds} from './chapter-diamonds.js';
// Shared port, intentionally separate from each framework's navigation.
export async function mountFixture(root, id) {
  const markup = await fetch(`/scenes/${id}.html`).then(r=>{if(!r.ok)throw new Error(`Scene ${id}: ${r.status}`);return r.text()});
  root.innerHTML = markup.replace(/<section\b/g,'<div').replace(/<\/section>/g,'</div>');
  const scene = root.querySelector('.slide');
  mountChapterDiamonds(root,id);
  const firstStep=['attention','layers','agent','system'].includes(id)?-1:0;
  let step = firstStep;let active=true;
  const syncLayer=()=>{const frame=root.querySelector('#layer-live-frame');if(frame?.contentWindow)frame.contentWindow.postMessage({type:'deck-layer-playback',playing:active&&step===0},location.origin);};
  let titles=['01 原子图元','02 组合 Pattern','03 框架画布 · Pass Error Cases'];
  const descriptions=['固定对象语义','组织关系与联动','保留上下文，按需核查'];
  function renderTitle(){if(id!=='system'||step<0||step>2)return;const title=root.querySelector('[data-series-title]'),description=root.querySelector('[data-series-description]');if(title)title.textContent=titles[step];if(description)description.textContent=descriptions[step];}

  const max = ['domain-theory','agenda'].includes(id)?0:id==='summary'?4:id==='system'?3:id==='language'?4:5;
  const {createSceneRuntime}=await import('./scene-runtime.js');
  const runtime=await createSceneRuntime(root,scene,id);
  scene.dataset.active='true';
  requestAnimationFrame(()=>requestAnimationFrame(()=>scene.querySelectorAll('.t-stagger').forEach(el=>el.classList.add('is-shown'))));
  const buttons = document.createElement('div');
  buttons.className='trial-controls';
  buttons.innerHTML='<button title="返回上一步">上一步</button><button title="进入下一步">下一步</button>';
  // Keep internal step controls off the presentation surface.
  buttons.hidden=true;
  const model = id==='agent'?window.ScaleModel.create():null;
  if(model) {
    for(const grid of root.querySelectorAll('[data-matrix]')) {
      for(let i=0;i<60;i++) {
        const cell=document.createElement('span');cell.className='data-cell'+(i===0?' selected':'');
        cell.dataset.index=String(i+(grid.dataset.matrix.endsWith('1')?60:0));grid.append(cell);
      }
    }
    root.querySelector('#scale-ops').innerHTML=window.VisualSystem.node('multiply','scale-multiply','',660,218)+window.VisualSystem.node('add','scale-add','',760,218);
  }
  function render(n) {
    const cards=id==='language'?[...root.querySelectorAll('.principle-card')]:[];
    cards.forEach(el=>el.getAnimations().forEach(a=>a.cancel()));
    const before=cards.map(el=>el.getBoundingClientRect());
    const previous=step;
    step=Math.max(firstStep,Math.min(max,n));scene.dataset.direction=step<previous?'back':'forward';scene.dataset.depth=step>=3?'detail':'overview';scene.dataset.step=String(step);scene.dataset.chapterReady='true';
    const caption=root.querySelector('[data-caption]');if(caption&&captions[id]?.[step])caption.textContent=captions[id][step];
    runtime.update(step,model);
    syncLayer();
    renderTitle();
    buttons.children[0].disabled=step===firstStep;buttons.children[1].disabled=step===max;
    if(cards.length){const focus=[-1,1,0,0,2,-1][step];cards.forEach(el=>el.classList.toggle('is-focused',Number(el.dataset.module)===focus));if(step!==previous&&!matchMedia('(prefers-reduced-motion:reduce)').matches)cards.forEach((el,i)=>{const a=before[i],b=el.getBoundingClientRect();if(a.width&&b.width)el.animate([{transform:`translate(${a.left-b.left}px,${a.top-b.top}px) scale(${a.width/b.width},${a.height/b.height})`},{transform:'none'}],{duration:850,easing:'cubic-bezier(.22,1,.36,1)'});});}
    if(model) {
      model.s[0]=step>=2?1:-1;
      root.querySelector('[data-scale-value]').textContent=String(model.s[0]);
      for(const grid of root.querySelectorAll('[data-matrix]'))for(const c of grid.children){const i=+c.dataset.index;c.textContent=String(grid.dataset.matrix.startsWith('x')?model.x[i]:window.ScaleModel.element(model,i).y);}
      for(const [b,i] of [0,60].entries())root.querySelector(`[data-readout="${b}"]`).textContent=String(window.ScaleModel.element(model,i).y);
    }
  }
  buttons.children[0].onclick=()=>render(step-1);buttons.children[1].onclick=()=>render(step+1);
  render(firstStep);
  const boundDocs=new Set();
  function isCurrent(){if(root.closest('.slidev-page'))return active;const section=root.closest('.reveal .slides > section');return !!section?.classList.contains('present');}
  function onKey(event){if(!isCurrent()||event.ctrlKey||event.metaKey||event.altKey||event.target.closest('input,textarea,select,[contenteditable="true"],.cm-editor'))return;const direction=event.key==='ArrowRight'?1:event.key==='ArrowLeft'?-1:0;if(!direction)return;if((direction>0&&step<max)||(direction<0&&step>firstStep)){event.preventDefault();event.stopImmediatePropagation();render(step+direction);}else if(event.currentTarget!==document){event.preventDefault();document.dispatchEvent(new KeyboardEvent('keydown',{key:event.key,bubbles:true}));}}
  function bind(doc){if(!doc||boundDocs.has(doc))return;doc.addEventListener('keydown',onKey,true);boundDocs.add(doc);}
  bind(document);
  const frames=[...root.querySelectorAll('iframe')];
  const onLoad=event=>{try{bind(event.target.contentDocument);syncLayer()}catch{}};
  frames.forEach(frame=>{frame.addEventListener('load',onLoad);try{bind(frame.contentDocument)}catch{}});
  root.dataset.ready='true';
  return {step:render,setActive(value){active=value;scene.dataset.active=String(value);syncLayer();}, setTitles(values){titles=titles.map((t,i)=>values[i]??t);renderTitle();}, destroy(){runtime.destroy();boundDocs.forEach(doc=>doc.removeEventListener('keydown',onKey,true));frames.forEach(frame=>frame.removeEventListener('load',onLoad));root.replaceChildren();}};
}
