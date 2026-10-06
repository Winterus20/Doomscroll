<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
import { ACHIEVEMENTS, ACHIEVEMENT_CATEGORIES } from '../game/achievements'
import { format } from '../core/format'
import { Trophy } from 'lucide-vue-next'
import TabHero from './TabHero.vue'

const store = useGameStore()

const unlockedSet = computed(() => new Set<string>(store.achievements))

function isUnlocked(id: string): boolean {
  return unlockedSet.value.has(id)
}

function categoryProgress(catId: string): { done: number; total: number } {
  const defs = ACHIEVEMENTS.filter((a) => a.category === catId)
  return { done: defs.filter((a) => isUnlocked(a.id)).length, total: defs.length }
}

const totalUnlocked = computed(() => store.achievements.length)
const totalCount = ACHIEVEMENTS.length
const multiplierText = computed(() => format(store.achievementMultiplier, 2, store.settings.notation))
</script>

<template>
  <div class="space-y-3">
    <TabHero
      :icon="Trophy"
      icon-class="text-amber-400"
      title="Kozmik Başarımlar & Plaketler"
      :badge="`${totalUnlocked}/${totalCount}`"
      badge-class="ds-badge-amber"
      subtitle="Her başarım kalıcı ×1.012 üretim verir, tam satır (kategori) ×1.06 ekler. Ödüllü başarımlar prestij dahil kalıcı yetenek açar. Gizli başarımlar ipucu vermez, ödül vermez — sadece plaket."
      accent="amber"
    >
      <template #stats>
        <div class="stat-box">
          <div>
            <div class="stat-box-label">Başarım Çarpanı (kalıcı)</div>
            <div class="stat-box-value text-amber-400 tabular-nums">×{{ multiplierText }}</div>
          </div>
        </div>
      </template>
    </TabHero>

    <!-- Kategori Satırları -->
    <div class="glass-panel-card p-4 rounded-xl space-y-4">
      <div
        v-for="cat in ACHIEVEMENT_CATEGORIES"
        :key="cat.id"
        class="space-y-2.5"
      >
        <div class="flex items-center justify-between gap-3 flex-wrap">
          <div class="flex items-center gap-2">
            <span class="text-lg">{{ cat.icon }}</span>
            <div>
              <div class="text-sm font-bold text-white">{{ cat.name }}</div>
              <div class="text-[11px] text-slate-500">{{ cat.desc }}</div>
            </div>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <div class="progress-track progress-track-sm w-24 progress-track-bordered">
              <div
                class="progress-fill progress-fill-amber"
                :style="{ width: `${(categoryProgress(cat.id).done / Math.max(1, categoryProgress(cat.id).total)) * 100}%` }"
              ></div>
            </div>
            <span class="text-xs font-mono text-slate-400 tabular-nums">
              {{ categoryProgress(cat.id).done }}/{{ categoryProgress(cat.id).total }}
            </span>
          </div>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
          <div
            v-for="ach in ACHIEVEMENTS.filter((a) => a.category === cat.id)"
            :key="ach.id"
            class="p-3 rounded-xl border flex flex-col gap-1.5 transition-all"
            :class="isUnlocked(ach.id)
              ? 'bg-amber-500/[0.05] border-amber-500/25'
              : 'bg-black/30 border-white/[0.04] opacity-45'"
          >
            <div class="flex items-center gap-2">
              <span class="text-xl leading-none" :class="{ 'grayscale': !isUnlocked(ach.id) }">
                {{ isUnlocked(ach.id) || !ach.secret ? ach.icon : '❓' }}
              </span>
              <span class="text-xs font-bold" :class="isUnlocked(ach.id) ? 'text-amber-200' : 'text-slate-400'">
                {{ isUnlocked(ach.id) || !ach.secret ? ach.name : '???' }}
              </span>
            </div>
            <div class="text-[11px] leading-snug" :class="isUnlocked(ach.id) ? 'text-slate-300' : 'text-slate-500'">
              {{ isUnlocked(ach.id) || !ach.secret ? ach.desc : 'Gizli başarım — olay ufkunu kurcala, belki bulursun.' }}
            </div>
            <div v-if="ach.reward" class="mt-auto pt-1">
              <span
                class="ds-badge tabular-nums"
                :class="isUnlocked(ach.id) ? 'ds-badge-emerald' : ''"
              >
                {{ isUnlocked(ach.id) ? '✔ ' : '' }}{{ ach.reward.desc }}
              </span>
            </div>
            <div v-else-if="ach.secret && !isUnlocked(ach.id)" class="mt-auto pt-1">
              <span class="ds-badge ds-badge-purple">
                GİZLİ · ÖDÜLSÜZ
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
