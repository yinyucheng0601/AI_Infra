<script setup>
defineProps({kind:String,title:String,subtitle:String,eyebrow:String,accent:{type:String,default:'#c19cf0'},embedded:{type:Boolean,default:false}})
</script>
<template>
  <div class="slidev-layout page-frame" :class="[`page-frame--${kind}`,{'page-frame--embedded':embedded}]" :style="{'--page-accent':accent}">
    <header v-if="!embedded" class="page-frame__header">
      <slot name="header"><small v-if="eyebrow">{{ eyebrow }}</small><h1 v-if="title">{{ title }}</h1><p v-if="subtitle">{{ subtitle }}</p></slot>
    </header>
    <main class="page-frame__content"><slot /></main>
    <footer v-if="!embedded" class="page-frame__footer"><slot name="footer" /></footer>
  </div>
</template>
<style>
.page-frame{position:relative;width:100%;height:100%;padding:0;overflow:hidden;container-type:size;background:#f0f1f3;color:#17242e;--page-header:21cqh;--page-gutter:4cqw}
.page-frame__header{position:absolute;inset:3.2cqh var(--page-gutter) auto;z-index:3}
.page-frame__header small{font-size:1cqw}.page-frame__header h1{font-size:3cqw;line-height:1.2;font-weight:600;margin:1.5cqh 0}.page-frame__header p{font-size:1.15cqw;line-height:1.5;margin:1cqh 0;color:#657180}
.page-frame__content{position:absolute;inset:var(--page-header) var(--page-gutter) 5cqh;min-width:0;min-height:0}
.page-frame__footer{position:absolute;inset:auto var(--page-gutter) 1.5cqh;font-size:.9cqw}
.page-frame--embedded .page-frame__content{inset:0}
.page-frame--chapter{background:var(--page-accent);padding:1.1cqw;border-bottom:0}
.page-frame--chapter:not(.page-frame--embedded)::before{content:'';position:absolute;inset:1.1cqw 1.1cqw 5.8cqh;border-radius:.9cqw;background:#f5f5f7}
.page-frame--chapter{--page-gutter:4cqw;--page-header:25cqh}
.page-frame--demo{background:#080a09;color:#f3f4f2}
.page-frame--demo .page-frame__content iframe{width:100%;height:100%;border:0;display:block}
.page-frame--cards .page-frame__content{display:flex;gap:1.2cqw}
.page-frame--cards .page-frame__content>article{flex:1;min-width:0;padding:2cqw;border-radius:.9cqw;background:var(--page-accent)}
.page-frame--architecture{--page-header:16cqh}
.page-frame__content>svg{width:100%;height:100%}
</style>
