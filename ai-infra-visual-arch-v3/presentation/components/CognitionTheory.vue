<script setup>
import {useSlideContext} from '@slidev/client'
import VisualCognition from './VisualCognition.vue'
import VisualCognitionTranslation from './VisualCognitionTranslation.vue'
const {$clicks}=useSlideContext()
</script>
<template>
<div class="cognition-presentation" :class="{compact:$clicks>0}">
 <div class="cognition-details"><VisualCognitionTranslation detail-only /></div>
 <div class="cognition-cards"><VisualCognition :compact="$clicks>0" /></div>
</div>
</template>
<style scoped>
.cognition-presentation,.cognition-details,.cognition-cards{position:absolute;inset:0}
.cognition-presentation{background:#f5f5f5}
.cognition-cards{pointer-events:none}
.cognition-details{opacity:0;transform:translateY(8px);transition:opacity 180ms ease,transform 180ms ease;pointer-events:none}
.compact .cognition-details{opacity:1;transform:none;transition:opacity 240ms 180ms ease,transform 320ms 180ms cubic-bezier(.22,1,.36,1)}
@media(prefers-reduced-motion:reduce){.cognition-details,.compact .cognition-details{transition:none;transform:none}}
</style>
