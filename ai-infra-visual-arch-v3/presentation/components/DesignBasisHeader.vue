<script setup>
defineProps({title:String,subtitle:String})
</script>
<template><header class="basis-header"><small>1 设计依据与任务</small><h1>{{title}}</h1><p v-if="subtitle">{{subtitle}}</p></header></template>
<style scoped>
.basis-header{position:absolute;z-index:4;top:2.7cqh;left:2.7cqw;right:2.7cqw;font-family:Inter,'PingFang SC',sans-serif;color:#151b20;pointer-events:none;text-align:left}.basis-header small{font:500 12px/1.4 SFMono-Regular,Consolas,monospace;letter-spacing:.12em;color:#3f4952}.basis-header h1{font-size:2.85cqw;line-height:1.2;font-weight:600;margin:2.2cqh 0 1.5cqh;letter-spacing:-.02em;text-align:left;text-indent:0;padding:0}.basis-header p{font-size:1.4cqw;line-height:1.5;color:#737e89;margin:0}
</style>
