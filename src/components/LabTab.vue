<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGameStore, LAB_SEEDS, LAB_RECIPES } from '../stores/game'
import { formatNumber } from '../core/format'
import type { LabSeedType } from '../models/types'
import {
  FlaskConical,
  Sparkles,
  Scissors,
  Info,
  Zap,
  Rocket,
  BookOpen,
  Flame,
  Coffee,
  Dna,
  Eye,
  CheckCircle2,
  HelpCircle,
  X,
  Layers
} from 'lucide-vue-next'
import TabHero from './TabHero.vue'
import LockedFeature from './LockedFeature.vue'

const store = useGameStore()
const selectedSeedType = ref<LabSeedType>('cat_audio')
const showCodexModal = ref(false)

// Tohum kademesi (Özellik Merdiveni): Kedi başlangıçta, Kaşar/Subway/Phonk sırayla açılır
const SEED_UNLOCK_FEATURES: Partial<Record<LabSeedType, string>> = {
  cheese_sizzle: 'seed_cheese',
  subway_beat: 'seed_subway',
  sigma_phonk: 'seed_phonk'
}

function seedUnlockFeatureId(seedType: LabSeedType): string | null {
  return SEED_UNLOCK_FEATURES[seedType] || null
}

function isSeedLocked(seedType: LabSeedType): boolean {
  const featureId = seedUnlockFeatureId(seedType)
  return !!featureId && !store.isFeatureUnlocked(featureId)
}

function isSeedDiscovered(seedType: LabSeedType): boolean {
  return store.discoveredFormulas.includes(seedType)
}

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
    if (selectedSeed.value.isMutationOnly && !isSeedDiscovered(selectedSeedType.value)) return
    if (isSeedLocked(selectedSeedType.value)) return
    store.plantSeed(cellId, selectedSeedType.value)
  } else if (cell.isMature) {
    // Olgun hücreye tıklandığında anlık dopamin & Hype toplar, hücre silinmez tekrar ısınır!
    store.harvestCell(cellId)
  } else if (cell.seedType !== selectedSeedType.value && canAffordSeed(selectedSeedType.value)) {
    if (selectedSeed.value.isMutationOnly && !isSeedDiscovered(selectedSeedType.value)) return
    if (isSeedLocked(selectedSeedType.value)) return
    store.plantSeed(cellId, selectedSeedType.value)
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

const isHypeFull = computed(() => store.labHype >= 100)
</script>

<template>
  <div class="space-y-3.5">
    <!-- Birleşik Hero -->
    <TabHero
      :icon="FlaskConical"
      icon-class="text-emerald-400"
      title="Algoritma Stüdyosu: Viral Matris & Trend Reaktörü"
      badge="Viral Stüdyo"
      badge-class="ds-badge-emerald"
      subtitle="Popüler Reels ses ve meme formatlarını akış matrisine yerleştir, yönlü rezonanslarla algoritmayı hackle ve dolan Viral Reaktörü akışa fırlat!"
      accent="emerald"
    >
      <template #stats>
        <div class="stat-box flex-wrap gap-y-2">
          <div>
            <div class="stat-box-label">Pasif Matris</div>
            <div class="stat-box-value text-emerald-400 flex items-center gap-1.5">
              <Sparkles class="w-3.5 h-3.5 text-emerald-400" />
              <span>×{{ formatNumber(store.labPassiveMultiplier, store.settings.notation) }}</span>
            </div>
          </div>
          <div class="h-6 w-[1px] bg-white/[0.08] hidden sm:block"></div>
          <div>
            <div class="stat-box-label">Tıklama Gücü</div>
            <div class="stat-box-value text-cyan-400">
              ×{{ formatNumber(store.labClickMultiplier, store.settings.notation) }}
            </div>
          </div>
          <div class="h-6 w-[1px] bg-white/[0.08] hidden sm:block"></div>
          <div>
            <div class="stat-box-label">Viral Kodeks</div>
            <div class="stat-box-value text-amber-400">
              +{{ store.labCodexBonusPercent }}% Kalıcı
            </div>
          </div>
        </div>
      </template>
    </TabHero>

    <!-- Algoritma Zemin Modları (FYP Besleme Stratejisi) -->
    <div class="glass-panel-card p-3 sm:p-4 rounded-xl">
      <div class="flex items-center justify-between mb-2.5 flex-wrap gap-1">
        <span class="section-label flex items-center gap-1.5">
          <Layers class="w-4 h-4 text-emerald-400" />
          <span>Algoritma Besleme Stratejisi (FYP Zemin Modu)</span>
        </span>
        <span class="section-hint">İstediğin zaman serbestçe değiştir</span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        <!-- 1. Agresif FYP -->
        <button
          @click="store.setLabMode('fyp')"
          class="p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between"
          :class="[
            store.labMode === 'fyp'
              ? 'bg-rose-500/15 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.15)]'
              : 'bg-black/40 border-white/[0.06] hover:border-white/[0.15]'
          ]"
        >
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-sm font-bold font-mono text-rose-300 flex items-center gap-1.5">
                <Flame class="w-4 h-4 text-rose-400" />
                <span>Agresif Keşfet (FYP)</span>
              </span>
              <span class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                Aktif Oyun
              </span>
            </div>
            <p class="text-[11px] text-slate-300 leading-snug">
              Hype barı <b class="text-rose-300">%80 daha hızlı</b> dolar. Akışa Fırlatıldığında anında <b class="text-rose-300">2× Dopamin</b> fışkırır!
            </p>
          </div>
          <div class="mt-2 text-[10px] font-mono text-slate-400 flex items-center gap-1">
            <span :class="store.labMode === 'fyp' ? 'text-rose-400 font-bold' : ''">
              {{ store.labMode === 'fyp' ? '● Aktif Mod' : '○ Seçmek için tıkla' }}
            </span>
          </div>
        </button>

        <!-- 2. Evergreen Arşiv -->
        <button
          @click="store.setLabMode('evergreen')"
          class="p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between"
          :class="[
            store.labMode === 'evergreen'
              ? 'bg-amber-500/15 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
              : 'bg-black/40 border-white/[0.06] hover:border-white/[0.15]'
          ]"
        >
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-sm font-bold font-mono text-amber-300 flex items-center gap-1.5">
                <Coffee class="w-4 h-4 text-amber-400" />
                <span>Evergreen Arşiv</span>
              </span>
              <span class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                AFK & Gece Uykusu
              </span>
            </div>
            <p class="text-[11px] text-slate-300 leading-snug">
              Hype barı durur. Matrisin ürettiği tüm 7/24 pasif dopamin çarpanı kalıcı olarak <b class="text-amber-300">2.5×</b> katlanır.
            </p>
          </div>
          <div class="mt-2 text-[10px] font-mono text-slate-400 flex items-center gap-1">
            <span :class="store.labMode === 'evergreen' ? 'text-amber-400 font-bold' : ''">
              {{ store.labMode === 'evergreen' ? '● Aktif Mod' : '○ Seçmek için tıkla' }}
            </span>
          </div>
        </button>

        <!-- 3. Nöral Sentez -->
        <button
          @click="store.setLabMode('mutation')"
          class="p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between"
          :class="[
            store.labMode === 'mutation'
              ? 'bg-cyan-500/15 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
              : 'bg-black/40 border-white/[0.06] hover:border-white/[0.15]'
          ]"
        >
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-sm font-bold font-mono text-cyan-300 flex items-center gap-1.5">
                <Dna class="w-4 h-4 text-cyan-400" />
                <span>Nöral Sentez Labı</span>
              </span>
              <span class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Formül Kaşifi
              </span>
            </div>
            <p class="text-[11px] text-slate-300 leading-snug">
              Hype normal hızda dolar. Komşu ebeveynlerin yeni gizli formülleri sentezleme şansı <b class="text-cyan-300">3 katına</b> çıkar.
            </p>
          </div>
          <div class="mt-2 text-[10px] font-mono text-slate-400 flex items-center gap-1">
            <span :class="store.labMode === 'mutation' ? 'text-cyan-400 font-bold' : ''">
              {{ store.labMode === 'mutation' ? '● Aktif Mod' : '○ Seçmek için tıkla' }}
            </span>
          </div>
        </button>
      </div>
    </div>

    <!-- Trend Reaktörü & "🚀 AKIŞA FIRLAT!" Paneli -->
    <div
      class="glass-panel-card p-4 rounded-xl border transition-all"
      :class="[
        store.isViralActive
          ? 'border-rose-500/60 bg-gradient-to-r from-rose-950/20 via-black/60 to-purple-950/20 shadow-[0_0_25px_rgba(244,63,94,0.25)] animate-pulse'
          : isHypeFull
            ? 'border-emerald-500/50 bg-emerald-950/10 shadow-[0_0_20px_rgba(16,185,129,0.15)]'
            : 'border-white/[0.06]'
      ]"
    >
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div class="flex items-center gap-2">
          <Rocket
            class="w-5 h-5"
            :class="store.isViralActive ? 'text-rose-400 animate-bounce' : isHypeFull ? 'text-emerald-400 animate-pulse' : 'text-slate-400'"
          />
          <div>
            <div class="text-sm font-bold font-mono tracking-wide text-slate-200">
              Trend Reaktörü & Viral Fırlatıcı
            </div>
            <div class="text-[11px] text-slate-400">
              {{
                store.isViralActive
                  ? 'Canlı Viral Zirve Dalgası Yayında!'
                  : store.labMode === 'evergreen'
                    ? 'Evergreen Modu: Hype durduruldu, matris 2.5× pasif üretim veriyor.'
                    : 'Kaydırdıkça ve matris çalıştıkça Hype dolar.'
              }}
            </div>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button
            @click="showCodexModal = true"
            class="px-2.5 py-1.5 rounded-lg border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <BookOpen class="w-3.5 h-3.5" />
            <span>Viral Kodeks ({{ store.labCodexDiscoveredCount }}/{{ LAB_RECIPES.length }})</span>
          </button>
        </div>
      </div>

      <!-- Canlı Akış Durumu veya Hype Barı -->
      <div v-if="store.isViralActive" class="p-3 rounded-xl bg-black/60 border border-rose-500/40 mb-3 space-y-2">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <div class="flex items-center gap-2">
            <span class="inline-block w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
            <span class="text-xs font-mono font-bold text-rose-300">🔥 CANLI VİRAL AKIŞTA!</span>
          </div>
          <div class="text-xs font-mono text-slate-300 flex items-center gap-3">
            <span class="flex items-center gap-1 text-cyan-300">
              <Eye class="w-3.5 h-3.5" />
              <span>{{ store.viralViews.toLocaleString('tr-TR') }} Canlı İzlenme</span>
            </span>
            <span class="text-rose-400 font-bold tabular-nums">
              {{ store.viralTimeRemaining.toFixed(1) }}s kaldı
            </span>
          </div>
        </div>

        <!-- İlerleme Çizgisi -->
        <div class="progress-track progress-track-md">
          <div
            class="h-full bg-gradient-to-r from-rose-500 via-purple-500 to-cyan-400 transition-all duration-100"
            :style="{ width: `${Math.min(100, (store.viralTimeRemaining / 25) * 100)}%` }"
          ></div>
        </div>

        <div class="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1">
          <span class="text-emerald-400 font-bold">⚡ ×{{ store.labViralMultiplier.toFixed(1) }} Küresel Dopamin Çarpanı</span>
          <span class="text-amber-400 font-bold">✨ 3× Gece Krizleri Yağmuru</span>
        </div>
      </div>

      <div v-else class="space-y-2.5">
        <!-- Hype İlerleme Çubuğu -->
        <div class="space-y-1">
          <div class="flex items-center justify-between text-xs font-mono">
            <span class="text-slate-300 flex items-center gap-1">
              <span>Viral Hype Potansiyeli:</span>
              <b :class="isHypeFull ? 'text-emerald-400 font-bold' : 'text-slate-200'">{{ Math.floor(store.labHype) }}%</b>
            </span>
            <span v-if="isHypeFull" class="text-emerald-400 font-bold animate-pulse">
              REAKTÖR HAZIR! AKIŞA FIRLAT!
            </span>
            <span v-else-if="store.labMode === 'evergreen'" class="text-amber-400">
              (Evergreen modunda pasife odaklanıldı)
            </span>
            <span v-else class="text-slate-500 text-[11px]">
              Yukarı kaydırarak (+0.4%) hızlandır
            </span>
          </div>

          <div class="progress-track progress-track-lg relative overflow-hidden">
            <div
              class="h-full transition-all duration-200"
              :class="isHypeFull ? 'bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 animate-pulse' : 'bg-emerald-500'"
              :style="{ width: `${store.labHype}%` }"
            ></div>
          </div>
        </div>

        <!-- Akışa Fırlat Butonu -->
        <button
          @click="store.triggerViralDrop"
          :disabled="!isHypeFull"
          class="w-full py-2.5 px-4 rounded-xl font-mono text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
          :class="[
            isHypeFull
              ? 'bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 text-black hover:opacity-95 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:scale-[1.01]'
              : 'bg-white/5 border border-white/10 text-slate-500 cursor-not-allowed opacity-60'
          ]"
        >
          <Rocket class="w-4 h-4" :class="isHypeFull ? 'animate-bounce' : ''" />
          <span v-if="isHypeFull">
            🚀 AKIŞA FIRLAT! (Viral Zirve Dalgası Başlat — ×{{ store.labViralMultiplier.toFixed(1) }} Çarpan)
          </span>
          <span v-else>
            Reaktör Şarj Oluyor (%{{ Math.floor(store.labHype) }} / %100)
          </span>
        </button>
      </div>
    </div>

    <!-- 3x3 Akış Matrisi & Sinerji Rehberi -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-3">
      <!-- Matris Izgarası (2 Kolon) -->
      <div class="lg:col-span-2 glass-panel-card p-4 rounded-xl">
        <div class="flex items-center justify-between mb-3 flex-wrap gap-1">
          <span class="section-label">Akış Matrisi (3×3 Sinerji Devresi)</span>
          <span class="section-hint">ÇÜRÜME YOK! Modüller kalıcı çalışır</span>
        </div>

        <div class="grid grid-cols-3 gap-2.5 sm:gap-3.5 max-w-lg mx-auto aspect-square">
          <div
            v-for="cell in store.labCells"
            :key="cell.id"
            class="relative rounded-xl border flex flex-col items-center justify-between p-2.5 transition-all select-none overflow-hidden"
            :class="[
              cell.id === 4 ? 'ring-1 ring-amber-500/40' : '',
              cell.seedType === null
                ? 'bg-black/40 border-white/[0.06] hover:border-emerald-500/50 hover:bg-black/60 cursor-pointer group'
                : cell.isMature
                  ? 'bg-emerald-950/20 border-emerald-500/60 cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.1)]'
                  : 'bg-black/60 border-white/[0.08]'
            ]"
            @click="handleCellClick(cell.id)"
          >
            <!-- Merkez Hücre (Nöral Çekirdek) Rozeti -->
            <div
              v-if="cell.id === 4"
              class="absolute top-1 left-1 z-10 text-[8px] font-mono font-bold px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30"
              v-tip="'Nöral Çekirdek (Merkez): Kendi çarpanı ×1.5 katlanır ve 4 komşusuna +%20 destek yayar!'"
            >
              Hub
            </div>

            <!-- Boş Hücre Durumu -->
            <template v-if="cell.seedType === null">
              <div class="h-full w-full flex flex-col items-center justify-center text-slate-600 group-hover:text-emerald-400 transition-colors gap-1.5">
                <span class="text-3xl opacity-30 group-hover:opacity-100 group-hover:scale-110 transition-transform">
                  {{ selectedSeed.icon }}
                </span>
                <span class="text-[10px] font-mono font-bold group-hover:text-emerald-300">
                  + Yerleştir
                </span>
                <span class="text-[9px] font-mono text-slate-600 line-clamp-1">
                  {{ selectedSeed.name }}
                </span>
              </div>
            </template>

            <!-- Yerleştirilmiş Format Hücresi -->
            <template v-else>
              <!-- Sök / Temizle Butonu -->
              <div class="absolute top-1.5 right-1.5 z-10">
                <button
                  @click.stop="store.clearCell(cell.id)"
                  class="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-all cursor-pointer"
                  v-tip="'Modülü yuvadan çıkar'"
                >
                  <Scissors class="w-3 h-3" />
                </button>
              </div>

              <!-- Format İkonu -->
              <div class="text-3xl mt-1.5 transform transition-transform" :class="cell.isMature ? 'scale-110' : ''">
                {{ getCellSeedDef(cell.seedType)?.icon }}
              </div>

              <!-- İsim & Durum -->
              <div class="text-[11px] font-mono font-bold text-slate-200 text-center line-clamp-1 w-full px-1">
                {{ getCellSeedDef(cell.seedType)?.name }}
              </div>

              <!-- Durum ve İlerleme / Rezonans -->
              <div class="w-full mt-1.5">
                <div v-if="!cell.isMature" class="space-y-1">
                  <div class="progress-track progress-track-sm">
                    <div
                      class="progress-fill progress-fill-emerald"
                      :style="{ width: `${getProgressPercent(cell)}%` }"
                    ></div>
                  </div>
                  <div class="flex justify-between text-[8px] font-mono text-slate-400 tabular-nums">
                    <span>Isınıyor</span>
                    <span>{{ Math.floor(cell.age) }}s / {{ cell.matureAge }}s</span>
                  </div>
                </div>

                <div v-else class="text-center">
                  <span class="inline-block px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-emerald-500/25 text-emerald-300 border border-emerald-500/40">
                    ✨ REZONANSTA
                  </span>
                  <div class="text-[8px] font-mono text-emerald-400/80 mt-0.5">
                    Tıkla: +Verim & Hype
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>

      <!-- Bilgi & Sinerji İpuçları (1 Kolon) -->
      <div class="glass-panel-card p-4 rounded-xl flex flex-col justify-between">
        <div>
          <div class="flex items-center gap-2 mb-3">
            <Info class="w-4 h-4 text-emerald-400" />
            <h3 class="section-label">Matris Sinerji Kuralları</h3>
          </div>

          <div class="space-y-2.5 text-xs text-slate-400 leading-relaxed">
            <div class="p-2.5 rounded-xl bg-black/40 border border-white/[0.06]">
              <div class="font-bold text-slate-200 font-mono flex items-center gap-1.5 mb-1 text-[11px]">
                <Zap class="w-3.5 h-3.5 text-amber-400" />
                <span>Nöral Çekirdek (Merkez Hücre 4)</span>
              </div>
              <p class="text-[10px] text-slate-400">
                Merkezdeki modül kendi çarpanını <b>1.5×</b> yapar ve çevresindeki 4 komşusuna <b>+%20</b> verim yayar. En güçlü formatını merkeze yerleştir!
              </p>
            </div>

            <div class="p-2.5 rounded-xl bg-black/40 border border-white/[0.06]">
              <div class="font-bold text-slate-200 font-mono flex items-center gap-1.5 mb-1 text-[11px]">
                <span>🐱 + 🗿 = Bas & Miyav Rezonansı</span>
              </div>
              <p class="text-[10px] text-slate-400">
                Kedi çevresine <b>+%15 rezonans</b>, Phonk ise komşularına <b>Bas Şoku (×1.25)</b> verir. Yan yana geldiklerinde <b>Saf Nöron Çürütücü</b> sentezlenir!
              </p>
            </div>

            <div class="p-2.5 rounded-xl bg-black/40 border border-white/[0.06]">
              <div class="font-bold text-slate-200 font-mono flex items-center gap-1.5 mb-1 text-[11px]">
                <span>🍔 Cheeseburger Kedi Sinerjisi</span>
              </div>
              <p class="text-[10px] text-slate-400">
                Kedi ve Kaşar bir araya geldiğinde açılan Cheeseburger Kedi, tatlılığıyla <b>Vicdan Azaplarının emiş oranını %25 düşürür!</b>
              </p>
            </div>
          </div>
        </div>

        <div class="mt-4 pt-3 border-t border-white/[0.06] text-[11px] font-mono text-slate-400 flex items-center justify-between tabular-nums">
          <span>Toplam Hasatlar & Drop:</span>
          <span class="text-emerald-400 font-bold">{{ store.stats.labHarvests || 0 }}</span>
        </div>
        <div class="mt-2 text-[10px] font-mono text-slate-500">
          Aktif hasat bütçesi, olgun hücreler arasında paylaşılır.
        </div>
      </div>
    </div>

    <!-- Format Seçici Paleti -->
    <div class="glass-panel-card p-4 rounded-xl">
      <div class="flex items-center justify-between mb-3 flex-wrap gap-1">
        <span class="section-label">
          <span>Yerleştirilecek Format Seçimi</span>
        </span>
        <span class="section-hint">Seçtikten sonra matristeki bir hücreye tıkla</span>
      </div>

      <div class="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-4 gap-2.5">
        <template v-for="seed in LAB_SEEDS" :key="seed.type">
          <!-- Kilitli Temel Tohum -->
          <LockedFeature
            v-if="isSeedLocked(seed.type)"
            :feature-id="seedUnlockFeatureId(seed.type)"
          />

          <!-- Henüz Keşfedilmemiş Hibrit Format -->
          <div
            v-else-if="seed.isMutationOnly && !isSeedDiscovered(seed.type)"
            class="p-3 rounded-xl border border-dashed border-white/10 bg-black/30 flex flex-col justify-between opacity-60"
            v-tip="'Henüz keşfedilmedi! Komşu ebeveyn formatları yan yana yerleştirerek bu gizli formülü sentezle.'"
          >
            <div>
              <div class="flex items-center justify-between mb-1">
                <span class="text-xl">❓</span>
                <span class="text-[9px] font-mono bg-white/10 text-slate-400 px-1.5 py-0.5 rounded">
                  Gizli Formül
                </span>
              </div>
              <div class="text-xs font-bold font-mono text-slate-400">???</div>
              <div class="text-[10px] text-slate-500 mt-1">Keşif için komşuları eşleştir</div>
            </div>
            <div class="mt-2 text-[9px] font-mono text-amber-400/70">
              Kodeksten ipucuna bak
            </div>
          </div>

          <!-- Seçilebilir Açık Format -->
          <button
            v-else
            @click="selectedSeedType = seed.type"
            class="btn-tactile p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between cursor-pointer"
            :class="[
              selectedSeedType === seed.type
                ? 'bg-emerald-500/15 border-emerald-500/50 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
                : 'bg-black/40 border-white/[0.06] hover:border-white/[0.14]'
            ]"
          >
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <span class="text-xl">{{ seed.icon }}</span>
                <span
                  v-if="seed.isMutationOnly"
                  class="text-[9px] font-mono bg-cyan-500/20 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-500/30"
                >
                  Sentezlendi
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
        </template>
      </div>
    </div>

    <!-- Viral Kodeks Modal / Çekmece -->
    <div
      v-if="showCodexModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      @click.self="showCodexModal = false"
    >
      <div class="glass-panel-card max-w-2xl w-full p-5 rounded-2xl border border-amber-500/40 shadow-[0_0_30px_rgba(245,158,11,0.2)] space-y-4 max-h-[85vh] overflow-y-auto">
        <div class="flex items-center justify-between border-b border-white/10 pb-3">
          <div class="flex items-center gap-2">
            <BookOpen class="w-5 h-5 text-amber-400" />
            <div>
              <h2 class="text-base font-bold font-mono text-slate-100">
                Viral Kodeks & Sentez Ansiklopedisi
              </h2>
              <div class="text-xs text-amber-300 font-mono">
                Keşfedilen: {{ store.labCodexDiscoveredCount }}/{{ LAB_RECIPES.length }} Formül (+{{ store.labCodexBonusPercent }}% Kalıcı Global Dopamin)
              </div>
            </div>
          </div>
          <button
            @click="showCodexModal = false"
            class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X class="w-5 h-5" />
          </button>
        </div>

        <!-- Açıklama -->
        <p class="text-xs text-slate-300 leading-relaxed">
          Akış matrisinde doğru iki ebeveyn formatı yan yana komşu yerleştirdiğinde, aralarında bir rezonans başlar. Sentezlenen her yeni formül kalıcı olarak tüm oyununa <b>+%3 Global Dopamin</b> kazandırır ve seçim paletinde sınırsız ekilebilir hale gelir!
        </p>

        <!-- Sentez Tarifleri Listesi -->
        <div class="space-y-2.5">
          <div
            v-for="recipe in LAB_RECIPES"
            :key="recipe.result"
            class="p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
            :class="[
              isSeedDiscovered(recipe.result)
                ? 'bg-emerald-950/20 border-emerald-500/40'
                : 'bg-black/50 border-white/[0.08]'
            ]"
          >
            <div class="flex items-center gap-3">
              <span class="text-3xl p-1.5 rounded-lg bg-black/40 border border-white/10">
                {{ isSeedDiscovered(recipe.result) ? recipe.icon : '❓' }}
              </span>
              <div>
                <div class="flex items-center gap-2">
                  <span class="text-xs font-bold font-mono" :class="isSeedDiscovered(recipe.result) ? 'text-emerald-300' : 'text-slate-300'">
                    {{ isSeedDiscovered(recipe.result) ? recipe.name : 'Gizli Formül' }}
                  </span>
                  <span
                    v-if="isSeedDiscovered(recipe.result)"
                    class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1"
                  >
                    <CheckCircle2 class="w-3 h-3" />
                    <span>Keşfedildi (+%3)</span>
                  </span>
                  <span
                    v-else
                    class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1"
                  >
                    <HelpCircle class="w-3 h-3" />
                    <span>Kilitli</span>
                  </span>
                </div>
                <div class="text-[11px] text-slate-400 mt-0.5">
                  {{ isSeedDiscovered(recipe.result) ? recipe.desc : recipe.hint }}
                </div>
              </div>
            </div>

            <!-- Ebeveyn İpuçları -->
            <div class="flex items-center gap-1.5 text-xs font-mono bg-black/40 px-2.5 py-1.5 rounded-lg border border-white/10 text-slate-300 shrink-0">
              <span>{{ getCellSeedDef(recipe.parent1)?.icon }} {{ getCellSeedDef(recipe.parent1)?.name }}</span>
              <span class="text-amber-400">+</span>
              <span>{{ getCellSeedDef(recipe.parent2)?.icon }} {{ getCellSeedDef(recipe.parent2)?.name }}</span>
            </div>
          </div>
        </div>

        <div class="pt-2 text-right">
          <button
            @click="showCodexModal = false"
            class="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-slate-200 font-mono text-xs font-bold transition-all cursor-pointer"
          >
            Kapat
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
