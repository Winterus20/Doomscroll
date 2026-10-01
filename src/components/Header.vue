<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { useGameStore } from '../stores/game'
import { format } from '../core/format'
import type { StanceType } from '../models/types'
import {
  Moon,
  Flame,
  EyeOff,
  Settings,
  Zap,
  ArrowUp,
  Cpu,
  Layers,
  Wifi,
  Signal,
  Battery,
  Play,
  Pause,
  SkipForward,
  Lock
} from 'lucide-vue-next'
import { musicEngine, MUSIC_TRACKS } from '../core/music-engine'
import { getFeatureById, unlockProgress } from '../game/unlocks'
import { Decimal } from '../core/math'

const emit = defineEmits(['open-settings'])

const store = useGameStore()
const swipeBtnRef = ref<HTMLButtonElement | null>(null)
const counterRef = ref<HTMLElement | null>(null)
let popTimer: number | null = null

// Faz 4 juice: tıklama/space anında sayaç mikro-pop (reduced-motion CSS'te kapalı)
function popCounter() {
  const el = counterRef.value
  if (!el) return
  el.classList.remove('count-pop')
  // Reflow ile animasyonu yeniden tetikle
  void el.offsetWidth
  el.classList.add('count-pop')
  if (popTimer !== null) clearTimeout(popTimer)
  popTimer = window.setTimeout(() => el.classList.remove('count-pop'), 320)
}

// Canlı Ekolayzır (Visualizer) Barları
const visualizerBars = ref([0.3, 0.5, 0.4, 0.6])
let visualizerInterval: number | null = null

const currentTrackInfo = computed(() => {
  return MUSIC_TRACKS.find((t) => t.id === store.settings.musicTrack) || MUSIC_TRACKS[0]
})

function toggleMusic() {
  store.toggleMusic()
}

function nextTrack() {
  store.nextMusicTrack()
}

const formattedDopamine = computed(() => format(store.matter, 2, store.settings.notation))
const formattedPerSec = computed(() => format(store.matterPerSecond, 2, store.settings.notation))
const formattedClickPower = computed(() => format(store.manualClickPower, 2, store.settings.notation))
const tickspeedCost = computed(() => format(store.tickspeedCost, 2, store.settings.notation))
const tickspeedMultiplier = computed(() => format(store.tickspeedMultiplier, 2, store.settings.notation))
const canAffordTickspeed = computed(() => store.matter.gte(store.tickspeedCost))

// Gece saati — Şafak ilerlemesiyle senkron (02:47 → 06:00 arası)
const nightClock = computed(() => {
  const logVal = store.matter.lt(10) ? 0 : Math.max(0, store.matter.log10().toNumber())
  const progress = Math.min(1, Math.max(0, logVal / 308.25))
  const totalMinutes = Math.round(167 + progress * 193)
  const hh = String(Math.floor(totalMinutes / 60)).padStart(2, '0')
  const mm = String(totalMinutes % 60).padStart(2, '0')
  return `${hh}:${mm}`
})

const stanceLabel = computed(() => {
  if (store.currentStance === 'spam') return 'Çılgın Kaydırma'
  if (store.currentStance === 'private_mode') return 'Düşük Parlaklık'
  return 'Yorgan Altı'
})

// Alınabilir en az bir yükseltme var mı?
const canAffordAny = computed(() => {
  if (canAffordTickspeed.value) return true
  for (let i = 1; i <= store.unlockedDimensionsCount; i++) {
    if (store.matter.gte(store.getDimensionCost(i))) return true
  }
  return false
})

// "Sıradaki hedef" satırı (bulgu U4 — competence/next-goal dersi):
// her zaman tek bir odak çizer: alınabilir varsa o, yoksa en yakın kilide kalan.
const nextGoal = computed<{ label: string; value: string; ready: boolean }>(() => {
  if (canAffordTickspeed.value) {
    return { label: 'Frekans hazır', value: `×${tickspeedMultiplier.value} → ${tickspeedCost.value}`, ready: true }
  }
  for (let i = store.unlockedDimensionsCount; i >= 1; i--) {
    const cost = store.getDimensionCost(i)
    if (store.matter.gte(cost)) {
      return { label: `D${i} alınabilir`, value: format(cost, 2, store.settings.notation), ready: true }
    }
  }
  // En yakın alınabilir hedefe kalan yüzde (ucuz olanı seç)
  let best = { label: 'Sıradaki hedef', value: '', ready: false, ratio: 1 }
  if (canAffordAny.value) return { label: 'Alınabilir var', value: '', ready: true }
  for (let i = 1; i <= store.unlockedDimensionsCount; i++) {
    const cost = store.getDimensionCost(i)
    const ratio = store.matter.div(cost).toNumber()
    if (ratio < best.ratio) {
      best = {
        label: `D${i} için kalan`,
        value: `%${Math.min(99, Math.floor(ratio * 100))}`,
        ready: false,
        ratio
      }
    }
  }
  return best
})

function setStance(stance: StanceType) {
  store.setStance(stance)
}

// Stance kilitlemeleri (Özellik Merdiveni: D1 formatını 50 adet sahibi ol)
function stanceLockHint(featureId: string): { hint: string; progress: string } | null {
  if (store.isFeatureUnlocked(featureId)) return null
  const f = getFeatureById(featureId)
  if (!f) return null
  const p = unlockProgress(store.unlockContext, f)
  const cur = format(new Decimal(p.current), 0, store.settings.notation)
  const tgt = format(new Decimal(p.target), 0, store.settings.notation)
  return { hint: f.hint, progress: `${cur} / ${tgt}` }
}
const stanceSpamLock = computed(() => stanceLockHint('stance_spam'))
const stancePrivateLock = computed(() => stanceLockHint('stance_private'))

function buyTickspeed() {
  store.buyTickspeed()
}

function maxAll() {
  store.maxAll()
}

function handleManualClick(event?: MouseEvent) {
  let x = window.innerWidth / 2
  let y = window.innerHeight / 2

  if (event && (event.clientX || event.clientY)) {
    x = event.clientX
    y = event.clientY
  } else if (swipeBtnRef.value) {
    const rect = swipeBtnRef.value.getBoundingClientRect()
    x = rect.left + rect.width / 2
    y = rect.top + rect.height / 2
  }

  // Taktil floating juice parçacığı
  window.dispatchEvent(
    new CustomEvent('doomscroll:tap', {
      detail: {
        x,
        y,
        text: `+${formattedClickPower.value}`
      }
    })
  )

  store.manualClick()
  popCounter()
}

// Klavye Kısayolu: Space ile Yukarı Kaydır
function handleKeydown(e: KeyboardEvent) {
  if (
    e.code === 'Space' &&
    (e.target as HTMLElement).tagName !== 'BUTTON' &&
    (e.target as HTMLElement).tagName !== 'INPUT' &&
    (e.target as HTMLElement).tagName !== 'TEXTAREA'
  ) {
    e.preventDefault()
    handleManualClick()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  visualizerInterval = window.setInterval(() => {
    if (store.settings.musicEnabled) {
      const data = musicEngine.getVisualizerData()
      visualizerBars.value = data
    } else {
      visualizerBars.value = [0.15, 0.15, 0.15, 0.15]
    }
  }, 100)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
  if (visualizerInterval !== null) {
    clearInterval(visualizerInterval)
    visualizerInterval = null
  }
  if (popTimer !== null) {
    clearTimeout(popTimer)
    popTimer = null
  }
})
</script>

<template>
  <header class="w-full glass-panel-glow rounded-2xl p-4 md:p-5 mb-6 relative overflow-hidden border border-white/[0.08]">
    <!-- 1. ÜST STATUS BAR (Minimalist Akıllı Telefon Çubuğu + Lo-Fi Radyo) -->
    <div class="flex items-center justify-between text-xs font-mono border-b border-white/[0.06] pb-2.5 mb-4 text-slate-400 select-none flex-wrap gap-2">
      <!-- Sol: Zaman & Durum (Şafak ilerlemesiyle senkron) -->
      <div class="flex items-center gap-2">
        <span class="inline-block w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse"></span>
        <span class="font-bold text-slate-200 tracking-wider tabular-nums">{{ nightClock }}</span>
        <span class="hidden sm:inline text-[11px] text-slate-500">|</span>
        <span class="hidden sm:inline text-[11px] text-slate-400">{{ stanceLabel }}</span>
      </div>

      <!-- Orta: Gece Lo-Fi Radyo Mini Oynatıcı (U1: mobilde gizli — ilk bakışta sayaç + hedef tek odak) -->
      <div class="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/60 border border-purple-500/30 text-[11px] shadow-sm">
        <!-- Visualizer Bar'ları -->
        <div class="flex items-end gap-0.5 h-3.5 px-0.5" v-tip="'Lo-Fi Radyo'">
          <span
            v-for="(lvl, idx) in visualizerBars"
            :key="idx"
            class="w-1 rounded-full bg-gradient-to-t from-purple-500 to-cyan-400 transition-all duration-100"
            :style="{ height: `${Math.max(20, lvl * 100)}%` }"
          ></span>
        </div>

        <!-- Parça İsmi -->
        <button
          @click="emit('open-settings')"
          class="font-mono font-medium text-slate-300 hover:text-purple-300 flex items-center gap-1.5 transition-colors cursor-pointer truncate max-w-[110px] sm:max-w-[160px]"
          v-tip="`${currentTrackInfo.name} (${currentTrackInfo.subtitle}) - Ayarları aç`"
        >
          <span class="text-xs">{{ currentTrackInfo.icon }}</span>
          <span class="truncate font-semibold">{{ currentTrackInfo.name }}</span>
        </button>

        <span class="text-slate-700">|</span>

        <!-- Oynat / Duraklat Butonu -->
        <button
          @click="toggleMusic"
          class="hit-44 p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          v-tip="store.settings.musicEnabled ? 'Müziği Duraklat' : 'Müziği Başlat'"
        >
          <component :is="store.settings.musicEnabled ? Pause : Play" class="w-3 h-3 text-purple-400" />
        </button>

        <!-- Sonraki Parça Butonu -->
        <button
          @click="nextTrack"
          class="hit-44 p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          v-tip="'Sonraki Radyo Kanalı'"
        >
          <SkipForward class="w-3 h-3 text-cyan-400" />
        </button>
      </div>

      <!-- Sağ: Şebeke, Wi-Fi & Pil (U1: diegetik kimlik korunur, sadece seyreltildi) -->
      <div class="flex items-center gap-3">
        <Signal class="hidden sm:block w-3.5 h-3.5 text-slate-400" />
        <Wifi class="hidden sm:block w-3.5 h-3.5 text-slate-400" />
        <div class="flex items-center gap-1 text-rose-400" v-tip="'Pil: %3 (Düşük Güç Modu)'">
          <Battery class="w-4 h-4 text-rose-400" />
          <span class="text-[11px] font-bold tabular-nums">%3</span>
        </div>
      </div>
    </div>

    <!-- 2. MERKEZİ DOPAMİN ÇEKİRDEĞİ -->
    <div class="flex flex-col items-center justify-center text-center my-3 relative z-10">
      <span class="text-xs font-bold text-slate-400 flex items-center gap-1.5 mb-0.5">
        <Zap class="w-3.5 h-3.5 text-purple-400" />
        <span>Dopamin</span>
      </span>

      <!-- Sayıların zıplamaması ve taşmaması için tabular-nums ve temiz font-mono -->
      <div
        ref="counterRef"
        class="text-4xl sm:text-5xl lg:text-6xl font-mono tabular-nums font-black text-white tracking-tight my-0.5 select-all will-change-transform"
      >
        {{ formattedDopamine }}
      </div>

      <div class="text-xs font-mono text-purple-300/80 flex items-center gap-2 mt-0.5">
        <span class="tabular-nums">+{{ formattedPerSec }}/s</span>
        <span
          v-if="store.slackerLeechPercent > 0"
          class="text-rose-400 font-semibold text-[11px] bg-rose-500/10 px-1.5 py-0.2 rounded border border-rose-500/20 tabular-nums shrink-0"
        >
          -{{ (store.slackerLeechPercent * 100).toFixed(0) }}% Vicdan
        </span>
      </div>

      <!-- Sıradaki hedef — her zaman tek odak çizgisi (Three Reads / 2. okuma) -->
      <div
        class="mt-2 inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[11px] font-semibold transition-colors"
        :class="nextGoal.ready
          ? 'bg-purple-500/10 border-purple-500/35 text-purple-200'
          : 'bg-white/[0.03] border-white/[0.07] text-slate-400'"
        v-tip="nextGoal.ready ? 'Hemen satın alabileceğin bir şey var — fırsatı kaçırma!' : 'Bu hedefe yaklaştıkça yüzde doluyor.'"
      >
        <span class="w-1.5 h-1.5 rounded-full shrink-0" :class="nextGoal.ready ? 'bg-purple-400 animate-pulse' : 'bg-slate-500'"></span>
        <span>{{ nextGoal.label }}</span>
        <span v-if="nextGoal.value" class="tabular-nums font-bold">{{ nextGoal.value }}</span>
      </div>
    </div>

    <!-- 3. DENETİM VE AKSİYON BUTONLARI ÇUBUĞU -->
    <div class="flex flex-col md:flex-row items-center justify-between gap-3 pt-3 border-t border-white/[0.05]">
      <!-- Sol: Stance Modları (Denetim Merkezi) -->
      <div class="flex items-center p-1 rounded-xl bg-black/40 border border-white/[0.06] shrink-0 justify-center md:justify-start w-fit mx-auto md:mx-0 max-w-full overflow-x-auto no-scrollbar">
        <button
          @click="setStance('trend')"
          class="btn-tactile hit-44 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
          :class="store.currentStance === 'trend'
            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
            : 'text-slate-400 hover:text-slate-200 border border-transparent'"
          v-tip="'Yorgan Altı: Pasif üretime 2× odak'"
        >
          <Moon class="w-3.5 h-3.5 text-purple-400" />
          <span>Yorgan (2×)</span>
        </button>

        <button
          @click="setStance('spam')"
          :disabled="!!stanceSpamLock"
          class="btn-tactile hit-44 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-all whitespace-nowrap"
          :class="stanceSpamLock
            ? 'text-slate-600 border border-white/[0.03] bg-black/20 opacity-70 cursor-not-allowed'
            : store.currentStance === 'spam'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 shadow-sm cursor-pointer'
              : 'text-slate-400 hover:text-slate-200 border border-transparent cursor-pointer'"
          v-tip="stanceSpamLock ? `Kilitli — ${stanceSpamLock.hint} (${stanceSpamLock.progress})` : 'Çılgın Kaydırma: Kaydırmaya 4× güç ve %50 daha sık kriz'"
        >
          <Lock v-if="stanceSpamLock" class="w-3.5 h-3.5 text-slate-600" />
          <Flame v-else class="w-3.5 h-3.5 text-rose-400" />
          <span>Çılgın (4×)</span>
        </button>

        <button
          @click="setStance('private_mode')"
          :disabled="!!stancePrivateLock"
          class="btn-tactile hit-44 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-all whitespace-nowrap"
          :class="stancePrivateLock
            ? 'text-slate-600 border border-white/[0.03] bg-black/20 opacity-70 cursor-not-allowed'
            : store.currentStance === 'private_mode'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm cursor-pointer'
              : 'text-slate-400 hover:text-slate-200 border border-transparent cursor-pointer'"
          v-tip="stancePrivateLock ? `Kilitli — ${stancePrivateLock.hint} (${stancePrivateLock.progress})` : 'Düşük Parlaklık: Frekans alımlarında %15 indirim'"
        >
          <Lock v-if="stancePrivateLock" class="w-3.5 h-3.5 text-slate-600" />
          <EyeOff v-else class="w-3.5 h-3.5 text-cyan-400" />
          <span>Karanlık</span>
        </button>
      </div>

      <!-- Sağ: TAKTİL BUTONLAR (Kayıp/zıplama yapmayan sabit yükseklikli ve sarmasız buton grubu) -->
      <div class="flex items-center justify-center md:justify-end gap-1.5 sm:gap-2 shrink-0 flex-nowrap overflow-x-auto no-scrollbar py-0.5 max-w-full">
        <!-- 1. Manuel Yukarı Kaydır (Space / Swipe Up) -->
        <button
          ref="swipeBtnRef"
          @click="handleManualClick($event)"
          class="btn-tactile h-11 px-2.5 sm:px-3.5 rounded-xl bg-purple-600/25 hover:bg-purple-600/35 text-purple-200 border border-purple-500/40 text-xs font-bold font-mono flex items-center gap-1.5 sm:gap-2 cursor-pointer shadow-sm active:scale-95 shrink-0 min-w-[85px] sm:min-w-[110px]"
          v-tip="'Space tuşuna basarak da kaydırabilirsiniz'"
        >
          <ArrowUp class="w-4 h-4 text-purple-400 shrink-0" />
          <div class="flex flex-col items-start text-left leading-tight">
            <div class="flex items-center gap-1">
              <span>Kaydır</span>
              <kbd class="hidden sm:inline-block px-1 py-0.2 rounded bg-black/40 border border-white/10 text-[9px] text-slate-400 font-mono font-normal">Space</kbd>
            </div>
            <span class="text-[10px] text-purple-300/80 font-mono font-normal tabular-nums truncate max-w-[65px] sm:max-w-[90px]">
              +{{ formattedClickPower }}
            </span>
          </div>
        </button>

        <!-- 2. Algoritma Frekansı (Tickspeed) Butonu -->
        <button
          @click="buyTickspeed"
          :disabled="!canAffordTickspeed"
          class="btn-tactile h-11 px-2 sm:px-3 rounded-xl text-xs font-mono font-medium transition-all flex items-center gap-1.5 sm:gap-2 border shrink-0 min-w-[78px] sm:min-w-[95px]"
          :class="canAffordTickspeed
            ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-200 border-amber-500/40 cursor-pointer affordance-pulse'
            : 'bg-black/30 text-slate-600 border-white/[0.05] cursor-not-allowed opacity-50'"
          :style="canAffordTickspeed ? { '--pulse-c1': 'rgba(245, 158, 11, 0.35)', '--pulse-c2': 'rgba(245, 158, 11, 0.8)' } : undefined"
          v-tip="'Algoritma Frekansını (Hz) yükseltir'"
        >
          <Cpu class="w-4 h-4 text-amber-400 shrink-0" />
          <div class="flex flex-col items-start text-left leading-tight">
            <div class="flex items-center gap-1">
              <span class="text-[10px] text-slate-400">Hz</span>
              <span class="font-bold tabular-nums text-white text-xs">×{{ tickspeedMultiplier }}</span>
            </div>
            <span class="text-[10px] text-amber-400/90 font-mono tabular-nums truncate max-w-[60px] sm:max-w-[80px]">
              {{ tickspeedCost }}
            </span>
          </div>
        </button>

        <!-- 3. Tümünü Al Butonu -->
        <button
          @click="maxAll"
          :disabled="!canAffordAny"
          class="btn-tactile h-11 px-2 sm:px-3 rounded-xl font-bold text-xs tracking-wider flex items-center gap-1.5 sm:gap-2 transition-all border font-mono shrink-0 min-w-[65px] sm:min-w-[75px]"
          :class="canAffordAny
            ? 'bg-white/[0.08] hover:bg-white/[0.12] text-white border-white/20 cursor-pointer'
            : 'bg-black/30 text-slate-600 border-white/[0.05] cursor-not-allowed opacity-40'"
          v-tip="'Tüm açık format ve frekans yükseltmelerini alır'"
        >
          <Layers class="w-4 h-4 text-purple-400 shrink-0" />
          <div class="flex flex-col items-start text-left leading-tight">
            <span class="text-xs font-bold">Tümü</span>
            <span class="text-[10px] text-slate-400 font-normal">Maks Al</span>
          </div>
        </button>

        <!-- 4. Ayarlar Butonu -->
        <button
          @click="emit('open-settings')"
          class="btn-tactile h-11 w-10 sm:w-11 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white border border-white/[0.08] transition-all cursor-pointer flex items-center justify-center shrink-0"
          v-tip="'Ayarlar'"
        >
          <Settings class="w-4 h-4" />
        </button>
      </div>
    </div>
  </header>
</template>
