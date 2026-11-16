<script setup>
import {ref,onMounted,onBeforeUnmount} from 'vue'
import DesignBasisHeader from './DesignBasisHeader.vue'
import ComputationMechanisms from './ComputationMechanisms.vue'
const hardware=ref('AIC')
const hardwareOpen=ref(false)
function openHardware(name){
 hardwareOpen.value=hardware.value===name?!hardwareOpen.value:true
 hardware.value=name
}
function dismiss(event){
 if(!event.target.closest?.('.hardware-popover,.hardware-trigger'))hardwareOpen.value=false
}
function onKey(event){
 if(event.key==='Escape'&&hardwareOpen.value){event.preventDefault();event.stopImmediatePropagation();hardwareOpen.value=false}
}
onMounted(()=>{document.addEventListener('pointerdown',dismiss);window.addEventListener('keydown',onKey,true)})
onBeforeUnmount(()=>{document.removeEventListener('pointerdown',dismiss);window.removeEventListener('keydown',onKey,true)})
</script>
<template>
<DesignBasisHeader title="计算、访存、通信、同步与调度共同决定执行与性能" />
<svg class="computation-story" viewBox="25 160 1270 610" role="img" aria-label="计算机制与运行行为"><ComputationMechanisms @open-hardware="openHardware" /></svg>
<aside v-if="hardwareOpen" class="hardware-popover" role="region" :aria-label="hardware+' 硬件结构预览'">
<header><strong>Core · AIC / AIV</strong><button title="关闭硬件结构面板" aria-label="关闭硬件结构面板" @click="hardwareOpen=false">×</button></header>
<img src="/assets/aic-aiv-execution-reference.png" alt="AIC、AIV 的存储、搬运与计算结构" />
</aside>
</template>
<style scoped>
.computation-story{position:absolute;left:2.7%;top:17%;width:94.6%;height:81%}
.hardware-popover{position:absolute;z-index:8;left:63.5%;top:43%;width:32.5%;box-sizing:border-box;padding:10px;border-radius:12px;background:#fff;color:#222;box-shadow:0 6px 28px #0002}
.hardware-popover::before{content:'';position:absolute;left:-7px;top:18px;width:14px;height:14px;background:#fff;transform:rotate(45deg)}
.hardware-popover header{display:flex;justify-content:space-between;align-items:center;position:relative;margin-bottom:6px}
.hardware-popover strong{font:600 14px Inter,'PingFang SC',sans-serif}
.hardware-popover button{width:26px;height:26px;border:0;border-radius:50%;background:#f2f2f2;color:#555;font:20px sans-serif;cursor:pointer}
.hardware-popover button:focus-visible{outline:none;background:#def46c}
.hardware-popover img{display:block;width:100%;height:auto}
</style>
