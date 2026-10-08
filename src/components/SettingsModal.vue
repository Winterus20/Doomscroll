<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, useId, watch } from 'vue'
import { useGameStore } from '../stores/game'
import { SaveSystem, type InspectResult } from '../core/save'
import { useFocusTrap } from '../core/focus-trap'
import { sounds } from '../core/audio'
import { format, formatTime, type NotationType } from '../core/format'
import { Decimal } from '../core/math'
import {
  X,
  Volume2,
  VolumeX,
  Save,
  Download,
  Upload,
  AlertTriangle,
  Hash,
  Radio,
  Disc,
  CloudRain,
  MoonStar,
  Timer,
  Sliders,
  Palette,
  HardDrive,
  Keyboard,
  Info,
  CheckCircle2,
  RotateCcw,
  Copy,
  FolderOpen,
  BatteryCharging,
  Cloud,
  UploadCloud,
  DownloadCloud,
  LogIn,
  Loader2
} from 'lucide-vue-next'
import { MUSIC_TRACKS } from '../core/music-engine'
import type { MusicTrackId, SaveSlotMeta } from '../models/types'
import { useAuthStore } from '../stores/auth'
import { CloudSaveService } from '../core/auth/cloud-save-service'
import ConfirmModal from './ConfirmModal.vue'

const emit = defineEmits<{
  (e: 'close'): void
}>()

const store = useGameStore()
const authStore = useAuthStore()

// Erişilebilirlik: başlık bağlantısı + odak yönetimi.
const titleId = useId()

// Not: Escape ile kapatma App.vue'deki global keydown dinleyicisinde zaten var
// (showAdmin / showSettings kapatılır); burada ikinci bir handler eklenmiyor ki
// tek tuş iki kez kapanma tetiklemesin. İç içe açılan ConfirmModal kendi
// Escape'ini yakalayıp yayılımı durdurur, ayarlar açık kalır.
const { dialogRef } = useFocusTrap(true, { focusDialog: true })

type TabType = 'gameplay' | 'visuals' | 'audio' | 'save' | 'about'
const activeTab = ref<TabType>('gameplay')

// Bildirimler ve Geri Bildirimler
const copyFeedback = ref(false)
const saveFeedback = ref(false)
const downloadFeedback = ref(false)
// setTimeout sızıntısı: tüm geri bildirim zamanlayıcıları takip edilip unmount'ta temizlenir.
const pendingFeedbackTimers: number[] = []
function later(fn: () => void, ms: number): number {
  const id = window.setTimeout(() => {
    const idx = pendingFeedbackTimers.indexOf(id)
    if (idx !== -1) pendingFeedbackTimers.splice(idx, 1)
    fn()
  }, ms)
  pendingFeedbackTimers.push(id)
  return id
}
// İçe aktarma/dosya güvenlik sınırları: 1MB dosya, 500k karakter metin.
const MAX_SAVE_FILE_BYTES = 1_000_000
const MAX_IMPORT_CHARS = 500_000
const importString = ref('')
const importError = ref('')
const importSuccess = ref('')
const importInspection = ref<InspectResult | null>(null)
const showImportConfirm = ref(false)
const showHardResetConfirm = ref(false)
const hardResetConfirmInput = ref('')
const fileInputRef = ref<HTMLInputElement | null>(null)

// Slot verileri
const slotsMeta = ref<SaveSlotMeta[]>([])
const slotActionSuccess = ref('')

// Canlı kayıt telemetrisi
const lastSavedAgoSeconds = ref(0)
let saveTimerInterval: number | null = null

const customUrlInput = ref(store.settings.customAudioUrl || '')
// Modal açıkken store değişirse (başka sekme/senkron) input bayatlamasın.
watch(
  () => store.settings.customAudioUrl,
  (v) => {
    customUrlInput.value = v || ''
  }
)

const notations: Array<{ id: NotationType; label: string; example: string }> = [
  { id: 'standard', label: 'Standart (Harf)', example: '1.23 Qa' },
  { id: 'scientific', label: 'Bilimsel (Scientific)', example: '1.23e45' },
  { id: 'engineering', label: 'Mühendislik', example: '12.3e42' },
  { id: 'logarithm', label: 'Logaritmik', example: 'e45.12' }
]

function refreshSlots() {
  slotsMeta.value = SaveSystem.getAllSlotsMeta()
}

function updateLastSavedCounter() {
  const ts = SaveSystem.lastSaveTimestamp
  if (ts > 0) {
    lastSavedAgoSeconds.value = Math.max(0, Math.floor((Date.now() - ts) / 1000))
  }
}

onMounted(() => {
  refreshSlots()
  updateLastSavedCounter()
  // Modal her açıldığında güncel store değerini yansıt (tek kopya bayatlığı düzeltmesi).
  customUrlInput.value = store.settings.customAudioUrl || ''
  saveTimerInterval = window.setInterval(() => {
    updateLastSavedCounter()
  }, 1000)
})

onUnmounted(() => {
  if (saveTimerInterval !== null) {
    clearInterval(saveTimerInterval)
  }
  for (const id of pendingFeedbackTimers) clearTimeout(id)
  pendingFeedbackTimers.length = 0
})

// --- Oynanış Ayarları ---
function setNotation(type: NotationType) {
  store.settings.notation = type
  sounds.playClick()
}

function setDecimalPlaces(places: number) {
  store.settings.decimalPlaces = places
  sounds.playClick()
}

function toggleConfirmDialogs() {
  store.settings.confirmDialogs = !store.settings.confirmDialogs
  sounds.playClick()
}

function toggleOfflineProgressModal() {
  store.settings.offlineProgressModal = !store.settings.offlineProgressModal
  sounds.playClick()
}

function toggleHotkeys() {
  store.settings.hotkeysEnabled = !store.settings.hotkeysEnabled
  sounds.playClick()
}

// --- Görsel & Performans Ayarları ---
function toggleBatterySaver() {
  store.settings.batterySaver = !store.settings.batterySaver
  sounds.playClick()
}

function toggleAnimations() {
  store.settings.reduceAnimations = !store.settings.reduceAnimations
  sounds.playClick()
}

function setJuiceMode(mode: 'calm' | 'balanced' | 'tilt') {
  store.settings.juiceMode = mode
  sounds.playClick()
}

function toggleCrt() {
  store.settings.crtEffect = !(store.settings.crtEffect ?? true)
  sounds.playClick()
}

function toggleHoloCards() {
  store.settings.holoCardsEnabled = !(store.settings.holoCardsEnabled ?? true)
  sounds.playClick()
}

function toggleScreenOverlay() {
  store.settings.screenOverlayEffects = !(store.settings.screenOverlayEffects ?? true)
  sounds.playClick()
}

function toggleSequentialStrike() {
  store.settings.sequentialStrike = !(store.settings.sequentialStrike ?? true)
  sounds.playClick()
}

function setSwirlShaderQuality(quality: 'off' | 'balanced' | 'high') {
  store.settings.swirlShaderQuality = quality
  sounds.playClick()
}

function toggleFloatingTexts() {
  store.settings.floatingTexts = !(store.settings.floatingTexts ?? true)
  sounds.playClick()
}

function toggleNewsTicker() {
  store.settings.newsTickerEnabled = !(store.settings.newsTickerEnabled ?? true)
  sounds.playClick()
}

function setSwipeSensitivity(val: 'balanced' | 'low' | 'off') {
  store.settings.swipeSensitivity = val
  sounds.playClick()
}

// --- Ses & Lo-Fi Mikser Ayarları ---
function toggleSound() {
  store.settings.soundEnabled = !store.settings.soundEnabled
  sounds.enabled = store.settings.soundEnabled
  if (sounds.enabled) sounds.playClick()
}

function updateVolume(e: Event) {
  const target = e.target as HTMLInputElement
  const val = parseFloat(target.value)
  store.settings.soundVolume = val
  sounds.volume = val
}

function toggleMusic() {
  store.toggleMusic()
  sounds.playClick()
}

function updateMusicVolume(e: Event) {
  const target = e.target as HTMLInputElement
  const val = parseFloat(target.value)
  store.setMusicVolume(val)
}

function selectTrack(trackId: MusicTrackId) {
  store.setMusicTrack(trackId)
  sounds.playClick()
}

function toggleVinyl() {
  store.toggleVinylCrackle()
  sounds.playClick()
}

function toggleRain() {
  store.toggleRain()
  sounds.playClick()
}

function updateRainLevel(e: Event) {
  const target = e.target as HTMLInputElement
  store.setRainLevel(parseFloat(target.value))
}

function updateIntensity(e: Event) {
  const target = e.target as HTMLInputElement
  store.setMusicIntensity(parseFloat(target.value))
  sounds.playClick()
}

function setSleepTimer(minutes: number) {
  store.setSleepTimer(minutes)
  sounds.playClick()
}

function saveCustomUrl() {
  store.setCustomAudioUrl(customUrlInput.value)
  sounds.playClick()
}

// --- Kayıt & Slot Yönetimi ---
function manualSave() {
  const ok = SaveSystem.save(store.serialize(), store.settings.activeSlot)
  saveFeedback.value = true
  later(() => (saveFeedback.value = false), 2000)
  if (!ok) {
    importError.value = 'Kayıt yazılamadı (depolama kotası dolu olabilir)!'
  } else {
    refreshSlots()
    updateLastSavedCounter()
  }
  sounds.playClick()
}

function downloadSaveFile(saveStr: string) {
  const blob = new Blob([saveStr], { type: 'text/plain' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `uroboros-save-slot${store.settings.activeSlot}-${new Date().toISOString().slice(0, 10)}.txt`
  a.click()
  later(() => URL.revokeObjectURL(url), 1000)
  downloadFeedback.value = true
  later(() => (downloadFeedback.value = false), 2500)
}

function exportSave() {
  const saveStr = SaveSystem.exportSave(store.serialize())
  if (navigator.clipboard?.writeText) {
    navigator.clipboard
      .writeText(saveStr)
      .then(() => {
        importSuccess.value = 'Kayıt kodu panoya kopyalandı!'
        copyFeedback.value = true
        later(() => (copyFeedback.value = false), 2000)
        sounds.playClick()
      })
      .catch(() => {
        downloadSaveFile(saveStr)
      })
  } else {
    downloadSaveFile(saveStr)
  }
}

// Dosya seçerek içe aktarma
function triggerFileInput() {
  fileInputRef.value?.click()
}

function handleFileSelect(e: Event) {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]
  if (!file) return

  // Güvenlik: devasa dosya + yanlış tip/uzantı elenir.
  const nameOk = /\.(txt|json)$/i.test(file.name)
  const typeOk = file.type === '' || file.type === 'text/plain' || file.type === 'application/json'
  if (!nameOk || !typeOk) {
    importError.value = 'Yalnızca .txt / .json kayıt dosyası seçin!'
    importSuccess.value = ''
    target.value = ''
    return
  }
  if (file.size > MAX_SAVE_FILE_BYTES) {
    importError.value = 'Dosya çok büyük (sınır 1MB)!'
    importSuccess.value = ''
    target.value = ''
    return
  }

  const reader = new FileReader()
  reader.onerror = () => {
    importError.value = 'Dosya okunamadı, tekrar deneyin!'
    importSuccess.value = ''
    target.value = ''
  }
  reader.onload = (event) => {
    const content = event.target?.result as string
    if (content) {
      const trimmed = content.trim()
      if (trimmed.length > MAX_IMPORT_CHARS) {
        importError.value = 'Kayıt metni çok uzun (sınır 500k karakter)!'
        importSuccess.value = ''
        target.value = ''
        return
      }
      importString.value = trimmed
      onImportInputChanged()
    }
    target.value = ''
  }
  reader.readAsText(file)
}

function onImportInputChanged() {
  importError.value = ''
  importSuccess.value = ''
  if (!importString.value.trim()) {
    importInspection.value = null
    return
  }
  // Textarea yapıştırma yolu da aynı 500k sınırına tabidir (bellek şişmesini önler).
  if (importString.value.length > MAX_IMPORT_CHARS) {
    importInspection.value = null
    importError.value = 'Kayıt metni çok uzun (sınır 500k karakter)!'
    return
  }
  importInspection.value = SaveSystem.inspectSaveString(importString.value)
  if (!importInspection.value.valid) {
    importError.value = importInspection.value.error || 'Geçersiz kayıt dizesi'
  }
}

function requestImport() {
  if (!importString.value.trim()) return
  if (importString.value.length > MAX_IMPORT_CHARS) {
    importError.value = 'Kayıt metni çok uzun (sınır 500k karakter)!'
    return
  }
  onImportInputChanged()
  if (!importInspection.value?.valid) return

  if (store.settings.confirmDialogs) {
    showImportConfirm.value = true
    return
  }
  doImport()
}

function doImport() {
  showImportConfirm.value = false
  if (!importString.value.trim()) return
  const data = SaveSystem.importSave(importString.value)
  if (data) {
    store.deserialize(data)
    SaveSystem.save(store.serialize(), store.settings.activeSlot)
    importString.value = ''
    importInspection.value = null
    importError.value = ''
    importSuccess.value = 'Kayıt başarıyla yüklendi ve kaydedildi!'
    refreshSlots()
    sounds.playClick()
  } else {
    importSuccess.value = ''
    importError.value = 'Geçersiz veya bozuk kayıt dizesi!'
  }
}

// Slot değiştirme
function switchSlot(slot: number) {
  if (slot === store.settings.activeSlot) return
  sounds.playClick()
  store.switchSaveSlot(slot)
}

// Slot kopyalama
function copyCurrentSlotTo(targetSlot: number) {
  if (targetSlot === store.settings.activeSlot) return
  const ok = store.copySaveSlot(store.settings.activeSlot, targetSlot)
  if (ok) {
    slotActionSuccess.value = `Slot ${store.settings.activeSlot}, Slot ${targetSlot}'e başarıyla kopyalandı!`
    refreshSlots()
    later(() => (slotActionSuccess.value = ''), 3000)
    sounds.playClick()
  }
}

// Otomatik yedekten kurtarma
function restoreBackup() {
  const ok = store.restoreFromBackup()
  if (ok) {
    importSuccess.value = 'Otomatik yedekten başarıyla geri dönüldü!'
    refreshSlots()
    sounds.playClick()
  } else {
    importError.value = 'Kullanılabilir bir otomatik yedek bulunamadı!'
  }
}

// Güvenli Hard Reset
const canHardReset = computed(() => {
  return hardResetConfirmInput.value.trim().toUpperCase() === 'RESET'
})

/**
 * Sıfırlamanın kalıcı olması için bulut tarafı da temizlenmeli.
 *
 * ADR-0033: yalnızca `SaveSystem.hardReset()` çağrıldığında buluttaki eski
 * kayıt kalıyordu; 5 dakika sonraki otomatik senkron bir çakışma bulup eski
 * ilerlemeyi geri getiriyordu, yani "sıfırla" işlevi tutmuyordu.
 *
 * Firestore kuralları belge silmeyi (`allow delete: if false`) yasaklıyor;
 * bu yüzden kayıt SİLİNMEZ, sıfırlanmış durumla ÜZERİNE YAZILIR. Referans
 * anahtarları da unutulur ki eski belge "çakışma" üretmesin.
 */
function executeHardReset() {
  if (!canHardReset.value) return
  // Kök neden düzeltmesi (2026-10-04): bellek sıfırlanmadan reload yapılırsa
  // App.vue'daki beforeunload/pagehide → persistLocalSave ESKİ store'u diske
  // geri yazar ve sıfırlama tutmazdı. Önce bellek, sonra disk sıfırlanır.
  store.$reset()
  SaveSystem.hardReset()
  // hardReset bayrağı sonunda kaldırır; reload'a kadar otomatik kayıtları
  // sustur ki yarışta eski durum geri yazılmasın (save() buna saygı duyar).
  SaveSystem.suppressSaves()
  CloudSaveService.forgetAllLocalRevisions()

  if (!authStore.isAuthenticated) {
    window.location.reload()
    return
  }

  const uid = authStore.user?.uid
  if (uid) CloudSaveService.forgetMockCloud(uid)

  // Sıfırlanmış (taze) durumu buluta zorla yaz; ağ patlasa bile reload —
  // eskiden catch yoktu, reject olursa sayfada kalınıyordu.
  authStore.saveToCloud(true).then(
    () => window.location.reload(),
    () => window.location.reload()
  )
}
</script>

<template>
  <div class="layer-modal fixed inset-0 flex items-center justify-center p-3 md:p-4 bg-black/80 backdrop-blur-md z-50" @click.self="emit('close')">
    <div
      ref="dialogRef"
      role="dialog"
      aria-modal="true"
      :aria-labelledby="titleId"
      tabindex="-1"
      class="glass-panel-glow modal-glass w-full max-w-2xl rounded-2xl relative max-h-[92vh] flex flex-col overflow-hidden border border-white/[0.1] shadow-2xl outline-none"
    >
      <!-- Modal Üst Başlık & Telemetri Çubuğu -->
      <div class="p-4 md:px-6 md:pt-5 border-b border-white/[0.08] flex items-center justify-between shrink-0 bg-black/40">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-300">
            <Sliders class="w-4 h-4" />
          </div>
          <div>
            <h3 :id="titleId" class="text-sm font-extrabold text-slate-100 flex items-center gap-2">
              <span>Sistem Ayarları</span>
              <span class="px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-[10px] font-mono text-cyan-300">
                Slot {{ store.settings.activeSlot }} Aktif
              </span>
            </h3>
            <p class="text-[10px] text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
              <span>Otomatik Kayıt:</span>
              <span class="text-emerald-400 font-semibold">{{ lastSavedAgoSeconds }} sn önce</span>
              <span>· 10 sn aralık</span>
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button
            @click="manualSave"
            aria-label="Oyunu hemen kaydet"
            class="btn-tactile px-2.5 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            v-tip="'Anında kaydet'"
          >
            <Save class="w-3.5 h-3.5" />
            <span class="hidden sm:inline">{{ saveFeedback ? 'Kaydedildi!' : 'Kaydet' }}</span>
          </button>

          <button
            @click="emit('close')"
            class="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/[0.08] border border-white/[0.06] transition-all cursor-pointer"
            aria-label="Kapat"
          >
            <X class="w-5 h-5" />
          </button>
        </div>
      </div>

      <!-- Bento Sekmeli Navigasyon Çubuğu -->
      <div class="flex items-center gap-1 p-2 md:px-6 border-b border-white/[0.06] bg-black/50 overflow-x-auto no-scrollbar shrink-0">
        <button
          @click="activeTab = 'gameplay'"
          class="btn-tactile px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer border"
          :class="activeTab === 'gameplay'
            ? 'bg-purple-500/20 text-purple-200 border-purple-500/40 shadow-xs'
            : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03] border-transparent'"
        >
          <Sliders class="w-3.5 h-3.5" />
          <span>Oynanış &amp; QoL</span>
        </button>

        <button
          @click="activeTab = 'visuals'"
          class="btn-tactile px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer border"
          :class="activeTab === 'visuals'
            ? 'bg-cyan-500/20 text-cyan-200 border-cyan-500/40 shadow-xs'
            : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03] border-transparent'"
        >
          <Palette class="w-3.5 h-3.5" />
          <span>Görsel &amp; Ekran</span>
        </button>

        <button
          @click="activeTab = 'audio'"
          class="btn-tactile px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer border"
          :class="activeTab === 'audio'
            ? 'bg-purple-500/20 text-purple-200 border-purple-500/40 shadow-xs'
            : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03] border-transparent'"
        >
          <Radio class="w-3.5 h-3.5" />
          <span>Lo-Fi Radyo &amp; SFX</span>
        </button>

        <button
          @click="activeTab = 'save'"
          class="btn-tactile px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer border"
          :class="activeTab === 'save'
            ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/40 shadow-xs'
            : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03] border-transparent'"
        >
          <HardDrive class="w-3.5 h-3.5" />
          <span>Kayıt &amp; Slotlar</span>
        </button>

        <button
          @click="activeTab = 'about'"
          class="btn-tactile px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap transition-all cursor-pointer border ml-auto"
          :class="activeTab === 'about'
            ? 'bg-slate-500/20 text-slate-200 border-slate-400/40 shadow-xs'
            : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.03] border-transparent'"
        >
          <Keyboard class="w-3.5 h-3.5" />
          <span>Kısayollar</span>
        </button>
      </div>

      <!-- Sekme İçerikleri (Kaydırılabilir Gövde) -->
      <div class="p-4 md:p-6 overflow-y-auto flex-1 space-y-5 custom-scrollbar">
        <!-- =================== SEKME 1: OYNANIŞ & QOL =================== -->
        <div v-if="activeTab === 'gameplay'" class="space-y-4">
          <!-- Sayı Notasyonu -->
          <div class="glass-panel-card p-3.5 rounded-xl">
            <div class="flex items-center gap-2 mb-2.5">
              <Hash class="w-4 h-4 text-cyan-300" />
              <span class="text-xs font-mono font-bold text-slate-200">Sayı Notasyonu</span>
            </div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                v-for="item in notations"
                :key="item.id"
                @click="setNotation(item.id)"
                class="btn-tactile p-2.5 rounded-xl text-left border text-xs font-mono transition-all cursor-pointer flex flex-col justify-between"
                :class="store.settings.notation === item.id
                  ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-200 shadow-xs'
                  : 'bg-black/40 border-white/[0.06] text-slate-400 hover:text-slate-200 hover:border-white/[0.14]'"
              >
                <div class="font-bold flex items-center justify-between">
                  <span>{{ item.label }}</span>
                  <span v-if="store.settings.notation === item.id" class="text-cyan-400 text-[10px]">● Aktif</span>
                </div>
                <div class="text-[10px] text-slate-500 mt-1 tabular-nums">Örn: {{ item.example }}</div>
              </button>
            </div>
          </div>

          <!-- Sayı Hassasiyeti (Ondalık Basamak) -->
          <div class="glass-panel-card p-3.5 rounded-xl flex items-center justify-between">
            <div>
              <div class="text-xs font-mono font-semibold text-slate-200">Sayı Hassasiyeti (Ondalık)</div>
              <div class="text-[10px] text-slate-400 mt-0.5">Büyük sayılarda virgülden sonra kaç basamak gösterilsin</div>
            </div>
            <div class="flex gap-1 bg-black/40 p-1 rounded-lg border border-white/[0.06]">
              <button
                @click="setDecimalPlaces(2)"
                class="px-2.5 py-1 rounded-md text-xs font-mono font-bold transition-all cursor-pointer"
                :class="(store.settings.decimalPlaces ?? 2) === 2 ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'"
              >
                2 Basamak (1.23)
              </button>
              <button
                @click="setDecimalPlaces(3)"
                class="px-2.5 py-1 rounded-md text-xs font-mono font-bold transition-all cursor-pointer"
                :class="(store.settings.decimalPlaces ?? 2) === 3 ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' : 'text-slate-400 hover:text-white'"
              >
                3 Basamak (1.234)
              </button>
            </div>
          </div>

          <!-- Onay Pencereleri -->
          <div class="glass-panel-card p-3.5 rounded-xl flex items-center justify-between">
            <div>
              <div class="text-xs font-mono font-semibold text-slate-200">Kritik Onay Pencereleri</div>
              <div class="text-[10px] text-slate-400 mt-0.5">Sabah 06:00 Çöküşü, Toplu Uyku ve Kayıt Yüklemede onay sor</div>
            </div>
            <button
              @click="toggleConfirmDialogs"
              class="px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer shrink-0 border"
              :class="store.settings.confirmDialogs ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-black/40 text-slate-500 border-white/[0.06]'"
            >
              {{ store.settings.confirmDialogs ? 'Açık' : 'Kapalı' }}
            </button>
          </div>

          <!-- Çevrimdışı İlerleme Karşılama Ekranı -->
          <div class="glass-panel-card p-3.5 rounded-xl flex items-center justify-between">
            <div>
              <div class="text-xs font-mono font-semibold text-slate-200">Çevrimdışı İlerleme Bildirimi</div>
              <div class="text-[10px] text-slate-400 mt-0.5">Oyuna dönüldüğünde kazanılan kütle raporunu aç</div>
            </div>
            <button
              @click="toggleOfflineProgressModal"
              class="px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer shrink-0 border"
              :class="(store.settings.offlineProgressModal !== false) ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-black/40 text-slate-500 border-white/[0.06]'"
            >
              {{ (store.settings.offlineProgressModal !== false) ? 'Açık' : 'Kapalı' }}
            </button>
          </div>

          <!-- Klavye Kısayolları -->
          <div class="glass-panel-card p-3.5 rounded-xl flex items-center justify-between">
            <div>
              <div class="text-xs font-mono font-semibold text-slate-200">Klavye Kısayolları</div>
              <div class="text-[10px] text-slate-400 mt-0.5">1-9 sekme geçişi, M (Max All), Space (Kaydır) tuşları</div>
            </div>
            <button
              @click="toggleHotkeys"
              class="px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer shrink-0 border"
              :class="(store.settings.hotkeysEnabled !== false) ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-black/40 text-slate-500 border-white/[0.06]'"
            >
              {{ (store.settings.hotkeysEnabled !== false) ? 'Açık' : 'Kapalı' }}
            </button>
          </div>
        </div>

        <!-- =================== SEKME 2: GÖRSEL & EKRAN =================== -->
        <div v-else-if="activeTab === 'visuals'" class="space-y-4">
          <!-- Pil & Performans Tasarrufu -->
          <div class="glass-panel-card p-3.5 rounded-xl flex items-center justify-between bg-gradient-to-r from-emerald-500/[0.08] to-transparent border-emerald-500/30">
            <div class="flex items-center gap-2.5">
              <div class="p-1.5 rounded-lg bg-emerald-500/20 text-emerald-300">
                <BatteryCharging class="w-4 h-4" />
              </div>
              <div>
                <div class="text-xs font-mono font-bold text-emerald-200">Pil &amp; Düşük GPU Tasarrufu</div>
                <div class="text-[10px] text-slate-400 mt-0.5">Neon blur ve ağır filtreleri kapatarak CPU/GPU yükünü en aza indirir</div>
              </div>
            </div>
            <button
              @click="toggleBatterySaver"
              class="px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer shrink-0 border"
              :class="store.settings.batterySaver ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-black/40 text-slate-500 border-white/[0.06]'"
            >
              {{ store.settings.batterySaver ? 'Aktif' : 'Kapalı' }}
            </button>
          </div>

          <!-- Animasyon Seviyesi -->
          <div class="glass-panel-card p-3.5 rounded-xl flex items-center justify-between">
            <div>
              <div class="text-xs font-mono font-semibold text-slate-200">Animasyonları Azalt</div>
              <div class="text-[10px] text-slate-400 mt-0.5">Nabız, titreşim ve parıltı animasyonlarını hafifletir</div>
            </div>
            <button
              @click="toggleAnimations"
              class="px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer shrink-0 border"
              :class="store.settings.reduceAnimations ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-black/40 text-slate-500 border-white/[0.06]'"
            >
              {{ store.settings.reduceAnimations ? 'Azaltıldı' : 'Tam Animasyon' }}
            </button>
          </div>

          <!-- Balatro Juice Modu -->
          <div class="glass-panel-card p-3.5 rounded-xl">
            <div class="flex items-center justify-between mb-2">
              <div class="text-xs font-mono font-semibold text-slate-200">Balatro Juice &amp; Taktil Geri Bildirim</div>
              <span class="text-[10px] font-mono text-purple-300">Tıklama darbeleri ve dinamizm</span>
            </div>
            <div class="grid grid-cols-3 gap-2">
              <button
                @click="setJuiceMode('calm')"
                class="btn-tactile p-2 rounded-xl text-center border text-xs font-mono font-bold transition-all cursor-pointer"
                :class="(store.settings.juiceMode ?? 'balanced') === 'calm'
                  ? 'bg-slate-500/20 text-slate-200 border-slate-400/40'
                  : 'bg-black/40 text-slate-500 border-white/[0.06] hover:text-slate-300'"
              >
                Sade (Calm)
              </button>
              <button
                @click="setJuiceMode('balanced')"
                class="btn-tactile p-2 rounded-xl text-center border text-xs font-mono font-bold transition-all cursor-pointer"
                :class="(store.settings.juiceMode ?? 'balanced') === 'balanced'
                  ? 'bg-purple-500/20 text-purple-200 border-purple-500/40'
                  : 'bg-black/40 text-slate-500 border-white/[0.06] hover:text-slate-300'"
              >
                Dengeli (Önerilen)
              </button>
              <button
                @click="setJuiceMode('tilt')"
                class="btn-tactile p-2 rounded-xl text-center border text-xs font-mono font-bold transition-all cursor-pointer"
                :class="(store.settings.juiceMode ?? 'balanced') === 'tilt'
                  ? 'bg-rose-500/20 text-rose-200 border-rose-500/40'
                  : 'bg-black/40 text-slate-500 border-white/[0.06] hover:text-slate-300'"
              >
                Full Tilt (Parti)
              </button>
            </div>
          </div>

          <!-- Balatro Paint Swirl Shader Mimarisi -->
          <div class="glass-panel-card p-3.5 rounded-xl flex flex-col gap-2">
            <div class="flex items-center justify-between">
              <div>
                <div class="text-xs font-mono font-semibold text-slate-200">Algoritma Arka Plan Girdabı (Balatro Swirl)</div>
                <div class="text-[10px] text-slate-400 mt-0.5">Frekans (Hz) ve krizlerle dalgalanan canlı GLSL akışkan shader</div>
              </div>
            </div>
            <div class="grid grid-cols-3 gap-2 mt-1">
              <button
                @click="setSwirlShaderQuality('high')"
                class="btn-tactile p-2 rounded-xl text-center border text-xs font-mono font-bold transition-all cursor-pointer"
                :class="(store.settings.swirlShaderQuality ?? 'balanced') === 'high'
                  ? 'bg-purple-500/20 text-purple-200 border-purple-500/40'
                  : 'bg-black/40 text-slate-500 border-white/[0.06] hover:text-slate-300'"
              >
                Yüksek (0.75x)
              </button>
              <button
                @click="setSwirlShaderQuality('balanced')"
                class="btn-tactile p-2 rounded-xl text-center border text-xs font-mono font-bold transition-all cursor-pointer"
                :class="(store.settings.swirlShaderQuality ?? 'balanced') === 'balanced'
                  ? 'bg-cyan-500/20 text-cyan-200 border-cyan-500/40'
                  : 'bg-black/40 text-slate-500 border-white/[0.06] hover:text-slate-300'"
              >
                Dengeli (0.5x Retro)
              </button>
              <button
                @click="setSwirlShaderQuality('off')"
                class="btn-tactile p-2 rounded-xl text-center border text-xs font-mono font-bold transition-all cursor-pointer"
                :class="(store.settings.swirlShaderQuality ?? 'balanced') === 'off'
                  ? 'bg-rose-500/20 text-rose-200 border-rose-500/40'
                  : 'bg-black/40 text-slate-500 border-white/[0.06] hover:text-slate-300'"
              >
                Kapalı (Statik)
              </button>
            </div>
          </div>

          <!-- Kozmik CRT Scanline -->
          <div class="glass-panel-card p-3.5 rounded-xl flex items-center justify-between">
            <div>
              <div class="text-xs font-mono font-semibold text-slate-200">Kozmik CRT Scanline &amp; Vinyet</div>
              <div class="text-[10px] text-slate-400 mt-0.5">Eski tüplü televizyon ve retro cyberpunk dokusu</div>
            </div>
            <button
              @click="toggleCrt"
              class="px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer shrink-0 border"
              :class="(store.settings.crtEffect ?? true) ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' : 'bg-black/40 text-slate-500 border-white/[0.06]'"
            >
              {{ (store.settings.crtEffect ?? true) ? 'Açık' : 'Kapalı' }}
            </button>
          </div>

          <!-- 3D Kart & Holo Kaplamaları -->
          <div class="glass-panel-card p-3.5 rounded-xl flex items-center justify-between">
            <div>
              <div class="text-xs font-mono font-semibold text-slate-200">3D Kart &amp; Holografik Kaplamalar</div>
              <div class="text-[10px] text-slate-400 mt-0.5">Kartlarda fareyi takip eden 3D eğilme ve foil/holo parıltısı</div>
            </div>
            <button
              @click="toggleHoloCards"
              class="px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer shrink-0 border"
              :class="(store.settings.holoCardsEnabled ?? true) ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : 'bg-black/40 text-slate-500 border-white/[0.06]'"
            >
              {{ (store.settings.holoCardsEnabled ?? true) ? 'Açık' : 'Kapalı' }}
            </button>
          </div>

          <!-- Laboratuvar Ekran Dokuları -->
          <div class="glass-panel-card p-3.5 rounded-xl flex items-center justify-between">
            <div>
              <div class="text-xs font-mono font-semibold text-slate-200">Laboratuvar Ekran Dokuları (Optik / Çatlak)</div>
              <div class="text-[10px] text-slate-400 mt-0.5">Taktil başparmak izi lekesi ve kriz anlarında cam çatlağı</div>
            </div>
            <button
              @click="toggleScreenOverlay"
              class="px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer shrink-0 border"
              :class="(store.settings.screenOverlayEffects ?? true) ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-black/40 text-slate-500 border-white/[0.06]'"
            >
              {{ (store.settings.screenOverlayEffects ?? true) ? 'Açık' : 'Kapalı' }}
            </button>
          </div>

          <!-- Balatro Sütun 2: Sıralı Çekim Vuruşu -->
          <div class="glass-panel-card p-3.5 rounded-xl flex items-center justify-between">
            <div>
              <div class="text-xs font-mono font-semibold text-slate-200">Sıralı Çekim Vuruşu (Balatro Pop-Chain)</div>
              <div class="text-[10px] text-slate-400 mt-0.5">Kütle yutmada çarpanların sırayla patladığı görsel kaskad ve yükselen ses arpeji</div>
            </div>
            <button
              @click="toggleSequentialStrike"
              class="px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer shrink-0 border"
              :class="(store.settings.sequentialStrike ?? true) ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' : 'bg-black/40 text-slate-500 border-white/[0.06]'"
            >
              {{ (store.settings.sequentialStrike ?? true) ? 'Açık' : 'Kapalı' }}
            </button>
          </div>

          <!-- Uçan Yazılar & Efektler -->
          <div class="glass-panel-card p-3.5 rounded-xl flex items-center justify-between">
            <div>
              <div class="text-xs font-mono font-semibold text-slate-200">Uçan Kütle / Kazanç Sayıları</div>
              <div class="text-[10px] text-slate-400 mt-0.5">Yutma ve kriz tıklamalarında beliren +Kütle yazılarını göster</div>
            </div>
            <button
              @click="toggleFloatingTexts"
              class="px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer shrink-0 border"
              :class="(store.settings.floatingTexts ?? true) ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : 'bg-black/40 text-slate-500 border-white/[0.06]'"
            >
              {{ (store.settings.floatingTexts ?? true) ? 'Açık' : 'Kapalı' }}
            </button>
          </div>

          <!-- Haber Bandı (News Ticker) -->
          <div class="glass-panel-card p-3.5 rounded-xl flex items-center justify-between">
            <div>
              <div class="text-xs font-mono font-semibold text-slate-200">Kozmik Telemetri Haber Bandı</div>
              <div class="text-[10px] text-slate-400 mt-0.5">Üstte akan laboratuvar ve kozmik haber bandı</div>
            </div>
            <button
              @click="toggleNewsTicker"
              class="px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer shrink-0 border"
              :class="(store.settings.newsTickerEnabled ?? true) ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' : 'bg-black/40 text-slate-500 border-white/[0.06]'"
            >
              {{ (store.settings.newsTickerEnabled ?? true) ? 'Açık' : 'Kapalı' }}
            </button>
          </div>

          <!-- Mobil Ekran Kaydırma & Fiske Jest Hassasiyeti -->
          <div class="glass-panel-card p-3.5 rounded-xl space-y-2.5">
            <div class="flex items-center justify-between">
              <div>
                <div class="text-xs font-mono font-semibold text-slate-200">Mobil Ekran Jest Hassasiyeti</div>
                <div class="text-[10px] text-slate-400 mt-0.5">Ekranda yukarı kaydırarak manuel kütle üretme jesti</div>
              </div>
            </div>
            <div class="grid grid-cols-3 gap-1.5 pt-0.5">
              <button
                type="button"
                @click="setSwipeSensitivity('balanced')"
                class="px-2 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-all text-center cursor-pointer"
                :class="(store.settings.swipeSensitivity ?? 'balanced') === 'balanced' ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40' : 'bg-black/40 text-slate-400 border-white/[0.06] hover:text-slate-200'"
              >
                Dengeli
              </button>
              <button
                type="button"
                @click="setSwipeSensitivity('low')"
                class="px-2 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-all text-center cursor-pointer"
                :class="store.settings.swipeSensitivity === 'low' ? 'bg-amber-500/20 text-amber-300 border-amber-500/40' : 'bg-black/40 text-slate-400 border-white/[0.06] hover:text-slate-200'"
              >
                Düşük (Sert)
              </button>
              <button
                type="button"
                @click="setSwipeSensitivity('off')"
                class="px-2 py-1.5 rounded-lg text-xs font-mono font-semibold border transition-all text-center cursor-pointer"
                :class="store.settings.swipeSensitivity === 'off' ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-black/40 text-slate-400 border-white/[0.06] hover:text-slate-200'"
              >
                Kapalı
              </button>
            </div>
            <div class="text-[10px] text-slate-400 font-mono">
              {{ (store.settings.swipeSensitivity ?? 'balanced') === 'off' ? 'Jest kapalı: Sayfa kaydırırken asla tıklama yapmaz. Yalnızca butonla yutulur.' : (store.settings.swipeSensitivity ?? 'balanced') === 'low' ? 'Düşük hassasiyet: Yalnızca hızlı ve sert fiske hareketleri kabul edilir.' : 'Dengeli: Sayfa kaydırmaları elenir; kasıtlı hızlı fiskeler kütle üretir.' }}
            </div>
          </div>
        </div>

        <!-- =================== SEKME 3: LO-FI RADYO & SFX =================== -->
        <div v-else-if="activeTab === 'audio'" class="space-y-4">
          <!-- Lo-Fi Radyo & Ambient Müzik -->
          <div class="glass-panel-card p-3.5 rounded-xl">
            <div class="flex items-center justify-between mb-3">
              <div class="flex items-center gap-2">
                <Radio class="w-4 h-4 text-purple-400" />
                <span class="text-xs font-mono font-bold text-slate-200">Lo-Fi Radyo &amp; Müzik Motoru</span>
              </div>
              <button
                @click="toggleMusic"
                class="px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer border"
                :class="store.settings.musicEnabled ? 'bg-purple-500/20 text-purple-300 border-purple-500/40' : 'bg-black/40 text-slate-500 border-white/[0.06]'"
              >
                {{ store.settings.musicEnabled ? 'Açık' : 'Kapalı' }}
              </button>
            </div>

            <!-- Ses Seviyesi Slider'ı -->
            <div class="mb-3.5">
              <div class="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                <span>Radyo Ses Düzeyi</span>
                <span class="text-purple-300 font-bold tabular-nums">%{{ Math.round(store.settings.musicVolume * 100) }}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                :value="store.settings.musicVolume"
                @input="updateMusicVolume"
                :disabled="!store.settings.musicEnabled"
                class="w-full accent-purple-500 cursor-pointer h-1.5 bg-black/40 rounded-lg"
              />
            </div>

            <!-- İstasyon Seçimi -->
            <div class="space-y-1.5 mb-3">
              <div class="text-[11px] font-mono text-slate-400">Radyo İstasyonu</div>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  v-for="track in MUSIC_TRACKS"
                  :key="track.id"
                  @click="selectTrack(track.id)"
                  class="btn-tactile p-2.5 rounded-xl text-left border text-xs font-mono transition-all cursor-pointer flex flex-col justify-between"
                  :class="store.settings.musicTrack === track.id
                    ? 'bg-purple-500/15 border-purple-500/50 text-purple-200 shadow-xs'
                    : 'bg-black/40 border-white/[0.06] text-slate-400 hover:text-slate-200 hover:border-white/[0.14]'"
                >
                  <div class="flex items-center gap-1.5 font-bold text-white text-[12px]">
                    <span>{{ track.icon }}</span>
                    <span class="truncate">{{ track.name }}</span>
                    <span v-if="track.bpm > 0" class="ml-auto shrink-0 px-1.5 py-0.5 rounded-md bg-black/40 border border-white/10 text-[10px] font-mono text-cyan-300 tabular-nums">{{ track.bpm }} BPM</span>
                  </div>
                  <div class="text-[10px] text-slate-400 mt-1 line-clamp-1">{{ track.subtitle }}</div>
                  <div class="text-[9px] text-slate-500 mt-0.5 line-clamp-1">{{ track.description }}</div>
                </button>
              </div>
            </div>

            <!-- Özel Stream URL -->
            <div v-if="store.settings.musicTrack === 'custom'" class="mb-3 space-y-1.5 p-3 rounded-xl bg-purple-500/[0.07] border border-purple-500/30">
              <div class="text-[11px] font-mono text-purple-300 font-bold">Harici Ses / Stream URL</div>
              <div class="flex gap-2">
                <input
                  v-model="customUrlInput"
                  type="text"
                  placeholder="https://.../stream.mp3"
                  class="flex-1 bg-black/40 border border-white/[0.08] rounded-lg px-2.5 py-1.5 text-xs font-mono text-slate-200 focus:outline-none focus:border-purple-400"
                />
                <button
                  @click="saveCustomUrl"
                  class="px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-mono text-xs font-bold transition-all cursor-pointer"
                >
                  Kaydet
                </button>
              </div>
            </div>

            <!-- Kozmik Rezonans Sıcaklığı (Filtre Cutoff) -->
            <div class="mb-3">
              <div class="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
                <span class="flex items-center gap-1"><MoonStar class="w-3 h-3 text-purple-400" /> Kozmik Rezonans Sıcaklığı (Filtre Yoğunluğu)</span>
                <span class="text-purple-300 font-bold tabular-nums">%{{ Math.round(store.settings.musicIntensity * 100) }}</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                :value="store.settings.musicIntensity"
                @change="updateIntensity"
                :disabled="!store.settings.musicEnabled"
                class="w-full accent-purple-400 cursor-pointer h-1.5 bg-black/40 rounded-lg"
              />
              <p class="text-[10px] text-slate-500 mt-1">Daha boğuk ve derin kozmik ton için frekansı yumuşatır.</p>
            </div>

            <!-- Uyku Zamanlayıcısı -->
            <div class="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/[0.06]">
              <div class="flex items-center gap-2">
                <Timer class="w-4 h-4 text-cyan-400/80" />
                <div>
                  <div class="text-xs font-mono font-medium text-slate-300">Uyku Zamanlayıcısı</div>
                  <div class="text-[10px] text-slate-500">Süre bitince 3 sn fade-out ile otomatik kapanır</div>
                </div>
              </div>
              <div class="flex gap-1">
                <button
                  v-for="m in [0, 15, 30, 60]"
                  :key="m"
                  @click="setSleepTimer(m)"
                  class="px-2 py-1 rounded-lg text-[11px] font-mono font-bold transition-all cursor-pointer border"
                  :class="store.settings.sleepTimerMinutes === m ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' : 'bg-black/40 text-slate-500 border-white/[0.06]'"
                >
                  {{ m === 0 ? 'Kapalı' : m + 'dk' }}
                </button>
              </div>
            </div>
          </div>

          <!-- SFX Synthesizer -->
          <div class="glass-panel-card p-3.5 rounded-xl">
            <div class="flex items-center justify-between mb-3">
              <label class="flex items-center gap-2">
                <component :is="store.settings.soundEnabled ? Volume2 : VolumeX" class="w-4 h-4 text-cyan-300" />
                <span class="text-xs font-mono font-bold text-slate-200">Ses Efektleri (SFX Synthesizer)</span>
              </label>
              <button
                @click="toggleSound"
                class="px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer border"
                :class="store.settings.soundEnabled ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40' : 'bg-black/40 text-slate-500 border-white/[0.06]'"
              >
                {{ store.settings.soundEnabled ? 'Açık' : 'Kapalı' }}
              </button>
            </div>

            <div class="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
              <span>Efekt Ses Düzeyi</span>
              <span class="text-cyan-300 font-bold tabular-nums">%{{ Math.round(store.settings.soundVolume * 100) }}</span>
            </div>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              :value="store.settings.soundVolume"
              @input="updateVolume"
              :disabled="!store.settings.soundEnabled"
              class="w-full accent-cyan-300 cursor-pointer h-1.5 bg-black/40 rounded-lg"
            />
          </div>

          <!-- Çevre Sesleri Mikseri (Yağmur & Vinil) -->
          <div class="glass-panel-card p-3.5 rounded-xl space-y-3">
            <div class="flex items-center gap-2">
              <CloudRain class="w-4 h-4 text-sky-400" />
              <span class="text-xs font-mono font-bold text-slate-200">Çevre Sesleri Mikseri</span>
            </div>

            <!-- Pencerede Yağmur -->
            <div class="p-2.5 rounded-xl bg-black/40 border border-white/[0.06]">
              <div class="flex items-center justify-between">
                <div>
                  <div class="text-xs font-mono font-medium text-slate-300">Pencerede Yağmur</div>
                  <div class="text-[10px] text-slate-500">Kozmik arka plan ışıması ve kuantum beyaz gürültüsü</div>
                </div>
                <button
                  @click="toggleRain"
                  class="px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer shrink-0 border"
                  :class="store.settings.rainEnabled ? 'bg-sky-500/20 text-sky-300 border-sky-500/30' : 'bg-black/40 text-slate-500 border-white/[0.06]'"
                >
                  {{ store.settings.rainEnabled ? 'Açık' : 'Kapalı' }}
                </button>
              </div>
              <div v-if="store.settings.rainEnabled" class="mt-2 flex items-center gap-2">
                <span class="text-[10px] font-mono text-slate-500">Hafif</span>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  :value="store.settings.rainLevel"
                  @input="updateRainLevel"
                  class="flex-1 accent-sky-400 cursor-pointer h-1.5 bg-black/40 rounded-lg"
                />
                <span class="text-[10px] font-mono text-slate-500">Yoğun</span>
              </div>
            </div>

            <!-- Vinil Çıtırtısı -->
            <div class="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/[0.06]">
              <div class="flex items-center gap-2">
                <Disc class="w-4 h-4 text-amber-400/80" />
                <div>
                  <div class="text-xs font-mono font-medium text-slate-300">Analog Vinil / Kaset Cızırtısı</div>
                  <div class="text-[10px] text-slate-500">Kozmik sıcaklık için pembe gürültü ve analog çıtırtı</div>
                </div>
              </div>
              <button
                @click="toggleVinyl"
                class="px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer shrink-0 border"
                :class="store.settings.vinylCrackle ? 'bg-amber-500/20 text-amber-300 border-amber-500/30' : 'bg-black/40 text-slate-500 border-white/[0.06]'"
              >
                {{ store.settings.vinylCrackle ? 'Açık' : 'Kapalı' }}
              </button>
            </div>
          </div>
        </div>

        <!-- =================== SEKME 4: KAYIT & SLOTLAR =================== -->
        <div v-else-if="activeTab === 'save'" class="space-y-4">
          
          <!-- Bulut Senkronizasyon & Hesap Kartı -->
          <div class="glass-panel-card p-4 rounded-xl border border-cyan-500/30 bg-cyan-950/20 relative overflow-hidden">
            <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.06]">
              <div class="flex items-center gap-2.5">
                <div class="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                  <Cloud class="w-5 h-5" />
                </div>
                <div>
                  <div class="flex items-center gap-2">
                    <span class="text-xs font-mono font-bold text-white">Bulut Senkronizasyonu (Cloud Save)</span>
                    <span
                      v-if="authStore.isAuthenticated"
                      class="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-mono font-bold border border-emerald-500/30"
                    >
                      Aktif
                    </span>
                    <span
                      v-else
                      class="px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[9px] font-mono border border-slate-700"
                    >
                      Misafir
                    </span>
                  </div>
                  <p class="text-[11px] text-slate-400 mt-0.5">
                    {{ authStore.isAuthenticated ? `Bağlı Hesap: ${authStore.userDisplayName} (${authStore.userEmail || 'Google'})` : 'Kayıtlarınızı buluta bağlayarak cihazlar arası veri kaybını önleyin.' }}
                  </p>
                </div>
              </div>

              <!-- Hesap Yönetimi / Giriş Butonu -->
              <button
                @click="authStore.openAuthModal()"
                class="px-3 py-1.5 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1.5 shrink-0"
                :class="authStore.isAuthenticated ? 'bg-dark-900 border-cyan-500/40 text-cyan-300 hover:bg-dark-800' : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-md shadow-cyan-500/20'"
              >
                <LogIn v-if="!authStore.isAuthenticated" class="w-3.5 h-3.5" />
                <span>{{ authStore.isAuthenticated ? 'Bulut Paneli / Çıkış' : 'Giriş Yap / Kaydol' }}</span>
              </button>
            </div>

            <!-- Giriş yapılmışsa hızlı aksiyonlar -->
            <div v-if="authStore.isAuthenticated" class="mt-3 pt-1 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div class="text-[11px] text-slate-400 font-mono">
                Buluttaki Son Kayıt:
                <span class="text-slate-200 font-semibold">
                  {{ authStore.cloudMeta ? format(new Decimal(authStore.cloudMeta.matter), 2, store.settings.notation) + ' g Kütle' : 'Henüz yok' }}
                </span>
              </div>
              <div class="flex items-center gap-2">
                <button
                  @click="authStore.saveToCloud(true)"
                  :disabled="authStore.isSyncing"
                  class="px-2.5 py-1 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[11px] font-bold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                >
                  <Loader2 v-if="authStore.syncStatus === 'syncing'" class="w-3 h-3 animate-spin" />
                  <UploadCloud v-else class="w-3 h-3" />
                  <span>{{ authStore.syncStatus === 'syncing' ? 'Yedekleniyor...' : 'Buluta Yedekle' }}</span>
                </button>
                <button
                  @click="authStore.loadFromCloud()"
                  :disabled="authStore.isSyncing"
                  class="px-2.5 py-1 rounded-lg bg-dark-900 hover:bg-dark-800 text-slate-300 border border-slate-700 text-[11px] font-bold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50"
                >
                  <DownloadCloud class="w-3 h-3 text-emerald-400" />
                  <span>Buluttan Çek</span>
                </button>
              </div>
            </div>

            <!-- Geri Bildirim Satırı (Hata veya Başarı) -->
            <div v-if="authStore.error" class="mt-2.5 p-2 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[11px] font-medium flex items-center gap-1.5 animate-fade-in">
              <AlertTriangle class="w-3.5 h-3.5 shrink-0 text-rose-400" />
              <span>{{ authStore.error }}</span>
            </div>
            <div v-else-if="authStore.syncStatus === 'success'" class="mt-2.5 p-2 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-[11px] font-medium flex items-center gap-1.5 animate-fade-in">
              <CheckCircle2 class="w-3.5 h-3.5 shrink-0 text-emerald-400" />
              <span>İlerlemeniz buluta başarıyla yedeklendi!</span>
            </div>
          </div>

          <!-- 3 Bağımsız Kayıt Slotu Kartları -->
          <div class="space-y-2.5">
            <div class="flex items-center justify-between">
              <span class="text-xs font-mono font-bold text-slate-200 flex items-center gap-1.5">
                <HardDrive class="w-4 h-4 text-emerald-400" />
                Çoklu Kayıt Slotları (3 Slot)
              </span>
              <span v-if="slotActionSuccess" class="text-[11px] font-mono text-emerald-400 font-bold">
                {{ slotActionSuccess }}
              </span>
            </div>

            <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div
                v-for="s in [1, 2, 3]"
                :key="s"
                class="glass-panel-card p-3 rounded-xl border relative flex flex-col justify-between transition-all"
                :class="store.settings.activeSlot === s
                  ? 'border-emerald-500/50 bg-emerald-500/[0.06] shadow-sm'
                  : 'border-white/[0.07] bg-black/40'"
              >
                <div>
                  <div class="flex items-center justify-between mb-1.5">
                    <span class="text-xs font-mono font-bold text-white">Slot {{ s }}</span>
                    <span
                      v-if="store.settings.activeSlot === s"
                      class="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[9px] font-mono font-bold border border-emerald-500/30"
                    >
                      Aktif
                    </span>
                  </div>

                  <div v-if="slotsMeta[s - 1]?.exists" class="space-y-0.5 text-[10px] font-mono text-slate-400">
                    <div class="text-slate-200 font-semibold truncate">
                      Kütle: {{ format(slotsMeta[s - 1].matter || '0', 2, store.settings.notation) }}
                    </div>
                    <div>Çöküş: {{ slotsMeta[s - 1].singularities || 0 }}</div>
                    <div>Süre: {{ formatTime(slotsMeta[s - 1].playtime || 0) }}</div>
                  </div>
                  <div v-else class="text-[10px] font-mono text-slate-500 italic py-2">
                    Boş Slot
                  </div>
                </div>

                <div class="mt-3 pt-2 border-t border-white/[0.06] flex gap-1.5">
                  <button
                    v-if="store.settings.activeSlot !== s"
                    @click="switchSlot(s)"
                    :aria-label="`Slot ${s}'e geç`"
                    class="btn-tactile flex-1 py-1 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-[10px] font-mono font-bold transition-all cursor-pointer"
                  >
                    Geç
                  </button>
                  <button
                    v-if="store.settings.activeSlot !== s"
                    @click="copyCurrentSlotTo(s)"
                    :aria-label="`Mevcut slotu Slot ${s}'e kopyala`"
                    class="btn-tactile px-2 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 border border-white/[0.08] text-[10px] font-mono transition-all cursor-pointer flex items-center gap-1"
                    v-tip="`Mevcut slotu Slot ${s}'e kopyala`"
                  >
                    <Copy class="w-3 h-3" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Dışa Aktarma (Export) — panel zemini glass-panel-card (--ds-panel); quantum-* kullanılmıyor -->
          <div class="glass-panel-card p-3.5 rounded-xl space-y-2">
            <div class="text-xs font-mono font-semibold text-slate-200">Kayıt Dışa Aktarma (Yedekleme)</div>
            <div class="grid grid-cols-2 gap-2">
              <button
                @click="exportSave"
                aria-label="Kayıt kodunu panoya kopyala"
                class="btn-tactile p-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Copy class="w-4 h-4 text-cyan-300" />
                <span>{{ copyFeedback ? 'Panoya Kopyalandı!' : 'Panoya Kopyala' }}</span>
              </button>

              <button
                @click="downloadSaveFile(SaveSystem.exportSave(store.serialize()))"
                aria-label="Kaydı metin dosyası olarak indir"
                class="btn-tactile p-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Download class="w-4 h-4 text-emerald-400" />
                <span>{{ downloadFeedback ? 'Dosya İndirildi!' : 'Dosya İndir (.txt)' }}</span>
              </button>
            </div>
          </div>

          <!-- İçe Aktarma (Import) & Dosya Seçimi -->
          <div class="glass-panel-card p-3.5 rounded-xl space-y-2.5">
            <div class="flex items-center justify-between">
              <span class="text-xs font-mono font-semibold text-slate-200">Kayıt İçe Aktarma</span>
              <button
                @click="triggerFileInput"
                aria-label="Kayıt dosyası seç (.txt veya .json)"
                class="btn-tactile px-2.5 py-1 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono font-bold flex items-center gap-1 transition-all cursor-pointer"
              >
                <FolderOpen class="w-3 h-3" />
                Dosya Seç (.txt)
              </button>
              <input
                ref="fileInputRef"
                type="file"
                accept=".txt,.json"
                @change="handleFileSelect"
                class="hidden"
              />
            </div>

            <div class="flex gap-2">
              <input
                v-model="importString"
                @input="onImportInputChanged"
                type="text"
                placeholder="Kayıt kodunu buraya yapıştırın veya dosya seçin..."
                class="flex-1 bg-black/40 border border-white/[0.08] rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-400"
              />
              <button
                @click="requestImport"
                :disabled="!importInspection?.valid"
                aria-label="Kayıt kodunu içe aktar"
                class="btn-tactile px-3.5 py-2 rounded-xl text-xs font-bold font-mono transition-all flex items-center gap-1 cursor-pointer"
                :class="importInspection?.valid
                  ? 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40'
                  : 'bg-black/30 text-slate-500 border border-white/[0.04] opacity-50 cursor-not-allowed'"
              >
                <Upload class="w-3.5 h-3.5" />
                Yükle
              </button>
            </div>

            <!-- İçe Aktarma Önizleme / Doğrulama Kartı -->
            <div v-if="importInspection?.valid && importInspection.summary" class="p-2.5 rounded-xl bg-emerald-500/[0.08] border border-emerald-500/30 text-xs font-mono space-y-1">
              <div class="text-emerald-300 font-bold flex items-center gap-1.5">
                <CheckCircle2 class="w-3.5 h-3.5" />
                Geçerli Kayıt Doğrulandı
              </div>
              <div class="grid grid-cols-2 gap-1 text-[11px] text-slate-300">
                <div>Kütle: <span class="text-white font-bold">{{ format(importInspection.summary.matter, 2, store.settings.notation) }}</span></div>
                <div>Çöküş: <span class="text-white font-bold">{{ importInspection.summary.singularities }}</span></div>
                <div>Süre: <span class="text-white font-bold">{{ formatTime(importInspection.summary.playtime) }}</span></div>
                <div>Sürüm: <span class="text-white font-bold">v{{ importInspection.summary.version }}</span></div>
              </div>
            </div>

            <p v-if="importError" class="text-[11px] text-rose-400 font-mono">
              {{ importError }}
            </p>
            <p v-else-if="importSuccess" class="text-[11px] text-emerald-400 font-mono">
              {{ importSuccess }}
            </p>
          </div>

          <!-- Otomatik Yedekten Kurtarma -->
          <div class="glass-panel-card p-3 rounded-xl flex items-center justify-between">
            <div>
              <div class="text-xs font-mono font-semibold text-slate-200">Otomatik Yedekten Geri Yükle</div>
              <div class="text-[10px] text-slate-400 mt-0.5">Sistem her 1 dakikada bir otomatik dönen yedek tutar</div>
            </div>
            <button
              @click="restoreBackup"
              aria-label="Otomatik yedekten geri yükle"
              class="btn-tactile px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-xs font-mono font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <RotateCcw class="w-3.5 h-3.5" />
              Yedekten Yükle
            </button>
          </div>

          <!-- Tehlikeli Alan: Güvenli Hard Reset -->
          <div class="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/[0.04] space-y-3">
            <div class="flex items-center gap-2 text-rose-400">
              <AlertTriangle class="w-4 h-4 shrink-0" />
              <span class="text-xs font-mono font-bold">Tehlikeli Alan: Sıfırla (Hard Reset)</span>
            </div>

            <div v-if="!showHardResetConfirm">
              <button
                @click="showHardResetConfirm = true"
                aria-label="Sıfırlama onayını göster"
                class="btn-tactile w-full py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold font-mono transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                Tüm İlerlemeyi ve Kayıtları Kalıcı Olarak Sıfırla
              </button>
            </div>

            <div v-else class="space-y-2.5 p-3 rounded-xl bg-rose-950/40 border border-rose-500/40">
              <p class="text-xs text-rose-200 font-medium leading-relaxed">
                Bu işlem tüm slotları, başarımları ve ayarları geri dönülemez biçimde silecektir! Onaylamak için aşağıdaki kutuya <strong class="text-white font-mono uppercase underline">RESET</strong> yazın:
              </p>
              <div class="flex gap-2">
                <label for="hard-reset-confirm" class="sr-only">Onay için RESET yazın</label>
                <input
                  id="hard-reset-confirm"
                  v-model="hardResetConfirmInput"
                  type="text"
                  placeholder="RESET yazın..."
                  autocomplete="off"
                  class="flex-1 bg-black/60 border border-rose-500/50 rounded-xl px-3 py-1.5 text-xs font-mono text-white uppercase focus:outline-none focus:border-rose-400"
                />
                <button
                  @click="executeHardReset"
                  :disabled="!canHardReset"
                  aria-label="Tüm ilerlemeyi kalıcı olarak sıfırla"
                  class="btn-tactile px-4 py-1.5 rounded-xl text-xs font-bold font-mono transition-all cursor-pointer"
                  :class="canHardReset
                    ? 'bg-rose-600 hover:bg-rose-500 text-white'
                    : 'bg-rose-900/40 text-rose-400/40 cursor-not-allowed'"
                >
                  Sıfırla
                </button>
                <button
                  @click="showHardResetConfirm = false; hardResetConfirmInput = ''"
                  aria-label="Sıfırlamayı iptal et"
                  class="btn-tactile px-3 py-1.5 rounded-xl bg-white/[0.06] text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  İptal
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- =================== SEKME 5: KISAYOLLAR & BİLGİ =================== -->
        <div v-else-if="activeTab === 'about'" class="space-y-4">
          <!-- Kısayollar Tablosu -->
          <div class="glass-panel-card p-3.5 rounded-xl space-y-2.5">
            <div class="flex items-center gap-2 text-xs font-mono font-bold text-slate-200">
              <Keyboard class="w-4 h-4 text-cyan-300" />
              Klavye Kısayolları Haritası
            </div>
            <div class="divide-y divide-white/[0.06] text-xs font-mono">
              <div class="py-2 flex items-center justify-between">
                <span class="text-slate-400">1 - 9 Tuşları</span>
                <span class="text-white font-bold bg-white/[0.06] px-2 py-0.5 rounded-md">Sekme Değiştir (Katmanlar, Lab, Kriz...)</span>
              </div>
              <div class="py-2 flex items-center justify-between">
                <span class="text-slate-400">M Tuşu</span>
                <span class="text-cyan-300 font-bold bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">Tüm Kademeleri Satın Al (Max All)</span>
              </div>
              <div class="py-2 flex items-center justify-between">
                <span class="text-slate-400">Space (Boşluk)</span>
                <span class="text-purple-300 font-bold bg-purple-500/10 px-2 py-0.5 rounded-md border border-purple-500/20">Kütle Yut (Taktil Çekim)</span>
              </div>
              <div class="py-2 flex items-center justify-between">
                <span class="text-slate-400">Esc (Escape)</span>
                <span class="text-slate-300 font-bold bg-white/[0.06] px-2 py-0.5 rounded-md">Pencereyi / Modalı Kapat</span>
              </div>
              <div class="py-2 flex items-center justify-between">
                <span class="text-slate-400">GODMODE (yazın)</span>
                <span class="text-amber-300 font-bold bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">Gizli Geliştirici &amp; Hile Paneli</span>
              </div>
            </div>
          </div>

          <!-- Oyun Hakkında & Mimari -->
          <div class="glass-panel-card p-3.5 rounded-xl space-y-2">
            <div class="flex items-center gap-2 text-xs font-mono font-bold text-slate-200">
              <Info class="w-4 h-4 text-purple-400" />
              UROBOROS: The Cosmic Feast
            </div>
            <p class="text-[11px] text-slate-400 leading-relaxed font-sans">
              Bir su damlasındaki moleküler bağları ayrıştırmakla başlayıp Planck duvarını delen, Dünya'yı ve tüm Samanyolu Galaksisi'ni yutan sonsuz bir kuantum-kozmik tekillik döngüsü. Antimatter Dimensions, Tasty Planet ve Cookie Clicker mekanikleri sentezlenerek geliştirilmiştir.
            </p>
            <div class="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] font-mono text-slate-500">
              <span>Sürüm: v0.23.0 (UROBOROS)</span>
              <span>Vue 3 · Pinia · Vite 6 · Web Audio API</span>
            </div>
          </div>
        </div>
      </div>

      <!-- İçe Aktarma Onay Modalı -->
      <ConfirmModal
        v-if="showImportConfirm"
        title="Kaydı Üzerine Yaz"
        message="İçe aktarılan kayıt mevcut slotunuzun üzerine yazacaktır. Önce mevcut kaydınızı dışa aktarıp yedeklemeniz önerilir. Devam etmek istiyor musunuz?"
        confirm-label="Evet, Üzerine Yaz"
        :danger="true"
        @confirm="doImport"
        @cancel="showImportConfirm = false"
      />
    </div>
  </div>
</template>

<style scoped>
.custom-scrollbar::-webkit-scrollbar {
  width: 5px;
}
.custom-scrollbar::-webkit-scrollbar-track {
  background: rgba(0, 0, 0, 0.2);
}
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
}
.custom-scrollbar::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.2);
}
</style>
