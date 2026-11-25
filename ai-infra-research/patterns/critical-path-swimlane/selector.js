(function(global){
function mount(select){
 const abort=new AbortController(),on=(el,type,fn)=>el.addEventListener(type,fn,{signal:abort.signal});
 const wrap=document.createElement('div');wrap.className='trace-selector';
 const trigger=document.createElement('button');trigger.type='button';trigger.className='trace-selector-trigger';trigger.setAttribute('aria-haspopup','listbox');trigger.setAttribute('aria-expanded','false');
 const menu=document.createElement('div');menu.className='trace-selector-menu';menu.setAttribute('role','listbox');menu.setAttribute('aria-label',select.getAttribute('aria-label')||'选择');menu.hidden=true;
 const tip=document.createElement('span');tip.className='trace-selector-tip';tip.setAttribute('role','tooltip');tip.hidden=true;
 const id='trace-selector-'+Math.random().toString(36).slice(2);menu.id=id;trigger.setAttribute('aria-controls',id);tip.id=id+'-tip';trigger.setAttribute('aria-describedby',tip.id);
 select.before(wrap);wrap.append(trigger,menu,tip);select.classList.add('trace-native-select');select.tabIndex=-1;select.setAttribute('aria-hidden','true');
 const buttons=[...select.options].map(opt=>{const b=document.createElement('button');b.type='button';b.className='trace-selector-option';b.setAttribute('role','option');b.textContent=opt.textContent;menu.append(b);on(b,'click',()=>{select.value=opt.value;select.dispatchEvent(new Event('change',{bubbles:true}));close(true);});on(b,'pointerenter',()=>{tip.textContent=opt.textContent;tip.hidden=false;});on(b,'pointerleave',()=>tip.hidden=true);on(b,'focus',()=>{tip.textContent=opt.textContent;tip.hidden=false;});on(b,'blur',()=>tip.hidden=true);return b;});
 function sync(){const i=select.selectedIndex;trigger.textContent=select.options[i]?.textContent||'选择';trigger.setAttribute('aria-label',(select.getAttribute('aria-label')||'选择')+' · '+trigger.textContent);buttons.forEach((b,j)=>b.setAttribute('aria-selected',String(i===j)));}
 function close(focus){menu.hidden=true;tip.hidden=true;trigger.setAttribute('aria-expanded','false');if(focus)trigger.focus();}
 function open(){menu.hidden=false;tip.hidden=true;trigger.setAttribute('aria-expanded','true');buttons[select.selectedIndex]?.focus();}
 on(trigger,'click',()=>menu.hidden?open():close(false));
 on(trigger,'pointerenter',()=>{if(menu.hidden){tip.textContent=trigger.textContent;tip.hidden=false;}});
 on(trigger,'pointerleave',()=>tip.hidden=true);on(trigger,'focus',()=>{if(menu.hidden){tip.textContent=trigger.textContent;tip.hidden=false;}});on(trigger,'blur',()=>tip.hidden=true);
 on(wrap,'keydown',e=>{if(e.key==='Escape'){e.preventDefault();e.stopPropagation();close(true);}else if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();e.stopPropagation();if(menu.hidden){open();return;}const at=buttons.indexOf(document.activeElement);buttons[e.key==='Home'?0:e.key==='End'?buttons.length-1:Math.max(0,Math.min(buttons.length-1,at+(e.key==='ArrowDown'?1:-1)))]?.focus();}});
 on(document,'pointerdown',e=>{if(!wrap.contains(e.target))close(false);});
 on(select,'change',sync);sync();
 return {sync,destroy(){abort.abort();wrap.remove();select.classList.remove('trace-native-select');select.removeAttribute('aria-hidden');select.tabIndex=0;}};
}
global.TraceSelector={mount};
})(window);
