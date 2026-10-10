<script setup lang="ts">
import { computed, ref, watch, onMounted, onUnmounted } from 'vue'
import { useGameStore, COMBO_THRESHOLDS, COMBO_DECAY_MS } from '../stores/game'
import { format, getMassScaleBadge } from '../core/format'
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
  Activity,
  Play,
  Pause,
  SkipForward,
  Lock,
  Sun,
  Cloud
} from 'lucide-vue-next'
import { musicEngine, MUSIC_TRACKS } from '../core/music-engine'
import { sounds } from '../core/audio'
import { safeConfetti, isPageVisible } from '../core/celebrate'
import { getFeatureById, unlockProgress } from '../game/unlocks'
import { Decimal, D_1 } from '../core/math'
import { useAuthStore } from '../stores/auth'
import ConfirmModal from './ConfirmModal.vue'

const emit = defineEmits<{ (e: 'open-settings'): void; (e: 'open-auth'): void }>()

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

const formattedDopamine = computed(() => format(store.matter, 2, store.settings.notation))
const massScaleBadge = computed(() => getMassScaleBadge(store.matter))
const formattedPerSec = computed(() => format(store.matterPerSecond, 2, store.settings.notation))
const formattedClickPower = computed(() => format(store.manualClickPower, 2, store.settings.notation))
const tickspeedCost = computed(() => format(store.tickspeedCost, 2, store.settings.notation))
const tickspeedMultiplier = computed(() => format(store.tickspeedMultiplier, 2, store.settings.notation))
const canAffordTickspeed = computed(() => store.matter.gte(store.tickspeedCost))

// Sayaç akışı: ana kütle sayacı rAF ile ~12Hz tazelenir (göz akıcı görür),
// fiyat/hız gibi yavaş değişen yan metinler ~2Hz'de kalır (render yükü düşük).
// Ham computed'lar mantıkta kalır; şablon bu kopyaları okur.
const displayDopamine = ref('')
const displayPerSec = ref('')
const displayClickPower = ref('')
const displayTickCost = ref('')
const displayTickMult = ref('')
// SR özeti: ana sayaç sessizdir (aria-live off); bu gizli metin 5sn'de bir okunur.
const srSummary = ref('')
let srSummaryInterval: number | null = null
let lastCounterRefresh = 0
let lastSecondaryRefresh = 0

function refreshCounterText() {
  displayDopamine.value = formattedDopamine.value
}

function refreshSecondaryText() {
  displayPerSec.value = formattedPerSec.value
  displayClickPower.value = formattedClickPower.value
  displayTickCost.value = tickspeedCost.value
  displayTickMult.value = tickspeedMultiplier.value
}

function refreshThrottledText() {
  refreshCounterText()
  refreshSecondaryText()
}

function refreshSrSummary() {
  srSummary.value = `Yutulan Kütle ${displayDopamine.value}, saniyede ${displayPerSec.value}`
}

const decadeFlash = ref(false)
let smoothRaf = 0
let decadeTimer: number | null = null
let lastDecade = 0
let lastDecadeShakeAt = 0
let lastSmoothCheck = 0

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

// ADR-0049: logaritmik hız kademesi (rateTier) kaldırıldı — sayaç nabzı kapalı.


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

// ADR-0049: alev histerezisi kapalı — sayaç sakin kalır, okunaklık öncelikli.
// flameOn her zaman false tutulur; şablon dalı korunur ama tetiklenmez.
const flameOn = ref(false)
watch(heatScore, (s) => {
  if (flameOn.value && (s < 0.6 || motionOff.value)) {
    flameOn.value = false
  }
})

const counterHeatClass = computed(() => {
  // ADR-0049 Okunaklı Balatro: sayaçta sürekli nabız kapalı.
  // Olay anı efektleri (count-pop, decade-flash) korunur.
  return ''
})


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
      // Büyük dekadlar (10'arlı): konfeti + kontrollü sarsıntı + şok dalgası + payoff.
      // Gizli sekmede kutlama yok (rAF durur + dönüşte lastDecade senkronlanır).
      if (dec % 10 === 0 && dec > 0) {
        if (isPageVisible()) {
          safeConfetti({ particleCount: 40, spread: 70, ticks: 120, disableForReducedMotion: true })
        }
        try {
          sounds.playPayoff()
          const now = Date.now()
          // Botlar veya hızlı üretim esnasında aralıksız sarsıntıyı önlemek için 4sn cooldown
          if (now - lastDecadeShakeAt >= 4000) {
            lastDecadeShakeAt = now
            window.dispatchEvent(new CustomEvent('doomscroll:shake', { detail: { level: 'medium' } }))
          }
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
        // Tek dekad: tiz tick — "yeni büyüklük" hissi (ekran sarsıntısı kapalı: botlar aktifken titreşimi önler)
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

function tickSmooth(frameT: number) {
  if (smoothRaf === 0) return
  // Ana sayaç ~12Hz (80ms): 20TPS tick'lerin tamamına yakını ekrana yansır, akıcı görünür.
  // Hareket kapalı/pil tasarrufunda 500ms'ye düşer (pil dostu).
  const counterEvery = motionOff.value ? 500 : 80
  if (frameT - lastCounterRefresh >= counterEvery) {
    lastCounterRefresh = frameT
    refreshCounterText()
  }
  // Yan metinler ~2Hz: fiyat/hız nadiren değişir, her kare format maliyeti yok.
  if (frameT - lastSecondaryRefresh >= 500) {
    lastSecondaryRefresh = frameT
    refreshSecondaryText()
  }
  // Dekad kontrolü ~2Hz'ye kısıldı: her kare Decimal.log10() yok; trend örneklemeyle birleşik.
  if (frameT - lastSmoothCheck >= 500) {
    lastSmoothCheck = frameT
    checkDecade()
    updateTrend(frameT)
  }
  smoothRaf = requestAnimationFrame(tickSmooth)
}

function handleCounterVisibility() {
  if (!document.hidden) {
    lastDecade = currentDecade()
  }
}

// Kozmik Çöküş hazır: 1.79e308 g Kütle eşiği aşıldı
const singularityReady = computed(() => store.canSingularity)
const singularityGainText = computed(() => format(store.singularityGain, 2, store.settings.notation))
const nextSpMatterText = computed(() => format(store.nextSingularityPointAt, 2, store.settings.notation))
// Break Singularity alındıysa Shift/Galaxy botları tekillikte beklemeyi bırakır
const singularityBroken = computed(() => store.hasBreakSingularity)
const singularityTip = computed(() =>
  singularityBroken.value
    ? `Kozmik Çöküş hazır! +${singularityGainText.value} SP (Sonraki SP: ${nextSpMatterText.value} g) — Planck sınırı yıkıldı, üstel büyüme devrede.`
    : `Kozmik Çöküş hazır! +${singularityGainText.value} SP (Sonraki SP: ${nextSpMatterText.value} g) — Kütle arttıkça kazanç katlanır!`
)

// D1 (Moleküler Bağlar) pasifi etkinse Yut tooltip'ine eklenir
const swipeTip = computed(() =>
  store.passiveBadges.d1Sync
    ? 'Space ile de yut — D1 pasifi: Çekim senkron tavanı +0.5%'
    : 'Space tuşuna basarak da kütle yutabilirsiniz'
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
  return `Meydan Okuma: ${def.name} — ${def.ruleDesc} Hedef: 1.79e308 g Kütle. Ödül: ${def.rewardDesc}.`
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

// Gece saati — Şafak ilerlemesiyle senkron (02:47 → 06:15 arası, 208 dk gece)
// Dopamin log10/308.25 ilerlemesi gece yarısı saatine birebir bağlanır:
// erken koşu = derin gece, tekillik eşiği = şafak. Faz 1 fantasisi sayaçla buluşur.
const nightProgress = computed(() => {
  try {
    const m = store.matter
    if (m.isNan() || Number.isNaN(m.mag)) return 0
    if (!m.isFinite() || m.lt(10)) return 0
    const logVal = Math.max(0, m.log10().toNumber())
    if (!Number.isFinite(logVal)) return 0
    return Math.min(1, Math.max(0, logVal / 308.25))
  } catch {
    return 0
  }
})
const nightClock = computed(() => {
  const totalMinutes = Math.round(167 + nightProgress.value * 208)
  const hh = String(Math.floor(totalMinutes / 60)).padStart(2, '0')
  const mm = String(totalMinutes % 60).padStart(2, '0')
  return `${hh}:${mm}`
})
// Kozmik çöküş fazı — telemetri rozeti + nokta rengi
const nightPhase = computed(() => {
  const p = nightProgress.value
  if (p >= 1) return { label: 'Kozmik Tekillik', dot: 'bg-amber-300', text: 'text-amber-200' }
  if (p >= 0.8) return { label: 'Galaktik Olay Ufku', dot: 'bg-orange-300', text: 'text-orange-200' }
  if (p >= 0.55) return { label: 'Makro Çöküş', dot: 'bg-purple-300', text: 'text-purple-200' }
  if (p >= 0.25) return { label: 'Mikro Karadelik', dot: 'bg-cyan-300', text: 'text-cyan-200' }
  return { label: 'Planck Yırtılması', dot: 'bg-blue-400', text: 'text-slate-200' }
})

// 0-state onboarding: ilk format hiç alınmamışsa oyuncuya tek bir eylem çizilir
// (oyun 10 Dopamin ile başlar — matter eşiği değil, ilk alım davranışı belirleyicidir)
const showFirstSwipeHint = computed(() => store.dimensions[0]?.bought === 0)

// Alınabilir en az bir yükseltme var mı?
const canAffordAny = computed(() => {
  if (canAffordTickspeed.value) return true
  for (let i = 1; i <= store.unlockedDimensionsCount; i++) {
    const pack = store.getDimensionCost(i)
    if (store.matter.gte(pack)) return true
    if (store.matter.gte(pack.div(10))) return true
  }
  return false
})

// "Sıradaki hedef" satırı (bulgu U4 — competence/next-goal dersi):
// her zaman tek bir odak çizer: alınabilir varsa o, yoksa en yakın kilide kalan.
const nextGoal = computed<{ label: string; value: string; ready: boolean }>(() => {
  if (singularityReady.value) {
    return { label: 'Kozmik Çöküş Hazır!', value: `+${singularityGainText.value} SP`, ready: true }
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
// Bir kez açılan kapanmaz: D1×25 erken önizlemesi sıçramada sıfırlanıyordu
// (bought koşu-içidir). İlk açılış localStorage'a mühürlenir, bir daha kapanmaz.
const STANCE_SEEN_KEY = 'uroboros-stance-seen'
const stanceSeen = ref(false)
try {
  stanceSeen.value = localStorage.getItem(STANCE_SEEN_KEY) === '1'
} catch { /* yoksay */ }
const isStanceUnlocked = computed(() => stanceSeen.value || (store.dimensions[0]?.bought ?? 0) >= 25 || store.isFeatureUnlocked('stance_spam'))
watch(isStanceUnlocked, (v) => {
  if (v && !stanceSeen.value) {
    stanceSeen.value = true
    try {
      localStorage.setItem(STANCE_SEEN_KEY, '1')
    } catch { /* yoksay */ }
  }
}, { immediate: true })
const hasMobileControls = computed(() => isStanceUnlocked.value || inChallenge.value || singularityReady.value)

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
  const now = performance.now()
  lastSmoothCheck = now
  lastCounterRefresh = now
  lastSecondaryRefresh = now
  refreshThrottledText()
  refreshSrSummary()
  srSummaryInterval = window.setInterval(refreshSrSummary, 5000)
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
  if (srSummaryInterval !== null) {
    clearInterval(srSummaryInterval)
    srSummaryInterval = null
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
    <!-- 1. ÜST STATUS BAR (Kozmik Telemetri & Kuantum Rezonans Çubuğu) -->
    <div class="flex items-center justify-between text-xs font-mono border-b border-white/[0.06] pb-2.5 mb-4 text-slate-400 select-none flex-wrap gap-2">
      <!-- Sol: Kozmik Zaman & Çöküş Fazı -->
      <div
        class="flex items-center gap-2 min-w-0"
        v-tip="`Telemetri Zamanı ${nightClock} — Faz: ${nightPhase.label}. 1.79e308 g kütlede Kozmik Çöküş tetiklenir.`"
      >
        <span class="inline-block w-2 h-2 rounded-full shrink-0" :class="[nightPhase.dot, 'shadow-xs animate-pulse']"></span>
        <span class="font-bold tracking-wider tabular-nums text-slate-200">{{ nightClock }}</span>
        <span class="text-[10px] text-slate-400 font-semibold truncate hidden sm:inline">{{ nightPhase.label }}</span>
        <!-- Kozmik İlerleme İnce Şeridi -->
        <span class="hidden md:inline-block w-16 h-1 rounded-full overflow-hidden bg-black/50 border border-white/[0.06] shrink-0" aria-hidden="true">
          <span
            class="block h-full rounded-full transition-all duration-500"
            :style="{
              width: `${Math.round(nightProgress * 100)}%`,
              background: 'linear-gradient(to right, #00f0ff, #a855f7, #f59e0b)'
            }"
          ></span>
        </span>
      </div>

      <!-- Orta: Kuantum Sinyal Alıcısı (U1: mobilde gizli — sayaç odaklı) -->
      <div class="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-full bg-black/60 border border-cyan-500/25 text-[11px] shadow-sm">
        <!-- Visualizer Barları -->
        <div class="flex items-end gap-0.5 h-3 px-0.5" v-tip="'Kuantum Sinyal Modülatörü'">
          <span
            v-for="(lvl, idx) in visualizerBars"
            :key="idx"
            class="w-1 rounded-full bg-gradient-to-t from-cyan-500 to-purple-400 transition-all duration-100"
            :style="{ height: `${Math.max(20, lvl * 100)}%` }"
          ></span>
        </div>

        <!-- Parça / Frekans İsmi -->
        <button
          @click="emit('open-settings')"
          aria-label="Frekans ayarlarını aç"
          class="font-mono font-medium text-slate-300 hover:text-cyan-300 flex items-center gap-1.5 transition-colors cursor-pointer truncate max-w-[110px] sm:max-w-[160px]"
          v-tip="`${currentTrackInfo.name} (${currentTrackInfo.subtitle}) — Frekans Ayarları`"
        >
          <span class="text-xs">{{ currentTrackInfo.icon }}</span>
          <span class="truncate font-semibold">{{ currentTrackInfo.name }}</span>
        </button>

        <span class="text-slate-700">|</span>

        <!-- Oynat / Duraklat -->
        <button
          @click="toggleMusic"
          aria-label="Kuantum sinyalini başlat veya duraklat"
          class="hit-44 p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          v-tip="store.settings.musicEnabled ? 'Sinyali Duraklat' : 'Sinyali Başlat'"
        >
          <component :is="store.settings.musicEnabled ? Pause : Play" class="w-3 h-3 text-cyan-400" />
        </button>

        <!-- Sonraki Frekans Kanalı -->
        <button
          @click="nextTrack"
          aria-label="Sonraki kuantum kanalı"
          class="hit-44 p-1 rounded-md text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          v-tip="'Sonraki Kuantum Kanalı'"
        >
          <SkipForward class="w-3 h-3 text-purple-400" />
        </button>
      </div>

      <!-- Sağ: Bulut Hesabı & Tekillik Kararlılığı Telemetrisi -->
      <div class="flex items-center gap-2">
        <button
          @click="emit('open-auth')"
          aria-label="Bulut hesabını aç veya giriş yap"
          class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all text-xs cursor-pointer active:scale-95"
          :class="authStore.isAuthenticated ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/20' : 'bg-white/[0.04] border-white/[0.08] text-slate-400 hover:text-white'"
          v-tip="authStore.isAuthenticated ? `${authStore.userDisplayName} (Bulut Hesabı)` : 'Giriş Yap / Kaydol'"
        >
          <Cloud class="w-3.5 h-3.5" :class="authStore.isAuthenticated ? 'text-cyan-400' : 'text-slate-400'" />
          <span class="text-[11px] font-semibold">{{ authStore.isAuthenticated ? authStore.userDisplayName : 'Giriş Yap' }}</span>
          <span v-if="authStore.isAuthenticated" class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
        </button>

        <!-- Tekillik Kararlılığı Göstergesi -->
        <div
          class="flex items-center gap-1.5 px-2 py-0.5 rounded-md border text-[11px] font-mono font-semibold"
          :class="store.crisisBackfireDebuff > 0
            ? 'bg-rose-500/15 border-rose-500/35 text-rose-300'
            : 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'"
          v-tip="store.crisisBackfireDebuff > 0 ? 'Gravitasyonel Kararsızlık: Kriz ters tepmesi aktif' : 'Olay Ufku Kararlı: Çekim alanı dengede'"
        >
          <Activity class="w-3.5 h-3.5" :class="store.crisisBackfireDebuff > 0 ? 'text-rose-400 animate-pulse' : 'text-emerald-400'" />
          <span class="uppercase tracking-wider text-[10px]">{{ store.crisisBackfireDebuff > 0 ? 'KARARSIZ' : 'KARARLI' }}</span>
        </div>

        <!-- Ayarlar Butonu (Mobilde üst barda doğrudan erişim) -->
        <button
          @click="emit('open-settings')"
          aria-label="Ayarlar"
          class="md:hidden flex items-center justify-center h-7 w-7 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.08] transition-all cursor-pointer shrink-0"
          v-tip="'Ayarlar'"
        >
          <Settings class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>

      <!-- 2. MERKEZİ KÜTLE ÇEKİRDEĞİ — tek odak: sayı + hız, gerisi ikincil -->
    <div class="flex flex-col items-center justify-center text-center my-4 py-1 relative z-10">
      <span class="text-xs font-bold text-slate-400 flex items-center gap-1.5 mb-0.5">
        <Zap class="w-3.5 h-3.5 text-purple-400" />
        <span>Yutulan Kütle</span>
        <span class="text-[10px] font-mono tracking-wider px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-300 border border-purple-500/30 ml-1">{{ massScaleBadge }}</span>
      </span>

      <!-- Sayıların zıplamaması ve taşmaması için tabular-nums; imza tipografi: Chakra Petch -->
      <!-- SR notu: ana sayaç aria-live="off" (20TPS anonsu yok); 5sn'lik gizli özet okunur. -->
      <div
        ref="counterRef"
        aria-live="off"
        :aria-label="`Yutulan Kütle: ${displayDopamine}`"
        class="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tabular-nums tracking-tight my-0.5 select-all will-change-transform"
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
        {{ displayDopamine }}
      </div>
      <span class="sr-only" aria-live="polite">{{ srSummary }}</span>

      <div class="text-xs font-mono text-purple-300/80 flex items-center gap-2 mt-1">
        <span
          ref="perSecRef"
          :class="[
            'tabular-nums text-[15px] font-semibold inline-flex items-center gap-1.5',
            flameOn ? 'dps-burn' : 'text-purple-100'
          ]"
        >
          <span>+{{ displayPerSec }}/s</span>
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
          class="text-[10px] font-mono text-cyan-200 bg-cyan-500/15 px-1.5 py-0.5 rounded border border-cyan-400/30 tabular-nums shrink-0"
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

      </div>
    </div>

    <!-- 3. DENETİM VE AKSİYON BUTONLARI — tek sıra: duruş solda, aksiyon
      hep sağda. Aksiyon grubundaki ml-auto, duruş kapalıyken bile grubu
      sağda tutar; açılışta yatay kayma olmaz. -->
    <div
      :class="[
        hasMobileControls ? 'flex' : 'hidden md:flex',
        'flex-col md:flex-row items-center justify-between gap-3 pt-3 border-t border-white/[0.05]'
      ]"
    >
      <!-- Sol: Stance Modları (bir kez açılır, bir daha kapanmaz) -->
      <div
        v-if="isStanceUnlocked"
        class="flex items-center p-1 rounded-xl bg-black/40 border border-white/[0.06] shrink-0 justify-center md:justify-start w-fit mx-auto md:mx-0 max-w-full overflow-x-auto no-scrollbar"
      >
        <button
          @click="setStance('trend')"
          aria-label="Kuantum odak duruşuna geç"
          class="btn-tactile hit-44 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
          :class="store.currentStance === 'trend'
            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
            : 'text-slate-400 hover:text-slate-200 border border-transparent'"
          v-tip="'Kuantum Odak: Pasif çekim akışına 2× odak'"
        >
          <Moon class="w-3.5 h-3.5 text-purple-400" />
          <span>Kuantum (2×)</span>
        </button>

        <button
          @click="setStance('spam')"
          :disabled="!!stanceSpamLock"
          aria-label="Obur çekim duruşuna geç"
          class="btn-tactile hit-44 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-all whitespace-nowrap"
          :class="stanceSpamLock
            ? 'text-slate-600 border border-white/[0.03] bg-black/20 opacity-70 cursor-not-allowed'
            : store.currentStance === 'spam'
              ? 'bg-rose-500/15 text-rose-200 border border-rose-500/40 shadow-sm cursor-pointer'
              : 'text-slate-500 hover:text-slate-200 border border-transparent cursor-pointer opacity-90'"
          v-tip="stanceSpamLock ? `Kilitli — ${stanceSpamLock.hint} (${stanceSpamLock.progress})` : 'Obur Çekim: Manuel çekime 4× güç ve %50 daha sık kozmik dalgalanma'"
        >
          <Lock v-if="stanceSpamLock" class="w-3.5 h-3.5 text-slate-600" />
          <Flame v-else class="w-3.5 h-3.5 text-rose-400" />
          <span>Obur (4×)</span>
        </button>

        <button
          @click="setStance('private_mode')"
          :disabled="!!stancePrivateLock"
          aria-label="Vakum kalkanı duruşuna geç"
          class="btn-tactile hit-44 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-all whitespace-nowrap"
          :class="stancePrivateLock
            ? 'text-slate-600 border border-white/[0.03] bg-black/20 opacity-70 cursor-not-allowed'
            : store.currentStance === 'private_mode'
              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm cursor-pointer'
              : 'text-slate-400 hover:text-slate-200 border border-transparent cursor-pointer'"
          v-tip="stancePrivateLock ? `Kilitli — ${stancePrivateLock.hint} (${stancePrivateLock.progress})` : 'Vakum Kalkanı: Çekim Hızı yükseltmelerinde %15 indirim'"
        >
          <Lock v-if="stancePrivateLock" class="w-3.5 h-3.5 text-slate-600" />
          <EyeOff v-else class="w-3.5 h-3.5 text-cyan-400" />
          <span>Kalkan</span>
        </button>
      </div>

      <!-- Sağ: TAKTİL BUTONLAR (md:ml-auto ile duruş kapalıyken de sağda sabit) -->
      <div
        :class="[
          inChallenge || singularityReady ? 'flex' : 'hidden md:flex',
          'items-center justify-end gap-1.5 sm:gap-2 shrink-0 flex-nowrap overflow-x-auto py-0.5 max-w-full md:ml-auto'
        ]"
      >
        <!-- Hipnotik Seri rozeti: masaüstünde YUT butonunun solunda belirir (mobilde FloatingThumbBar'da gösterilir) -->
        <div
          v-if="comboActive"
          class="hidden md:flex h-11 px-2 rounded-xl bg-rose-500/15 border border-rose-500/40 flex-col items-center justify-center gap-1 min-w-[54px] shrink-0"
          v-tip="`Hipnotik Çekim Serisi: ${comboCount} üst üste yutma — seri 1.5 sn içinde söner, devam et!`"
        >
          <span class="text-xs font-mono font-black text-rose-300 tabular-nums leading-none">{{ comboBadgeText }}</span>
          <div class="w-full h-1 rounded-full bg-black/50 overflow-hidden">
            <div
              class="h-full bg-gradient-to-r from-rose-500 to-pink-400 rounded-full"
              :style="{ width: `${comboDrain * 100}%` }"
            ></div>
          </div>
        </div>

        <!-- 1. Manuel Yut (Space / Consume) — masaüstü birincil taktil aksiyon (mobilde FloatingThumbBar'da yer alır) -->
        <button
          ref="swipeBtnRef"
          @click="handleManualClick($event)"
          class="hidden md:flex btn-tactile h-11 px-3.5 sm:px-4 rounded-xl bg-purple-600/30 hover:bg-purple-600/40 text-white border border-purple-400/50 text-xs font-bold font-sans items-center gap-2 cursor-pointer shadow-md active:scale-95 shrink-0 min-w-[115px] sm:min-w-[140px]"
          :class="{ 'cta-beacon': showFirstSwipeHint }"
          aria-label="Manuel kütle yut"
          v-tip="swipeTip"
        >
          <ArrowUp class="w-4 h-4 text-purple-300 shrink-0" />
          <div class="flex flex-col items-start text-left leading-tight">
            <div class="flex items-center gap-1">
              <span class="tracking-wide">YUT!</span>
              <kbd class="hidden sm:inline-block px-1 py-0.5 rounded bg-black/50 border border-white/10 text-[10px] text-slate-400 font-sans font-normal">Space</kbd>
            </div>
            <span class="text-[10px] text-purple-200/80 font-mono font-normal tabular-nums truncate max-w-[65px] sm:max-w-[90px]">
              +{{ displayClickPower }}
            </span>
          </div>
        </button>

        <!-- 2. Çekim Hızı (Hz / Tickspeed) — masaüstü ikincil kuantum modülatörü (mobilde FloatingThumbBar'da yer alır) -->
        <button
          @click="buyTickspeed"
          v-hold="buyTickspeed"
          :disabled="!canAffordTickspeed"
          aria-label="Çekim hızı yükselt"
          class="hidden md:flex btn-tactile h-11 px-2.5 sm:px-3 rounded-xl text-xs font-mono font-medium transition-all items-center gap-1.5 sm:gap-2 border shrink-0 min-w-[76px] sm:min-w-[92px]"
          :class="canAffordTickspeed
            ? 'bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-200 border-cyan-500/35 cursor-pointer affordance-pulse'
            : 'bg-black/30 text-slate-600 border-white/[0.04] cursor-not-allowed opacity-50'"
          :style="canAffordTickspeed ? { '--pulse-c1': 'rgba(0, 240, 255, 0.3)', '--pulse-c2': 'rgba(0, 240, 255, 0.7)' } : undefined"
          v-tip="'Çekim Hızını (Hz) yükseltir'"
        >
          <Cpu class="w-4 h-4 text-cyan-400 shrink-0" />
          <div class="flex flex-col items-start text-left leading-tight">
            <div class="flex items-center gap-1">
              <span class="text-[10px] text-slate-400">Hz</span>
              <span class="font-bold tabular-nums text-white text-xs">×{{ displayTickMult }}</span>
            </div>
            <span class="text-[10px] text-cyan-300/90 font-mono tabular-nums truncate max-w-[60px] sm:max-w-[80px]">
              {{ displayTickCost }}
            </span>
          </div>
        </button>

        <!-- 3. Tümünü Al Butonu — masaüstü üçüncül ghost HUD butonu (mobilde FloatingThumbBar'da yer alır) -->
        <button
          @click="maxAll"
          :disabled="!canAffordAny"
          aria-label="Tüm yükseltmeleri al"
          class="hidden md:flex btn-tactile h-11 px-2.5 sm:px-3 rounded-xl font-bold text-xs tracking-wider items-center gap-1.5 sm:gap-2 transition-all border font-mono shrink-0 min-w-[65px] sm:min-w-[74px]"
          :class="canAffordAny
            ? 'bg-white/[0.08] hover:bg-white/[0.14] text-white border-white/20 cursor-pointer'
            : 'bg-black/30 text-slate-600 border-white/[0.04] cursor-not-allowed opacity-40'"
          v-tip="'Tüm açık boyut ve frekans yükseltmelerini alır'"
        >
          <Layers class="w-4 h-4 text-slate-300 shrink-0" />
          <div class="flex flex-col items-start text-left leading-tight">
            <span class="text-xs font-bold">Tümü</span>
            <span class="text-[10px] text-slate-400 font-normal">Maks Al</span>
          </div>
        </button>

        <!-- 4. Kozmik Çöküş (Tekillik hazır) / Meydan Okumayı Tamamla -->
        <button
          v-if="inChallenge || singularityReady"
          @click="handleSingularity"
          :disabled="inChallenge && !singularityReady"
          aria-label="Kozmik çöküşü başlat veya meydan okumayı tamamla"
          class="btn-tactile h-11 px-2.5 sm:px-3 rounded-xl border text-xs font-bold font-mono flex items-center gap-1.5 cursor-pointer shrink-0 min-w-[70px] sm:min-w-[90px]"
          :class="inChallenge && !singularityReady
            ? 'bg-black/30 text-slate-600 border-white/[0.05] cursor-not-allowed opacity-60'
            : 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-300 shadow-md animate-pulse'"
          v-tip="inChallenge ? challengeTip : singularityTip"
        >
          <Sun class="w-4 h-4 text-slate-950/80 shrink-0" />
          <div class="flex flex-col items-start text-left leading-tight min-w-0">
            <span class="text-[10px] text-slate-950/80 font-normal">{{ inChallenge ? 'Meydan' : 'Tekillik' }}</span>
            <span class="text-xs font-black tabular-nums truncate max-w-[110px] sm:max-w-[150px]">
              {{ inChallenge ? challengeRewardShort : `+${singularityGainText}` }}
            </span>
          </div>
        </button>

      </div>

      <!-- 5. Ayarlar Butonu (Masaüstü) -->
      <button
        @click="emit('open-settings')"
        aria-label="Ayarlar"
        class="hidden md:flex btn-tactile h-11 w-10 sm:w-11 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white border border-white/[0.08] transition-all cursor-pointer items-center justify-center shrink-0"
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
        aria-label="Meydan okumadan vazgeç"
        class="btn-tactile px-2.5 py-1.5 rounded-lg text-[11px] font-bold bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 text-slate-200 cursor-pointer shrink-0"
        v-tip="'Meydan okumadan cezasız vazgeç (koşu sıfırlanır)'"
      >
        Vazgeç
      </button>
    </div>

    <!-- QoL: tekillik onay diyaloğu (native confirm yerine) -->
    <ConfirmModal
      v-if="showSingularityConfirm"
      title="Kozmik Çöküş"
      message="Yutulan kütle ve tüm katmanlar sıfırlanacak; karşılığında kalıcı Tekillik Puanı (SP) kazanacaksın. Hazır mısın?"
      confirm-label="Çöküşü Başlat"
      :danger="false"
      @confirm="store.singularityReset(); showSingularityConfirm = false"
      @cancel="showSingularityConfirm = false"
    />

    <!-- QoL: meydan okuma tamamlama onayı (SP yerine challenge ödülü) -->
    <ConfirmModal
      v-if="showCompleteConfirm && store.activeChallengeDef"
      title="Meydan Okumayı Tamamla"
      :message="`“${store.activeChallengeDef.name}” hedefi tuttu (1.79e308 g Kütle). Koşu sıfırlanacak ve kalıcı ödül kazanacaksın: ${store.activeChallengeDef.rewardDesc}. Onaylıyor musun?`"
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
