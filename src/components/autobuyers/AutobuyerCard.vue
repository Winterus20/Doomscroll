<script setup lang="ts">
import { computed, type Component } from "vue";
import { useGameStore, AUTOBUYER_COSTS, getAutobuyerRequirementText } from "../../stores/game";
import { formatNumber } from "../../core/format";
import type { AutobuyerMode } from "../../models/types";
import {
  Bot,
  Power,
  Lock,
  Unlock,
  ToggleLeft,
  ToggleRight,
  Gauge,
  Zap,
  Orbit,
  Radio
} from "lucide-vue-next";

const props = defineProps<{
  botKey: string;
  variant: "dim" | "operator" | "shop";
}>();

const store = useGameStore();

const bot = computed(() => store.autobuyers[props.botKey]);

// Hız çarpanı
const speedMultiplierRaw = computed(() => store.autobuyerFleetSpeedMult);

// Kozmik operatör kartı görsel haritası (ikon, açıklama, vurgu rengi)
const OPERATOR_META: Record<string, { icon: Component; iconClass: string; desc: string; intervalClass: string; activeClass: string }> = {
  tickspeed: {
    icon: Gauge,
    iconClass: "text-cyan-400",
    desc: "Çekim Hızı (Hz) kaskadını otomatik hızlandırır.",
    intervalClass: "text-cyan-300",
    activeClass: "border-cyan-500/40 bg-cyan-950/20"
  },
  shift: {
    icon: Zap,
    iconClass: "text-purple-400",
    desc: "Hazır olduğunda boyut sıçramasını otomatik icra eder.",
    intervalClass: "text-purple-300",
    activeClass: "border-purple-500/40 bg-purple-950/20"
  },
  galaxy: {
    icon: Orbit,
    iconClass: "text-sky-400",
    desc: "Hazır olduğunda sonsuz akış kümesini otomatik kurar.",
    intervalClass: "text-sky-300",
    activeClass: "border-sky-500/40 bg-sky-950/20"
  }
};

const operatorMeta = computed(() => OPERATOR_META[props.botKey]);

// Faz 0 Dükkan Kontrolleri
function canUnlock(key: string): boolean {
  const cost = AUTOBUYER_COSTS[key];
  if (!cost) return false;
  if (!store.isAutobuyerRequirementMet(key)) return false;
  return store.matter.gte(cost);
}

function requirementText(key: string): string {
  return getAutobuyerRequirementText(String(key));
}

function requirementMet(key: string): boolean {
  return store.isAutobuyerRequirementMet(String(key));
}

function modeLabel(mode: string | undefined): string {
  if (mode === "bulk") return "×10";
  if (mode === "max") return "MAKS";
  return "×1";
}

function setMode(key: string, mode: AutobuyerMode): void {
  store.setAutobuyerMode(String(key), mode);
}

// Şafak Nöbeti Botu min-SP tabanı girişi
function onMinGainInput(event: Event, key: string): void {
  const input = event.target as HTMLInputElement;
  const raw = Number(input.value);
  const val = Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 1;
  const target = store.autobuyers[key];
  if (target) target.minGainSp = val;
  input.value = String(val);
}
</script>

<template>
  <!-- Kokpit: Kuantum Boyut Botu (D1-D8) kompakt kartı -->
  <div
    v-if="variant === 'dim' && bot"
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
          @click="setMode(botKey, 'single')"
          class="py-1 rounded text-[9px] font-mono font-bold border transition-all cursor-pointer text-center"
          :class="bot.mode === 'single' ? 'bg-emerald-500/25 text-emerald-200 border-emerald-500/50' : 'bg-black/30 text-slate-500 border-white/[0.05]'"
        >×1</button>
        <button
          @click="setMode(botKey, 'bulk')"
          class="py-1 rounded text-[9px] font-mono font-bold border transition-all cursor-pointer text-center"
          :class="bot.mode === 'bulk' ? 'bg-blue-500/25 text-blue-200 border-blue-500/50' : 'bg-black/30 text-slate-500 border-white/[0.05]'"
        >×10</button>
        <button
          @click="setMode(botKey, 'max')"
          class="py-1 rounded text-[9px] font-mono font-bold border transition-all cursor-pointer text-center"
          :class="bot.mode === 'max' ? 'bg-amber-500/25 text-amber-200 border-amber-500/50' : 'bg-black/30 text-slate-500 border-white/[0.05]'"
        >MAKS</button>
      </div>
      <button
        @click="store.toggleAutobuyer(botKey)"
        class="p-1.5 rounded-lg border cursor-pointer transition-all shrink-0"
        :class="bot.enabled ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border-rose-500/40 hover:bg-rose-500/30'"
        :title="bot.enabled ? 'Botu Durdur' : 'Botu Başlat'"
      >
        <Power class="w-3.5 h-3.5" />
      </button>
    </div>
  </div>

  <!-- Kokpit: Kozmik Hız & Makro Operatör kartı -->
  <div
    v-else-if="variant === 'operator' && bot"
    class="glass-panel-card p-4 rounded-xl border flex flex-col justify-between"
    :class="botKey === 'singularity'
      ? (bot.unlocked
        ? bot.enabled ? 'border-amber-500/40 bg-amber-950/20' : 'border-white/[0.08] bg-black/40'
        : 'opacity-50 border-white/[0.04] bg-black/30')
      : (bot.enabled && operatorMeta ? operatorMeta.activeClass : 'border-white/[0.08] bg-black/40')"
  >
    <!-- Şafak Nöbeti (Singularity) Botu -->
    <template v-if="botKey === 'singularity'">
      <div>
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <Radio class="w-4 h-4 text-amber-400" />
            <h3 class="text-xs font-bold font-mono text-slate-200">{{ bot.name }}</h3>
          </div>
          <span v-if="bot.unlocked" class="ds-badge" :class="bot.enabled ? 'ds-badge-amber' : ''">
            {{ bot.enabled ? 'AKTİF' : 'BEKLEMEDE' }}
          </span>
          <span v-else class="text-[10px] font-mono text-slate-500 flex items-center gap-1">
            <Lock class="w-3 h-3" />
            <span>3 Çöküş İster</span>
          </span>
        </div>
        <div v-if="bot.unlocked">
          <p class="text-[10px] text-slate-400 font-mono mb-2">Marjinal büyüme 3 sn boyunca oturduğunda evreni çökerterek SP toplar.</p>
          <div class="flex items-center gap-2">
            <span class="text-[10px] text-slate-400 font-mono">Taban SP:</span>
            <input
              type="number"
              min="1"
              step="1"
              :value="bot.minGainSp || 1"
              @change="onMinGainInput($event, 'singularity')"
              class="w-20 bg-black/50 border border-white/[0.1] rounded px-2 py-1 text-xs font-mono font-bold text-amber-300 tabular-nums focus:outline-none focus:border-amber-500"
            />
          </div>
        </div>
        <div v-else class="text-[11px] text-slate-500 font-mono">
          3 Tekillik Çöküşü tamamlandığında otomatik rampa çöküşü açılır. (Şu an: {{ store.singularities }}/3)
        </div>
      </div>
      <div v-if="bot.unlocked" class="mt-3 pt-3 border-t border-white/[0.06]">
        <button
          @click="store.toggleAutobuyer('singularity')"
          class="w-full py-1.5 px-3 rounded-lg text-xs font-mono font-bold border cursor-pointer"
          :class="bot.enabled ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'"
        >
          {{ bot.enabled ? 'Durdur' : 'Başlat' }}
        </button>
      </div>
    </template>

    <!-- Frekans / Sıçrama / Küme operatörleri -->
    <template v-else-if="operatorMeta">
      <div>
        <div class="flex items-center justify-between mb-2">
          <div class="flex items-center gap-2">
            <component :is="operatorMeta.icon" class="w-4 h-4" :class="operatorMeta.iconClass" />
            <h3 class="text-xs font-bold font-mono text-slate-200">{{ bot.name }}</h3>
          </div>
          <span class="ds-badge" :class="bot.enabled ? 'ds-badge-emerald' : ''">{{ bot.enabled ? 'AKTİF' : 'KAPALI' }}</span>
        </div>
        <p class="text-[11px] text-slate-400 font-mono">{{ operatorMeta.desc }}</p>
        <div class="text-[11px] font-mono text-slate-300 mt-2">
          Tetiklenme: <span class="font-bold tabular-nums" :class="operatorMeta.intervalClass">{{ (bot.interval / speedMultiplierRaw).toFixed(2) }} sn</span>
        </div>
      </div>
      <div v-if="botKey === 'tickspeed'" class="mt-3 pt-3 border-t border-white/[0.06] flex items-center gap-2">
        <div class="grid grid-cols-3 gap-1 flex-1">
          <button @click="setMode(botKey, 'single')" class="py-1 rounded text-[10px] font-mono font-bold border cursor-pointer" :class="bot.mode === 'single' ? 'bg-emerald-500/25 text-emerald-200 border-emerald-500/50' : 'bg-black/30 text-slate-500 border-white/[0.05]'">×1</button>
          <button @click="setMode(botKey, 'bulk')" class="py-1 rounded text-[10px] font-mono font-bold border cursor-pointer" :class="bot.mode === 'bulk' ? 'bg-blue-500/25 text-blue-200 border-blue-500/50' : 'bg-black/30 text-slate-500 border-white/[0.05]'">×10</button>
          <button @click="setMode(botKey, 'max')" class="py-1 rounded text-[10px] font-mono font-bold border cursor-pointer" :class="bot.mode === 'max' ? 'bg-amber-500/25 text-amber-200 border-amber-500/50' : 'bg-black/30 text-slate-500 border-white/[0.05]'">MAKS</button>
        </div>
        <button
          @click="store.toggleAutobuyer(botKey)"
          class="px-3 py-1 rounded-lg text-xs font-mono font-bold border cursor-pointer"
          :class="bot.enabled ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'"
        >
          {{ bot.enabled ? 'Durdur' : 'Başlat' }}
        </button>
      </div>
      <div v-else class="mt-3 pt-3 border-t border-white/[0.06] flex items-center justify-end">
        <button
          @click="store.toggleAutobuyer(botKey)"
          class="w-full py-1.5 px-3 rounded-lg text-xs font-mono font-bold border cursor-pointer"
          :class="bot.enabled ? 'bg-rose-500/20 text-rose-300 border-rose-500/40' : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'"
        >
          {{ bot.enabled ? 'Durdur' : 'Başlat' }}
        </button>
      </div>
    </template>
  </div>

  <!-- Faz 0 Dükkan bot kartı -->
  <div
    v-else-if="variant === 'shop' && bot"
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
          Açılış Maliyeti: <span class="text-blue-300 font-bold tabular-nums">{{ formatNumber(AUTOBUYER_COSTS[botKey], store.settings.notation) }} g Kütle</span>
          <span v-if="requirementText(botKey)" class="block text-[10px] mt-0.5" :class="requirementMet(botKey) ? 'text-emerald-400' : 'text-amber-400'">İster: {{ requirementText(botKey) }}</span>
          <span class="block text-[10px] text-slate-500 mt-0.5">×1 modda başlar (8-20sn'de 1 adet)</span>
        </span>
      </div>
    </div>

    <!-- Şafak Nöbeti Botu: mod seçici yerine min-SP tabanı girişi -->
    <div v-if="bot.unlocked && botKey === 'singularity'" class="mt-3">
      <div class="text-[10px] text-slate-400 font-mono leading-relaxed mb-1.5">
        Marjinal büyüme koşu ortalamasına oturunca (3 sn) çöker. Taban:
      </div>
      <div class="flex items-center gap-2">
        <input
          type="number"
          min="1"
          step="1"
          :value="bot.minGainSp || 1"
          @change="onMinGainInput($event, botKey)"
          class="w-full bg-black/40 border border-white/[0.1] rounded-lg px-2.5 py-1.5 text-xs font-mono font-bold text-amber-300 tabular-nums focus:outline-none focus:border-amber-500/50"
          v-tip="'Bu kadar SP garantilenecek kadar bekler; eğim düşüşü ile birlikte çöker.'"
        />
        <span class="text-[10px] text-slate-400 font-mono shrink-0">SP</span>
      </div>
    </div>

    <!-- Mod Seçici -->
    <div v-else-if="bot.unlocked" class="grid grid-cols-3 gap-1.5 mt-3">
      <button
        @click="setMode(botKey, 'single')"
        class="py-1 rounded-md text-[10px] font-mono font-bold border transition-all cursor-pointer"
        :class="(bot.mode || 'single') === 'single' ? 'bg-emerald-500/25 text-emerald-200 border-emerald-500/50' : 'bg-black/40 text-slate-500 border-white/[0.06] hover:border-white/[0.14]'"
      >
        ×1
      </button>
      <button
        @click="setMode(botKey, 'bulk')"
        :disabled="!store.autobuyerBulkUnlocked"
        v-tip="!store.autobuyerBulkUnlocked ? 'Önce ×10 Alım kademesini aç' : 'her basışta 1 paket (10 adet)'"
        class="py-1 rounded-md text-[10px] font-mono font-bold border transition-all cursor-pointer"
        :class="bot.mode === 'bulk' ? 'bg-blue-500/25 text-blue-200 border-blue-500/50' : store.autobuyerBulkUnlocked ? 'bg-black/40 text-slate-400 border-white/[0.06] hover:border-blue-500/50' : 'bg-black/30 text-slate-700 border-white/[0.04] cursor-not-allowed'"
      >
        ×10
      </button>
      <button
        @click="setMode(botKey, 'max')"
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
        @click="store.toggleAutobuyer(botKey)"
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
        @click="store.unlockAutobuyer(botKey)"
        :disabled="!canUnlock(botKey)"
        class="btn-tactile w-full py-1.5 px-3 rounded-lg text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border"
        :class="canUnlock(botKey)
          ? 'bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border-blue-500/50'
          : 'bg-black/30 text-slate-600 border-white/[0.05]'"
      >
        <Unlock class="w-3.5 h-3.5" />
        <span>{{ !requirementMet(botKey) ? 'Kilitli: ' + requirementText(botKey) : canUnlock(botKey) ? 'Botu Satın Al' : 'Yetersiz Kütle' }}</span>
      </button>
    </div>
  </div>
</template>
