<script setup>
import PageFrame from '../components/PageFrame.vue'
defineProps({title:String,subtitle:String,eyebrow:String,accent:String,embedded:{type:Boolean,default:false}})
</script>
<template>
  <PageFrame kind="chapter" :title="title" :subtitle="subtitle" :eyebrow="eyebrow" :accent="accent" :embedded="embedded">
    <slot />
    <template #header><slot name="header"><small v-if="eyebrow">{{ eyebrow }}</small><h1 v-if="title">{{ title }}</h1><p v-if="subtitle">{{ subtitle }}</p></slot></template>
    <template #footer><slot name="footer" /></template>
  </PageFrame>
</template>
