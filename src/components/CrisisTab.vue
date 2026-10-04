<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore, CRISIS_SPELLS } from '../stores/game'
import { getTierIdentity } from '../game/dimension_identity'
import { Zap, Flame, AlertTriangle, BatteryCharging, ShieldAlert, Sparkles } from 'lucide-vue-next'
import type { CrisisSpellType } from '../models/types'
import TabHero from './TabHero.vue'
import LockedFeature from './LockedFeature.vue'

const store = useGameStore()

// D4 (Bölünmüş Dikkat) pasifi: kriz spawn hızını artırır — etkinse hero'da rozet
const d4Passive = computed(() => {
  const id = getTierIdentity(4)
  if (!store.passiveBadges.d4Anomaly || !id) return null
  return { label: `D4 +${Math.round((id.passive.value - 1) * 100)}%`, desc: id.passive.desc }
})

// Büyü kademesi (Özellik Merdiveni): Şarj başlangıçta, Espresso/Kulaklık/Yalan sırayla açılır
const SPELL_UNLOCK_FEATURES: Partial<Record<CrisisSpellType, string>> = {
  espresso_shot: 'spell_espresso',
  noise_cancelling: 'spell_noise',
  sleep_denial: 'spell_sleep'
}
function spellUnlockFeatureId(spellId: CrisisSpellType): string | null {
  return SPELL_UNLOCK_FEATURES[spellId] || null
}
function isSpellLocked(spellId: CrisisSpellType): boolean {
  const featureId = spellUnlockFeatureId(spellId)
  return !!featureId && !store.isFeatureUnlocked(featureId)
}

function canCast(spellCost: number): boolean {
  return store.caffeineEnergy >= spellCost
}

function handleCast(spellId: CrisisSpellType) {
  if (isSpellLocked(spellId)) return
  store.castSpell(spellId)
}
</script>

<template>
  <div class="space-y-3">
    <!-- Birleşik Hero -->
    <TabHero
      :icon="Zap"
      icon-class="text-cyan-400"
      title="Gece Yarısı Kriz Yönetimi: Kafein & Uykusuzluk Kararları"
      badge="Gece Kararları"
      badge-class="ds-badge-cyan"
      subtitle="Gece ilerledikçe biriken uykusuzluk enerjisini kullanarak riskli hamleler yap. Dikkat et; bazı kararlar ters tepebilir!"
      accent="cyan"
    >
      <template #stats>
        <div class="stat-box">
          <BatteryCharging class="w-4 h-4 text-cyan-400 shrink-0" />
          <div class="font-mono">
            <span class="text-sm font-bold text-cyan-300 tabular-nums">{{ Math.floor(store.caffeineEnergy) }}</span>
            <span class="text-xs text-slate-500 tabular-nums"> / {{ store.maxCaffeineEnergy }} Enerji</span>
          </div>
          <span class="text-[10px] font-mono text-emerald-400 ml-1 tabular-nums">(+1.2/sn)</span>
        </div>
        <span
          v-if="d4Passive"
          class="text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded bg-rose-500/15 text-rose-300 border border-rose-500/25 shrink-0 cursor-help select-none"
          v-tip="`D4 Bölünmüş Dikkat Pasifi: ${d4Passive.desc}`"
        >
          {{ d4Passive.label }}
        </span>
      </template>
      <template #progress>
        <div class="progress-track progress-track-md progress-track-bordered">
          <div
            class="progress-fill progress-fill-cyan"
            :style="{ width: `${(store.caffeineEnergy / store.maxCaffeineEnergy) * 100}%` }"
          ></div>
        </div>
      </template>
      <template #alert>
        <div
          v-if="store.crisisBackfireDebuff > 0"
          class="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs font-mono flex items-center gap-2 animate-pulse"
        >
          <AlertTriangle class="w-4 h-4 text-rose-400 shrink-0" />
          <span class="tabular-nums">
            ⚠️ TERS TEPKİ: Şarj aleti temassızlık yaptı! Üretim %50 yavaşladı! (Kalan: {{ Math.ceil(store.crisisBackfireDebuff) }} sn)
          </span>
        </div>
      </template>
    </TabHero>

    <!-- Gece Kararı Kartları -->
    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
      <template v-for="spell in CRISIS_SPELLS" :key="spell.id">
        <LockedFeature
          v-if="isSpellLocked(spell.id)"
          :feature-id="spellUnlockFeatureId(spell.id)"
        />
        <div
          v-else
          class="glass-panel-card p-4 rounded-xl flex flex-col justify-between"
          :class="canCast(spell.energyCost) ? 'hover:border-cyan-500/40' : 'opacity-60'"
        >
        <div>
          <!-- Üst Başlık & İkon & Enerji Maliyeti -->
          <div class="flex items-start justify-between gap-3 mb-2">
            <div class="flex items-center gap-2.5">
              <span class="text-2xl p-2 rounded-xl bg-black/40 border border-white/[0.08]">{{ spell.icon }}</span>
              <div>
                <h3 class="text-sm font-bold font-mono text-slate-100">{{ spell.name }}</h3>
                <span class="text-[11px] font-mono font-bold text-cyan-400 tabular-nums">
                  {{ spell.energyCost }} Enerji
                </span>
              </div>
            </div>

            <!-- Risk Rozeti -->
            <span
              class="ds-badge"
              :class="spell.backfireChance > 0 ? 'ds-badge-amber' : 'ds-badge-emerald'"
            >
              {{ spell.backfireChance > 0 ? `%${Math.round(spell.backfireChance * 100)} Risk` : 'Güvenli' }}
            </span>
          </div>

          <!-- Açıklama -->
          <p class="text-xs text-slate-300 mt-2 leading-relaxed">
            {{ spell.desc }}
          </p>

          <!-- Backfire Açıklaması -->
          <div
            v-if="spell.backfireChance > 0"
            class="text-[10px] font-mono text-amber-400/90 mt-2.5 p-2 rounded-lg bg-amber-500/5 border border-amber-500/20 flex items-center gap-1.5"
          >
            <ShieldAlert class="w-3.5 h-3.5 shrink-0 text-amber-400" />
            <span>{{ spell.backfireDesc }}</span>
          </div>
        </div>

        <!-- Kullan Butonu -->
        <button
          @click="handleCast(spell.id)"
          :disabled="!canCast(spell.energyCost)"
          class="btn-tactile mt-4 w-full py-2.5 px-4 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-2 transition-all cursor-pointer border"
          :class="canCast(spell.energyCost)
            ? 'bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border-cyan-500/50'
            : 'bg-black/30 text-slate-600 border-white/[0.05]'"
        >
            <Sparkles class="w-3.5 h-3.5" />
            <span>{{ canCast(spell.energyCost) ? 'Kararı Uygula' : 'Yetersiz Enerji' }}</span>
          </button>
        </div>
      </template>
    </div>

    <!-- İstatistik & Bilgi Kutusu -->
    <div class="glass-panel-card p-3.5 rounded-xl flex items-center justify-between text-xs font-mono text-slate-400 flex-wrap gap-2">
      <div class="flex items-center gap-2">
        <Flame class="w-4 h-4 text-purple-400" />
        <span>Kullanılan Toplam Gece Kararları:</span>
        <span class="text-purple-300 font-bold tabular-nums">{{ store.stats.spellsCast || 0 }}</span>
      </div>
      <div class="text-[11px] text-slate-500">
        Enerji maksimum 100 birime kadar otomatik dolar.
      </div>
    </div>
  </div>
</template>
