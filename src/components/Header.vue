<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { useGameStore, COMBO_THRESHOLDS, COMBO_DECAY_MS } from '../stores/game'
import { format, formatParts } from '../core/format'
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
  Battery,
  Play,
  Pause,
  SkipForward,
  Lock,
  Sun,
  Cloud
} from 'lucide-vue-next'
import { musicEngine, MUSIC_TRACKS } from '../core/music-engine'
import { sounds } from '../core/audio'
import { getFeatureById, unlockProgress } from '../game/unlocks'
import { Decimal, D_1 } from '../core/math'
import { useAuthStore } from '../stores/auth'
import ConfirmModal from './ConfirmModal.vue'
import confetti from 'canvas-confetti'

const emit = defineEmits(['open-settings', 'open-auth'])

const store = useGameStore()
const authStore = useAuthStore()
const swipeBtnRef = ref<HTMLButtonElement | null>(null)
const counterRef = ref<HTMLElement | null>(null)
const perSecRef = ref<HTMLElement | null>(null)
const dpsSurgeActive = ref(false)
const dpsSurgeDelta = ref('')
let popTimer: number | null = null
let dpsSurgeTimer: number | null = null

// Faz 4 juice + P0 Balatro: tıklamada sayaç pop; kombo aktifken kromatik versiyon.
// Pop dış tablaya uygulanır — iç sayaçtaki sonsuz ısı nabzıyla çakışmaz.
// Büyüklük kademesi: 0 normal tık, 1 üretim sıçraması, 2 büyük sıçrama/krit.
function popCounter(intensity: 0 | 1 | 2 = 0) {
  const el = counterRef.value?.parentElement ?? counterRef.value
  if (!el) return
  const comboClass = comboActive.value ? 'count-pop-combo' : intensity === 2 ? 'count-pop-lg' : intensity === 1 ? 'count-pop-md' : 'count-pop'
  el.classList.remove('count-pop', 'count-pop-md', 'count-pop-lg', 'count-pop-combo')
  // Reflow ile animasyonu yeniden tetikle
  void el.offsetWidth
  el.classList.add(comboClass)
  if (popTimer !== null) clearTimeout(popTimer)
  popTimer = window.setTimeout(() => el.classList.remove('count-pop', 'count-pop-md', 'count-pop-lg', 'count-pop-combo'), 380)
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

const formattedDopamine = computed(() => format(displayedMatter.value, 2, store.settings.notation))
// Okunabilirlik: sonek (M/B/e45) ruloya girmez, ayrı rozet gibi çizilir.
const dopaParts = computed(() => formatParts(displayedMatter.value, 2, store.settings.notation))
const formattedPerSec = computed(() => format(store.matterPerSecond, 2, store.settings.notation))
const formattedClickPower = computed(() => format(store.manualClickPower, 2, store.settings.notation))
const tickspeedCost = computed(() => format(store.tickspeedCost, 2, store.settings.notation))
const tickspeedMultiplier = computed(() => format(store.tickspeedMultiplier, 2, store.settings.notation))
const canAffordTickspeed = computed(() => store.matter.gte(store.tickspeedCost))

// Sütun 5 v2: rAF yumuşatma — görüntü değeri hedefe üstel yaklaşır, basamak şeritleri GPU'da kayar.
// Kesikli pencere yerine sürekli akış; büyük sıçramada (log fark > 2) anında yapışır.
const displayedMatter = ref<Decimal>(store.matter)
const decadeFlash = ref(false)
let smoothRaf = 0
let lastFrame = 0
let decadeTimer: number | null = null
let lastDecade = 0

const REEL_DIGITS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
function isDigitChar(ch: string): boolean {
  return ch >= '0' && ch <= '9'
}

function currentDecade(): number {
  try {
    const m = store.matter
    if (m.isNan() || Number.isNaN(m.mag)) return 0
    if (!m.isFinite() || m.lte(0)) return 0
    return Math.max(0, Math.floor(m.log10().toNumber()))
  } catch {
    return 0
  }
}

// Log-hız ısısı: geç oyunda ölmeyen kademe. Taban = log10(mps) (mps 0.1→~0,
// 1→0.13, 1e3→0.5, 1e7+→1.0); üzerine anlık göreli hızdan küçük momentum eklenir
// (erken oyunda tıklama/sıçrama patlaması hissedilir, geç oyunda taban taşır).
function logMpsNow(): number {
  try {
    const mps = store.matterPerSecond
    if (mps.isNan() || Number.isNaN(mps.mag)) return -1
    if (!mps.isFinite() || mps.lte(0)) return -1
    return mps.log10().toNumber()
  } catch {
    return -1
  }
}

const heatScore = computed(() => {
  const l = logMpsNow()
  if (!Number.isFinite(l)) return 0
  const base = Math.min(1, Math.max(0, (l + 1) / 8))
  let burst = 0
  try {
    const mps = store.matterPerSecond
    if (mps.isFinite() && !mps.isNan() && mps.gt(0)) {
      const baseM = store.matter.gte(D_1) ? store.matter : D_1
      const rel = mps.div(baseM).toNumber()
      if (Number.isFinite(rel) && rel > 0) burst = Math.min(0.35, rel * 0.35)
    }
  } catch { burst = 0 }
  return Math.min(1, base + burst)
})

const motionOff = computed(() => store.settings.reduceAnimations || store.settings.batterySaver)

// Logaritmik hız kademesi: skor <0.25 sakin, <0.5 ılık, <0.75 sıcak, üstü süpernova.
type RateTier = 'calm' | 'warm' | 'hot' | 'supernova'
const rateTier = computed<RateTier>(() => {
  const s = heatScore.value
  if (s >= 0.75) return 'supernova'
  if (s >= 0.5) return 'hot'
  if (s >= 0.25) return 'warm'
  return 'calm'
})


// /s delta oku: ~1.5 sn arayla mps örneği, %5 bandı üstü ▲/▼.
const mpsTrend = ref<1 | 0 | -1>(0)
let trendLastMps = 0
let trendLastT = 0

function updateTrend(now: number) {
  if (now - trendLastT < 1500) return
  try {
    const cur = store.matterPerSecond
    if (trendLastT > 0 && cur.isFinite() && !cur.isNan()) {
      const c = cur.toNumber()
      if (Number.isFinite(c) && Number.isFinite(trendLastMps) && trendLastMps > 0 && c > 0) {
        const d = (c - trendLastMps) / trendLastMps
        mpsTrend.value = d > 0.05 ? 1 : d < -0.05 ? -1 : 0
      }
    }
    trendLastMps = cur.isFinite() && !cur.isNan() ? cur.toNumber() : 0
    trendLastT = now
  } catch { /* yoksay */ }
}

// Alev histerezisi: 0.75'te tutuşur, 0.6'nın altına inmeden sönmez
// (eşikte titreyip açılıp kapanmaz). Hareket kapalıyken alev yok.
const flameOn = ref(false)
watch(heatScore, (s) => {
  if (!flameOn.value && s >= 0.75 && !motionOff.value) {
    flameOn.value = true
    // Tutuşma anı: tek seferlik kor patlaması (spam yok — geçişte bir kez)
    try {
      const r = counterRef.value?.getBoundingClientRect()
      if (r) {
        window.dispatchEvent(
          new CustomEvent('doomscroll:shockwave', {
            detail: { x: r.left + r.width / 2, y: r.top + r.height / 2, color: '#ff7b00', maxRadius: 150 }
          })
        )
      }
    } catch { /* yoksay */ }
    sounds.playTallyTick(1)
  } else if (flameOn.value && (s < 0.6 || motionOff.value)) {
    flameOn.value = false
  }
})

const counterHeatClass = computed(() => {
  if (motionOff.value) return ''
  switch (rateTier.value) {
    case 'supernova':
      return 'rate-supernova'
    case 'hot':
      return 'rate-hot'
    case 'warm':
      return 'rate-warm'
    default:
      return ''
  }
})

// Odometre: format çıktısının ANA gövdesi karakterlere bölünür, değişen basamak
// key değişimiyle rulo animasyonu alır. Sonek (M/B/e45) ayrı ve sabittir.
const dopaChars = computed(() => dopaParts.value.main.split(''))

function checkDecade() {
  const dec = currentDecade()
  if (dec > lastDecade) {
    lastDecade = dec
    // Ses her zaman (synth yöneticisi kapalıyken kendi susar); shake/shockwave
    // sadece hareket serbestken — reduceAnimations/pil tasarrufunda yok.
    if (!motionOff.value) {
      decadeFlash.value = true
      if (decadeTimer !== null) clearTimeout(decadeTimer)
      decadeTimer = window.setTimeout(() => {
        decadeFlash.value = false
        decadeTimer = null
      }, 900)
      // Büyük dekadlar (10'arlı): konfeti + orta sarsıntı + şok dalgası + payoff.
      if (dec % 10 === 0 && dec > 0) {
        try {
          confetti({ particleCount: 40, spread: 70, ticks: 120, disableForReducedMotion: true })
        } catch { /* yoksay */ }
        try {
          sounds.playPayoff()
          window.dispatchEvent(new CustomEvent('doomscroll:shake', { detail: { level: 'medium' } }))
          const r = counterRef.value?.getBoundingClientRect()
          if (r) {
            window.dispatchEvent(
              new CustomEvent('doomscroll:shockwave', {
                detail: { x: r.left + r.width / 2, y: r.top + r.height / 2, color: '#fbbf24', maxRadius: 220 }
              })
            )
          }
        } catch { /* yoksay */ }
      } else {
        // Tek dekad: hafif sarsıntı + tiz tick — "yeni büyüklük" hissi.
        try {
          window.dispatchEvent(new CustomEvent('doomscroll:shake', { detail: { level: 'soft' } }))
        } catch { /* yoksay */ }
        sounds.playTallyTick(0.7)
      }
    } else {
      lastDecade = dec
      sounds.playTallyTick(0.5)
    }
  } else if (dec !== lastDecade) {
    lastDecade = dec
  }
}

// Her karede görüntü değerini hedefe yaklaştır (üstel yumuşatma, ~6/sn hız sabiti).
function tickSmooth(frameT: number) {
  if (smoothRaf === 0) return
  const dt = Math.min(0.1, Math.max(0, (frameT - lastFrame) / 1000 || 0))
  lastFrame = frameT
  const target = store.matter
  if (motionOff.value) {
    if (!displayedMatter.value.eq(target)) displayedMatter.value = target
  } else {
    const shown = displayedMatter.value
    if (!shown.eq(target)) {
      try {
        if (
          target.isNan() || Number.isNaN(target.mag) ||
          shown.isNan() || Number.isNaN(shown.mag) ||
          !target.isFinite() || !shown.isFinite() ||
          shown.lte(0) || target.lte(0)
        ) {
          displayedMatter.value = target
        } else {
          const logDiff = Math.abs(target.log10().toNumber() - shown.log10().toNumber())
          if (!Number.isFinite(logDiff) || logDiff > 2) {
            displayedMatter.value = target
          } else {
            const relGap = target.minus(shown).abs().div(target).toNumber()
            if (Number.isFinite(relGap) && relGap < 1e-9) {
              displayedMatter.value = target
            } else {
              const k = 1 - Math.exp(-6 * dt)
              const next = shown.plus(target.minus(shown).times(k))
              displayedMatter.value = target.gt(shown)
                ? (next.gt(target) ? target : next)
                : (next.lt(target) ? target : next)
            }
          }
        }
      } catch {
        displayedMatter.value = target
      }
    }
  }
  checkDecade()
  updateTrend(frameT)
  smoothRaf = requestAnimationFrame(tickSmooth)
}

function handleCounterVisibility() {
  // Arka planda rAF durur; dönüşte eski kareden dev yumuşatma yerine anında yapış.
  if (!document.hidden) {
    lastFrame = performance.now()
    displayedMatter.value = store.matter
    lastDecade = currentDecade()
  }
}

// Sabah 06:00 Çöküşü hazır: 1.79e308 Dopamin eşiği aşıldı
const singularityReady = computed(() => store.canSingularity)
const singularityGainText = computed(() => format(store.singularityGain, 2, store.settings.notation))
// Break Singularity alındıysa Shift/Galaxy botları tekillikte beklemeyi bırakır
const singularityBroken = computed(() => (store.singularityUpgrades?.break_singularity || 0) >= 1)
const singularityTip = computed(() =>
  singularityBroken.value
    ? `Sabah 06:00 Çöküşü hazır! +${singularityGainText.value} SP — Sınır yıkıldı: Shift/Galaxy botları e308 üstünde de çalışıyor.`
    : `Sabah 06:00 Çöküşü hazır! +${singularityGainText.value} SP — Shift/Galaxy botları sen kararı verene kadar bekliyor.`
)

// D1 (Masum Kedi) pasifi etkinse Kaydır tooltip'ine eklenir
const swipeTip = computed(() =>
  store.passiveBadges.d1Sync
    ? 'Space ile de kaydır — D1 pasifi: CPS senkron tavanı +0.5%'
    : 'Space tuşuna basarak da kaydırabilirsiniz'
)

function handleSingularity() {
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
const showChallengeExitConfirm = ref(false)

// Aktif meydan okuma bağlamı (banner + buton varyantı)
const inChallenge = computed(() => !!store.activeChallenge)
const challengeRewardShort = computed(() =>
  (store.activeChallengeDef?.rewardDesc || '').replace(/^Kalıcı ödül:\s*/, '')
)
const challengeTip = computed(() => {
  const def = store.activeChallengeDef
  if (!def) return ''
  return `Meydan Okuma: ${def.name} — ${def.ruleDesc} Hedef: 1.79e308 Dopamin. Ödül: ${def.rewardDesc}.`
})
const challengeProgressPct = computed(() => Math.round(store.challengeProgress01 * 100))

function requestChallengeExit() {
  if (!store.activeChallenge) return
  if (!store.settings.confirmDialogs) {
    store.exitChallenge()
    return
  }
  showChallengeExitConfirm.value = true
}

// Gece saati — Şafak ilerlemesiyle senkron (02:47 → 06:00 arası)
const nightClock = computed(() => {
  const logVal = store.matter.lt(10) ? 0 : Math.max(0, store.matter.log10().toNumber())
  const progress = Math.min(1, Math.max(0, logVal / 308.25))
  const totalMinutes = Math.round(167 + progress * 193)
  const hh = String(Math.floor(totalMinutes / 60)).padStart(2, '0')
  const mm = String(totalMinutes % 60).padStart(2, '0')
  return `${hh}:${mm}`
})

// 0-state onboarding: ilk format hiç alınmamışsa oyuncuya tek bir eylem çizilir
// (oyun 10 Dopamin ile başlar — matter eşiği değil, ilk alım davranışı belirleyicidir)
const showFirstSwipeHint = computed(() => store.dimensions[0]?.bought === 0)

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
  if (singularityReady.value) {
    return { label: 'Sabah 06:00 — Güneşi Karşıla!', value: `+${singularityGainText.value} SP`, ready: true }
  }
  if (canAffordTickspeed.value) {
    return { label: 'Frekans hazır', value: `×${tickspeedMultiplier.value} → ${tickspeedCost.value}`, ready: true }
  }
  for (let i = store.unlockedDimensionsCount; i >= 1; i--) {
    const cost = store.getDimensionCost(i)
    if (store.matter.gte(cost)) {
      return { label: `D${i} alınabilir`, value: format(cost, 2, store.settings.notation), ready: true }
    }
  }
  // En yakın alınabilir hedefe kalan yüzde (en yüksek tamamlanma oranını seç)
  let best = { label: 'Sıradaki hedef', value: '', ready: false, ratio: -1 }
  if (canAffordAny.value) return { label: 'Alınabilir var', value: '', ready: true }
  for (let i = 1; i <= store.unlockedDimensionsCount; i++) {
    const cost = store.getDimensionCost(i)
    const ratio = store.matter.div(cost).toNumber()
    if (ratio > best.ratio) {
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

function onProductionBump(e: Event) {
  const detail = (e as CustomEvent<{ delta: string }>).detail
  if (!detail?.delta) return
  const delta = new Decimal(detail.delta)
  if (delta.lte(0)) return
  dpsSurgeDelta.value = `+${format(delta, 2, store.settings.notation)}/s`
  dpsSurgeActive.value = true
  // Büyüklük kademesi: sıçrama mevcut stoğun %25'ini aşarsa büyük pop + tiz tick.
  try {
    const baseM = store.matter.gte(D_1) ? store.matter : D_1
    const ratio = delta.div(baseM).toNumber()
    if (Number.isFinite(ratio) && ratio > 0.25) {
      popCounter(2)
      sounds.playTallyTick(1)
    } else {
      popCounter(1)
      sounds.playTallyTick(0.55)
    }
  } catch {
    popCounter(1)
  }
  const el = perSecRef.value
  if (el) {
    el.classList.remove('dps-surge')
    void el.offsetWidth
    el.classList.add('dps-surge')
  }
  if (dpsSurgeTimer !== null) clearTimeout(dpsSurgeTimer)
  dpsSurgeTimer = window.setTimeout(() => {
    dpsSurgeActive.value = false
    dpsSurgeDelta.value = ''
    dpsSurgeTimer = null
  }, 1200)
}

// Combo rozeti: yalnızca Hipnotik Seri (combo_unlock) alınmışsa ve seri ≥2 iken görünür.
// rAF döngüsü rozet görünürken başlar, seri ölünce durur — boşta CPU harcamaz.
const comboCount = computed(() => store.clickCombo.count)
const comboUnlocked = computed(() => (store.neuralNodesBought['combo_unlock'] || 0) >= 1)
const comboActive = computed(() => comboUnlocked.value && comboCount.value >= 2)

function currentComboMult(): number {
  let mult = 1
  for (const t of COMBO_THRESHOLDS) {
    if (comboCount.value >= t.count) mult = t.mult
  }
  return mult
}

// Eşik altında (2-4 seri) çarpan henüz 1 olduğundan seri sayısı gösterilir
const comboBadgeText = computed(() => {
  const mult = currentComboMult()
  return mult > 1 ? `×${mult}` : `${comboCount.value}×`
})

const comboDrain = ref(1)
let comboRaf = 0

function tickComboDrain() {
  const elapsed = Date.now() - store.clickCombo.lastClickAt
  comboDrain.value = Math.max(0, 1 - elapsed / COMBO_DECAY_MS)
  comboRaf = comboActive.value && comboDrain.value > 0 ? requestAnimationFrame(tickComboDrain) : 0
}

watch(
  [comboActive, () => store.clickCombo.lastClickAt],
  ([active]) => {
    if (active && comboRaf === 0) {
      comboRaf = requestAnimationFrame(tickComboDrain)
    } else if (!active && comboRaf !== 0) {
      cancelAnimationFrame(comboRaf)
      comboRaf = 0
    }
  },
  { immediate: true }
)

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

  // Taktil dokunsal titreşim (Web Vibration API - sessiz gece modunda bile haptik his)
  if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
    try {
      navigator.vibrate(8)
    } catch { /* yoksay */ }
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

  store.manualClick({ x, y })
  popCounter(0)
}

// Klavye Kısayolu: Space ile Yukarı Kaydır
function handleKeydown(e: KeyboardEvent) {
  if (e.code === 'Space') {
    const target = e.target as HTMLElement | null
    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
      return
    }
    e.preventDefault()
    // Odaklanmış buton varsa odağı kaldır (Space'in son tıklanan butonu tekrar tetiklemesini engelle)
    if (target && target.tagName === 'BUTTON') {
      target.blur()
    }
    handleManualClick()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
  window.addEventListener('doomscroll:production-bump', onProductionBump as EventListener)
  lastDecade = currentDecade()
  displayedMatter.value = store.matter
  lastFrame = performance.now()
  smoothRaf = requestAnimationFrame(tickSmooth)
  document.addEventListener('visibilitychange', handleCounterVisibility)
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
  window.removeEventListener('doomscroll:production-bump', onProductionBump as EventListener)
  if (dpsSurgeTimer !== null) {
    clearTimeout(dpsSurgeTimer)
    dpsSurgeTimer = null
  }
  if (visualizerInterval !== null) {
    clearInterval(visualizerInterval)
    visualizerInterval = null
  }
  if (smoothRaf !== 0) {
    cancelAnimationFrame(smoothRaf)
    smoothRaf = 0
  }
  document.removeEventListener('visibilitychange', handleCounterVisibility)
  if (decadeTimer !== null) {
    clearTimeout(decadeTimer)
    decadeTimer = null
  }
  if (popTimer !== null) {
    clearTimeout(popTimer)
    popTimer = null
  }
  if (comboRaf !== 0) {
    cancelAnimationFrame(comboRaf)
    comboRaf = 0
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

      <!-- Sağ: Kullanıcı İsmi / Bulut & Pil -->
      <div class="flex items-center gap-2">
        <button
          @click="emit('open-auth')"
          class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all text-xs cursor-pointer active:scale-95"
          :class="authStore.isAuthenticated ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/20' : 'bg-white/[0.04] border-white/[0.08] text-slate-400 hover:text-white'"
          v-tip="authStore.isAuthenticated ? `${authStore.userDisplayName} (Bulut Hesabı)` : 'Giriş Yap / Kaydol'"
        >
          <Cloud class="w-3.5 h-3.5" :class="authStore.isAuthenticated ? 'text-cyan-400' : 'text-slate-400'" />
          <span class="text-[11px] font-semibold">{{ authStore.isAuthenticated ? authStore.userDisplayName : 'Giriş Yap' }}</span>
          <span v-if="authStore.isAuthenticated" class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
        </button>

        <div class="flex items-center gap-1.5 px-1.5 py-0.5 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-300" v-tip="'Pil: %3 (Düşük Güç Modu — yine de kaydırmaya devam)'">
          <Battery class="w-4 h-4 text-rose-300" />
          <span class="text-[11px] font-bold tabular-nums">%3</span>
        </div>
      </div>
    </div>

      <!-- 2. MERKEZİ DOPAMİN ÇEKİRDEĞİ — tek odak: sayı + hız, gerisi ikincil -->
    <div class="flex flex-col items-center justify-center text-center my-4 py-1 relative z-10">
      <span class="text-xs font-bold text-slate-400 flex items-center gap-1.5 mb-0.5">
        <Zap class="w-3.5 h-3.5 text-purple-400" />
        <span>Dopamin</span>
      </span>

      <!-- Premium sayaç tablası: piksel font şeritleri + ısıya göre renklenen plaka -->
      <!-- Sütun 5 v2: şerit konuma sabitlenir, sadece translateY kayar — pürüzsüz slot rulosu -->
      <!-- Çerçevesiz sayaç: pop hedefi olan sade sarmalayıcı, görsel plaka yok -->
      <div class="dopa-wrap">
        <div
          ref="counterRef"
          aria-live="polite"
          :aria-label="`Dopamin: ${formattedDopamine}`"
          class="dopa-reels text-4xl sm:text-5xl lg:text-6xl font-bold tabular-nums tracking-tight my-0.5 select-all will-change-transform"
          :class="[
            flameOn
              ? 'flame-text'
              : singularityReady
                ? 'text-amber-200 counter-gold'
                : 'text-white counter-glow',
            flameOn ? '' : counterHeatClass,
            decadeFlash ? 'decade-flash' : ''
          ]"
        >
          <template
            v-for="(ch, i) in dopaChars"
            :key="i"
          >
            <span
              v-if="isDigitChar(ch)"
              class="reel"
              aria-hidden="true"
            >
              <span
                class="reel-strip"
                :style="{ transform: `translateY(-${ch}em)` }"
              ><span
                v-for="d in REEL_DIGITS"
                :key="d"
                class="reel-cell"
              >{{ d }}</span></span>
            </span>
            <span
              v-else
              :key="`s-${i}-${ch}`"
              class="reel-static"
              aria-hidden="true"
            >{{ ch }}</span>
          </template>
          <span
            v-if="dopaParts.suffix"
            :key="`suf-${dopaParts.suffix}`"
            class="reel-suffix"
            :class="dopaParts.kind === 'exponent' ? 'reel-suffix-exp' : 'reel-suffix-std'"
            aria-hidden="true"
          >{{ dopaParts.suffix }}</span>
          <span class="sr-only">{{ formattedDopamine }}</span>
        </div>
      </div>

      <div class="text-xs font-mono text-purple-300/80 flex items-center gap-2 mt-1">
        <span
          ref="perSecRef"
          :class="[
            'tabular-nums text-[15px] font-semibold inline-flex items-center gap-1.5',
            flameOn ? 'dps-burn' : 'text-purple-100'
          ]"
        >
          <span>+{{ formattedPerSec }}/s</span>
          <span
            v-if="mpsTrend === 1"
            class="dps-delta-up"
            aria-hidden="true"
          >▲</span>
          <span
            v-else-if="mpsTrend === -1"
            class="dps-delta-down"
            aria-hidden="true"
          >▼</span>
          <span
            v-if="dpsSurgeActive && dpsSurgeDelta"
            class="text-emerald-300 font-bold text-[11px] animate-pulse"
          >{{ dpsSurgeDelta }}</span>
        </span>
        <span
          v-if="store.formatUnlockBuffActive"
          class="text-[10px] font-mono text-cyan-200 bg-cyan-500/15 px-1.5 py-0.2 rounded border border-cyan-400/30 tabular-nums shrink-0"
          v-tip="'Yeni format keşfi: bu tier üretimine kısa süre ×1.25'"
        >
          📺 D{{ store.formatUnlockBuffTier }} · {{ store.formatUnlockBuffSecondsRemaining }}s
        </span>
      </div>

      <!-- Sıradaki hamle tek küme (P2 cila) -->
      <div class="mt-2 flex flex-col items-center gap-1.5">
      <!-- Sıradaki hamle — header'daki acil satın alma; App.vue'daki "Sonraki Açılacak" (unlock merdiveni) ile karışmaması için önekli -->
      <div
        class="inline-flex items-center gap-2 px-3 py-1 rounded-full border text-[11px] font-semibold transition-colors"
        :class="nextGoal.ready
          ? 'bg-purple-500/15 border-purple-400/50 text-purple-100 shadow-sm'
          : 'bg-white/[0.03] border-white/[0.07] text-slate-400'"
        v-tip="nextGoal.ready ? 'Hemen satın alabileceğin bir şey var — fırsatı kaçırma!' : 'Bu hedefe yaklaştıkça yüzde doluyor.'"
      >
        <span class="w-1.5 h-1.5 rounded-full shrink-0" :class="nextGoal.ready ? 'bg-purple-300 animate-pulse' : 'bg-slate-500'"></span>
        <span class="text-slate-500 font-normal">Sıradaki hamle:</span>
        <span>{{ nextGoal.label }}</span>
        <span v-if="nextGoal.value" class="tabular-nums font-bold">{{ nextGoal.value }}</span>
      </div>

      <!-- 0-state onboarding: ilk eylem çağrısı (ilk D1 alınana kadar) -->
      <div
        v-if="showFirstSwipeHint"
        class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-purple-500/[0.07] border border-purple-500/25 text-[11px] font-mono font-semibold text-purple-200"
      >
        <ArrowUp class="w-3.5 h-3.5 text-purple-400 arrow-nudge" />
        <span>Başparmağı hazırla — ilk video için <span class="font-bold">Kaydır</span>'a bas</span>
      </div>
      </div>
    </div>

    <!-- 3. DENETİM VE AKSİYON BUTONLARI ÇUBUĞU -->
    <div class="flex flex-col md:flex-row items-center justify-between gap-3 pt-3 border-t border-white/[0.05]">
      <!-- Sol: Stance Modları (Denetim Merkezi - İlk 25 alımdan sonra veya duruş açılınca görünür) -->
      <div
        v-if="(store.dimensions[0]?.bought ?? 0) >= 25 || store.isFeatureUnlocked('stance_spam')"
        class="flex items-center p-1 rounded-xl bg-black/40 border border-white/[0.06] shrink-0 justify-center md:justify-start w-fit mx-auto md:mx-0 max-w-full overflow-x-auto no-scrollbar"
      >
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
              ? 'bg-rose-500/15 text-rose-200 border border-rose-500/40 shadow-sm cursor-pointer'
              : 'text-slate-500 hover:text-slate-200 border border-transparent cursor-pointer opacity-90'"
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
      <!-- ADR-0029: no-scrollbar kaldırıldı. Kaydırılabilir olduğu görünmeyen bir
           alan "bulunamaz" alandır; tarayıcı çubuğu yatay kaydırmayı belli eder. -->
      <div class="flex items-center justify-center md:justify-end gap-1.5 sm:gap-2 shrink-0 flex-nowrap overflow-x-auto py-0.5 max-w-full">
        <!-- Hipnotik Seri rozeti: seri ≥2 iken Kaydır butonunun solunda belirir, geri sayım çubuğu 1.5 sn'de boşalır -->
        <div
          v-if="comboActive"
          class="h-11 px-2 rounded-xl bg-rose-500/15 border border-rose-500/40 flex flex-col items-center justify-center gap-1 min-w-[54px] shrink-0"
          v-tip="`Hipnotik Seri: ${comboCount} üst üste kaydırma — seri 1.5 sn içinde söner, devam et!`"
        >
          <span class="text-xs font-mono font-black text-rose-300 tabular-nums leading-none">{{ comboBadgeText }}</span>
          <div class="w-full h-1 rounded-full bg-black/50 overflow-hidden">
            <div
              class="h-full bg-gradient-to-r from-rose-500 to-pink-400 rounded-full"
              :style="{ width: `${comboDrain * 100}%` }"
            ></div>
          </div>
        </div>

        <!-- 1. Manuel Yukarı Kaydır (Space / Swipe Up) — birincil aksiyon: en büyük, en parlak -->
        <button
          ref="swipeBtnRef"
          @click="handleManualClick($event)"
          class="btn-tactile btn-sheen h-12 px-3.5 sm:px-5 rounded-xl bg-purple-600/35 hover:bg-purple-600/45 text-white border border-purple-400/60 text-sm font-bold font-mono flex items-center gap-2 cursor-pointer shadow-md active:scale-95 shrink-0 min-w-[120px] sm:min-w-[150px]"
          :class="{ 'cta-beacon': showFirstSwipeHint }"
          v-tip="swipeTip"
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

        <!-- 2. Algoritma Frekansı (Tickspeed) — ikincil üretim, mor sözlük (amber yalnızca Şafak/prestijde) -->
        <button
          @click="buyTickspeed"
          v-hold="buyTickspeed"
          :disabled="!canAffordTickspeed"
          class="btn-tactile h-12 px-2 sm:px-3 rounded-xl text-xs font-mono font-medium transition-all flex items-center gap-1.5 sm:gap-2 border shrink-0 min-w-[78px] sm:min-w-[95px]"
          :class="canAffordTickspeed
            ? 'bg-purple-500/10 hover:bg-purple-500/20 text-purple-200 border-purple-500/30 cursor-pointer affordance-pulse'
            : 'bg-black/30 text-slate-600 border-white/[0.05] cursor-not-allowed opacity-50'"
          :style="canAffordTickspeed ? { '--pulse-c1': 'rgba(168, 85, 247, 0.3)', '--pulse-c2': 'rgba(168, 85, 247, 0.7)' } : undefined"
          v-tip="'Algoritma Frekansını (Hz) yükseltir'"
        >
          <Cpu class="w-4 h-4 text-purple-300 shrink-0" />
          <div class="flex flex-col items-start text-left leading-tight">
            <div class="flex items-center gap-1">
              <span class="text-[10px] text-slate-400">Hz</span>
              <span class="font-bold tabular-nums text-white text-xs">×{{ tickspeedMultiplier }}</span>
            </div>
            <span class="text-[10px] text-purple-300/90 font-mono tabular-nums truncate max-w-[60px] sm:max-w-[80px]">
              {{ tickspeedCost }}
            </span>
          </div>
        </button>

        <!-- 3. Tümünü Al Butonu — üçüncül, ghost -->
        <button
          @click="maxAll"
          :disabled="!canAffordAny"
          class="btn-tactile h-12 px-2 sm:px-3 rounded-xl font-bold text-xs tracking-wider flex items-center gap-1.5 sm:gap-2 transition-all border font-mono shrink-0 min-w-[65px] sm:min-w-[75px]"
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

        <!-- 4. Güneşi Karşıla (Tekillik hazır) / Meydan Okumayı Tamamla (challenge aktif) -->
        <button
          v-if="inChallenge || singularityReady"
          @click="handleSingularity"
          :disabled="inChallenge && !singularityReady"
          class="btn-tactile h-12 px-2 sm:px-3 rounded-xl border text-xs font-bold font-mono flex items-center gap-1.5 cursor-pointer shrink-0 min-w-[70px] sm:min-w-[90px]"
          :class="inChallenge && !singularityReady
            ? 'bg-black/30 text-slate-600 border-white/[0.05] cursor-not-allowed opacity-60'
            : 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-300 shadow-md animate-pulse'"
          v-tip="inChallenge ? challengeTip : singularityTip"
        >
          <!-- ADR-0029: bu iki öğe amber-500 zemin üzerinde amber-900 idi
               (4.22:1 ve 3.07:1). 10 px'lik metin 4.5:1 istiyor; slate-950
               ~9.4:1 verir ve SingularityTab ile de tutarlı olur. -->
          <Sun class="w-4 h-4 text-slate-950/80 shrink-0" />
          <div class="flex flex-col items-start text-left leading-tight min-w-0">
            <span class="text-[10px] text-slate-950/80 font-normal">{{ inChallenge ? 'Meydan Okuma' : '06:00' }}</span>
            <span class="text-xs font-black tabular-nums truncate max-w-[110px] sm:max-w-[150px]">
              {{ inChallenge ? challengeRewardShort : `+${singularityGainText}` }}
            </span>
          </div>
        </button>

      </div>

      <!-- 5. Ayarlar Butonu -->
      <!-- ADR-0029: bu buton yatay kaydırma satırının DIŞINDA. Önceden satırın
           en sonundaydı ve 360 px'te taşma nedeniyle görünmez biçimde kırpılıyordu
           — yani telefonda "hareketi azalt / CRT / pil tasarrufu" ayarlarına
           ULAŞILAMIYORDU. Artık asla taşmaz. -->
      <button
        @click="emit('open-settings')"
        aria-label="Ayarlar"
        class="btn-tactile h-12 w-10 sm:w-11 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.08] transition-all cursor-pointer flex items-center justify-center shrink-0"
        v-tip="'Ayarlar'"
      >
        <Settings class="w-4 h-4" />
      </button>
    </div>

    <!-- Aktif meydan okuma bandı (ince): kural özeti + hedef çubuğu + vazgeç -->
    <div
      v-if="inChallenge && store.activeChallengeDef"
      class="mt-3 rounded-xl border border-rose-500/30 bg-rose-500/[0.05] px-3 py-2 flex items-center gap-2.5"
    >
      <span class="text-base leading-none shrink-0">{{ store.activeChallengeDef.icon }}</span>
      <div class="min-w-0 flex-1">
        <div class="text-[11px] font-bold text-rose-200 truncate">
          {{ store.activeChallengeDef.name }}
          <span class="text-slate-400 font-normal">— {{ store.activeChallengeDef.ruleDesc }}</span>
        </div>
        <div class="progress-track progress-track-sm progress-track-bordered mt-1">
          <div
            class="progress-fill progress-fill-rose"
            :style="{ width: `${challengeProgressPct}%` }"
          ></div>
        </div>
      </div>
      <span class="text-[11px] font-mono text-rose-300 font-bold tabular-nums shrink-0">%{{ challengeProgressPct }}</span>
      <button
        @click="requestChallengeExit"
        class="btn-tactile px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-slate-200 cursor-pointer shrink-0"
        v-tip="'Meydan okumadan cezasız vazgeç (koşu sıfırlanır)'"
      >
        Vazgeç
      </button>
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

    <!-- QoL: meydan okumadan vazgeçme onayı -->
    <ConfirmModal
      v-if="showChallengeExitConfirm"
      title="Meydan Okumadan Vazgeç"
      message="Mevcut meydan okuma koşusu sıfırlanacak. Ceza yok, ödül yok — dilediğin zaman yeniden başlayabilirsin. Emin misin?"
      confirm-label="Vazgeç"
      :danger="false"
      @confirm="store.exitChallenge(); showChallengeExitConfirm = false"
      @cancel="showChallengeExitConfirm = false"
    />
  </header>
</template>
