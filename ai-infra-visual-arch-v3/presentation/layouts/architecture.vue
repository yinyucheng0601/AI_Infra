<script setup>
import PageFrame from '../components/PageFrame.vue'
defineProps({title:String,heading:String,subtitle:String,heading:String,eyebrow:String,accent:String,embedded:{type:Boolean,default:false}})
</script>
<template>
  <PageFrame kind="architecture" :style="heading ? {'--page-header':'21cqh'} : {}" :title="heading || title" :subtitle="subtitle" :eyebrow="eyebrow" :accent="accent" :embedded="embedded">
    <slot />
    <template #header><slot name="header"><small v-if="eyebrow">{{ eyebrow }}</small><h1 v-if="heading || title">{{ heading || title }}</h1><p v-if="subtitle">{{ subtitle }}</p></slot></template>
    <template #footer><slot name="footer" /></template>
  </PageFrame>
</template>
