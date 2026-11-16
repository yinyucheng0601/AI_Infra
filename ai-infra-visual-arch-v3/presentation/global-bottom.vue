<script setup>
import {useNav} from '@slidev/client'
const {currentSlideNo,slides,isPresenter,exitPresenter}=useNav()
</script>
<template><div class="deck-page-number" aria-label="当前页码">{{currentSlideNo}} / {{slides.length}}</div><Teleport to="body"><button v-if="isPresenter" class="presenter-exit-button" type="button" @click.stop="exitPresenter">↗ 退出演讲者模式</button></Teleport></template>
<style>
.deck-page-number{position:absolute;right:24px;bottom:10px;z-index:100;pointer-events:none;font:500 10px/1.4 SFMono-Regular,Consolas,monospace;letter-spacing:.1em;color:#737e89}
.presenter-exit-button{position:fixed;top:12px;right:16px;z-index:10000;padding:8px 14px;border:0;border-radius:8px;background:#fff;color:#26313a;font:600 14px/1.4 sans-serif;cursor:pointer}
.presenter-exit-button:hover{background:#e9ebef}
.presenter-exit-button:focus-visible{outline:2px solid #8b7bd7;outline-offset:3px}
.trial-stage .page-no{display:none}
</style>
