<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useGameStore } from './stores/game'
import { SaveSystem } from './core/save'
import { gameLoop } from './core/game-loop'
import { sounds } from './core/audio'
import { musicEngine } from './core/music-engine'
import AlgorithmicSwirl from './components/AlgorithmicSwirl.vue'
import JuiceLayer from './components/JuiceLayer.vue'
import SequentialStrikeLayer from './components/SequentialStrikeLayer.vue'
import HeartBurstLayer from './components/HeartBurstLayer.vue'
import CommentTicker from './components/CommentTicker.vue'
import FloatingThumbBar from './components/FloatingThumbBar.vue'
import ScreenOverlay from './components/ScreenOverlay.vue'
import Header from './components/Header.vue'
import DimensionsTab from './components/DimensionsTab.vue'
import LabTab from './components/LabTab.vue'
import CrisisTab from './components/CrisisTab.vue'
import AutobuyersTab from './components/AutobuyersTab.vue'
import SingularityTab from './components/SingularityTab.vue'
import ChallengesTab from './components/ChallengesTab.vue'
import ColonyTab from './components/ColonyTab.vue'
import AchievementsTab from './components/AchievementsTab.vue'
import AchievementToast from './components/AchievementToast.vue'
import StatsTab from './components/StatsTab.vue'
import SettingsModal from './components/SettingsModal.vue'
import WelcomeBackModal from './components/WelcomeBackModal.vue'
import AnomalyOverlay from './components/AnomalyOverlay.vue'
import AdminPanel from './components/AdminPanel.vue'
import AuthModal from './components/AuthModal.vue'
import CloudConflictModal from './components/CloudConflictModal.vue'
import ConfirmModal from './components/ConfirmModal.vue'
import { useAuthStore } from './stores/auth'
import { Layers, BarChart3, Bot, FlaskConical, Zap, Sunrise, Trophy, Network, Swords, Lock } from 'lucide-vue-next'
import { nextLocked, unlockProgressFraction } from './game/unlocks'
import { ARC_LOG10_MAX, bandForLog10, log10Safe } from './game/pacing'

const store = useGameStore()
const authStore = useAuthStore()

export type TabId = 'dimensions' | 'lab' | 'crisis' | 'autobuyers' | 'colony' | 'singularity' | 'challenges' | 'achievements' | 'stats'

const activeTab = ref<TabId>('dimensions')
const navRef = ref<HTMLElement | null>(null)
const showSettings = ref(false)
const showAdmin = ref(false)

// ADR-0044: Mobil ekran tespiti — <nav> dock'unun body'ye teleport edilmesi için
const isMobile = ref(typeof window !== 'undefined' ? window.innerWidth < 768 : false)
let mobileMediaQuery: MediaQueryList | null = null

function handleMediaChange(e: MediaQueryListEvent | MediaQueryList) {
  isMobile.value = e.matches
}

// ADR-0029: bozuk kayıt / gelecek sürüm durumlarını oyuncuya göster
type SaveIssue = { kind: 'future' | 'recovered' | 'lost'; title: string; message: string }
const saveIssue = ref<SaveIssue | null>(null)
let godmodeBuffer = ''
let cloudSyncTimer: number | null = null

/** Sekme tekrar görünür olduğunda yedek bu kadar eskiyse hemen yakalanır. */
const VISIBLE_CATCHUP_MS = 2 * 60 * 1000

// Sekme kilit haritası — tek elden senkron (nav + içerik + otomatik geri dönüş)
const tabLocked = computed<Record<TabId, boolean>>(() => ({
  dimensions: false,
  lab: !store.labUnlocked,
  crisis: !store.crisisUnlocked,
  autobuyers: !store.autobuyersUnlocked,
  colony: !store.colonyUnlocked,
  singularity: !store.singularityUnlocked,
  challenges: !store.challengesUnlocked,
  achievements: false,
  stats: false
}))

// ADR-0032 — "Sonraki Açılacak" bandı.
// Ölçüm (brain/scratchpad/harness/results-308-audit.json) gösterdi ki koşunun
// %81'inde hiçbir yeni içerik açılmıyordu: oyuncu neden üstelendiğini bilmiyordu.
// nextLocked() altyapısı hazırdı ama hiçbir bileşen onu kullanmıyordu.
const nextUnlock = computed(() =>
  nextLocked(store.unlockContext, new Set(store.unlockedFeatures))
)
const nextUnlockPercent = computed(() => {
  const f = nextUnlock.value
  return f ? unlockProgressFraction(store.unlockContext, f) * 100 : 100
})
const nextUnlockLabel = computed(() => {
  const f = nextUnlock.value
  if (!f) return 'Merdiven tamam — şafak eşiğine götürürsün'
  return `${f.name} · ${f.hint}`
})
const arcPercent = computed(() => (log10Safe(store.matter) / ARC_LOG10_MAX) * 100)
const arcBandName = computed(() => bandForLog10(log10Safe(store.matter)).name)

// Algoritma Lab'da hasada hazır olgun tohum kontrolü
const hasHarvestableTrend = computed(() => {
  return store.labUnlocked && Array.isArray(store.labCells) && store.labCells.some((c) => c.isMature && !!c.seedType)
})

// Kriz sekmesi bildirimi: enerji doluysa ya da ters tepme aktifse
const hasCrisisAlert = computed(() => {
  if (!store.crisisUnlocked) return false
  return store.crisisBackfireDebuff > 0 || store.caffeineEnergy >= store.maxCaffeineEnergy
})

// Bot sekmesi bildirimi: açılabilir kademe, satın alınabilir bot ya da kilitli ama şartı+parası hazır bot varsa
const hasBotAlert = computed(() => {
  if (!store.autobuyersUnlocked) return false
  if (store.canUnlockBulk || store.canUnlockMax) return true
  return store.hasAffordableLockedBot
})

// QoL: sekme sırası — 1-9 klavye kısayolları bu sırayla eşleşir
const TAB_ORDER: TabId[] = [
  'dimensions', 'lab', 'crisis', 'autobuyers', 'colony', 'singularity', 'challenges', 'achievements', 'stats'
]

// Açık/kilitsiz olan sekmeler listesi (mobil yatay kaydırma için)
const availableTabs = computed<TabId[]>(() => {
  return TAB_ORDER.filter((id) => !tabLocked.value[id])
})

const slideDirection = ref<'next' | 'prev'>('next')

const transitionName = computed(() => {
  if (store.settings.reduceAnimations) return 'tab-fade'
  return slideDirection.value === 'next' ? 'tab-slide-next' : 'tab-slide-prev'
})

function switchTab(tab: TabId) {
  if (tabLocked.value[tab]) {
    sounds.playClick()
    window.dispatchEvent(
      new CustomEvent('doomscroll:tap', {
        detail: { x: window.innerWidth / 2, y: window.innerHeight * 0.3, text: 'Kilitli' }
      })
    )
    return
  }

  // Geçiş yönünü hesapla: Hedef sekme mevcut sekmeden ileride mi geride mi?
  const oldIdx = TAB_ORDER.indexOf(activeTab.value)
  const newIdx = TAB_ORDER.indexOf(tab)
  if (newIdx !== oldIdx) {
    slideDirection.value = newIdx > oldIdx ? 'next' : 'prev'
  }

  sounds.playHapticTap()
  activeTab.value = tab
  store.setActiveGameTab(tab)
  // ADR-0029: aktif sekmeyi görünür alana getir. Sekme dock'u yatay
  // kaydırılabilir olduğu için (9 sekme 360 px'e sığmıyor), 8. sekmeye tıklayıp
  // onu görünmeyen bir konuma gönderiyordu. Klavye ile de gezilebildiği için
  // davranış yalnızca görsel: scrollIntoView, odağı DEĞİŞTİRMEZ.
  scrollActiveTabIntoView()
  if (tab === 'achievements') {
    store.markAchievementsSeen()
  }
}

/**
 * Mevcut sekmeye göre yön (+1 sonraki, -1 önceki) kadar sekme atlar
 */
function switchTabByOffset(direction: 1 | -1) {
  const tabs = availableTabs.value
  const curIdx = tabs.indexOf(activeTab.value)
  if (curIdx === -1) return
  const nextIdx = curIdx + direction
  if (nextIdx >= 0 && nextIdx < tabs.length) {
    slideDirection.value = direction === 1 ? 'next' : 'prev'
    switchTab(tabs[nextIdx])
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(12)
      } catch {
        /* yoksay */
      }
    }
  }
}

// Plaket toast'undaki "İncele" butonu buraya düşer
function handleGotoAchievements(): void {
  switchTab('achievements')
}

// Mobil Yatay Fiske (Swipe Left / Right) ile Sekme Değiştirme Jestleri
let swipeStartX = 0
let swipeStartY = 0
let swipeStartTime = 0
let swipeScrollStartY = 0

function handleSwipeStart(e: TouchEvent) {
  if (e.touches.length !== 1) return
  if (showSettings.value || showAdmin.value || saveIssue.value) return

  const target = e.target as HTMLElement | null
  // İnteraktif form girdileri, yatay kaydırılabilir dock veya no-swipe alanları hariç
  if (target?.closest('input, textarea, select, .ds-nav-scroll, .no-swipe')) {
    swipeStartTime = 0
    return
  }

  const touch = e.touches[0]
  swipeStartX = touch.clientX
  swipeStartY = touch.clientY
  swipeStartTime = performance.now()
  swipeScrollStartY = window.scrollY || document.documentElement.scrollTop || 0
}

function handleSwipeEnd(e: TouchEvent) {
  if (swipeStartTime === 0) return
  if (e.changedTouches.length !== 1) {
    swipeStartTime = 0
    return
  }

  const touch = e.changedTouches[0]
  const duration = performance.now() - swipeStartTime
  swipeStartTime = 0

  // 1. Dikey sayfa kaydırma kontrolü: Eğer sayfa dikeyde kaydıysa bu bir sayfa kaydırmadır
  const currentScrollY = window.scrollY || document.documentElement.scrollTop || 0
  if (Math.abs(currentScrollY - swipeScrollStartY) > 12) {
    return
  }

  const deltaX = touch.clientX - swipeStartX
  const deltaY = touch.clientY - swipeStartY
  const absX = Math.abs(deltaX)
  const absY = Math.abs(deltaY)
  const velocity = absX / Math.max(duration, 1)

  // 2. Belirgin yatay fiske şartları:
  // - En az 48px yatay mesafe
  // - Yatay yön dikey yönden en az 1.4 kat baskın (absX > absY * 1.4)
  // - Süre 45ms - 420ms arasında
  // - Minimum hız: velocity >= 0.22 px/ms
  if (absX >= 48 && absX > absY * 1.4 && duration >= 45 && duration <= 420 && velocity >= 0.22) {
    if (deltaX < 0) {
      // Sola kaydırma -> Sonraki sekme (Next tab)
      switchTabByOffset(1)
    } else {
      // Sağa kaydırma -> Önceki sekme (Previous tab)
      switchTabByOffset(-1)
    }
  }
}

// Aktif sekme butonunu dock'un görünür alanına kaydırır (kaydırma sadece görsel).
function scrollActiveTabIntoView() {
  nextTick(() => {
    const nav = navRef.value
    if (!nav) return
    const activeBtn = nav.querySelector<HTMLElement>('[aria-current="page"]')
    if (!activeBtn) return
    const navRect = nav.getBoundingClientRect()
    const btnRect = activeBtn.getBoundingClientRect()
    if (btnRect.left < navRect.left || btnRect.right > navRect.right) {
      activeBtn.scrollIntoView({ block: 'nearest', inline: 'center', behavior: 'smooth' })
    }
  })
}

// Prestij sonrası kilitlenen sekmedeysek güvenli sekmeye geri dön
watch(
  () => [store.labUnlocked, store.crisisUnlocked, store.autobuyersUnlocked, store.colonyUnlocked, store.singularityUnlocked, store.challengesUnlocked].join('|'),
  () => {
    if (tabLocked.value[activeTab.value]) {
      activeTab.value = 'dimensions'
      store.setActiveGameTab('dimensions')
    }
  }
)

// Kutlama kapısı senkronu: aktif oyun sekmesi store'da tutulur,
// otomatik olaylar ilgili sekmede değilken sessiz geçer.
watch(
  activeTab,
  (tab) => store.setActiveGameTab(tab),
  { immediate: true }
)

// QoL: animasyon azaltma ayarı — kök elemana sınıf bağlar (style.css: .reduce-anim)
// P0 Balatro: CRT efekti kapalıysa veya animasyon azaltma açıksa body katmanları gizlenir (.crt-off)
function syncEffectClasses() {
  document.documentElement.classList.toggle('reduce-anim', store.settings.reduceAnimations)
  const crtOn = store.settings.crtEffect !== false && !store.settings.reduceAnimations
  document.documentElement.classList.toggle('crt-off', !crtOn)
  document.documentElement.classList.toggle('battery-saver', !!store.settings.batterySaver)
}
watch(
  () => [store.settings.reduceAnimations, store.settings.crtEffect, store.settings.batterySaver],
  () => syncEffectClasses(),
  { immediate: true }
)

// Performans: juice modu sıcak döngüde diskten okunmaz; tek yazan burası.
function syncJuiceMode(mode: string) {
  try {
    localStorage.setItem('doomscroll-juice-mode', mode)
  } catch { /* yoksay */ }
  window.__setJuiceMode?.(mode)
  window.dispatchEvent(new CustomEvent('doomscroll:juice-mode', { detail: mode }))
}
watch(
  () => store.settings.juiceMode,
  (mode) => syncJuiceMode(mode),
  { immediate: true }
)

// Birleşik nav stilleri — tüm sekmelerde aynı dil
function navClass(isActive: boolean): string {
  return isActive
    ? 'bg-white/[0.08] text-white border border-white/10 shadow-xs'
    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03] border border-transparent'
}

const NAV_BTN =
  'btn-tactile hit-44 shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap'

// Gizli Admin Paneli: klavyede GODMODE yazınca aç/kapat + QoL kısayolları (1-9 sekme, M=Tümü, Esc=modal)
function handleGodmode(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    if (showAdmin.value) {
      showAdmin.value = false
      return
    }
    if (showSettings.value) {
      showSettings.value = false
      return
    }
  }
  // Yazı alanlarında kısayol çalışmaz (import/export textarea, admin input'ları, seçim kutuları, düzenlenebilir alanlar)
  const target = e.target as HTMLElement | null
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT' || target.isContentEditable)) return

  // GODMODE gizli kodu kısayollardan ÖNCE kontrol edilir — yoksa 'm' (Max All)
  // kodu böler ve panel asla açılmaz. Kodun öneki yazılırken kısayol tetiklenmez.
  if (e.key.length === 1) {
    const candidate = (godmodeBuffer + e.key.toLowerCase()).slice(-7)
    if (candidate === 'godmode') {
      godmodeBuffer = ''
      showAdmin.value = !showAdmin.value
      sounds.playAnomaly()
      return
    }
    if ('godmode'.startsWith(candidate)) {
      godmodeBuffer = candidate
      return
    }
    godmodeBuffer = candidate
  }

  // Kısayollar kullanıcı ayarlarında devre dışı bırakılmışsa dur
  if (store.settings.hotkeysEnabled === false) return

  // 1-9: sekme değiştir
  const idx = Number(e.key)
  if (Number.isInteger(idx) && idx >= 1 && idx <= TAB_ORDER.length) {
    switchTab(TAB_ORDER[idx - 1])
    return
  }
  if (e.key === 'ArrowLeft') {
    switchTabByOffset(-1)
    return
  }
  if (e.key === 'ArrowRight') {
    switchTabByOffset(1)
    return
  }
  if (e.key.toLowerCase() === 'm') {
    store.maxAll()
    return
  }
}

/**
 * Sekme kapanırken / görünürlük değişince otomatik kaydet ve buluta yakala.
 *
 * ADR-0033: beforeunload içinde başlatılan Firestore yazımı en az bir ağ turu
 * gerektirir; tarayıcı sekmeyi kapatırken uçuştaki isteği iptal eder. O yol
 * "bulut güvencesi" gibi görünüyordu ama gerçekte hiç tamamlanmıyordu.
 * visibilitychange hem daha güvenilir hem de sekme kapatılmadan (arka plana
 * geçerken) tetiklenir, dolayısıyla yazma şansı gerçekten oluşur.
 */
function persistLocalSave(): void {
  SaveSystem.save(store.serialize())
}

function handleVisibilityChange(): void {
  persistLocalSave()
  if (!authStore.isAuthenticated || !authStore.autoSyncEnabled) return
  if (document.visibilityState === 'hidden') {
    // Sekme arka plana geçiyor: son durumu buluta it.
    void authStore.syncBackground()
  } else if (Date.now() - (authStore.lastSyncedAt ?? 0) > VISIBLE_CATCHUP_MS) {
    // Oyuncu geri döndü ve yedek bayat: gecikmeyi kapatmadan hemen yakala.
    void authStore.syncBackground()
  }
}

onMounted(() => {
  // Kaydedilmiş veriyi yükle (ADR-0029: ayrıntılı yükleme — bozuk kayıt ve
  // gelecek sürüm artık SESSİZCE yutulmuyor, oyuncuya bildiriliyor)
  const loadResult = SaveSystem.loadDetailed()
  if (loadResult.futureVersion) {
    saveIssue.value = {
      kind: 'future',
      title: 'Kayıt Bu Sürümden Daha Yeni',
      message: `Bu tarayıcıdaki kayıt v${loadResult.futureVersion.found}, uygulamanın desteklediği sürüm v${loadResult.futureVersion.supported}. Kayıt silinmedi ve karantinaya alındı — ilerlemen korunuyor. Oyunu güncelleyerek devam edebilirsin.`
    }
  } else if (loadResult.state) {
    store.deserialize(loadResult.state)
    if (loadResult.corrupted) {
      saveIssue.value = {
        kind: 'recovered',
        title: 'Bozuk Kayıt Kurtarıldı',
        message: 'Son kayıt okunamadı, bu yüzden otomatik yedeğinden geri yüklendi. Bozuk kayıt ayrıca saklandı — Ayarlar > Kayıt bölümünden inceleyebilirsin.'
      }
    }
  } else if (loadResult.corrupted) {
    saveIssue.value = {
      kind: 'lost',
      title: 'Kayıt Kurtarılamadı',
      message: 'Bu kayıt slotu okunamadı ve yedek de yoktu. Yeni bir oyun başlatıldı. Bozuk kayıt verisi ayrı bir anahtarda saklandı, yeni kayıt onu ezmedi.'
    }
  }

  // Kimlik doğrulama ve bulut servisini dinle
  authStore.init()

  // Oyun döngüsünü başlat
  gameLoop.start()

  // Periyodik otomatik bulut senkronizasyonu (her 5 dakikada bir)
  // ADR-0029: doğrudan saveToCloud() yerine syncBackground() — önce çakışma
  // kontrolü yapar, çakışma varsa yazmaz. Aksi halde boş bir yerel kayıt iyi
  // bulut kaydının üstüne yazılabiliyordu.
  cloudSyncTimer = window.setInterval(() => {
    void authStore.syncBackground()
  }, 5 * 60 * 1000)

  // Tarayıcı Autoplay kısıtı: Kullanıcının ilk tıklamasında/etkileşiminde müziği başlat
  const handleFirstInteraction = () => {
    musicEngine.resumeOnInteraction()
    window.removeEventListener('click', handleFirstInteraction)
    window.removeEventListener('keydown', handleFirstInteraction)
    window.removeEventListener('touchstart', handleFirstInteraction)
  }
  window.addEventListener('click', handleFirstInteraction, { passive: true })
  window.addEventListener('keydown', handleFirstInteraction, { passive: true })
  window.addEventListener('touchstart', handleFirstInteraction, { passive: true })

  document.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('pagehide', persistLocalSave)
  window.addEventListener('beforeunload', persistLocalSave)

  // Mobil ekran tespiti: Tailwind max-md eşiği (< 768px) ile eşleşir
  if (typeof window !== 'undefined' && 'matchMedia' in window) {
    mobileMediaQuery = window.matchMedia('(max-width: 767px)')
    isMobile.value = mobileMediaQuery.matches
    try {
      mobileMediaQuery.addEventListener('change', handleMediaChange)
    } catch {
      mobileMediaQuery.addListener(handleMediaChange)
    }
  }

  // Gizli Admin Paneli: klavyede GODMODE yazınca aç/kapat
  window.addEventListener('keydown', handleGodmode)

  // Plaket toast'undaki "İncele" butonu bu olayı gönderir
  window.addEventListener('uroboros:goto-achievements', handleGotoAchievements)
})

onUnmounted(() => {
  if (mobileMediaQuery) {
    try {
      mobileMediaQuery.removeEventListener('change', handleMediaChange)
    } catch {
      mobileMediaQuery.removeListener(handleMediaChange)
    }
    mobileMediaQuery = null
  }
  if (cloudSyncTimer !== null) {
    clearInterval(cloudSyncTimer)
  }
  gameLoop.stop()
  musicEngine.stop()
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  window.removeEventListener('pagehide', persistLocalSave)
  window.removeEventListener('beforeunload', persistLocalSave)
  window.removeEventListener('keydown', handleGodmode)
  window.removeEventListener('uroboros:goto-achievements', handleGotoAchievements)
})
</script>

<template>
  <div class="min-h-screen bg-[#08090d] text-slate-100 flex flex-col items-center p-3 md:p-6 font-sans relative selection:bg-purple-500/20 selection:text-purple-300 overflow-x-hidden">
    <!-- Balatro Tarzı Canlı Algoritma Girdabı (GLSL Procedural Paint Swirl) -->
    <AlgorithmicSwirl />

    <!-- Floating Dopamin Parçacık Katmanı -->
    <JuiceLayer />

    <!-- Balatro Sütun 2: Sıralı Reels Vuruşu ve Makro Sıçrama Katmanı -->
    <SequentialStrikeLayer />

    <!-- Çift Dokunuş Kalp Patlaması Katmanı -->
    <HeartBurstLayer />

    <!-- Gece Krizleri Overlay'i -->
    <AnomalyOverlay />

    <!-- Doomscroll Gece Ekran Dokuları (Parmak İzi & Kriz Çatlak Camı) -->
    <ScreenOverlay />

    <!-- Başarım Bildirimleri -->
    <AchievementToast />

    <!-- QoL: Çevrimdışı / arka plan yakalama raporu -->
    <WelcomeBackModal v-if="store.settings.offlineProgressModal !== false" />

    <div id="game-main-content" class="w-full max-w-5xl relative z-10 flex flex-col">
      <!-- Antimatter Dimensions Tarzı Kesintisiz Akan Kozmik Canlı Haber Bandı -->
      <CommentTicker v-if="store.settings.newsTickerEnabled !== false" />

      <!-- Üst Gösterge ve Kontroller -->
      <Header
        @open-settings="showSettings = true"
        @open-auth="authStore.openAuthModal()"
      />

      <!-- Kozmik Merdiven & Olay Ufku İlerlemesi (0 → 1.79e308 g) -->
      <div
        class="mb-4 rounded-xl border border-white/[0.08] bg-[#0c1017]/80 backdrop-blur-md px-3.5 py-2.5 shadow-xs"
        v-tip="'Kozmik Ölçek: 0 → 1.79e308 g. Her kademe bir Dekad Yükselişi çarpanı ve yeni bir kuantum/kozmik kilit açılışı getirir.'"
      >
        <div class="flex items-center gap-2 text-[10px] font-mono text-slate-400 mb-1.5">
          <span class="text-cyan-300 font-bold uppercase tracking-wider">{{ arcBandName }}</span>
          <span class="text-slate-600">·</span>
          <span class="text-slate-400">Tekillik Ufku</span>
          <span class="ml-auto tabular-nums font-bold" :class="arcPercent >= 100 ? 'text-amber-300' : 'text-slate-300'">
            <span class="text-slate-600 font-normal mr-1">ufuk</span>{{ arcPercent >= 100 ? 'TEKİLLİK HAZIR' : arcPercent.toFixed(1) + '%' }}
          </span>
        </div>
        <div class="progress-track progress-track-sm progress-track-bordered w-full mb-2">
          <div
            class="progress-fill"
            :style="{
              width: Math.min(100, Math.max(0, arcPercent)) + '%',
              background: 'linear-gradient(to right, #00f0ff, #a855f7, #f59e0b)'
            }"
          ></div>
        </div>
        <div class="flex items-center gap-2 text-[11px] font-mono">
          <Lock class="w-3 h-3 text-slate-500 shrink-0" />
          <span class="text-slate-500 shrink-0">Sıradaki kilit:</span>
          <span class="text-slate-200 truncate min-w-0 font-medium">{{ nextUnlockLabel }}</span>
          <span class="ml-auto shrink-0 tabular-nums font-mono text-cyan-400 font-semibold">
            <span class="text-slate-600 font-normal mr-1">kilit</span>{{ nextUnlockPercent.toFixed(0) }}%
          </span>
        </div>
      </div>

      <!-- Segmented Dock Bar Menüsü (Linear / Apple Kalitesi)
        Mobilde (<768px) body'ye teleport edilir ve alt sabit dock'a dönüşür:
        bu sayede #game-main-content sarsıntı (screen-shake) transform'u aldığında
        containing block viewport'tan kopmaz; tabler asla silinip tekrar gelmez. -->
      <Teleport to="body" :disabled="!isMobile">
        <nav
          ref="navRef"
          class="ds-nav-scroll p-1 rounded-xl mb-4 flex items-center gap-1 overflow-x-auto w-full border border-white/[0.06] bg-black/60 max-md:fixed max-md:bottom-0 max-md:left-0 max-md:right-0 max-md:z-30 max-md:mb-0 max-md:rounded-b-none max-md:rounded-t-2xl max-md:px-2 max-md:py-1.5 max-md:bg-black/85 max-md:border-white/[0.1] max-md:pb-[max(0.375rem,env(safe-area-inset-bottom))]"
          aria-label="Ana sekmeler"
        >
        <!-- Kütle / Katmanlar Sekmesi -->
        <button @click="switchTab('dimensions')" :aria-current="activeTab === 'dimensions' ? 'page' : undefined" :class="[NAV_BTN, navClass(activeTab === 'dimensions')]">
          <Layers class="w-3.5 h-3.5 text-purple-400" />
          <span>Katmanlar</span>
          <span v-if="store.canShift" class="tab-dot tab-dot-purple" v-tip="'Ölçek Sıçraması hazır'"></span>
        </button>

        <!-- Algoritma Laboratuvarı Sekmesi -->
        <button v-if="store.labUnlocked" @click="switchTab('lab')" :aria-current="activeTab === 'lab' ? 'page' : undefined" :class="[NAV_BTN, navClass(activeTab === 'lab')]">
          <FlaskConical class="w-3.5 h-3.5 text-emerald-400" />
          <span>Lab</span>
          <span v-if="hasHarvestableTrend" class="tab-dot tab-dot-emerald" v-tip="'Hasada hazır trend var'"></span>
        </button>

        <!-- Gece Kriz Yönetimi Sekmesi -->
        <button v-if="store.crisisUnlocked" @click="switchTab('crisis')" :aria-current="activeTab === 'crisis' ? 'page' : undefined" :class="[NAV_BTN, navClass(activeTab === 'crisis')]">
          <Zap class="w-3.5 h-3.5 text-cyan-400" />
          <span>Kriz</span>
          <span v-if="hasCrisisAlert" class="tab-dot tab-dot-cyan" v-tip="'Kriz sekmesinde işlem var'"></span>
        </button>

        <!-- Otomatik Botlar Sekmesi -->
        <button v-if="store.autobuyersUnlocked" @click="switchTab('autobuyers')" :aria-current="activeTab === 'autobuyers' ? 'page' : undefined" :class="[NAV_BTN, navClass(activeTab === 'autobuyers')]">
          <Bot class="w-3.5 h-3.5 text-blue-400" />
          <span>{{ store.isAutobuyerCockpitMode ? 'Kokpit' : 'Botlar' }}</span>
          <span v-if="hasBotAlert" class="tab-dot tab-dot-blue" v-tip="'Açılabilir bot kademesi veya alınabilir bot var'"></span>
        </button>

        <!-- Nöral İzleme Kolonisi Sekmesi -->
        <button v-if="store.colonyUnlocked" @click="switchTab('colony')" :aria-current="activeTab === 'colony' ? 'page' : undefined" :class="[NAV_BTN, navClass(activeTab === 'colony')]">
          <Network class="w-3.5 h-3.5 text-violet-400" />
          <span>Koloni</span>
          <span v-if="store.canPowerNap" class="tab-dot tab-dot-violet" v-tip="'Toplu Çöküş hazır'"></span>
        </button>

        <!-- Kozmik Çöküş / Tekillik Sekmesi -->
        <button v-if="store.singularityUnlocked" @click="switchTab('singularity')" :aria-current="activeTab === 'singularity' ? 'page' : undefined" :class="[NAV_BTN, navClass(activeTab === 'singularity')]">
          <Sunrise class="w-3.5 h-3.5 text-amber-400" />
          <span>Tekillik</span>
          <span v-if="store.canSingularity" class="tab-dot tab-dot-amber" v-tip="'Kozmik Çöküş hazır'"></span>
          <span v-else-if="store.hasAffordableNeuralNode" class="tab-dot tab-dot-amber" v-tip="'Alınabilir Nöral Ağaç düğümü var'"></span>
        </button>

        <!-- Gece Kriz Meydan Okumaları Sekmesi -->
        <button v-if="store.challengesUnlocked" @click="switchTab('challenges')" :aria-current="activeTab === 'challenges' ? 'page' : undefined" :class="[NAV_BTN, navClass(activeTab === 'challenges')]">
          <Swords class="w-3.5 h-3.5 text-rose-400" />
          <span>Meydan</span>
          <span v-if="store.activeChallenge" class="tab-dot tab-dot-rose" v-tip="'Aktif meydan okuma var'"></span>
        </button>

        <!-- Başarımlar Sekmesi -->
        <button @click="switchTab('achievements')" :aria-current="activeTab === 'achievements' ? 'page' : undefined" :class="[NAV_BTN, navClass(activeTab === 'achievements')]">
          <Trophy class="w-3.5 h-3.5 text-amber-400" />
          <span>Plaket</span>
          <span v-if="store.hasUnseenAchievements" class="tab-dot tab-dot-amber" v-tip="'Yeni başarım var'"></span>
        </button>

        <!-- Gece Raporu Sekmesi -->
        <button @click="switchTab('stats')" :aria-current="activeTab === 'stats' ? 'page' : undefined" :class="[NAV_BTN, navClass(activeTab === 'stats')]">
          <BarChart3 class="w-3.5 h-3.5 text-slate-400" />
          <span>Rapor</span>
        </button>

        </nav>
      </Teleport>

      <!-- Aktif Sekme İçeriği (tek ritim: space-y-3; mobilde alt dock + floating bar payı eklenir) -->
      <main
        class="w-full pb-8 max-md:pb-36 overflow-x-hidden min-h-[380px]"
        @touchstart.passive="handleSwipeStart"
        @touchend.passive="handleSwipeEnd"
      >
        <Transition :name="transitionName" mode="out-in">
          <DimensionsTab v-if="activeTab === 'dimensions'" key="dimensions" />
          <LabTab v-else-if="activeTab === 'lab' && store.labUnlocked" key="lab" />
          <CrisisTab v-else-if="activeTab === 'crisis' && store.crisisUnlocked" key="crisis" />
          <AutobuyersTab v-else-if="activeTab === 'autobuyers' && store.autobuyersUnlocked" key="autobuyers" />
          <ColonyTab v-else-if="activeTab === 'colony' && store.colonyUnlocked" key="colony" />
          <SingularityTab v-else-if="activeTab === 'singularity' && store.singularityUnlocked" key="singularity" />
          <ChallengesTab v-else-if="activeTab === 'challenges' && store.challengesUnlocked" key="challenges" />
          <AchievementsTab v-else-if="activeTab === 'achievements'" key="achievements" />
          <StatsTab v-else-if="activeTab === 'stats'" key="stats" />
        </Transition>
      </main>
    </div>

    <!-- Mobilde (< 768px) Başparmak Hızlı Aksiyon Alanı (#game-main-content sarsıntısından izole) -->
    <FloatingThumbBar />

    <!-- Ayarlar Modalı (#game-main-content sarsıntısından izole) -->
    <SettingsModal
      v-if="showSettings"
      @close="showSettings = false"
    />

    <!-- Kayıt uyarısı (bozuk kayıt / gelecek sürüm) — ADR-0029 -->
    <ConfirmModal
      v-if="saveIssue"
      :title="saveIssue.title"
      :message="saveIssue.message"
      confirm-label="Anladım"
      @confirm="saveIssue = null"
      @cancel="saveIssue = null"
    />

    <!-- Kimlik Doğrulama & Bulut Modalı -->
    <AuthModal
      v-if="authStore.showAuthModal"
      @close="authStore.closeAuthModal()"
    />

    <!-- Bulut Çakışma Yönetimi Modalı -->
    <CloudConflictModal />

    <!-- Gizli Admin Paneli (GODMODE) -->
    <AdminPanel
      v-if="showAdmin"
      @close="showAdmin = false"
    />
  </div>
</template>

<style scoped>
/* Yönlü Sekme Geçiş Animasyonları (Directional Tab Slide-Fade) */
.tab-slide-next-enter-active,
.tab-slide-next-leave-active,
.tab-slide-prev-enter-active,
.tab-slide-prev-leave-active {
  transition: opacity 0.18s cubic-bezier(0.16, 1, 0.3, 1), transform 0.18s cubic-bezier(0.16, 1, 0.3, 1);
  will-change: opacity, transform;
}

/* Next (Sola Kaydırma / İleri): Eski sekme sola kayar (-20px), yeni sekme sağdan gelir (+20px -> 0) */
.tab-slide-next-enter-from {
  opacity: 0;
  transform: translate3d(20px, 0, 0);
}
.tab-slide-next-leave-to {
  opacity: 0;
  transform: translate3d(-20px, 0, 0);
}

/* Prev (Sağa Kaydırma / Geri): Eski sekme sağa kayar (+20px), yeni sekme soldan gelir (-20px -> 0) */
.tab-slide-prev-enter-from {
  opacity: 0;
  transform: translate3d(-20px, 0, 0);
}
.tab-slide-prev-leave-to {
  opacity: 0;
  transform: translate3d(20px, 0, 0);
}

/* Erişilebilirlik / Animasyon Azaltma (reduceAnimations) Modu */
.tab-fade-enter-active,
.tab-fade-leave-active {
  transition: opacity 0.12s ease;
}
.tab-fade-enter-from,
.tab-fade-leave-to {
  opacity: 0;
}
</style>
