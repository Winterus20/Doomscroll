<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useGameStore } from './stores/game'
import { SaveSystem } from './core/save'
import { gameLoop } from './core/game-loop'
import { sounds } from './core/audio'
import { musicEngine } from './core/music-engine'
import JuiceLayer from './components/JuiceLayer.vue'
import Header from './components/Header.vue'
import DimensionsTab from './components/DimensionsTab.vue'
import LabTab from './components/LabTab.vue'
import CrisisTab from './components/CrisisTab.vue'
import AutobuyersTab from './components/AutobuyersTab.vue'
import SingularityTab from './components/SingularityTab.vue'
import ColonyTab from './components/ColonyTab.vue'
import AchievementsTab from './components/AchievementsTab.vue'
import AchievementToast from './components/AchievementToast.vue'
import StatsTab from './components/StatsTab.vue'
import SettingsModal from './components/SettingsModal.vue'
import AnomalyOverlay from './components/AnomalyOverlay.vue'
import AdminPanel from './components/AdminPanel.vue'
import { Layers, BarChart3, Lock, Bot, FlaskConical, Zap, Sunrise, Trophy, Network } from 'lucide-vue-next'
import { nextLocked, unlockProgress } from './game/unlocks'
import { Decimal } from './core/math'
import { formatNumber } from './core/format'

const store = useGameStore()

export type TabId = 'dimensions' | 'lab' | 'crisis' | 'autobuyers' | 'colony' | 'singularity' | 'achievements' | 'stats'

const activeTab = ref<TabId>('dimensions')
const showSettings = ref(false)
const showAdmin = ref(false)
let godmodeBuffer = ''

// Sekme kilit haritası — tek elden senkron (nav + içerik + otomatik geri dönüş)
const tabLocked = computed<Record<TabId, boolean>>(() => ({
  dimensions: false,
  lab: !store.labUnlocked,
  crisis: !store.crisisUnlocked,
  autobuyers: !store.autobuyersUnlocked,
  colony: !store.colonyUnlocked,
  singularity: !store.singularityUnlocked,
  achievements: false,
  stats: false
}))

// Algoritma Lab'da hasada hazır olgun tohum kontrolü
const hasHarvestableTrend = computed(() => {
  return store.labUnlocked && Array.isArray(store.labCells) && store.labCells.some((c) => c.isMature && !!c.seedType)
})

// Kriz sekmesi bildirimi: enerji doluysa ya da ters tepme aktifse
const hasCrisisAlert = computed(() => {
  if (!store.crisisUnlocked) return false
  return store.crisisBackfireDebuff > 0 || store.caffeineEnergy >= store.maxCaffeineEnergy
})

// Bot sekmesi bildirimi: açılabilir kademe ya da satın alınabilir bot varsa
const hasBotAlert = computed(() => {
  if (!store.autobuyersUnlocked) return false
  if (store.canUnlockBulk || store.canUnlockMax) return true
  return false
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
  sounds.playHapticTap()
  activeTab.value = tab
  if (tab === 'achievements') {
    store.markAchievementsSeen()
  }
}

// Prestij sonrası kilitlenen sekmedeysek güvenli sekmeye geri dön
watch(
  () => [store.labUnlocked, store.crisisUnlocked, store.autobuyersUnlocked, store.colonyUnlocked, store.singularityUnlocked].join('|'),
  () => {
    if (tabLocked.value[activeTab.value]) {
      activeTab.value = 'dimensions'
    }
  }
)

// Sonraki Açılacak — Özellik Merdiveni (nav altı bandı)
const nextUnlock = computed(() =>
  nextLocked(store.unlockContext, new Set(store.unlockedFeatures))
)
const nextUnlockProgress = computed(() => {
  const f = nextUnlock.value
  if (!f) return { current: 0, target: 1, percent: 100 }
  const p = unlockProgress(store.unlockContext, f)
  const percent = p.target > 0 ? Math.min(100, Math.max(0, (p.current / p.target) * 100)) : 0
  return { current: p.current, target: p.target, percent }
})
const nextUnlockCurrent = computed(() =>
  formatNumber(new Decimal(nextUnlockProgress.value.current), store.settings.notation, 1)
)
const nextUnlockTarget = computed(() =>
  formatNumber(new Decimal(nextUnlockProgress.value.target), store.settings.notation, 1)
)

// Birleşik nav stilleri — tüm sekmelerde aynı dil
function navClass(isActive: boolean): string {
  return isActive
    ? 'bg-white/[0.08] text-white border border-white/10 shadow-xs'
    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03] border border-transparent'
}

const NAV_BTN =
  'btn-tactile hit-44 shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap'
const NAV_LOCKED =
  'hit-44 shrink-0 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 flex items-center gap-1.5 border border-white/[0.03] bg-black/20 opacity-70 cursor-not-allowed whitespace-nowrap'

// Gizli Admin Paneli: klavyede GODMODE yazınca aç/kapat
function handleGodmode(e: KeyboardEvent) {
  if (e.key === 'Escape' && showAdmin.value) {
    showAdmin.value = false
    return
  }
  if (e.key.length !== 1) return
  godmodeBuffer = (godmodeBuffer + e.key.toLowerCase()).slice(-7)
  if (godmodeBuffer === 'godmode') {
    godmodeBuffer = ''
    showAdmin.value = !showAdmin.value
    sounds.playAnomaly()
  }
}

onMounted(() => {
  // Kaydedilmiş veriyi yükle
  const savedData = SaveSystem.load()
  if (savedData) {
    store.deserialize(savedData)
  }

  // Oyun döngüsünü başlat
  gameLoop.start()

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

  // Sekme kapanırken otomatik kaydet
  window.addEventListener('beforeunload', () => {
    SaveSystem.save(store.serialize())
  })

  // Gizli Admin Paneli: klavyede GODMODE yazınca aç/kapat
  window.addEventListener('keydown', handleGodmode)
})

onUnmounted(() => {
  gameLoop.stop()
  musicEngine.stop()
  window.removeEventListener('keydown', handleGodmode)
})
</script>

<template>
  <div class="min-h-screen bg-[#08090d] text-slate-100 flex flex-col items-center p-3 md:p-6 font-sans relative selection:bg-purple-500/20 selection:text-purple-300 overflow-x-hidden">
    <!-- Floating Dopamin Parçacık Katmanı -->
    <JuiceLayer />

    <!-- Gece Krizleri Overlay'i -->
    <AnomalyOverlay />

    <!-- Başarım Bildirimleri -->
    <AchievementToast />

    <div class="w-full max-w-5xl relative z-10 flex flex-col">
      <!-- Üst Gösterge ve Kontroller -->
      <Header @open-settings="showSettings = true" />

      <!-- Segmented Dock Bar Menüsü (Linear / Apple Kalitesi) -->
      <nav class="p-1 rounded-xl mb-4 flex items-center gap-1 overflow-x-auto w-full border border-white/[0.06] bg-black/60 no-scrollbar" aria-label="Ana sekmeler">
        <!-- Reels Akışı Sekmesi -->
        <button @click="switchTab('dimensions')" :class="[NAV_BTN, navClass(activeTab === 'dimensions')]">
          <Layers class="w-3.5 h-3.5 text-purple-400" />
          <span>Reels</span>
          <span v-if="store.canShift" class="tab-dot tab-dot-purple" v-tip="'Akış Sıçraması hazır'"></span>
        </button>

        <!-- Algoritma Laboratuvarı Sekmesi -->
        <button v-if="store.labUnlocked" @click="switchTab('lab')" :class="[NAV_BTN, navClass(activeTab === 'lab')]">
          <FlaskConical class="w-3.5 h-3.5 text-emerald-400" />
          <span>Lab</span>
          <span v-if="hasHarvestableTrend" class="tab-dot tab-dot-emerald" v-tip="'Hasada hazır trend var'"></span>
        </button>
        <div v-else :class="NAV_LOCKED" v-tip="'D2 (Sokak Lezzeti) formatını 25 adet sahibi ol'">
          <Lock class="w-3 h-3" />
          <span>Lab (D2×25)</span>
        </div>

        <!-- Gece Kriz Yönetimi Sekmesi -->
        <button v-if="store.crisisUnlocked" @click="switchTab('crisis')" :class="[NAV_BTN, navClass(activeTab === 'crisis')]">
          <Zap class="w-3.5 h-3.5 text-cyan-400" />
          <span>Kriz</span>
          <span v-if="hasCrisisAlert" class="tab-dot tab-dot-cyan" v-tip="'Kriz sekmesinde işlem var'"></span>
        </button>
        <div v-else :class="NAV_LOCKED" v-tip="'D4 (Subway Surfers) formatını 10 adet sahibi ol'">
          <Lock class="w-3 h-3" />
          <span>Kriz (D4×10)</span>
        </div>

        <!-- Otomatik Botlar Sekmesi -->
        <button v-if="store.autobuyersUnlocked" @click="switchTab('autobuyers')" :class="[NAV_BTN, navClass(activeTab === 'autobuyers')]">
          <Bot class="w-3.5 h-3.5 text-blue-400" />
          <span>Botlar</span>
          <span v-if="hasBotAlert" class="tab-dot tab-dot-blue" v-tip="'Açılabilir bot kademesi var'"></span>
        </button>
        <div v-else :class="NAV_LOCKED" v-tip="'1M (1e6) Dopamin biriktir'">
          <Lock class="w-3 h-3" />
          <span>Botlar (1M)</span>
        </div>

        <!-- Nöral İzleme Kolonisi Sekmesi -->
        <button v-if="store.colonyUnlocked" @click="switchTab('colony')" :class="[NAV_BTN, navClass(activeTab === 'colony')]">
          <Network class="w-3.5 h-3.5 text-violet-400" />
          <span>Koloni</span>
          <span v-if="store.canPowerNap" class="tab-dot tab-dot-violet" v-tip="'Toplu Uyku hazır'"></span>
        </button>
        <div v-else :class="NAV_LOCKED" v-tip="'1e13 Dopamin ile açılır'">
          <Lock class="w-3 h-3" />
          <span>Koloni (1e13)</span>
        </div>

        <!-- Sabah 06:00 Dükkanı Sekmesi -->
        <button v-if="store.singularityUnlocked" @click="switchTab('singularity')" :class="[NAV_BTN, navClass(activeTab === 'singularity')]">
          <Sunrise class="w-3.5 h-3.5 text-amber-400" />
          <span>Şafak (06:00)</span>
          <span v-if="store.canSingularity" class="tab-dot tab-dot-amber" v-tip="'Tekillik hazır'"></span>
        </button>
        <div v-else :class="NAV_LOCKED" v-tip="'1e30 Dopamine ulaşıldığında görünür hale gelir'">
          <Lock class="w-3 h-3" />
          <span>Şafak (1e30)</span>
        </div>

        <!-- Başarımlar Sekmesi -->
        <button @click="switchTab('achievements')" :class="[NAV_BTN, navClass(activeTab === 'achievements')]">
          <Trophy class="w-3.5 h-3.5 text-amber-400" />
          <span>Plaket</span>
          <span v-if="store.hasUnseenAchievements" class="tab-dot tab-dot-amber" v-tip="'Yeni başarım var'"></span>
        </button>

        <!-- Gece Raporu Sekmesi -->
        <button @click="switchTab('stats')" :class="[NAV_BTN, navClass(activeTab === 'stats'), 'ml-auto']">
          <BarChart3 class="w-3.5 h-3.5 text-slate-400" />
          <span>Rapor</span>
        </button>

        <!-- Kilitli Faz 2 -->
        <div
          class="shrink-0 px-2.5 py-1.5 rounded-lg text-[11px] font-mono text-slate-600 flex items-center gap-1.5 border border-white/[0.02] bg-black/20 opacity-40 cursor-not-allowed whitespace-nowrap"
          v-tip="'Faz 2: Kolektif Nöbet ile açılır'"
        >
          <Lock class="w-3 h-3" />
          <span>Faz 2</span>
        </div>
      </nav>

      <!-- Sonraki Açılacak bandı (Özellik Merdiveni — tek kaynak: game/unlocks.ts) -->
      <div
        v-if="nextUnlock"
        class="mb-4 rounded-xl border border-white/[0.06] bg-black/40 px-3 py-2 flex items-center gap-3"
        v-tip="nextUnlock.hint"
      >
        <div class="min-w-0 flex-1">
          <div class="text-[9px] font-mono text-slate-500 uppercase tracking-widest">Sonraki Açılacak</div>
          <div class="text-xs font-semibold font-mono text-slate-300 truncate">
            {{ nextUnlock.name }}
            <span class="text-slate-500 font-normal">— {{ nextUnlock.hint }}</span>
          </div>
          <div class="progress-track progress-track-sm progress-track-bordered mt-1.5">
            <div
              class="progress-fill progress-fill-slate"
              :style="{ width: `${nextUnlockProgress.percent}%` }"
            ></div>
          </div>
        </div>
        <span class="text-[10px] font-mono text-slate-500 tabular-nums shrink-0">
          {{ nextUnlockCurrent }} / {{ nextUnlockTarget }}
        </span>
      </div>

      <!-- Aktif Sekme İçeriği (tek ritim: space-y-3) -->
      <main class="w-full pb-8">
        <DimensionsTab v-if="activeTab === 'dimensions'" />
        <LabTab v-else-if="activeTab === 'lab' && store.labUnlocked" />
        <CrisisTab v-else-if="activeTab === 'crisis' && store.crisisUnlocked" />
        <AutobuyersTab v-else-if="activeTab === 'autobuyers' && store.autobuyersUnlocked" />
        <ColonyTab v-else-if="activeTab === 'colony' && store.colonyUnlocked" />
        <SingularityTab v-else-if="activeTab === 'singularity' && store.singularityUnlocked" />
        <AchievementsTab v-else-if="activeTab === 'achievements'" />
        <StatsTab v-else-if="activeTab === 'stats'" />
      </main>

      <!-- Ayarlar Modalı -->
      <SettingsModal
        v-if="showSettings"
        @close="showSettings = false"
      />

      <!-- Gizli Admin Paneli (GODMODE) -->
      <AdminPanel
        v-if="showAdmin"
        @close="showAdmin = false"
      />
    </div>
  </div>
</template>
