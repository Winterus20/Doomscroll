<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore, SINGULARITY_UPGRADES } from '../stores/game'
import { formatNumber } from '../core/format'
import { D_INFINITY } from '../core/math'
import { Sunrise, Sparkles, Check, ShieldCheck, Sun } from 'lucide-vue-next'
import TabHero from './TabHero.vue'

const store = useGameStore()

const progressToSingularity = computed(() => {
  if (store.matter.gte(D_INFINITY)) return 100
  const logVal = Math.max(0, store.matter.log10().toNumber())
  return Math.min(100, Math.floor((logVal / 308.25) * 100))
})

function getUpgradeCost(upg: typeof SINGULARITY_UPGRADES[0]): number {
  const currentLvl = store.singularityUpgrades[upg.id] || 0
  return Math.floor(upg.baseCost * Math.pow(upg.costMult, currentLvl) * store.achievementSpDiscount)
}

function canAffordUpgrade(upg: typeof SINGULARITY_UPGRADES[0]): boolean {
  const currentLvl = store.singularityUpgrades[upg.id] || 0
  if (currentLvl >= upg.maxLevel) return false
  return store.singularityPoints.gte(getUpgradeCost(upg))
}

function handleSingularityReset() {
  if (!store.canSingularity) return
  if (confirm('Sabah 06:00 Çöküşünü tetiklemek istiyor musun? Dopamin ve İstasyonların sıfırlanacak ancak kalıcı Uykusuzluk Puanı (SP) kazanacaksın!')) {
    store.singularityReset()
  }
}
</script>

<template>
  <div class="space-y-3">
    <!-- Birleşik Hero -->
    <TabHero
      :icon="Sunrise"
      icon-class="text-amber-400"
      title="Sabah 06:00 Çöküşü (Güneş Doğdu!)"
      badge="Katman 1 Tekillik"
      badge-class="ds-badge-amber"
      subtitle="Dışarıdan kuş sesleri geliyor, güneş perdelerden sızıyor ama başparmağın hala otomatik yukarı kaydırıyor! 1.79e308 Dopamine ulaştığında uykusuzluğu yenerek ilk çöküşü yaşa ve kalıcı Uykusuzluk Puanı (SP) kazan."
      :accent="store.canSingularity ? 'amber' : 'slate'"
    >
      <template #stats>
        <div class="stat-box">
          <Sparkles class="w-5 h-5 text-amber-400 shrink-0" />
          <div>
            <div class="stat-box-label">Mevcut Uykusuzluk Puanı</div>
            <div class="stat-box-value text-amber-400 tabular-nums">{{ formatNumber(store.singularityPoints, store.settings.notation) }} SP</div>
          </div>
        </div>
        <button
          @click="handleSingularityReset"
          :disabled="!store.canSingularity"
          class="btn-tactile py-2.5 px-5 rounded-xl font-mono font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer border"
          :class="store.canSingularity
            ? 'bg-amber-500 hover:bg-amber-400 text-slate-950 border-amber-400 animate-pulse'
            : 'bg-black/30 text-slate-600 border-white/[0.05]'"
        >
          <Sun class="w-4 h-4" />
          <span>
            {{ store.canSingularity ? `Güneşi Karşıla (+${formatNumber(store.singularityGain, store.settings.notation)} SP)` : '1.79e308 Dopamin Gereklidir' }}
          </span>
        </button>
      </template>
      <template #progress>
        <div class="flex justify-between text-xs font-mono mb-1.5">
          <span class="text-slate-400">Sabah 06:00 Güneş İlerlemesi</span>
          <span class="text-amber-400 font-bold tabular-nums">%{{ progressToSingularity }}</span>
        </div>
        <div class="progress-track progress-track-md progress-track-bordered">
          <div
            class="progress-fill progress-fill-dawn"
            :style="{ width: `${progressToSingularity}%` }"
          ></div>
        </div>
      </template>
    </TabHero>

    <!-- Kalıcı Uykusuzluk Dükkanı (SP Yükseltmeleri) -->
    <div>
      <div class="flex items-center justify-between mb-3 flex-wrap gap-1">
        <h3 class="section-label">
          <Sparkles class="w-4 h-4 text-amber-400" />
          <span>Kalıcı Uykusuzluk Dükkanı (SP Upgrades)</span>
        </h3>
        <span class="section-hint">Bu yükseltmeler sıfırlamalarda kalıcıdır ve asla silinmez.</span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <div
          v-for="upg in SINGULARITY_UPGRADES"
          :key="upg.id"
          class="glass-panel-card p-4 rounded-xl flex flex-col justify-between"
          :class="[
            (store.singularityUpgrades[upg.id] || 0) >= upg.maxLevel
              ? 'border-emerald-500/40 bg-emerald-950/20'
              : canAffordUpgrade(upg)
                ? 'hover:border-amber-500/50'
                : 'opacity-60'
          ]"
        >
          <div>
            <!-- İkon, İsim ve Seviye -->
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2.5">
                <span class="text-2xl p-2 rounded-xl bg-black/40 border border-white/[0.08]">{{ upg.icon }}</span>
                <div>
                  <h4 class="text-xs font-bold font-mono text-slate-100">{{ upg.name }}</h4>
                  <div class="text-[10px] font-mono text-slate-400 tabular-nums">
                    Seviye:
                    <span class="text-amber-400 font-bold">{{ store.singularityUpgrades[upg.id] || 0 }}</span>
                    / {{ upg.maxLevel }}
                  </div>
                </div>
              </div>

              <span
                v-if="(store.singularityUpgrades[upg.id] || 0) >= upg.maxLevel"
                class="ds-badge ds-badge-emerald"
              >
                <Check class="w-3 h-3" />
                <span>MAKS</span>
              </span>
            </div>

            <!-- Açıklama -->
            <p class="text-xs text-slate-300 mt-2 leading-relaxed">
              {{ upg.desc }}
            </p>
          </div>

          <!-- Satın Al Butonu -->
          <div class="mt-4 pt-3 border-t border-white/[0.06]">
            <button
              v-if="(store.singularityUpgrades[upg.id] || 0) < upg.maxLevel"
              @click="store.buySingularityUpgrade(upg.id)"
              :disabled="!canAffordUpgrade(upg)"
              class="btn-tactile w-full py-2 px-3 rounded-xl text-xs font-mono font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer border tabular-nums"
              :class="canAffordUpgrade(upg)
                ? 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border-amber-500/40'
                : 'bg-black/30 text-slate-600 border-white/[0.05]'"
            >
              <span>Yükselt ({{ getUpgradeCost(upg) }} SP)</span>
            </button>

            <div v-else class="text-center py-2 text-xs font-mono text-emerald-400 flex items-center justify-center gap-1">
              <ShieldCheck class="w-4 h-4" />
              <span>Maksimum Seviyeye Ulaşıldı</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
