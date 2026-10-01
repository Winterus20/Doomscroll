<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGameStore, LAB_SEEDS } from '../stores/game'
import { formatNumber } from '../core/format'
import type { LabSeedType } from '../models/types'
import { FlaskConical, Sparkles, Scissors, Info, Sprout, Zap } from 'lucide-vue-next'
import TabHero from './TabHero.vue'

const store = useGameStore()
const selectedSeedType = ref<LabSeedType>('cat_audio')

const selectedSeed = computed(() => {
  return LAB_SEEDS.find((s) => s.type === selectedSeedType.value) || LAB_SEEDS[0]
})

function canAffordSeed(seedType: LabSeedType): boolean {
  const seed = LAB_SEEDS.find((s) => s.type === seedType)
  if (!seed) return false
  return store.matter.gte(seed.cost)
}

function handleCellClick(cellId: number) {
  const cell = store.labCells[cellId]
  if (!cell) return

  if (cell.seedType === null) {
    if (selectedSeed.value.isMutationOnly) return
    store.plantSeed(cellId, selectedSeedType.value)
  } else if (cell.isMature) {
    store.harvestCell(cellId)
  }
}

function getCellSeedDef(seedType: LabSeedType | null) {
  if (!seedType) return null
  return LAB_SEEDS.find((s) => s.type === seedType) || null
}

function getProgressPercent(cell: typeof store.labCells[0]): number {
  if (!cell.seedType || cell.matureAge <= 0) return 0
  return Math.min(100, Math.floor((cell.age / cell.matureAge) * 100))
}
</script>

<template>
  <div class="space-y-3">
    <!-- Birleşik Hero -->
    <TabHero
      :icon="FlaskConical"
      icon-class="text-emerald-400"
      title="Algoritma Laboratuvarı: Trend & Ses Çaprazlama"
      badge="The Garden"
      badge-class="ds-badge-emerald"
      subtitle="Popüler Reels seslerini ve meme formatlarını ek, büyüt, komşu hücrelerle çaprazlayıp mutasyona uğrat ve güçlü dopamin çarpanları hasat et!"
      accent="emerald"
    >
      <template #stats>
        <div class="stat-box">
          <div>
            <div class="stat-box-label">Aktif Lab Bonusu</div>
            <div class="stat-box-value text-emerald-400 flex items-center gap-1.5">
              <Sparkles class="w-3.5 h-3.5 text-emerald-400" />
              <span>×{{ formatNumber(store.labPassiveMultiplier, store.settings.notation) }} Pasif</span>
            </div>
          </div>
          <div class="h-6 w-[1px] bg-white/[0.08]"></div>
          <div>
            <div class="stat-box-label">Tıklama Gücü</div>
            <div class="stat-box-value text-cyan-400">
              ×{{ formatNumber(store.labClickMultiplier, store.settings.notation) }}
            </div>
          </div>
        </div>
      </template>
    </TabHero>

    <!-- Tohum Seçici Paleti -->
    <div class="glass-panel-card p-4 rounded-xl">
      <div class="flex items-center justify-between mb-3 flex-wrap gap-1">
        <span class="section-label">
          <Sprout class="w-4 h-4 text-emerald-400" />
          <span>Ekilmek Üzere Seçili Ses / Format</span>
        </span>
        <span class="section-hint">Boş bir hücreye tıklayarak tohumu ek</span>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
        <button
          v-for="seed in LAB_SEEDS"
          :key="seed.type"
          @click="selectedSeedType = seed.type"
          :disabled="seed.isMutationOnly"
          class="btn-tactile p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between"
          :class="[
            selectedSeedType === seed.type
              ? 'bg-emerald-500/15 border-emerald-500/50'
              : 'bg-black/40 border-white/[0.06] hover:border-white/[0.14]',
            seed.isMutationOnly ? 'opacity-70 cursor-not-allowed border-dashed border-amber-500/40 bg-amber-500/5' : ''
          ]"
        >
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-xl">{{ seed.icon }}</span>
              <span
                v-if="seed.isMutationOnly"
                class="text-[9px] font-mono bg-amber-500/20 text-amber-300 px-1.5 py-0.5 rounded border border-amber-500/30"
              >
                Mutasyon
              </span>
              <span
                v-else
                class="text-[10px] font-mono tabular-nums"
                :class="canAffordSeed(seed.type) ? 'text-emerald-300' : 'text-slate-500'"
              >
                {{ formatNumber(seed.cost, store.settings.notation) }}
              </span>
            </div>
            <div class="text-xs font-bold font-mono text-slate-200 line-clamp-1">{{ seed.name }}</div>
            <div class="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-tight">{{ seed.desc }}</div>
          </div>

          <div class="mt-2.5 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono">
            <span class="text-emerald-400">{{ seed.matureBoostDesc }}</span>
            <span class="text-slate-500 tabular-nums">{{ seed.growthSeconds }}s</span>
          </div>
        </button>
      </div>
    </div>

    <!-- 3x3 Laboratuvar Tarlası / Izgarası -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-3">
      <div class="lg:col-span-2 glass-panel-card p-4 rounded-xl">
        <div class="flex items-center justify-between mb-3 flex-wrap gap-1">
          <span class="section-label">Laboratuvar Hücreleri (3×3 Grid)</span>
          <span class="section-hint">Olgunlaşan hücreye tıklayarak hasat et</span>
        </div>

        <div class="grid grid-cols-3 gap-2.5 sm:gap-3.5 max-w-lg mx-auto aspect-square">
          <div
            v-for="cell in store.labCells"
            :key="cell.id"
            class="relative rounded-xl border flex flex-col items-center justify-center p-2.5 transition-all select-none overflow-hidden"
            :class="[
              cell.seedType === null
                ? 'bg-black/40 border-white/[0.06] hover:border-emerald-500/50 hover:bg-black/60 cursor-pointer group'
                : cell.isMature
                  ? 'bg-emerald-950/20 border-emerald-500/60 cursor-pointer animate-pulse'
                  : 'bg-black/60 border-white/[0.08]'
            ]"
            @click="handleCellClick(cell.id)"
          >
            <!-- Boş Hücre Durumu -->
            <template v-if="cell.seedType === null">
              <div class="text-slate-600 group-hover:text-emerald-400 transition-colors flex flex-col items-center gap-1">
                <span class="text-2xl opacity-40 group-hover:opacity-100 group-hover:scale-110 transition-transform">
                  {{ selectedSeed.icon }}
                </span>
                <span class="text-[10px] font-mono font-bold group-hover:text-emerald-300">
                  + Ek
                </span>
              </div>
            </template>

            <!-- Ekili / Büyüyen veya Olgun Hücre -->
            <template v-else>
              <div class="absolute top-1.5 right-1.5 z-10">
                <button
                  @click.stop="store.clearCell(cell.id)"
                  class="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-all"
                  title="Hücreyi temizle"
                >
                  <Scissors class="w-3 h-3" />
                </button>
              </div>

              <!-- Tohum İkonu -->
              <div class="text-3xl mb-1 transform transition-transform" :class="cell.isMature ? 'scale-110' : ''">
                {{ getCellSeedDef(cell.seedType)?.icon }}
              </div>

              <!-- İsim & Durum -->
              <div class="text-[11px] font-mono font-bold text-slate-200 text-center line-clamp-1">
                {{ getCellSeedDef(cell.seedType)?.name }}
              </div>

              <!-- Büyüme Barı veya Hasat Bildirimi -->
              <div class="w-full mt-2">
                <div v-if="!cell.isMature" class="space-y-1">
                  <div class="progress-track progress-track-md">
                    <div
                      class="progress-fill progress-fill-emerald"
                      :style="{ width: `${getProgressPercent(cell)}%` }"
                    ></div>
                  </div>
                  <div class="flex justify-between text-[9px] font-mono text-slate-400 tabular-nums">
                    <span>{{ Math.floor(cell.age) }}s</span>
                    <span>{{ cell.matureAge }}s</span>
                  </div>
                </div>

                <div v-else class="text-center">
                  <span class="inline-block px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/30 text-emerald-300 border border-emerald-500/40">
                    HASAT ET!
                  </span>
                  <div class="text-[9px] font-mono text-emerald-400 mt-1">
                    {{ getCellSeedDef(cell.seedType)?.matureBoostDesc }}
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>

      <!-- Bilgi & Mutasyon Rehberi -->
      <div class="glass-panel-card p-4 rounded-xl flex flex-col justify-between">
        <div>
          <div class="flex items-center gap-2 mb-3">
            <Info class="w-4 h-4 text-emerald-400" />
            <h3 class="section-label">Çaprazlama & Mutasyon Rehberi</h3>
          </div>

          <div class="space-y-2.5 text-xs text-slate-400 leading-relaxed">
            <div class="p-3 rounded-xl bg-black/40 border border-white/[0.06]">
              <div class="font-bold text-slate-200 font-mono flex items-center gap-1.5 mb-1">
                <span>🐱 + 🗿 = 🧠 Saf Nöron Çürütücü</span>
              </div>
              <p class="text-[11px] text-slate-400">
                Olgunlaşmış bir <b>Kedi Miyavlaması</b> ile bir <b>Sigma Phonk</b> tohumunu yan yana komşu hücrelere ek. Aralarındaki boş hücre zamanla kendiliğinden efsanevi <span class="text-emerald-300 font-bold">Saf Nöron Çürütücü</span>'ye mutasyona uğrar!
              </p>
            </div>

            <div class="p-3 rounded-xl bg-black/40 border border-white/[0.06]">
              <div class="font-bold text-slate-200 font-mono flex items-center gap-1.5 mb-1">
                <Zap class="w-3.5 h-3.5 text-amber-400" />
                <span>Canlı Tutma Stratejisi</span>
              </div>
              <p class="text-[11px] text-slate-400">
                Olgun tohumlar hasat edilmeden toprakta kaldığı sürece pasif çarpan vermeye devam eder. Ancak çok uzun süre bekletilirse solar ve çürür.
              </p>
            </div>
          </div>
        </div>

        <div class="mt-4 pt-3 border-t border-white/[0.06] text-[11px] font-mono text-slate-500 flex items-center justify-between tabular-nums">
          <span>Toplam Lab Hasatları:</span>
          <span class="text-emerald-400 font-bold">{{ store.stats.labHarvests || 0 }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
