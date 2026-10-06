<script setup lang="ts">
import type { Component } from 'vue'

export type HeroAccent = 'purple' | 'emerald' | 'cyan' | 'blue' | 'amber' | 'rose' | 'slate' | 'violet'

withDefaults(
  defineProps<{
    icon: Component
    iconClass?: string
    title: string
    badge?: string
    badgeClass?: string
    subtitle?: string
    accent?: HeroAccent
  }>(),
  {
    iconClass: 'text-slate-300',
    badgeClass: '',
    subtitle: '',
    badge: '',
    accent: 'slate'
  }
)
</script>

<template>
  <div class="panel-hero" :class="`hero-accent-${accent}`">
    <!-- Minimalist HUD Reticle & Geometrik Arka Plan Vurgusu -->
    <div class="hero-reticle" aria-hidden="true">
      <div class="reticle-line-h"></div>
      <div class="reticle-line-v"></div>
      <div class="reticle-ring"></div>
    </div>

    <div class="relative flex flex-col md:flex-row md:items-center justify-between gap-3 z-10">
      <div class="min-w-0">
        <div class="flex items-center gap-2 mb-1 flex-wrap">
          <component :is="icon" class="w-5 h-5 shrink-0" :class="iconClass" />
          <h2 class="text-base font-extrabold text-slate-100 tracking-tight truncate">
            {{ title }}
          </h2>
          <span v-if="badge" class="ds-badge" :class="badgeClass">{{ badge }}</span>
        </div>
        <p v-if="subtitle" class="text-xs text-slate-400 max-w-2xl leading-relaxed">
          {{ subtitle }}
        </p>
        <div v-if="$slots.progress" class="mt-3 max-w-xl">
          <slot name="progress"></slot>
        </div>
      </div>
      <div v-if="$slots.stats" class="flex items-center gap-2 shrink-0 flex-wrap">
        <slot name="stats"></slot>
      </div>
    </div>
    <div v-if="$slots.alert" class="relative mt-3 z-10">
      <slot name="alert"></slot>
    </div>
  </div>
</template>

<style scoped>
.hero-reticle {
  position: absolute;
  right: -1rem;
  top: -1.5rem;
  width: 7rem;
  height: 7rem;
  pointer-events: none;
  opacity: 0.35;
}

.reticle-ring {
  position: absolute;
  inset: 1rem;
  border-radius: 9999px;
  border: 1px dashed rgba(255, 255, 255, 0.15);
}

.reticle-line-h {
  position: absolute;
  top: 50%;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent);
}

.reticle-line-v {
  position: absolute;
  left: 50%;
  top: 0;
  bottom: 0;
  width: 1px;
  background: linear-gradient(180deg, transparent, rgba(255, 255, 255, 0.15), transparent);
}
</style>
