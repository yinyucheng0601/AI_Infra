import {nextTick} from 'vue'
import {useRouter} from 'vue-router'
const installed=new WeakSet()
export function useCognitionContinuity(){
 const router=useRouter()
 if(installed.has(router)||typeof document==='undefined')return
 installed.add(router)
 let overlays=[],animations=[],captured=[],version=0
 const cards=no=>[...document.querySelectorAll(`.slidev-page-${no} [data-cognition-card]`)].filter(el=>el.getBoundingClientRect().width>0)
 function cleanup(){
  overlays.forEach(el=>el.remove());overlays=[]
  animations.forEach(a=>a.cancel());animations=[]
  delete document.documentElement.dataset.cognitionContinuity
 }
 router.beforeEach((to,from)=>{
  version++;cleanup();captured=[]
  if(String(to.params.no)!==String(from.params.no)||Number(to.query.clicks||0)===Number(from.query.clicks||0)||matchMedia('(prefers-reduced-motion: reduce)').matches)return
  const source=cards(from.params.no)
  if(source.length!==5)return
  document.documentElement.dataset.cognitionContinuity='true'
  captured=source.map(el=>{
   const title=el.querySelector('h3'),rect=el.getBoundingClientRect(),tr=title.getBoundingClientRect(),style=getComputedStyle(title)
   return {rect,title:title.textContent,titleRect:tr,font:parseFloat(style.fontSize)*rect.width/el.clientWidth,weight:style.fontWeight,family:style.fontFamily}
  })
 })
 router.afterEach(async(to)=>{
  if(!captured.length)return
  const ownVersion=version,source=captured;captured=[]
  await nextTick()
  if(ownVersion!==version)return
  const target=cards(to.params.no)
  if(target.length!==5){cleanup();return}
  const easing='cubic-bezier(.22,1,.36,1)',duration=320
  source.forEach((item,i)=>{
   const end=target[i].getBoundingClientRect(),title=target[i].querySelector('h3'),tr=title.getBoundingClientRect(),scale=end.width/target[i].clientWidth
   const box=document.createElement('div'),text=document.createElement('h3')
   box.dataset.cognitionOverlay=String(i)
   Object.assign(box.style,{position:'fixed',left:'0',top:'0',width:end.width+'px',height:end.height+'px',background:'#fff',borderRadius:'12px',boxShadow:'0 3px 12px #0000000c',overflow:'hidden',zIndex:'9999',pointerEvents:'none',transform:`translate3d(${end.x}px,${end.y}px,0)`})
   text.textContent=item.title
   Object.assign(text.style,{position:'absolute',margin:'0',whiteSpace:'nowrap',fontFamily:item.family,fontWeight:item.weight,color:'#242424',left:(tr.x-end.x)+'px',top:(tr.y-end.y)+'px',fontSize:parseFloat(getComputedStyle(title).fontSize)*scale+'px'})
   box.append(text);document.body.append(box);overlays.push(box)
   animations.push(box.animate([{transform:`translate3d(${item.rect.x}px,${item.rect.y}px,0)`,width:item.rect.width+'px',height:item.rect.height+'px',opacity:1},{transform:`translate3d(${end.x}px,${end.y}px,0)`,width:end.width+'px',height:end.height+'px',opacity:1}],{duration,easing}))
   animations.push(text.animate([{left:(item.titleRect.x-item.rect.x)+'px',top:(item.titleRect.y-item.rect.y)+'px',fontSize:item.font+'px'},{left:(tr.x-end.x)+'px',top:(tr.y-end.y)+'px',fontSize:parseFloat(getComputedStyle(title).fontSize)*scale+'px'}],{duration,easing}))
   animations.push(box.animate([{opacity:1},{opacity:0}],{delay:260,duration:80,fill:'forwards'}))
  })
  const page=document.querySelector(`.slidev-page-${to.params.no}`)
  const svg=page?.querySelector('.cognition-theory')
  if(svg)animations.push(svg.animate([{opacity:0},{opacity:1}],{delay:150,duration:180,fill:'backwards'}))
  await Promise.allSettled(animations.map(a=>a.finished))
  if(version===ownVersion)cleanup()
 })
}
