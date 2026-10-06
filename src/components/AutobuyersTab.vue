<script setup lang="ts">
import { computed } from 'vue'
import {
  useGameStore,
  AUTOBUYER_COSTS,
  AUTOBUYER_BULK_COST,
  AUTOBUYER_MAX_COST,
  AUTOBUYER_BULK_SHIFT_REQ,
  AUTOBUYER_MAX_GALAXY_REQ,
  getAutobuyerRequirementText
} from '../stores/game'
import { formatNumber } from '../core/format'
import {
  Bot,
  Power,
  Lock,
  Unlock,
  Cpu,
  ToggleLeft,
  ToggleRight,
  Layers,
  Zap,
  Radio,
  Sliders,
  Gauge,
  Activity,
  Sparkles,
  Orbit
} from 'lucide-vue-next'
import type { AutobuyerMode } from '../models/types'
import TabHero from './TabHero.vue'

const store = useGameStore()

// Kokpit modu kontrolü (singularities >= 1)
const isCockpit = computed(() => store.isCockpitMode)

// Hız çarpanı
const speedMultiplierRaw = computed(() => store.autobuyerFleetSpeedMult)
const speedMultiplier = computed(() => speedMultiplierRaw.value.toFixed(1))

// Tüm açık botlar aktif mi
const allEnabled = computed(() => {
  const bots = Object.values(store.autobuyers).filter((b) => b.unlocked)
  return bots.length > 0 && bots.every((b) => b.enabled)
})

function toggleAll() {
  store.toggleAllAutobuyers()
}

// Faz 0 Dükkan Kontrolleri
function canUnlock(key: string): boolean {
  const cost = AUTOBUYER_COSTS[key]
  if (!cost) return false
  if (!store.isAutobuyerRequirementMet(key)) return false
  return store.matter.gte(cost)
}

function requirementText(key: string): string {
  return getAutobuyerRequirementText(String(key))
}

function requirementMet(key: string): boolean {
  return store.isAutobuyerRequirementMet(String(key))
}

function modeLabel(mode: string | undefined): string {
  if (mode === 'bulk') return '×10'
  if (mode === 'max') return 'MAKS'
  return '×1'
}

function setMode(key: string, mode: AutobuyerMode): void {
  store.setAutobuyerMode(String(key), mode)
}

function setAllModes(mode: AutobuyerMode): void {
  store.setAllAutobuyerModes(mode)
}

// Şafak Nöbeti Botu min-SP tabanı girişi
function onMinGainInput(event: Event, key: string): void {
  const input = event.target as HTMLInputElement
  const raw = Number(input.value)
  const val = Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 1
  const bot = store.autobuyers[key]
  if (bot) bot.minGainSp = val
  input.value = String(val)
}

// Bot Gruplamaları (Kokpit Görünümü İçin)
const dimensionBots = computed(() => {
  return Object.entries(store.autobuyers).filter(([k]) => k.startsWith('dim'))
})

const speedBot = computed(() => {
  return store.autobuyers.tickspeed ? [['tickspeed', store.autobuyers.tickspeed] as const] : []
})
</script>

<template>
  <div class="space-y-4">
    <!-- ========================================================= -->
    <!-- MOD B: PRESTİJ SONRASI KOZMİK OTONOMİ KOKPİTİ             -->
    <!-- ========================================================= -->
    <template v-if="isCockpit">
      <!-- Kokpit Hero -->
      <TabHero
        :icon="Radio"
        icon-class="text-cyan-400"
        title="Kozmik Otonomi Kokpiti"
        badge="Merkezi Komuta"
        badge-class="ds-badge-cyan"
        subtitle="Evrenler boyu edinilmiş kuantum otonomi filosu. Tüm botlar kalıcı lisansla emrinde."
        accent="cyan"
      >
        <template #stats>
          <!-- Filo Durum Kutusu -->
          <div class="stat-box">
            <div class="stat-box-label">Filo Çevrimiçi</div>
            <div class="stat-box-value text-emerald-400 flex items-center gap-1.5">
              <Activity class="w-3.5 h-3.5 animate-pulse text-emerald-400" />
              <span class="tabular-nums font-mono">{{ store.activeAutobuyersCount }}/{{ store.totalAutobuyersCount }} Bot</span>
            </div>
          </div>

          <!-- Overclock Hız Kutusu -->
          <div class="stat-box">
            <div class="stat-box-label">Aşırı Yükleme</div>
            <div class="stat-box-value text-cyan-400 flex items-center gap-1.5">
              <Cpu class="w-3.5 h-3.5 text-cyan-400" />
              <span class="tabular-nums font-mono">{{ speedMultiplier }}× Hız</span>
            </div>
          </div>

          <!-- Ana Şalter (Master Switch) -->
          <button
            @click="toggleAll"
            class="btn-tactile px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer border shadow-lg"
            :class="allEnabled
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
              : 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'"
          >
            <Power class="w-3.5 h-3.5" />
            <span>{{ allEnabled ? 'Filoyu Durdur' : 'Filoyu Başlat' }}</span>
          </button>
        </template>
      </TabHero>

      <!-- Kokpit Hızlı Kontrol Konsolu (Batch Mod Seçiciler) -->
      <div class="glass-panel-card p-3 rounded-xl border-cyan-500/30 bg-black/40 flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2">
          <Sliders class="w-4 h-4 text-cyan-400" />
          <span class="text-xs font-mono font-bold text-slate-200">Filo Hızlı Mod Ataması:</span>
        </div>
        <div class="flex items-center gap-2">
          <button
            @click="setAllModes('max')"
            class="btn-tactile px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30 cursor-pointer"
          >
            <Zap class="w-3.5 h-3.5" />
            <span>Tümünü MAKS Yap</span>
          </button>
          <button
            @click="setAllModes('bulk')"
            class="btn-tactile px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 bg-blue-500/20 text-blue-300 border border-blue-500/40 hover:bg-blue-500/30 cursor-pointer"
          >
            <Layers class="w-3.5 h-3.5" />
            <span>Tümünü ×10 Yap</span>
          </button>
          <button
            @click="setAllModes('single')"
            class="btn-tactile px-3 py-1.5 rounded-lg text-xs font-mono font-bold flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 cursor-pointer"
          >
            <span>Tümünü ×1 Yap</span>
          </button>
        </div>
      </div>

      <!-- KANAT 1: Kuantum Boyut Botları (D1 - D8) -->
      <div>
        <div class="flex items-center gap-2 mb-2 px-1">
          <Sparkles class="w-3.5 h-3.5 text-blue-400" />
          <h2 class="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">Kuantum Boyut Botları (D1 – D8)</h2>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <div
            v-for="[key, bot] in dimensionBots"
            :key="key"
            class="glass-panel-card p-3.5 rounded-xl border flex flex-col justify-between transition-all"
            :class="bot.enabled
              ? 'border-blue-500/40 bg-blue-950/20 shadow-sm'
              : 'border-white/[0.08] bg-black/40 opacity-70'"
          >
            <div>
              <div class="flex items-center justify-between mb-1.5">
                <div class="flex items-center gap-1.5">
                  <Bot class="w-3.5 h-3.5" :class="bot.enabled ? 'text-blue-400' : 'text-slate-600'" />
                  <span class="text-xs font-mono font-bold text-slate-200">{{ bot.name }}</span>
                </div>
                <span class="ds-badge text-[9px]" :class="bot.enabled ? 'ds-badge-emerald' : ''">
                  {{ bot.enabled ? 'AKTİF' : 'KAPALI' }}
                </span>
              </div>
              <div class="text-[10px] text-slate-400 font-mono flex items-center justify-between">
                <span>Tetiklenme:</span>
                <span class="text-slate-200 font-bold tabular-nums">{{ (bot.interval / speedMultiplierRaw).toFixed(2) }} sn</span>
              </div>
            </div>

            <!-- Mod Butonları & Aç/Kapa Şalteri -->
            <div class="mt-3 pt-2.5 border-t border-white/[0.06] flex items-center justify-between gap-2">
              <div class="grid grid-cols-3 gap-1 flex-1">
                <button
                  @click="setMode(String(key), 'single')"
                  class="py-1 rounded text-[9px] font-mono font-bold border transition-all cursor-pointer text-center"
                  :class="bot.mode === 'single' ? 'bg-emerald-500/25 text-emerald-200 border-emerald-500/50' : 'bg-black/30 text-slate-500 border-white/[0.05]'"
                >×1</button>
                <button
                  @click="setMode(String(key), 'bulk')"
                  class="py-1 rounded text-[9px] font-mono font-bold border transition-all cursor-pointer text-center"
                  :class="bot.mode === 'bulk' ? 'bg-blue-500/25 text-blue-200 border-blue-500/50' : 'bg-black/30 text-slate-500 border-white/[0.05]'"
                >×10</button>
                <button
                  @click="setMode(String(key), 'max')"
                  class="py-1 rounded text-[9px] font-mono font-bold border transition-all cursor-pointer text-center"
                  :class="bot.mode === 'max' ? 'bg-amber-500/25 text-amber-200 border-amber-500/50' : 'bg-black/30 text-slate-500 border-white/[0.05]'"
                >MAKS</button>
              </div>
              <button
                @click="store.toggleAutobuyer(String(key))"
                class="p-1.5 rounded-lg border cursor-pointer transition-all shrink-0"
                :class="bot.enabled ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'"
                :title="bot.enabled ? 'Botu Durdur' : 'Botu Başlat'"
              >
                <Power class="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- KANAT 2 & 3: Frekans & Makro Çöküş Yöneticileri -->
      <div>
        <div class="flex items-center gap-2 mb-2 px-1">
          <Gauge class="w-3.5 h-3.5 text-cyan-400" />
          <h2 class="text-xs font-mono font-bold text-slate-300 uppercase tracking-wider">Kozmik Hız & Makro Operatörler</h2>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <!-- Frekans (Hz) Botu -->
          <div
            v-for="[key, bot] in speedBot"
            :key="key"
            class="glass-panel-card p-4 rounded-xl border flex flex-col justify-between"
            :class="bot.enabled ? 'border-cyan-500/40 bg-cyan-950/20' : 'border-white/[0.08] bg-black/40'"
          >
            <div>
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                  <Gauge class="w-4 h-4 text-cyan-400" />
                  <h3 class="text-xs font-bold font-mono text-slate-200">{{ bot.name }}</h3>
                </div>
                <span class="ds-badge" :class="bot.enabled ? 'ds-badge-emerald' : ''">{{ bot.enabled ? 'AKTİF' : 'KAPALI' }}</span>
              </div>
              <p class="text-[11px] text-slate-400 font-mono">Çekim Hızı (Hz) kaskadını otomatik hızlandırır.</p>
              <div class="text-[11px] font-mono text-slate-300 mt-2">
                Tetiklenme: <span class="text-cyan-300 font-bold tabular-nums">{{ (bot.interval / speedMultiplierRaw).toFixed(2) }} sn</span>
              </div>
            </div>
            <div class="mt-3 pt-3 border-t border-white/[0.06] flex items-center gap-2">
              <div class="grid grid-cols-3 gap-1 flex-1">
                <button @click="setMode(String(key), 'single')" class="py-1 rounded text-[10px] font-mono font-bold border cursor-pointer" :class="bot.mode === 'single' ? 'bg-emerald-500/25 text-emerald-200 border-emerald-500/50' : 'bg-black/30 text-slate-500 border-white/[0.05]'">×1</button>
                <button @click="setMode(String(key), 'bulk')" class="py-1 rounded text-[10px] font-mono font-bold border cursor-pointer" :class="bot.mode === 'bulk' ? 'bg-blue-500/25 text-blue-200 border-blue-500/50' : 'bg-black/30 text-slate-500 border-white/[0.05]'">×10</button>
                <button @click="setMode(String(key), 'max')" class="py-1 rounded text-[10px] font-mono font-bold border cursor-pointer" :class="bot.mode === 'max' ? 'bg-amber-500/25 text-amber-200 border-amber-500/50' : 'bg-black/30 text-slate-500 border-white/[0.05]'">MAKS</button>
              </div>
              <button
                @click="store.toggleAutobuyer(String(key))"
                class="px-3 py-1 rounded-lg text-xs font-mono font-bold border cursor-pointer"
                :class="bot.enabled ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'"
              >
                {{ bot.enabled ? 'Durdur' : 'Başlat' }}
              </button>
            </div>
          </div>

          <!-- Akış Sıçraması (Shift) Botu -->
          <div
            v-if="store.autobuyers.shift"
            class="glass-panel-card p-4 rounded-xl border flex flex-col justify-between"
            :class="store.autobuyers.shift.enabled ? 'border-purple-500/40 bg-purple-950/20' : 'border-white/[0.08] bg-black/40'"
          >
            <div>
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                  <Zap class="w-4 h-4 text-purple-400" />
                  <h3 class="text-xs font-bold font-mono text-slate-200">{{ store.autobuyers.shift.name }}</h3>
                </div>
                <span class="ds-badge" :class="store.autobuyers.shift.enabled ? 'ds-badge-emerald' : ''">{{ store.autobuyers.shift.enabled ? 'AKTİF' : 'KAPALI' }}</span>
              </div>
              <p class="text-[11px] text-slate-400 font-mono">Hazır olduğunda boyut sıçramasını otomatik icra eder.</p>
              <div class="text-[11px] font-mono text-slate-300 mt-2">
                Tetiklenme: <span class="text-purple-300 font-bold tabular-nums">{{ (store.autobuyers.shift.interval / speedMultiplierRaw).toFixed(2) }} sn</span>
              </div>
            </div>
            <div class="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-end">
              <button
                @click="store.toggleAutobuyer('shift')"
                class="w-full py-1.5 px-3 rounded-lg text-xs font-mono font-bold border cursor-pointer"
                :class="store.autobuyers.shift.enabled ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'"
              >
                {{ store.autobuyers.shift.enabled ? 'Durdur' : 'Başlat' }}
              </button>
            </div>
          </div>

          <!-- Akış Kümeleri (Galaxy) Botu -->
          <div
            v-if="store.autobuyers.galaxy"
            class="glass-panel-card p-4 rounded-xl border flex flex-col justify-between"
            :class="store.autobuyers.galaxy.enabled ? 'border-sky-500/40 bg-sky-950/20' : 'border-white/[0.08] bg-black/40'"
          >
            <div>
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                  <Orbit class="w-4 h-4 text-sky-400" />
                  <h3 class="text-xs font-bold font-mono text-slate-200">{{ store.autobuyers.galaxy.name }}</h3>
                </div>
                <span class="ds-badge" :class="store.autobuyers.galaxy.enabled ? 'ds-badge-emerald' : ''">{{ store.autobuyers.galaxy.enabled ? 'AKTİF' : 'KAPALI' }}</span>
              </div>
              <p class="text-[11px] text-slate-400 font-mono">Hazır olduğunda sonsuz akış kümesini otomatik kurar.</p>
              <div class="text-[11px] font-mono text-slate-300 mt-2">
                Tetiklenme: <span class="text-sky-300 font-bold tabular-nums">{{ (store.autobuyers.galaxy.interval / speedMultiplierRaw).toFixed(2) }} sn</span>
              </div>
            </div>
            <div class="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-end">
              <button
                @click="store.toggleAutobuyer('galaxy')"
                class="w-full py-1.5 px-3 rounded-lg text-xs font-mono font-bold border cursor-pointer"
                :class="store.autobuyers.galaxy.enabled ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'"
              >
                {{ store.autobuyers.galaxy.enabled ? 'Durdur' : 'Başlat' }}
              </button>
            </div>
          </div>

          <!-- Şafak Nöbeti (Singularity) Botu -->
          <div
            v-if="store.autobuyers.singularity"
            class="glass-panel-card p-4 rounded-xl border flex flex-col justify-between"
            :class="store.autobuyers.singularity.unlocked
              ? store.autobuyers.singularity.enabled ? 'border-amber-500/40 bg-amber-950/20' : 'border-white/[0.08] bg-black/40'
              : 'opacity-50 border-white/[0.04] bg-black/30'"
          >
            <div>
              <div class="flex items-center justify-between mb-2">
                <div class="flex items-center gap-2">
                  <Radio class="w-4 h-4 text-amber-400" />
                  <h3 class="text-xs font-bold font-mono text-slate-200">{{ store.autobuyers.singularity.name }}</h3>
                </div>
                <span v-if="store.autobuyers.singularity.unlocked" class="ds-badge" :class="store.autobuyers.singularity.enabled ? 'ds-badge-amber' : ''">
                  {{ store.autobuyers.singularity.enabled ? 'AKTİF' : 'BEKLEMEDE' }}
                </span>
                <span v-else class="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                  <Lock class="w-3 h-3" />
                  <span>3 Çöküş İster</span>
                </span>
              </div>
              <div v-if="store.autobuyers.singularity.unlocked">
                <p class="text-[10px] text-slate-400 font-mono mb-2">Marjinal büyüme 3 sn boyunca oturduğunda evreni çökerterek SP toplar.</p>
                <div class="flex items-center gap-2">
                  <span class="text-[10px] text-slate-400 font-mono">Taban SP:</span>
                  <input
                    type="number"
                    min="1"
                    step="1"
                    :value="store.autobuyers.singularity.minGainSp || 1"
                    @change="onMinGainInput($event, 'singularity')"
                    class="w-20 bg-black/50 border border-white/[0.1] rounded px-2 py-1 text-xs font-mono font-bold text-amber-300 tabular-nums focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
              <div v-else class="text-[11px] text-slate-500 font-mono">
                3 Tekillik Çöküşü tamamlandığında otomatik rampa çöküşü açılır. (Şu an: {{ store.singularities }}/3)
              </div>
            </div>
            <div v-if="store.autobuyers.singularity.unlocked" class="mt-3 pt-3 border-t border-white/[0.06]">
              <button
                @click="store.toggleAutobuyer('singularity')"
                class="w-full py-1.5 px-3 rounded-lg text-xs font-mono font-bold border cursor-pointer"
                :class="store.autobuyers.singularity.enabled ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'"
              >
                {{ store.autobuyers.singularity.enabled ? 'Durdur' : 'Başlat' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- ========================================================= -->
    <!-- MOD A: FAZ 0 DÜKKAN MODU (singularities === 0)              -->
    <!-- ========================================================= -->
    <template v-else>
      <TabHero
        :icon="Bot"
        icon-class="text-blue-400"
        title="Otomatik Çekim Botları (Autobuyers)"
        badge="Otonom Çekim"
        badge-class="ds-badge-blue"
        subtitle="Kuantum boyutlarını, Çekim Hızını (Hz) ve Ölçek Sıçramalarını otomatik olarak satın alan otonom nano-botlar."
        accent="blue"
      >
        <template #stats>
          <div class="stat-box">
            <div>
              <div class="stat-box-label">Bot İşlem Hızı</div>
              <div class="stat-box-value text-cyan-400 flex items-center gap-1">
                <Cpu class="w-3.5 h-3.5 text-cyan-400" />
                <span class="tabular-nums">{{ speedMultiplier }}× Hız</span>
              </div>
            </div>
          </div>
          <button
            @click="toggleAll"
            class="btn-tactile px-4 py-2 rounded-xl text-xs font-mono font-bold flex items-center gap-2 transition-all cursor-pointer border"
            :class="allEnabled
              ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30'
              : 'bg-black/40 text-slate-300 border-white/[0.08] hover:border-white/[0.16]'"
          >
            <Power class="w-3.5 h-3.5" />
            <span>{{ allEnabled ? 'Tümünü Kapat' : 'Tümünü Aç' }}</span>
          </button>
        </template>
      </TabHero>

      <!-- Kademe Kartları: ×1 -> ×10 -> Maks -->
      <div class="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div class="glass-panel-card p-4 rounded-xl border-emerald-500/30 bg-emerald-950/10">
          <div class="text-xs font-bold font-mono text-emerald-300 mb-1">1. ×1 ALIM</div>
          <div class="text-[11px] text-slate-400 font-mono leading-relaxed">Her bot tek tek açılır. 8sn'de 1 adet alır. Erken oyun manuel kalır, hız patlaması yok.</div>
          <div class="text-[11px] font-mono text-emerald-400 mt-2">Durum: HER ZAMAN AÇIK</div>
        </div>
        <div class="glass-panel-card p-4 rounded-xl" :class="store.autobuyerBulkUnlocked ? 'border-blue-500/40 bg-blue-950/20' : ''">
          <div class="flex items-center gap-2 mb-1">
            <Layers class="w-3.5 h-3.5 text-blue-400" />
            <div class="text-xs font-bold font-mono text-slate-200">2. ×10 ALIM</div>
          </div>
          <div class="text-[11px] text-slate-400 font-mono leading-relaxed">Her basışta 1 paket (10 adet) alır. Sıçrama ister.</div>
          <div class="text-[11px] font-mono mt-2 tabular-nums" :class="store.autobuyerBulkUnlocked ? 'text-blue-300' : 'text-slate-500'">
            <span v-if="store.autobuyerBulkUnlocked">Durum: AÇIK</span>
            <span v-else>İster: {{ formatNumber(AUTOBUYER_BULK_COST, store.settings.notation) }} + {{ AUTOBUYER_BULK_SHIFT_REQ }} Sıçrama</span>
          </div>
          <button
            v-if="!store.autobuyerBulkUnlocked"
            @click="store.unlockBulkMode()"
            :disabled="!store.canUnlockBulk"
            class="btn-tactile mt-3 w-full py-1.5 px-3 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer border"
            :class="store.canUnlockBulk ? 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border-blue-500/50' : 'bg-black/30 text-slate-600 border-white/[0.05]'"
          >
            {{ store.canUnlockBulk ? '×10 Modu Aç' : 'Kilitli' }}
          </button>
        </div>
        <div class="glass-panel-card p-4 rounded-xl" :class="store.autobuyerMaxUnlocked ? 'border-amber-500/40 bg-amber-950/20' : ''">
          <div class="flex items-center gap-2 mb-1">
            <Zap class="w-3.5 h-3.5 text-amber-400" />
            <div class="text-xs font-bold font-mono text-slate-200">3. MAKS ALIM</div>
          </div>
          <div class="text-[11px] text-slate-400 font-mono leading-relaxed">Her basışta paran yettiği kadar alır. Küme ister, en son açılır.</div>
          <div class="text-[11px] font-mono mt-2 tabular-nums" :class="store.autobuyerMaxUnlocked ? 'text-amber-300' : 'text-slate-500'">
            <span v-if="store.autobuyerMaxUnlocked">Durum: AÇIK</span>
            <span v-else>İster: {{ formatNumber(AUTOBUYER_MAX_COST, store.settings.notation) }} + {{ AUTOBUYER_MAX_GALAXY_REQ }} Küme</span>
          </div>
          <button
            v-if="!store.autobuyerMaxUnlocked"
            @click="store.unlockMaxMode()"
            :disabled="!store.canUnlockMax"
            class="btn-tactile mt-3 w-full py-1.5 px-3 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer border"
            :class="store.canUnlockMax ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border-amber-500/50' : 'bg-black/30 text-slate-600 border-white/[0.05]'"
          >
            {{ store.canUnlockMax ? 'Maks Modu Aç' : 'Kilitli' }}
          </button>
        </div>
      </div>

      <!-- Faz 0 Bot Listesi -->
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <div
          v-for="(bot, key) in store.autobuyers"
          :key="key"
          class="glass-panel-card p-4 rounded-xl flex flex-col justify-between"
          :class="[
            bot.unlocked
              ? bot.enabled ? 'border-blue-500/40 bg-blue-950/20' : ''
              : 'opacity-60'
          ]"
        >
          <div>
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2">
                <Bot class="w-4 h-4" :class="bot.enabled && bot.unlocked ? 'text-blue-400' : 'text-slate-600'" />
                <h3 class="text-xs font-bold font-mono text-slate-200">{{ bot.name }}</h3>
              </div>
              <span v-if="bot.unlocked" class="ds-badge" :class="bot.enabled ? 'ds-badge-emerald' : ''">
                {{ bot.enabled ? 'AKTİF' : 'DEVRE DIŞI' }}
              </span>
              <span v-else class="text-[10px] font-mono text-slate-500 flex items-center gap-1">
                <Lock class="w-3 h-3" />
                <span>KİLİTLİ</span>
              </span>
            </div>

            <div class="text-[11px] text-slate-400 font-mono mt-1">
              <span v-if="bot.unlocked">
                <span class="ds-badge mr-1.5" :class="bot.mode === 'max' ? 'ds-badge-amber' : bot.mode === 'bulk' ? 'ds-badge-blue' : 'ds-badge-emerald'">{{ modeLabel(bot.mode) }}</span>
                Tetiklenme: <span class="text-slate-300 font-bold tabular-nums">{{ (bot.interval / speedMultiplierRaw).toFixed(2) }} sn</span>
              </span>
              <span v-else>
                Açılış Maliyeti: <span class="text-blue-300 font-bold tabular-nums">{{ formatNumber(AUTOBUYER_COSTS[key], store.settings.notation) }} g Kütle</span>
                <span v-if="requirementText(String(key))" class="block text-[10px] mt-0.5" :class="requirementMet(String(key)) ? 'text-emerald-400' : 'text-amber-400'">İster: {{ requirementText(String(key)) }}</span>
                <span class="block text-[10px] text-slate-500 mt-0.5">×1 modda başlar (8-20sn'de 1 adet)</span>
              </span>
            </div>
          </div>

          <!-- Şafak Nöbeti Botu: mod seçici yerine min-SP tabanı girişi -->
          <div v-if="bot.unlocked && key === 'singularity'" class="mt-3">
            <div class="text-[10px] text-slate-400 font-mono leading-relaxed mb-1.5">
              Marjinal büyüme koşu ortalamasına oturunca (3 sn) çöker. Taban:
            </div>
            <div class="flex items-center gap-2">
              <input
                type="number"
                min="1"
                step="1"
                :value="bot.minGainSp || 1"
                @change="onMinGainInput($event, String(key))"
                class="w-full bg-black/40 border border-white/[0.1] rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-amber-300 tabular-nums focus:outline-none focus:border-amber-500/50"
                v-tip="'Bu kadar SP garantilenecek kadar bekler; eğim düşüşü ile birlikte çöker.'"
              />
              <span class="text-[10px] text-slate-400 font-mono shrink-0">SP</span>
            </div>
          </div>

          <!-- Mod Seçici -->
          <div v-else-if="bot.unlocked" class="grid grid-cols-3 gap-1.5 mt-3">
            <button
              @click="setMode(String(key), 'single')"
              class="py-1 rounded-md text-[10px] font-mono font-bold border transition-all cursor-pointer"
              :class="(bot.mode || 'single') === 'single' ? 'bg-emerald-500/25 text-emerald-200 border-emerald-500/50' : 'bg-black/40 text-slate-500 border-white/[0.06] hover:border-white/[0.14]'"
            >
              ×1
            </button>
            <button
              @click="setMode(String(key), 'bulk')"
              :disabled="!store.autobuyerBulkUnlocked"
              v-tip="!store.autobuyerBulkUnlocked ? 'Önce ×10 Alım kademesini aç' : 'her basışta 1 paket (10 adet)'"
              class="py-1 rounded-md text-[10px] font-mono font-bold border transition-all cursor-pointer"
              :class="bot.mode === 'bulk' ? 'bg-blue-500/25 text-blue-200 border-blue-500/50' : store.autobuyerBulkUnlocked ? 'bg-black/40 text-slate-400 border-white/[0.06] hover:border-blue-500/50' : 'bg-black/30 text-slate-700 border-white/[0.04] cursor-not-allowed'"
            >
              ×10
            </button>
            <button
              @click="setMode(String(key), 'max')"
              :disabled="!store.autobuyerMaxUnlocked"
              v-tip="!store.autobuyerMaxUnlocked ? 'Önce Maks Alım kademesini aç' : 'her basışta paran yettiği kadar'"
              class="py-1 rounded-md text-[10px] font-mono font-bold border transition-all cursor-pointer"
              :class="bot.mode === 'max' ? 'bg-amber-500/25 text-amber-200 border-amber-500/50' : store.autobuyerMaxUnlocked ? 'bg-black/40 text-slate-400 border-white/[0.06] hover:border-amber-500/50' : 'bg-black/30 text-slate-700 border-white/[0.04] cursor-not-allowed'"
            >
              MAKS
            </button>
          </div>

          <!-- Butonlar -->
          <div class="mt-4 pt-3 border-t border-white/[0.06]">
            <button
              v-if="bot.unlocked"
              @click="store.toggleAutobuyer(String(key))"
              class="btn-tactile w-full py-1.5 px-3 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border"
              :class="bot.enabled
                ? 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border-rose-500/30'
                : 'bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border-emerald-500/30'"
            >
              <ToggleRight v-if="bot.enabled" class="w-4 h-4" />
              <ToggleLeft v-else class="w-4 h-4" />
              <span>{{ bot.enabled ? 'Durdur' : 'Başlat' }}</span>
            </button>

            <button
              v-else
              @click="store.unlockAutobuyer(String(key))"
              :disabled="!canUnlock(String(key))"
              class="btn-tactile w-full py-1.5 px-3 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border"
              :class="canUnlock(String(key))
                ? 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border-blue-500/50'
                : 'bg-black/30 text-slate-600 border-white/[0.05]'"
            >
              <Unlock class="w-3.5 h-3.5" />
              <span>{{ !requirementMet(String(key)) ? 'Kilitli: ' + requirementText(String(key)) : canUnlock(String(key)) ? 'Botu Satın Al' : 'Yetersiz Kütle' }}</span>
            </button>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>
