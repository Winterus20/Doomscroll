<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore, AUTOBUYER_COSTS, AUTOBUYER_BULK_COST, AUTOBUYER_MAX_COST, AUTOBUYER_BULK_SHIFT_REQ, AUTOBUYER_MAX_GALAXY_REQ, getAutobuyerRequirementText } from '../stores/game'
import { formatNumber } from '../core/format'
import { sounds } from '../core/audio'
import { Bot, Power, Lock, Unlock, Cpu, ToggleLeft, ToggleRight, Layers, Zap } from 'lucide-vue-next'
import type { AutobuyerMode } from '../models/types'
import TabHero from './TabHero.vue'

const store = useGameStore()

const speedMultiplierRaw = computed(() => {
  const chipBonus = Math.pow(1.5, store.singularityUpgrades?.neural_chip || 0)
  const overclock = store.neuralEffects?.botFrequencyMult || 1
  return chipBonus * overclock
})

const speedMultiplier = computed(() => {
  return speedMultiplierRaw.value.toFixed(1)
})

const allEnabled = computed(() => {
  const bots = Object.values(store.autobuyers).filter((b) => b.unlocked)
  return bots.length > 0 && bots.every((b) => b.enabled)
})

function toggleAll() {
  const targetState = !allEnabled.value
  Object.values(store.autobuyers).forEach((b) => {
    if (b.unlocked) {
      b.enabled = targetState
    }
  })
  sounds.playToggleBot()
}

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

// Şafak Nöbeti Botu min-SP tabanı: pozitif tam sayıya sıkıştır, geçersizse default 1
function onMinGainInput(event: Event, key: string): void {
  const input = event.target as HTMLInputElement
  const raw = Number(input.value)
  const val = Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 1
  const bot = store.autobuyers[key]
  if (bot) bot.minGainSp = val
  input.value = String(val)
}
</script>

<template>
  <div class="space-y-3">
    <!-- Birleşik Hero -->
    <TabHero
      :icon="Bot"
      icon-class="text-blue-400"
      title="Otomatik Kaydırma Botları (Autobuyers)"
      badge="Otonom Algoritma"
      badge-class="ds-badge-blue"
      subtitle="Başparmağın yorulduğunda devreye giren nöral botlar. İstasyonları, Algoritma Frekansını ve Sıçramaları otomatik olarak enjekte ederler."
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

    <!-- Bot Listesi Grid -->
    <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
      <div
        v-for="(bot, key) in store.autobuyers"
        :key="key"
        class="glass-panel-card p-4 rounded-xl flex flex-col justify-between"
        :class="[
          bot.unlocked
            ? bot.enabled
              ? 'border-blue-500/40 bg-blue-950/20'
              : ''
            : 'opacity-60'
        ]"
      >
        <div>
          <!-- Bot Başlığı ve Durumu -->
          <div class="flex items-center justify-between mb-2">
            <div class="flex items-center gap-2">
              <Bot class="w-4 h-4" :class="bot.enabled && bot.unlocked ? 'text-blue-400' : 'text-slate-600'" />
              <h3 class="text-xs font-bold font-mono text-slate-200">{{ bot.name }}</h3>
            </div>

            <span
              v-if="bot.unlocked"
              class="ds-badge"
              :class="bot.enabled ? 'ds-badge-emerald' : ''"
            >
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
  </div>
</template>
