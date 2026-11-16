import {watch,nextTick,onMounted} from 'vue'
import {useNav,useSlideContext} from '@slidev/client'
export function useEntrance(){
 const {currentSlideNo}=useNav();const {$page}=useSlideContext()
 async function enter(){
  if(Number(currentSlideNo.value)!==Number($page.value)||matchMedia('(prefers-reduced-motion: reduce)').matches)return
  await nextTick()
  if(document.documentElement.dataset.cognitionContinuity)return
  const root=document.querySelector(`.slidev-page-${$page.value}`);if(!root)return
  const elements=[...root.querySelectorAll('.basis-header,.computation-story,.cognition-theory,.knowledge-story')]
  elements.forEach((el,i)=>el.animate([{opacity:0,translate:'0 8px'},{opacity:1,translate:'0 0'}],{duration:400,delay:i*80,easing:'cubic-bezier(.22,1,.36,1)',fill:'backwards'}))
 }
 watch(currentSlideNo,enter);onMounted(enter)
}
