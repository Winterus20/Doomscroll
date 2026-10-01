<script setup lang="ts">
import { ref } from 'vue'
import { useGameStore } from '../stores/game'
import { SaveSystem } from '../core/save'
import { sounds } from '../core/audio'
import type { NotationType } from '../core/format'
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
  Timer
} from 'lucide-vue-next'
import { MUSIC_TRACKS } from '../core/music-engine'
import type { MusicTrackId } from '../models/types'

const emit = defineEmits<{
  (e: 'close'): void
}>()

const store = useGameStore()

const copyFeedback = ref(false)
const importString = ref('')
const importError = ref('')
const showHardResetConfirm = ref(false)
const customUrlInput = ref(store.settings.customAudioUrl || '')

const notations: Array<{ id: NotationType; label: string; example: string }> = [
  { id: 'scientific', label: 'Bilimsel (Scientific)', example: '1.23e45' },
  { id: 'standard', label: 'Standart (Harf)', example: '1.23 Qa' },
  { id: 'engineering', label: 'Mühendislik', example: '12.3e42' },
  { id: 'logarithm', label: 'Logaritmik', example: 'e45.12' }
]

function setNotation(type: NotationType) {
  store.settings.notation = type
  sounds.playClick()
}

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

function manualSave() {
  SaveSystem.save(store.serialize())
  copyFeedback.value = true
  setTimeout(() => (copyFeedback.value = false), 2000)
  sounds.playClick()
}

function exportSave() {
  const saveStr = SaveSystem.exportSave(store.serialize())
  navigator.clipboard.writeText(saveStr).then(() => {
    alert('Kayıt verisi panoya kopyalandı!')
    sounds.playClick()
  })
}

function doImport() {
  if (!importString.value.trim()) return
  const data = SaveSystem.importSave(importString.value)
  if (data) {
    store.deserialize(data)
    importString.value = ''
    importError.value = ''
    alert('Kayıt başarıyla yüklendi!')
    emit('close')
  } else {
    importError.value = 'Geçersiz veya bozuk kayıt dizesi!'
  }
}

function hardReset() {
  SaveSystem.hardReset()
  window.location.reload()
}
</script>

<template>
  <div class="layer-modal fixed inset-0 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" @click.self="emit('close')">
    <div class="glass-panel-glow modal-glass w-full max-w-lg rounded-2xl p-5 md:p-6 relative max-h-[90vh] overflow-y-auto">
      <!-- Modal Başlık & Kapat -->
      <div class="flex items-center justify-between border-b border-white/[0.06] pb-3.5 mb-5">
        <h3 class="text-sm font-extrabold text-slate-100">
          Sistem Ayarları
        </h3>
        <button
          @click="emit('close')"
          class="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.06] transition-all cursor-pointer"
        >
          <X class="w-5 h-5" />
        </button>
      </div>

      <div class="space-y-5">
        <!-- Sayı Formatı (Notasyon) -->
        <div>
          <label class="section-label mb-2">
            <Hash class="w-4 h-4 text-cyan-300" />
            Sayı Notasyonu
          </label>
          <div class="grid grid-cols-2 gap-2">
            <button
              v-for="item in notations"
              :key="item.id"
              @click="setNotation(item.id)"
              class="btn-tactile p-2.5 rounded-xl text-left border text-xs font-mono transition-all cursor-pointer"
              :class="store.settings.notation === item.id
                ? 'bg-cyan-500/15 border-cyan-500/50 text-cyan-200'
                : 'bg-black/40 border-white/[0.06] text-slate-400 hover:text-slate-200 hover:border-white/[0.14]'"
            >
              <div class="font-bold">{{ item.label }}</div>
              <div class="text-[10px] text-slate-500 mt-0.5 tabular-nums">Örn: {{ item.example }}</div>
            </button>
          </div>
        </div>

        <!-- Arka Plan Müziği & Lo-Fi Radyo -->
        <div class="border-t border-white/[0.06] pt-5">
          <div class="flex items-center justify-between mb-2">
            <label class="section-label">
              <Radio class="w-4 h-4 text-purple-400" />
              <span>Lo-Fi Radyo & Arka Plan Müziği</span>
            </label>
            <button
              @click="toggleMusic"
              class="px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer border"
              :class="store.settings.musicEnabled ? 'bg-purple-500/20 text-purple-300 border-purple-500/30' : 'bg-black/40 text-slate-500 border-white/[0.06]'"
            >
              {{ store.settings.musicEnabled ? 'Açık' : 'Kapalı' }}
            </button>
          </div>

          <!-- Müzik Ses Düzeyi -->
          <div class="mb-3">
            <div class="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
              <span>Müzik Ses Düzeyi</span>
              <span class="text-purple-400 font-bold tabular-nums">%{{ Math.round(store.settings.musicVolume * 100) }}</span>
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

          <!-- Müzik İstasyonu Seçimi -->
          <div class="space-y-1.5 mb-3">
            <div class="text-[11px] font-mono text-slate-400">Radyo İstasyonu</div>
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                v-for="track in MUSIC_TRACKS"
                :key="track.id"
                @click="selectTrack(track.id)"
                class="btn-tactile p-2.5 rounded-xl text-left border text-xs font-mono transition-all cursor-pointer flex flex-col justify-between"
                :class="store.settings.musicTrack === track.id
                  ? 'bg-purple-500/15 border-purple-500/50 text-purple-200'
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

          <!-- Özel Stream URL (Custom Track seçildiyse) -->
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
            <p class="text-[10px] text-slate-500">
              Not: Doğrudan MP3 akışı veya açık ses dosyası linki girin.
            </p>
          </div>

          <!-- Gece Sıcaklığı / Yoğunluk (Auto-DJ nefes alma) -->
          <div class="mb-3">
            <div class="flex justify-between text-[11px] font-mono text-slate-400 mb-1">
              <span class="flex items-center gap-1"><MoonStar class="w-3 h-3 text-purple-400" /> Gece Sıcaklığı</span>
              <span class="text-purple-400 font-bold tabular-nums">%{{ Math.round(store.settings.musicIntensity * 100) }}</span>
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
            <p class="text-[10px] text-slate-500 mt-1">Filtre parlaklığı + melodi yoğunluğu. Lo-fi 4 bank arasında otomatik de nefes alır.</p>
          </div>

          <!-- Uyku Zamanlayıcısı -->
          <div class="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/[0.06] mb-2 flex-wrap gap-2">
            <div class="flex items-center gap-2">
              <Timer class="w-4 h-4 text-cyan-400/80" />
              <div>
                <div class="text-xs font-mono font-medium text-slate-300">Uyku Zamanlayıcısı</div>
                <div class="text-[10px] text-slate-500">Süre bitince 3 sn fade-out ile kapanır</div>
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

          <!-- Yağmur / Oda Tonu Mikseri -->
          <div class="p-2.5 rounded-xl bg-black/40 border border-white/[0.06] mb-2">
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <CloudRain class="w-4 h-4 text-sky-400/80" />
                <div>
                  <div class="text-xs font-mono font-medium text-slate-300">Pencerede Yağmur</div>
                  <div class="text-[10px] text-slate-500">Hissedilir, duyulmaz — kapatınca boşluk belli olur</div>
                </div>
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
          <div class="flex items-center justify-between p-2.5 rounded-xl bg-black/40 border border-white/[0.06]">
            <div class="flex items-center gap-2">
              <Disc class="w-4 h-4 text-amber-400/80" />
              <div>
                <div class="text-xs font-mono font-medium text-slate-300">Analog Vinil / Kaset Cızırtısı</div>
                <div class="text-[10px] text-slate-500">Nostaljik gece 3 sıcaklığı için pembe gürültü ve çıtırtı</div>
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

        <!-- Ses Efektleri (SFX) -->
        <div class="border-t border-white/[0.06] pt-5">
          <div class="flex items-center justify-between mb-2">
            <label class="section-label">
              <component :is="store.settings.soundEnabled ? Volume2 : VolumeX" class="w-4 h-4 text-cyan-300" />
              Ses Efektleri (SFX Synthesizer)
            </label>
            <button
              @click="toggleSound"
              class="px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer border"
              :class="store.settings.soundEnabled ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30' : 'bg-black/40 text-slate-500 border-white/[0.06]'"
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

        <!-- Kayıt & Yedekleme Yönetimi -->
        <div class="border-t border-white/[0.06] pt-5 space-y-3">
          <label class="section-label">
            Kayıt Dosyası Yönetimi
          </label>

          <div class="grid grid-cols-2 gap-2">
            <button
              @click="manualSave"
              class="btn-tactile p-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Save class="w-4 h-4 text-emerald-400" />
              <span>{{ copyFeedback ? 'Kaydedildi!' : 'Şimdi Kaydet' }}</span>
            </button>

            <button
              @click="exportSave"
              class="btn-tactile p-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/[0.08] text-xs font-semibold text-slate-200 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
            >
              <Download class="w-4 h-4 text-cyan-300" />
              <span>Dışa Aktar (Kopyala)</span>
            </button>
          </div>

          <!-- İçe Aktarma Alanı -->
          <div class="space-y-1.5">
            <div class="flex gap-2">
              <input
                v-model="importString"
                type="text"
                placeholder="Kayıt kodunu buraya yapıştırın..."
                class="flex-1 bg-black/40 border border-white/[0.08] rounded-xl px-3 py-2 text-xs font-mono text-slate-200 focus:outline-none focus:border-cyan-300"
              />
              <button
                @click="doImport"
                class="btn-tactile px-3.5 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
              >
                <Upload class="w-3.5 h-3.5" />
                Yükle
              </button>
            </div>
            <p v-if="importError" class="text-[11px] text-rose-400 font-mono">
              {{ importError }}
            </p>
          </div>
        </div>

        <!-- Tehlikeli Alan: Sıfırla (Hard Reset) -->
        <div class="border-t border-white/[0.06] pt-5">
          <div v-if="!showHardResetConfirm">
            <button
              @click="showHardResetConfirm = true"
              class="btn-tactile w-full py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold font-mono transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <AlertTriangle class="w-4 h-4" />
              Tüm İlerlemeyi Sıfırla (Hard Reset)
            </button>
          </div>

          <div v-else class="bg-rose-500/[0.07] border border-rose-500/50 p-3.5 rounded-xl space-y-2.5">
            <p class="text-xs text-rose-200 font-medium">
              Emin misiniz? Tüm evren ve kayıtlar kalıcı olarak silinecektir!
            </p>
            <div class="flex gap-2">
              <button
                @click="hardReset"
                class="btn-tactile flex-1 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold font-mono transition-all cursor-pointer"
              >
                Evet, Sıfırla
              </button>
              <button
                @click="showHardResetConfirm = false"
                class="btn-tactile flex-1 py-1.5 rounded-lg bg-white/[0.06] text-slate-300 text-xs font-semibold cursor-pointer"
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
