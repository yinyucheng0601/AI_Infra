import {nextTick} from 'vue'
import {useRouter} from 'vue-router'
const installed=new WeakSet()
export function useCognitionContinuity(){
 const router=useRouter()
 if(installed.has(router)||typeof document==='undefined')return
 installed.add(router)
 let overlays=[],animations=[]
 const cleanup=()=>{overlays.forEach(n=>n.remove());overlays=[];animations.forEach(a=>a.cancel());animations=[]}
 const cards=no=>Array.from(document.querySelectorAll(`[data-slidev-no="${no}"] [data-cognition-card]`)).filter(el=>el.getBoundingClientRect().width>0)
 let captured=[]
 router.beforeEach((to,from)=>{
  cleanup();captured=[]
  if('startViewTransition' in document||matchMedia('(prefers-reduced-motion: reduce)').matches)return
  const old=cards(from.params.no),isPair=old.length===5&&Math.abs(Number(to.params.no)-Number(from.params.no))===1
  if(!isPair)return
  captured=old.map(el=>({node:el.cloneNode(true),rect:el.getBoundingClientRect(),size:getComputedStyle(el.querySelector('h3')).fontSize}))
 })
 router.afterEach(async(to)=>{
  if(!captured.length)return
  const old=captured;captured=[]
  await nextTick();await new Promise(resolve=>requestAnimationFrame(resolve))
  const targets=cards(to.params.no)
  if(targets.length!==5)return
  const duration=400,easing='cubic-bezier(0.22,1,0.36,1)'
  old.forEach((item,i)=>{
   const target=targets[i],end=target.getBoundingClientRect(),box=document.createElement('div'),node=item.node
   // A fixed overlay preserves the actual rendered card across the route boundary.
   Object.assign(box.style,{position:'fixed',left:item.rect.x+'px',top:item.rect.y+'px',width:item.rect.width+'px',height:item.rect.height+'px',zIndex:'9999',pointerEvents:'none'})
   Object.assign(node.style,{width:'100%',height:'100%',viewTransitionName:'none',overflow:'hidden',padding:(18*item.rect.width/222)+'px'})
   const title=node.querySelector('h3'),targetTitle=target.querySelector('h3')
   Object.assign(title.style,{viewTransitionName:'none',fontSize:parseFloat(item.size)*item.rect.width/222+'px'})
   node.querySelectorAll('p,svg').forEach(n=>n.style.opacity='0')
   box.append(node);document.body.append(box);overlays.push(box)
   animations.push(box.animate([{left:item.rect.x+'px',top:item.rect.y+'px',width:item.rect.width+'px',height:item.rect.height+'px'},{left:end.x+'px',top:end.y+'px',width:end.width+'px',height:end.height+'px'}],{duration,easing,fill:'forwards'}))
   animations.push(title.animate([{fontSize:title.style.fontSize},{fontSize:parseFloat(getComputedStyle(targetTitle).fontSize)*end.width/222+'px'}],{duration,easing,fill:'forwards'}))
   animations.push(target.animate([{opacity:0},{opacity:1}],{duration:200,delay:200,fill:'backwards'}))
  })
  const active=animations.slice()
  await Promise.allSettled(active.map(a=>a.finished))
  if(animations===active)return
  if(active.every(a=>animations.includes(a)))cleanup()
 })
}
