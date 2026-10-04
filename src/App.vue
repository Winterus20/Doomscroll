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
  sounds.playHapticTap()
  activeTab.value = tab
  // ADR-0029: aktif sekmeyi görünür alana getir. Sekme dock'u yatay
  // kaydırılabilir olduğu için (9 sekme 360 px'e sığmıyor), 8. sekmeye tıklayıp
  // onu görünmeyen bir konuma gönderiyordu. Klavye ile de gezilebildiği için
  // davranış yalnızca görsel: scrollIntoView, odağı DEĞİŞTİRMEZ.
  scrollActiveTabIntoView()
  if (tab === 'achievements') {
    store.markAchievementsSeen()
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
    }
  }
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
  // Yazı alanlarında kısayol çalışmaz (import/export textarea, admin input'ları)
  const target = e.target as HTMLElement | null
  if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) return

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

  // Gizli Admin Paneli: klavyede GODMODE yazınca aç/kapat
  window.addEventListener('keydown', handleGodmode)
})

onUnmounted(() => {
  if (cloudSyncTimer !== null) {
    clearInterval(cloudSyncTimer)
  }
  gameLoop.stop()
  musicEngine.stop()
  document.removeEventListener('visibilitychange', handleVisibilityChange)
  window.removeEventListener('pagehide', persistLocalSave)
  window.removeEventListener('beforeunload', persistLocalSave)
  window.removeEventListener('keydown', handleGodmode)
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

    <div class="w-full max-w-5xl relative z-10 flex flex-col">
      <!-- Üst Gösterge ve Kontroller -->
      <Header
        @open-settings="showSettings = true"
        @open-auth="authStore.openAuthModal()"
      />

      <!-- Gece Kuşları Sahte Canlı Yorum Akışı -->
      <CommentTicker />

      <!-- ADR-0032: Dekad Merdiveni — koşunun tamamı ve sıradaki açılış -->
      <div
        class="mb-4 rounded-xl border border-white/[0.06] bg-black/30 px-3 py-2.5"
        v-tip="'Gece 0 → 1.79e308. Her basamak bir Dekad Yükselişi (koşu içi hız) ve yeni bir açılış getirir.'"
      >
        <div class="flex items-center gap-2 text-[10px] font-mono text-slate-500 mb-1.5">
          <span class="text-slate-400 font-semibold">{{ arcBandName }}</span>
          <span class="text-slate-600">·</span>
          <span>Şafak yolu</span>
          <span class="ml-auto tabular-nums">{{ arcPercent >= 100 ? 'TEKİLLİK' : arcPercent.toFixed(0) + '%' }}</span>
        </div>
        <div class="progress-track progress-track-sm progress-track-bordered w-full mb-2">
          <div
            class="progress-fill progress-fill-slate"
            :style="{ width: Math.min(100, Math.max(0, arcPercent)) + '%' }"
          ></div>
        </div>
        <div class="flex items-center gap-2 text-[11px]">
          <Lock class="w-3 h-3 text-slate-500 shrink-0" />
          <span class="text-slate-500 shrink-0">Sonraki açılacak:</span>
          <span class="text-slate-300 truncate min-w-0">{{ nextUnlockLabel }}</span>
          <span class="ml-auto shrink-0 tabular-nums font-mono text-slate-500">
            {{ nextUnlockPercent.toFixed(0) }}%
          </span>
        </div>
      </div>

      <!-- Segmented Dock Bar Menüsü (Linear / Apple Kalitesi)
        Mobilde (<768px) alt sabit dock'a dönüşür: başparmak erişimi + safe-area desteği -->
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
          <span>Botlar</span>
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

      <!-- Aktif Sekme İçeriği (tek ritim: space-y-3; mobilde alt dock + floating bar payı eklenir) -->
      <main class="w-full pb-8 max-md:pb-36">
        <DimensionsTab v-if="activeTab === 'dimensions'" />
        <LabTab v-else-if="activeTab === 'lab' && store.labUnlocked" />
        <CrisisTab v-else-if="activeTab === 'crisis' && store.crisisUnlocked" />
        <AutobuyersTab v-else-if="activeTab === 'autobuyers' && store.autobuyersUnlocked" />
        <ColonyTab v-else-if="activeTab === 'colony' && store.colonyUnlocked" />
        <SingularityTab v-else-if="activeTab === 'singularity' && store.singularityUnlocked" />
        <ChallengesTab v-else-if="activeTab === 'challenges' && store.challengesUnlocked" />
        <AchievementsTab v-else-if="activeTab === 'achievements'" />
        <StatsTab v-else-if="activeTab === 'stats'" />
      </main>

      <!-- Mobilde (< 768px) Başparmak Hızlı Aksiyon Alanı -->
      <FloatingThumbBar />

      <!-- Ayarlar Modalı -->
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
  </div>
</template>
