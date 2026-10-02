<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore, COLONY_CORE_COST, COLONY_MIN_NAP_BOTS } from '../stores/game'
import { formatNumber } from '../core/format'
import { Network, Brain, Moon, Lock, TrendingUp, Hourglass } from 'lucide-vue-next'
import TabHero from './TabHero.vue'
import ConfirmModal from './ConfirmModal.vue'
import { ref } from 'vue'

const store = useGameStore()

const breedPercent = computed(() => (store.botBreedRate * 100).toFixed(1))

// 10 dakika sonraki bot sayısı (projeksiyon: bots × e^(rate × t))
const projectedBots = computed(() => {
  if (store.neuralBots.lte(0)) return '—'
  const future = store.neuralBots.times(Math.exp(store.botBreedRate * 600))
  return formatNumber(future)
})

// İlk Toplu Uyku'a kalan süre tahmini (sn -> dk)
const timeToNapMinutes = computed(() => {
  if (store.neuralBots.lte(0)) return null
  if (store.canPowerNap) return 0
  const needed = Math.log(COLONY_MIN_NAP_BOTS / Math.max(1, store.neuralBots.toNumber())) / store.botBreedRate
  return Math.max(1, Math.ceil(needed / 60))
})

const canAffordCore = computed(() => store.matter.gte(COLONY_CORE_COST))

function hatch() {
  if (store.hatchCore()) {
    window.dispatchEvent(new CustomEvent('doomscroll:tap', { detail: { x: window.innerWidth / 2, y: window.innerHeight * 0.4, text: '🧠 Çekirdek Aktif!' } }))
  }
}

function nap() {
  // QoL: koloni fedakarlığı geri dönüşsüz — onay diyaloğu (ayarlardan kapatılabilir)
  if (store.settings.confirmDialogs) {
    showNapConfirm.value = true
    return
  }
  doNap()
}

function doNap() {
  if (store.powerNap()) {
    window.dispatchEvent(new CustomEvent('doomscroll:shake', { detail: { level: 'hard' } }))
  }
}

const showNapConfirm = ref(false)
</script>

<template>
  <div class="space-y-3">
    <TabHero
      :icon="Network"
      icon-class="text-violet-400"
      title="Nöral İzleme Kolonisi"
      badge="Synergism"
      badge-class="ds-badge-violet"
      subtitle="Sen uyurken kendi kendini üreyen nöral alt-botlar. Toplu Uyku ile feda et, kalıcı kök dopamin çarpanını katla."
      accent="violet"
    >
      <template #stats>
        <div class="stat-box">
          <div class="stat-box-label">Nöral Bot</div>
          <div class="stat-box-value text-violet-300 flex items-center gap-1">
            <Brain class="w-3.5 h-3.5 text-violet-400" />
            <span class="tabular-nums">{{ formatNumber(store.neuralBots) }}</span>
          </div>
        </div>
        <div class="stat-box">
          <div class="stat-box-label">Kalıcı Toplu Uyku Çarpanı</div>
          <div class="stat-box-value text-amber-300 flex items-center gap-1">
            <Moon class="w-3.5 h-3.5 text-amber-400" />
            <span class="tabular-nums">×{{ formatNumber(store.napMultiplier) }}</span>
          </div>
        </div>
      </template>
    </TabHero>

    <!-- Çekirdek henüz yumurtlanmamış: aktivasyon paneli -->
    <div v-if="store.neuralBots.lte(0)" class="glass-panel-card p-4 rounded-xl border-violet-500/30 bg-violet-950/10">
      <div class="flex items-center gap-2 mb-1">
        <Lock class="w-4 h-4 text-violet-400" />
        <div class="text-xs font-bold font-mono text-violet-300">NÖRAL ÇEKİRDEK</div>
      </div>
      <div class="text-[11px] text-slate-400 leading-relaxed mb-3">
        Telefonun bir köşesinde kendi kendini üreyen ilk alt-rutini uyanıştır. Bir kerelik aktivasyon; sonrası koloni kendisi büyür.
      </div>
      <button
        @click="hatch"
        class="btn-primary-violet btn-tactile w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 cursor-pointer"
        :disabled="!canAffordCore"
        :class="canAffordCore ? '' : 'opacity-40 cursor-not-allowed'"
      >
        <Brain class="w-4 h-4" />
        <span>Çekirdek Aktif Et — {{ formatNumber(COLONY_CORE_COST) }} Dopamin</span>
      </button>
    </div>

    <!-- Ana panel: üreme + Toplu Uyku -->
    <div v-else class="glass-panel-card p-4 rounded-xl border-violet-500/30 bg-violet-950/10 space-y-3">
      <div class="grid grid-cols-2 gap-3">
        <div class="stat-box">
          <div class="stat-box-label">Üreme Hızı</div>
          <div class="stat-box-value text-emerald-300 tabular-nums">+%{{ breedPercent }}/sn</div>
        </div>
        <div class="stat-box">
          <div class="stat-box-label">Koloni Pasif Çarpanı</div>
          <div class="stat-box-value text-cyan-300 tabular-nums">×{{ formatNumber(store.colonyMultiplier) }}</div>
        </div>
      </div>

      <div class="flex items-center justify-between text-[11px] font-mono text-slate-400">
        <span class="flex items-center gap-1">
          <Hourglass class="w-3 h-3" />
          10 dk sonra: ~{{ projectedBots }} bot
        </span>
        <span>Toplu Uyku: {{ store.napCount }}×</span>
      </div>

      <!-- TOPLU UYKU butonu -->
      <button
        @click="nap"
        class="btn-tactile w-full py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2 cursor-pointer border transition-all"
        :class="store.canPowerNap
          ? 'bg-amber-500/20 text-amber-200 border-amber-400/50 hover:bg-amber-500/30 affordance-pulse'
          : 'bg-black/40 text-slate-500 border-white/[0.06] cursor-not-allowed'"
        :disabled="!store.canPowerNap"
      >
        <Moon class="w-4 h-4" />
        <span v-if="store.canPowerNap">
          TOPLU UYKU — ×{{ formatNumber(store.powerNapGain) }} Kalıcı Çarpan Kazan
        </span>
        <span v-else>
          Toplu Uyku için {{ formatNumber(COLONY_MIN_NAP_BOTS) }} bot gerekli
          <template v-if="timeToNapMinutes"> (~{{ timeToNapMinutes }} dk)</template>
        </span>
      </button>

      <div class="text-[10px] text-slate-500 leading-relaxed border-t border-white/[0.05] pt-2">
        Toplu Uyku: koloninin tamamı aynı anda uykuya dalar — nöral bağlar yeniden bağlanır ve
        <span class="text-amber-300/90">kalıcı kök dopamin çarpanı</span> katlanır.
        Çekirdek korunur; koloni sıfırdan ürer. Çarpan sabah 06:00 çöküşünden bile sağ kalır.
      </div>
    </div>

    <!-- QoL: Toplu Uyku onay diyaloğu -->
    <ConfirmModal
      v-if="showNapConfirm"
      title="Toplu Uyku"
      message="Koloni sıfırdan üremeye başlar; karşılığında kalıcı kök dopamin çarpanı katlanır. Çekirdek korunur. Onaylıyor musun?"
      confirm-label="Uykuya Dal"
      :danger="false"
      @confirm="showNapConfirm = false; doNap()"
      @cancel="showNapConfirm = false"
    />

    <!-- Nöral Yuva (SP yükseltmesi) ipucu -->
    <div class="glass-panel-card p-3 rounded-xl flex items-center gap-2">
      <TrendingUp class="w-4 h-4 text-emerald-400 shrink-0" />
      <div class="text-[11px] text-slate-400 leading-relaxed">
        Üreme hızını artırmak için Şafak sekmesindeki
        <span class="text-emerald-300">🐜 Nöral Yuva</span> SP yükseltmesini al (+%10/seviye).
      </div>
    </div>
  </div>
</template>
