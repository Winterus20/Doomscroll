<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGameStore, LAB_SEEDS, LAB_RECIPES } from '../stores/game'
import { formatNumber } from '../core/format'
import type { LabSeedType } from '../models/types'
import {
  Atom,
  Sparkles,
  Scissors,
  Info,
  Zap,
  Rocket,
  BookOpen,
  Flame,
  Activity,
  Orbit,
  Radio,
  CheckCircle2,
  HelpCircle,
  X,
  Layers,
  Crown
} from 'lucide-vue-next'
import TabHero from './TabHero.vue'
import LockedFeature from './LockedFeature.vue'

const store = useGameStore()
const selectedSeedType = ref<LabSeedType>('photon_resonator')
const showCodexModal = ref(false)

// Parçacık kademesi (Özellik Merdiveni): Foton başlangıçta, Nükleon/Gluon/Graviton sırayla açılır
const SEED_UNLOCK_FEATURES: Partial<Record<LabSeedType, string>> = {
  heavy_nucleon: 'seed_nucleon',
  gluon_binder: 'seed_gluon',
  graviton_trap: 'seed_graviton'
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
    // Olgun hücreye tıklandığında anlık kütle & Plazma şarjı toplar, hücre silinmez tekrar ısınır!
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

function isRowResonant(rowIndex: number): boolean {
  const rowCells = [store.labCells[rowIndex * 3], store.labCells[rowIndex * 3 + 1], store.labCells[rowIndex * 3 + 2]]
  return rowCells.every((c) => c && c.isMature && c.seedType !== null)
}

function isColResonant(colIndex: number): boolean {
  const colCells = [store.labCells[colIndex], store.labCells[colIndex + 3], store.labCells[colIndex + 6]]
  return colCells.every((c) => c && c.isMature && c.seedType !== null)
}

function handleCollapseReactor() {
  if (!store.canCollapseReactor) return
  if (typeof window !== 'undefined' && !window.confirm('Kozmik Relik Kurbanı: Tüm reaktör matrisi ve sentezlenen formüller tekilliğe feda edilecek, kalıcı Kozmik Relik Seviyesi kazanacaksınız. Onaylıyor musunuz?')) {
    return
  }
  store.collapseReactor()
}
</script>

<template>
  <div class="space-y-3.5">
    <!-- Birleşik Hero -->
    <TabHero
      :icon="Atom"
      icon-class="text-cyan-400"
      title="Kuantum Parçacık Reaktörü & Akı Matrisi"
      badge="Kuantum Reaktörü"
      badge-class="ds-badge-cyan"
      subtitle="Atomaltı kuantum parçacıklarını rezonans matrisine yerleştir, süperiletken akı hatlarıyla egzotik izotopları sentezle ve Reaktörü tekilliğe kurban et!"
      accent="cyan"
    >
      <template #stats>
        <div class="stat-box flex-wrap gap-y-2">
          <div>
            <div class="stat-box-label">Pasif Akı</div>
            <div class="stat-box-value text-emerald-400 flex items-center gap-1.5">
              <Sparkles class="w-3.5 h-3.5 text-emerald-400" />
              <span>×{{ formatNumber(store.labPassiveMultiplier, store.settings.notation) }}</span>
            </div>
          </div>
          <div class="h-6 w-[1px] bg-white/[0.08] hidden sm:block"></div>
          <div>
            <div class="stat-box-label">Manuel Yutma</div>
            <div class="stat-box-value text-cyan-400">
              ×{{ formatNumber(store.labClickMultiplier, store.settings.notation) }}
            </div>
          </div>
          <div class="h-6 w-[1px] bg-white/[0.08] hidden sm:block"></div>
          <div>
            <div class="stat-box-label">Parçacık Atlası</div>
            <div class="stat-box-value text-amber-400">
              +{{ store.labCodexBonusPercent }}% Kalıcı
            </div>
          </div>
          <div class="h-6 w-[1px] bg-white/[0.08] hidden sm:block"></div>
          <div>
            <div class="stat-box-label">Kozmik Relik</div>
            <div class="stat-box-value text-purple-400 flex items-center gap-1">
              <Crown class="w-3.5 h-3.5 text-purple-400" />
              <span>Lv. {{ store.reactorCollapseCount || 0 }}</span>
            </div>
          </div>
        </div>
      </template>
    </TabHero>

    <!-- Plazma Besleme Rejimleri (Modlar) -->
    <div class="glass-panel-card p-3 sm:p-4 rounded-xl">
      <div class="flex items-center justify-between mb-2.5 flex-wrap gap-1">
        <span class="section-label flex items-center gap-1.5">
          <Layers class="w-4 h-4 text-cyan-400" />
          <span>Plazma Besleme Rejimi (Reaktör Akı Modu)</span>
        </span>
        <span class="section-hint">İstediğin an serbestçe değiştir</span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-3 gap-2.5">
        <!-- 1. Hiper-Yükleme (Overdrive) -->
        <button
          @click="store.setLabMode('overdrive')"
          class="p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between"
          :class="[
            store.labMode === 'overdrive'
              ? 'bg-rose-500/15 border-rose-500/50 shadow-[0_0_15px_rgba(244,63,94,0.15)]'
              : 'bg-black/40 border-white/[0.06] hover:border-white/[0.15]'
          ]"
        >
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-sm font-bold font-mono text-rose-300 flex items-center gap-1.5">
                <Flame class="w-4 h-4 text-rose-400" />
                <span>Hiper-Yükleme (Overdrive)</span>
              </span>
              <span class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                Aktif Oyun
              </span>
            </div>
            <p class="text-[11px] text-slate-300 leading-snug">
              Plazma şarjı <b class="text-rose-300">%80 daha hızlı</b> dolar. Süperkritik boşalımda anında <b class="text-rose-300">2× Kütle</b> fışkırır!
            </p>
          </div>
          <div class="mt-2 text-[10px] font-mono text-slate-400 flex items-center gap-1">
            <span :class="store.labMode === 'overdrive' ? 'text-rose-400 font-bold' : ''">
              {{ store.labMode === 'overdrive' ? '● Aktif Rejim' : '○ Seçmek için tıkla' }}
            </span>
          </div>
        </button>

        <!-- 2. Süperiletken Durgunluk (Superconductor) -->
        <button
          @click="store.setLabMode('superconductor')"
          class="p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between"
          :class="[
            store.labMode === 'superconductor'
              ? 'bg-amber-500/15 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)]'
              : 'bg-black/40 border-white/[0.06] hover:border-white/[0.15]'
          ]"
        >
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-sm font-bold font-mono text-amber-300 flex items-center gap-1.5">
                <Activity class="w-4 h-4 text-amber-400" />
                <span>Süperiletken (Superconductor)</span>
              </span>
              <span class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                AFK & Durgunluk
              </span>
            </div>
            <p class="text-[11px] text-slate-300 leading-snug">
              Plazma şarjı dondurulur. Matrisin ürettiği kalıcı pasif kütle çarpanı <b class="text-amber-300">2.5×</b> katına çıkar.
            </p>
          </div>
          <div class="mt-2 text-[10px] font-mono text-slate-400 flex items-center gap-1">
            <span :class="store.labMode === 'superconductor' ? 'text-amber-400 font-bold' : ''">
              {{ store.labMode === 'superconductor' ? '● Aktif Rejim' : '○ Seçmek için tıkla' }}
            </span>
          </div>
        </button>

        <!-- 3. Kuantum Dalgalanması (Fluctuation) -->
        <button
          @click="store.setLabMode('fluctuation')"
          class="p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between"
          :class="[
            store.labMode === 'fluctuation'
              ? 'bg-cyan-500/15 border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.15)]'
              : 'bg-black/40 border-white/[0.06] hover:border-white/[0.15]'
          ]"
        >
          <div>
            <div class="flex items-center justify-between mb-1.5">
              <span class="text-sm font-bold font-mono text-cyan-300 flex items-center gap-1.5">
                <Orbit class="w-4 h-4 text-cyan-400" />
                <span>Dalgalanma (Fluctuation)</span>
              </span>
              <span class="text-[9px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Formül Kaşifi
              </span>
            </div>
            <p class="text-[11px] text-slate-300 leading-snug">
              Şarj normal hızda dolar. Komşu parçacıkların yeni egzotik formülleri sentezleme olasılığı <b class="text-cyan-300">3 katına</b> çıkar.
            </p>
          </div>
          <div class="mt-2 text-[10px] font-mono text-slate-400 flex items-center gap-1">
            <span :class="store.labMode === 'fluctuation' ? 'text-cyan-400 font-bold' : ''">
              {{ store.labMode === 'fluctuation' ? '● Aktif Rejim' : '○ Seçmek için tıkla' }}
            </span>
          </div>
        </button>
      </div>
    </div>

    <!-- Reaktör & Süperkritik Boşalım (Supercritical Venting) Paneli -->
    <div
      class="glass-panel-card p-4 rounded-xl border transition-all"
      :class="[
        store.isViralActive
          ? 'border-rose-500/60 bg-gradient-to-r from-rose-950/20 via-black/60 to-purple-950/20 shadow-[0_0_25px_rgba(244,63,94,0.25)] animate-pulse'
          : isHypeFull
            ? 'border-cyan-500/50 bg-cyan-950/10 shadow-[0_0_20px_rgba(6,182,212,0.15)]'
            : 'border-white/[0.06]'
      ]"
    >
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div class="flex items-center gap-2">
          <Rocket
            class="w-5 h-5"
            :class="store.isViralActive ? 'text-rose-400 animate-bounce' : isHypeFull ? 'text-cyan-400 animate-pulse' : 'text-slate-400'"
          />
          <div>
            <div class="text-sm font-bold font-mono tracking-wide text-slate-200">
              Kuantum Reaktörü & Süperkritik Boşalım
            </div>
            <div class="text-[11px] text-slate-400">
              {{
                store.isViralActive
                  ? '💥 Canlı Süperkritik Plazma Boşalımı Yayında!'
                  : store.labMode === 'superconductor'
                    ? 'Süperiletken Rejim: Plazma şarjı donduruldu, 2.5× sabit pasif kütle devrede.'
                    : 'Kuantum akısı ve matris titreştikçe plazma barı dolar.'
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
            <span>Parçacık Atlası ({{ store.labCodexDiscoveredCount }}/{{ LAB_RECIPES.length }})</span>
          </button>
        </div>
      </div>

      <!-- Canlı Süperkritik Boşalım Durumu -->
      <div v-if="store.isViralActive" class="p-3 rounded-xl bg-black/60 border border-rose-500/40 mb-3 space-y-2">
        <div class="flex items-center justify-between flex-wrap gap-2">
          <div class="flex items-center gap-2">
            <span class="inline-block w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
            <span class="text-xs font-mono font-bold text-rose-300">💥 SÜPERKRİTİK PLAZMA BOŞALIMI AKTİF!</span>
          </div>
          <div class="text-xs font-mono text-slate-300 flex items-center gap-3">
            <span class="flex items-center gap-1 text-cyan-300">
              <Radio class="w-3.5 h-3.5" />
              <span>Plazma Akısı Rezonansta</span>
            </span>
            <span class="text-rose-400 font-bold tabular-nums">
              {{ store.viralTimeRemaining.toFixed(1) }}s kaldı
            </span>
          </div>
        </div>

        <div class="progress-track progress-track-md">
          <div
            class="h-full bg-gradient-to-r from-rose-500 via-purple-500 to-cyan-400 transition-all duration-100"
            :style="{ width: `${Math.min(100, (store.viralTimeRemaining / 25) * 100)}%` }"
          ></div>
        </div>

        <div class="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-1">
          <span class="text-emerald-400 font-bold">⚡ ×{{ store.labViralMultiplier.toFixed(1) }} Canlı Plazma Çarpanı</span>
          <span class="text-amber-400 font-bold">✨ 3× Kozmik Kriz Yağmuru</span>
        </div>
      </div>

      <!-- Şarj Olma Durumu -->
      <div v-else class="space-y-2.5">
        <div class="space-y-1">
          <div class="flex items-center justify-between text-xs font-mono">
            <span class="text-slate-300 flex items-center gap-1">
              <span>Kritik Plazma Seviyesi:</span>
              <b :class="isHypeFull ? 'text-cyan-400 font-bold' : 'text-slate-200'">{{ Math.floor(store.labHype) }}%</b>
            </span>
            <span v-if="isHypeFull" class="text-cyan-400 font-bold animate-pulse">
              REAKTÖR KRİTİK SEVİYEDE! BOŞALIMA HAZIR!
            </span>
            <span v-else-if="store.labMode === 'superconductor'" class="text-amber-400">
              (Süperiletken modunda şarj durduruldu)
            </span>
            <span v-else class="text-slate-500 text-[11px]">
              Yutma yaparak (+0.4%) hızlandır
            </span>
          </div>

          <div class="progress-track progress-track-lg relative overflow-hidden">
            <div
              class="h-full transition-all duration-200"
              :class="isHypeFull ? 'bg-gradient-to-r from-cyan-500 via-purple-500 to-emerald-400 animate-pulse' : 'bg-cyan-500'"
              :style="{ width: `${store.labHype}%` }"
            ></div>
          </div>
        </div>

        <button
          @click="store.triggerSupercriticalVent()"
          :disabled="!isHypeFull"
          class="w-full py-2.5 px-4 rounded-xl font-mono text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
          :class="[
            isHypeFull
              ? 'bg-gradient-to-r from-cyan-500 via-teal-400 to-emerald-400 text-black hover:opacity-95 shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:scale-[1.01]'
              : 'bg-white/5 border border-white/10 text-slate-500 cursor-not-allowed opacity-60'
          ]"
        >
          <Rocket class="w-4 h-4" :class="isHypeFull ? 'animate-bounce' : ''" />
          <span v-if="isHypeFull">
            💥 SÜPERKRİTİK BOŞALIM BAŞLAT! (60s Kütle + ×{{ store.labViralMultiplier.toFixed(1) }} Canlı Plazma Çarpanı)
          </span>
          <span v-else>
            Plazma Şarj Oluyor (%{{ Math.floor(store.labHype) }} / %100)
          </span>
        </button>
      </div>
    </div>

    <!-- 3x3 Kuantum Akı Devresi (Flux Circuit) & Matris Izgarası -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-3">
      <!-- Matris Izgarası (2 Kolon) -->
      <div class="lg:col-span-2 glass-panel-card p-4 rounded-xl">
        <div class="flex items-center justify-between mb-3 flex-wrap gap-1">
          <span class="section-label flex items-center gap-1.5">
            <Radio class="w-4 h-4 text-cyan-400" />
            <span>Kuantum Akı Devresi (3×3 Süperiletken Matris)</span>
          </span>
          <span class="section-hint">ÇÜRÜME YOK! Parçacıklar kalıcı çalışır</span>
        </div>

        <!-- Süperiletken Hat Durum Bildirimi -->
        <div class="flex items-center justify-center gap-3 mb-2.5 text-[10px] font-mono text-slate-400">
          <span class="flex items-center gap-1">
            <span class="w-2 h-2 rounded-full bg-cyan-400 inline-block"></span>
            <span>Merkez Çekirdek: Hücre 4</span>
          </span>
          <span class="flex items-center gap-1">
            <span class="w-2 h-2 rounded-full bg-emerald-400 inline-block"></span>
            <span>Rezonans Akısı: Dolu Satır/Sütun ×1.12</span>
          </span>
        </div>

        <div class="grid grid-cols-3 gap-2.5 sm:gap-3.5 max-w-lg mx-auto aspect-square">
          <div
            v-for="cell in store.labCells"
            :key="cell.id"
            class="relative rounded-xl border flex flex-col items-center justify-between p-2.5 transition-all select-none overflow-hidden"
            :class="[
              cell.id === 4 ? 'ring-1 ring-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)]' : '',
              isRowResonant(Math.floor(cell.id / 3)) ? 'border-cyan-500/40' : '',
              isColResonant(cell.id % 3) ? 'border-cyan-500/40' : '',
              cell.seedType === null
                ? 'bg-black/40 border-white/[0.06] hover:border-cyan-500/50 hover:bg-black/60 cursor-pointer group'
                : cell.isMature
                  ? 'bg-cyan-950/20 border-cyan-500/60 cursor-pointer shadow-[0_0_15px_rgba(6,182,212,0.15)]'
                  : 'bg-black/60 border-white/[0.08]'
            ]"
            @click="handleCellClick(cell.id)"
          >
            <!-- Merkez Odak Çekirdeği Rozeti -->
            <div
              v-if="cell.id === 4"
              class="absolute top-1 left-1 z-10 text-[8px] font-mono font-bold px-1 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30"
              v-tip="'Kuantum Odak Çekirdeği (Merkez): Kendi çarpanı ×1.5 katlanır ve 4 komşusuna +%20 plazma yayar!'"
            >
              Odak Çekirdeği
            </div>

            <!-- Boş Hücre Durumu -->
            <template v-if="cell.seedType === null">
              <div class="h-full w-full flex flex-col items-center justify-center text-slate-600 group-hover:text-cyan-400 transition-colors gap-1.5">
                <span class="text-3xl opacity-30 group-hover:opacity-100 group-hover:scale-110 transition-transform">
                  {{ selectedSeed.icon }}
                </span>
                <span class="text-[10px] font-mono font-bold group-hover:text-cyan-300">
                  + Yerleştir
                </span>
                <span class="text-[9px] font-mono text-slate-600 line-clamp-1">
                  {{ selectedSeed.name }}
                </span>
              </div>
            </template>

            <!-- Yerleştirilmiş Parçacık Hücresi -->
            <template v-else>
              <!-- Sök / Temizle Butonu -->
              <div class="absolute top-1.5 right-1.5 z-10">
                <button
                  @click.stop="store.clearCell(cell.id)"
                  class="p-1 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded transition-all cursor-pointer"
                  v-tip="'Parçacığı yuvadan çıkar'"
                >
                  <Scissors class="w-3 h-3" />
                </button>
              </div>

              <!-- Parçacık İkonu -->
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
                      class="progress-fill progress-fill-cyan"
                      :style="{ width: `${getProgressPercent(cell)}%` }"
                    ></div>
                  </div>
                  <div class="flex justify-between text-[8px] font-mono text-slate-400 tabular-nums">
                    <span>Uyarılıyor</span>
                    <span>{{ Math.floor(cell.age) }}s / {{ cell.matureAge }}s</span>
                  </div>
                </div>

                <div v-else class="text-center">
                  <span class="inline-block px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-cyan-500/25 text-cyan-300 border border-cyan-500/40">
                    ✨ REZONANSTA
                  </span>
                  <div class="text-[8px] font-mono text-cyan-400/80 mt-0.5">
                    Tıkla: +Kütle & Şarj
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
            <Info class="w-4 h-4 text-cyan-400" />
            <h3 class="section-label">Akı Devresi Sinerji Kuralları</h3>
          </div>

          <div class="space-y-2.5 text-xs text-slate-400 leading-relaxed">
            <div class="p-2.5 rounded-xl bg-black/40 border border-white/[0.06]">
              <div class="font-bold text-slate-200 font-mono flex items-center gap-1.5 mb-1 text-[11px]">
                <Zap class="w-3.5 h-3.5 text-amber-400" />
                <span>Kuantum Odak Çekirdeği (Merkez Hücre 4)</span>
              </div>
              <p class="text-[10px] text-slate-400">
                Merkezdeki parçacık kendi katsayısını <b>1.5×</b> yapar ve çevresindeki 4 komşusuna <b>+%20</b> plazma yayar. En kritik parçacığı merkeze yerleştir!
              </p>
            </div>

            <div class="p-2.5 rounded-xl bg-black/40 border border-white/[0.06]">
              <div class="font-bold text-slate-200 font-mono flex items-center gap-1.5 mb-1 text-[11px]">
                <span>⚡ + 🕳️ = Foton & Graviton Sentezi</span>
              </div>
              <p class="text-[10px] text-slate-400">
                Foton komşularına <b>+%15 rezonans</b>, Graviton ise <b>Gravitasyonel Şok (×1.25)</b> yayar. Yan yana geldiklerinde <b>Higgs Bozonu (×3 Evrensel Kütle)</b> sentezlenir!
              </p>
            </div>

            <div class="p-2.5 rounded-xl bg-black/40 border border-white/[0.06]">
              <div class="font-bold text-slate-200 font-mono flex items-center gap-1.5 mb-1 text-[11px]">
                <span>🛡️ Manyetik Plazma Kalkanı</span>
              </div>
              <p class="text-[10px] text-slate-400">
                Foton ve Nükleon senteziyle açılan Manyetik Kalkan, <b>Kozmik Parazitlerin kütle emişini %25 soğurur!</b>
              </p>
            </div>
          </div>
        </div>

        <div class="mt-4 pt-3 border-t border-white/[0.06] text-[11px] font-mono text-slate-400 flex items-center justify-between tabular-nums">
          <span>Toplam Kuantum Hasatları:</span>
          <span class="text-cyan-400 font-bold">{{ store.stats.labHarvests || 0 }}</span>
        </div>
      </div>
    </div>

    <!-- Meta-İlerleme: Reaktör Çöküşü & Kozmik Relikler (Cosmic Relics) -->
    <div class="glass-panel-card p-4 rounded-xl border border-purple-500/30 bg-purple-950/10 shadow-[0_0_20px_rgba(168,85,247,0.1)]">
      <div class="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div class="flex items-center gap-2">
          <Crown class="w-5 h-5 text-purple-400" />
          <div>
            <div class="text-sm font-bold font-mono text-purple-200">
              Kozmik Relikler & Reaktör Çöküşü (Meta-İlerleme)
            </div>
            <div class="text-[11px] text-slate-400">
              Tüm 4 egzotik formül sentezlendiğinde reaktörü tekilliğe kurban edip kalıcı relik seviyeleri kazanın.
            </div>
          </div>
        </div>
        <div class="text-xs font-mono px-2.5 py-1 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
          Relik Seviyesi: Lv. {{ store.reactorCollapseCount || 0 }}
        </div>
      </div>

      <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5 mb-3 text-xs font-mono">
        <div class="p-2.5 rounded-lg border border-white/[0.06] bg-black/40">
          <div class="text-slate-400 text-[10px]">Seviye 1: Çekim Hızı (Hz)</div>
          <div class="text-emerald-300 font-bold mt-1">-%{{ (store.reactorRelicBonuses.tickspeedBase * 100).toFixed(0) }} Taban</div>
          <div class="text-[9px] text-slate-500">Kalıcı frekans indirimi</div>
        </div>
        <div class="p-2.5 rounded-lg border border-white/[0.06] bg-black/40">
          <div class="text-slate-400 text-[10px]">Seviye 2: Kriz Süreleri</div>
          <div class="text-amber-300 font-bold mt-1">+{{ store.reactorRelicBonuses.crisisDuration }}s İlave</div>
          <div class="text-[9px] text-slate-500">Tüm buff sürelerine ek</div>
        </div>
        <div class="p-2.5 rounded-lg border border-white/[0.06] bg-black/40">
          <div class="text-slate-400 text-[10px]">Seviye 3: Tekillik SP</div>
          <div class="text-cyan-300 font-bold mt-1">×{{ store.reactorRelicBonuses.spGainMult.toFixed(1) }} SP</div>
          <div class="text-[9px] text-slate-500">Post-break SP çarpanı</div>
        </div>
        <div class="p-2.5 rounded-lg border border-white/[0.06] bg-black/40">
          <div class="text-slate-400 text-[10px]">Seviye 4: Hücre Başı İvme</div>
          <div class="text-rose-300 font-bold mt-1">+%{{ (store.reactorRelicBonuses.dimensionalBoostPerCell * 100).toFixed(0) }} / hücre</div>
          <div class="text-[9px] text-slate-500">Boyutlara evrensel ivme</div>
        </div>
        <div class="p-2.5 rounded-lg border border-white/[0.06] bg-black/40">
          <div class="text-slate-400 text-[10px]">Seviye 5+: Evrensel Kütle</div>
          <div class="text-purple-300 font-bold mt-1">×{{ formatNumber(store.reactorRelicBonuses.universalMassMult, store.settings.notation) }}</div>
          <div class="text-[9px] text-slate-500">Sınırsız ölçeklenen relik</div>
        </div>
      </div>

      <!-- Reaktörü Kurban Et Butonu -->
      <button
        @click="handleCollapseReactor"
        :disabled="!store.canCollapseReactor"
        class="w-full py-2.5 px-4 rounded-xl font-mono text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
        :class="[
          store.canCollapseReactor
            ? 'bg-gradient-to-r from-purple-600 via-fuchsia-600 to-cyan-500 text-white hover:opacity-95 shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:scale-[1.01]'
            : 'bg-white/5 border border-white/10 text-slate-500 cursor-not-allowed opacity-60'
        ]"
      >
        <Crown class="w-4 h-4" />
        <span v-if="store.canCollapseReactor">
          👑 REAKTÖRÜ TEKİLLİĞE KURBAN ET! (Kozmik Relik Lv. {{ (store.reactorCollapseCount || 0) + 1 }} Kazan)
        </span>
        <span v-else>
          Reaktör Çöküşü Kilitli (4 Egzotik Formülün Tamamı Sentezlenmeli: {{ store.labCodexDiscoveredCount }}/4)
        </span>
      </button>
    </div>

    <!-- Parçacık Seçim Paleti -->
    <div class="glass-panel-card p-4 rounded-xl">
      <div class="flex items-center justify-between mb-3 flex-wrap gap-1">
        <span class="section-label">
          <span>Yerleştirilecek Parçacık Formatı</span>
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

          <!-- Henüz Keşfedilmemiş Egzotik Formül -->
          <div
            v-else-if="seed.isMutationOnly && !isSeedDiscovered(seed.type)"
            class="p-3 rounded-xl border border-dashed border-white/10 bg-black/30 flex flex-col justify-between opacity-60"
            v-tip="'Henüz keşfedilmedi! Komşu ebeveyn parçacıkları yan yana yerleştirerek bu gizli formülü sentezle.'"
          >
            <div>
              <div class="flex items-center justify-between mb-1">
                <span class="text-xl">❓</span>
                <span class="text-[9px] font-mono bg-white/10 text-slate-400 px-1.5 py-0.5 rounded">
                  Egzotik Sentez
                </span>
              </div>
              <div class="text-xs font-bold font-mono text-slate-400">???</div>
              <div class="text-[10px] text-slate-500 mt-1">Keşif için komşuları eşleştir</div>
            </div>
            <div class="mt-2 text-[9px] font-mono text-amber-400/70">
              Atlas'tan ipucuna bak
            </div>
          </div>

          <!-- Seçilebilir Açık Parçacık -->
          <button
            v-else
            @click="selectedSeedType = seed.type"
            class="btn-tactile p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between cursor-pointer"
            :class="[
              selectedSeedType === seed.type
                ? 'bg-cyan-500/15 border-cyan-500/50 shadow-[0_0_12px_rgba(6,182,212,0.15)]'
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
                  :class="canAffordSeed(seed.type) ? 'text-cyan-300' : 'text-slate-500'"
                >
                  {{ formatNumber(seed.cost, store.settings.notation) }}
                </span>
              </div>
              <div class="text-xs font-bold font-mono text-slate-200 line-clamp-1">{{ seed.name }}</div>
              <div class="text-[10px] text-slate-400 mt-1 line-clamp-2 leading-tight">{{ seed.desc }}</div>
            </div>

            <div class="mt-2.5 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono">
              <span class="text-cyan-400">{{ seed.matureBoostDesc }}</span>
              <span class="text-slate-500 tabular-nums">{{ seed.growthSeconds }}s</span>
            </div>
          </button>
        </template>
      </div>
    </div>

    <!-- Parçacık Atlası & Sentez Kodeksi Modal -->
    <Teleport to="body">
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
                  Kuantum Parçacık Atlası & Sentez Kodeksi
                </h2>
                <div class="text-xs text-amber-300 font-mono">
                  Keşfedilen: {{ store.labCodexDiscoveredCount }}/{{ LAB_RECIPES.length }} Formül (+{{ store.labCodexBonusPercent }}% Kalıcı Global Kütle)
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
            Akı matrisinde doğru iki ebeveyn parçacığı yan yana komşu yerleştirdiğinde, aralarında kuantum rezonansı başlar. Sentezlenen her egzotik parçacık kalıcı olarak tüm oyununa <b>+%3 Global Kütle</b> kazandırır ve seçim paletinde sınırsız ekilebilir hale gelir!
          </p>

          <!-- Sentez Tarifleri Listesi -->
          <div class="space-y-2.5">
            <div
              v-for="recipe in LAB_RECIPES"
              :key="recipe.result"
              class="p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              :class="[
                isSeedDiscovered(recipe.result)
                  ? 'bg-cyan-950/20 border-cyan-500/40'
                  : 'bg-black/50 border-white/[0.08]'
              ]"
            >
              <div class="flex items-center gap-3">
                <span class="text-3xl p-1.5 rounded-lg bg-black/40 border border-white/10">
                  {{ isSeedDiscovered(recipe.result) ? recipe.icon : '❓' }}
                </span>
                <div>
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-bold font-mono" :class="isSeedDiscovered(recipe.result) ? 'text-cyan-300' : 'text-slate-300'">
                      {{ isSeedDiscovered(recipe.result) ? recipe.name : 'Gizli Egzotik İzotop' }}
                    </span>
                    <span
                      v-if="isSeedDiscovered(recipe.result)"
                      class="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1"
                    >
                      <CheckCircle2 class="w-3 h-3" />
                      <span>Sentezlendi (+%3)</span>
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
    </Teleport>
  </div>
</template>
