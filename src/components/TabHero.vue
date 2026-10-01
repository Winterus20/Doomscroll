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
    <div class="hero-orb" aria-hidden="true"></div>
    <div class="relative flex flex-col md:flex-row md:items-center justify-between gap-3">
      <div class="min-w-0">
        <div class="flex items-center gap-2 mb-1 flex-wrap">
          <component :is="icon" class="w-5 h-5 shrink-0" :class="iconClass" />
          <h2 class="text-base font-extrabold text-slate-50 truncate">
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
    <div v-if="$slots.alert" class="relative mt-3">
      <slot name="alert"></slot>
    </div>
  </div>
</template>
