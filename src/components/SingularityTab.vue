<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '../stores/game'
import { formatNumber } from '../core/format'
import { D_INFINITY } from '../core/math'
import { NIGHT_WATCH_THRESHOLD } from '../stores/game'
import { Sunrise, Sparkles, Sun, Moon } from 'lucide-vue-next'
import TabHero from './TabHero.vue'
import NeuralTreeTab from './NeuralTreeTab.vue'
import ConfirmModal from './ConfirmModal.vue'
import { ref } from 'vue'

const store = useGameStore()

// Break Singularity alındıysa hero rozeti "Sınır Yıkıldı" durumuna geçer
const singularityBroken = computed(() => (store.singularityUpgrades?.break_singularity || 0) >= 1)

// Faz 2 kilometre taşı: Kolektif Gece Nöbeti (1e4000 Dopamin — GDD "İkinci Çöküş")
const nightWatchUnlocked = computed(() => store.nightWatchUnlocked)
const nightWatchProgress = computed(() => {
  if (store.matter.lt(1)) return 0
  if (store.matter.gte(NIGHT_WATCH_THRESHOLD)) return 100
  const logVal = Math.max(0, store.matter.log10().toNumber())
  return Math.min(100, Math.floor((logVal / 4000) * 100))
})

const progressToSingularity = computed(() => {
  if (store.matter.lt(1)) return 0
  if (store.matter.gte(D_INFINITY)) return 100
  const logVal = Math.max(0, store.matter.log10().toNumber())
  return Math.min(100, Math.floor((logVal / 308.25) * 100))
})

function handleSingularityReset() {
  // Meydan okuma aktifken buton "Tamamla" moduna geçer: SP yerine challenge ödülü verir
  if (store.activeChallenge) {
    if (!store.canSingularity) return
    if (!store.settings.confirmDialogs) {
      store.completeChallenge()
      return
    }
    showCompleteConfirm.value = true
    return
  }
  if (!store.canSingularity) return
  // QoL: native confirm yerine tek onay diyaloğu (ayarlardan kapatılabilir)
  if (!store.settings.confirmDialogs) {
    store.singularityReset()
    return
  }
  showSingularityConfirm.value = true
}

const showSingularityConfirm = ref(false)
const showCompleteConfirm = ref(false)

// Meydan okuma bağlamı: buton metni + ödül önizlemesi
const inChallenge = computed(() => !!store.activeChallenge)
const challengeRewardShort = computed(() =>
  (store.activeChallengeDef?.rewardDesc || '').replace(/^Kalıcı ödül:\s*/, '')
)
const challengeButtonLabel = computed(() => {
  if (!store.activeChallengeDef) return ''
  if (store.canSingularity) return `Meydan Okumayı Tamamla (${challengeRewardShort.value})`
  return `Meydan: ${store.activeChallengeDef.name} — Hedef 1.79e308 Dopamin`
})
</script>

<template>
  <div class="space-y-3">
    <!-- Birleşik Hero -->
    <TabHero
      :icon="Sunrise"
      icon-class="text-amber-400"
      title="Sabah 06:00 Çöküşü (Güneş Doğdu!)"
      :badge="singularityBroken ? '⚡ Sınır Yıkıldı' : 'Katman 1 Tekillik'"
      badge-class="ds-badge-amber"
      subtitle="Dışarıdan kuş sesleri geliyor, güneş perdelerden sızıyor ama başparmağın hala otomatik yukarı kaydırıyor! 1.79e308 Dopamine ulaştığında uykusuzluğu yenerek ilk çöküşü yaşa ve kalıcı Uykusuzluk Puanı (SP) kazan."
      :accent="store.canSingularity ? 'amber' : 'slate'"
    >
      <template #stats>
        <div class="stat-box">
          <Sparkles class="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <div class="stat-box-label">Mevcut Uykusuzluk Puanı</div>
            <div class="stat-box-value text-amber-400 tabular-nums">{{ formatNumber(store.singularityPoints, store.settings.notation) }} SP</div>
          </div>
        </div>
        <button
          @click="handleSingularityReset"
          :disabled="!store.canSingularity"
          class="btn-tactile py-2.5 px-5 rounded-xl font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer border"
          :class="store.canSingularity
            ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400 animate-pulse'
            : 'bg-black/30 text-slate-600 border-white/[0.05]'"
        >
          <Sun class="w-4 h-4" />
          <span>
            {{ inChallenge ? challengeButtonLabel : (store.canSingularity ? `Güneşi Karşıla (+${formatNumber(store.singularityGain, store.settings.notation)} SP)` : '1.79e308 Dopamin Gereklidir') }}
          </span>
        </button>
      </template>
      <template #progress>
        <div class="flex justify-between text-xs font-mono mb-1.5">
          <span class="text-slate-400">Sabah 06:00 Güneş İlerlemesi</span>
          <span class="text-amber-400 font-bold tabular-nums">%{{ progressToSingularity }}</span>
        </div>
        <div class="progress-track progress-track-md progress-track-bordered">
          <div
            class="progress-fill progress-fill-dawn"
            :style="{ width: `${progressToSingularity}%` }"
          ></div>
        </div>
      </template>
    </TabHero>

    <!-- Nöral Ağaç: eski düz SP dükkânının öncüllü kalıcı ağaç hâli -->
    <NeuralTreeTab />

    <!-- Faz 2 Kilometre Taşı: Kolektif Gece Nöbeti (1e4000 Dopamin) -->
    <div
      class="glass-panel-card p-4 rounded-xl border"
      :class="nightWatchUnlocked ? 'border-amber-500/40 bg-amber-950/10' : 'border-white/[0.06]'"
    >
      <div class="flex items-center justify-between mb-1.5">
        <div class="flex items-center gap-2">
          <Moon class="w-4 h-4 shrink-0" :class="nightWatchUnlocked ? 'text-amber-400' : 'text-slate-600'" />
          <h3 class="text-xs font-bold font-mono text-slate-200">Kolektif Gece Nöbeti</h3>
        </div>
        <span class="ds-badge" :class="nightWatchUnlocked ? 'ds-badge-amber' : ''">
          {{ nightWatchUnlocked ? 'FAZ 2 AÇIK' : 'KİLİTLİ' }}
        </span>
      </div>
      <p class="text-[11px] text-slate-400 font-mono leading-relaxed mb-2">
        <span v-if="!nightWatchUnlocked">
          Tüm insanlık yatakta aynı anda ekrana kilitleniyor — 2. Çöküş eşiği:
          <span class="text-purple-300 font-bold tabular-nums">1e4000 Dopamin</span>. Uyku Sınırını Yık ve Dopamini eşiklerin ötesine taşı.
        </span>
        <span v-else>
          Faz 2 açıldı: Uyku Baskısı Matrisi (Corruptions) ve donanım soketleri yolda. Şimdilik nöbet ilerlemen burada sayılır.
        </span>
      </p>
      <div class="flex justify-between text-xs font-mono mb-1">
        <span class="text-slate-400">Nöbet İlerlemesi</span>
        <span class="tabular-nums font-bold" :class="nightWatchUnlocked ? 'text-amber-400' : 'text-purple-400'">%{{ nightWatchProgress }}</span>
      </div>
      <div class="progress-track progress-track-md progress-track-bordered">
        <div
          class="progress-fill progress-fill-dawn"
          :style="{ width: `${nightWatchProgress}%` }"
        ></div>
      </div>
    </div>

    <!-- QoL: tekillik onay diyaloğu (native confirm yerine) -->
    <ConfirmModal
      v-if="showSingularityConfirm"
      title="Sabah 06:00 Çöküşü"
      message="Dopamin ve istasyonların sıfırlanacak; karşılığında kalıcı Uykusuzluk Puanı (SP) kazanacaksın. Hazır mısın?"
      confirm-label="Güneşi Karşıla"
      :danger="false"
      @confirm="store.singularityReset(); showSingularityConfirm = false"
      @cancel="showSingularityConfirm = false"
    />

    <!-- QoL: meydan okuma tamamlama onayı (SP yerine challenge ödülü) -->
    <ConfirmModal
      v-if="showCompleteConfirm && store.activeChallengeDef"
      title="Meydan Okumayı Tamamla"
      :message="`“${store.activeChallengeDef.name}” hedefi tuttu (1.79e308 Dopamin). Koşu sıfırlanacak ve kalıcı ödül kazanacaksın: ${store.activeChallengeDef.rewardDesc}. Onaylıyor musun?`"
      confirm-label="Ödülü Al"
      :danger="false"
      @confirm="store.completeChallenge(); showCompleteConfirm = false"
      @cancel="showCompleteConfirm = false"
    />
  </div>
</template>
