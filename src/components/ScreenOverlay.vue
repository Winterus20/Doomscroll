<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useGameStore } from '../stores/game'

const store = useGameStore()

// Başparmak izi reaktif darbe durumu
const smudgePulse = ref(false)
let pulseTimeout: ReturnType<typeof setTimeout> | null = null

// Efektlerin açık olup olmadığı
const isEnabled = computed(() => {
  return store.settings.screenOverlayEffects ?? true
})

// Çatlak ekran tetikleyicisi: aktif bir Kriz Meydan Okuması (C1-C8) veya ters tepme krizi
const showCracks = computed(() => {
  if (!isEnabled.value) return false
  return !!store.activeChallenge || store.crisisBackfireDebuff > 0
})

// Gece Kriz Ambiyansı & Perimetre Işığı
const hasFloatingAnomalies = computed(() => store.floatingAnomalies.length > 0)
const isCombo = computed(() => store.isComboActive)
const hasActiveBuffs = computed(() => store.activeBuffs.length > 0)
const hasCrisisAura = computed(() => isEnabled.value && (hasFloatingAnomalies.value || isCombo.value || hasActiveBuffs.value))

const primaryAnomalyType = computed(() => {
  if (isCombo.value) return 'combo'
  if (store.floatingAnomalies.length > 0) return store.floatingAnomalies[0].type
  if (store.activeBuffs.length > 0) return store.activeBuffs[0].type
  return 'fyp'
})

const crisisAuraClass = computed(() => {
  if (primaryAnomalyType.value === 'combo') return 'crisis-aura-combo'
  if (primaryAnomalyType.value === 'heart_frenzy') return 'crisis-aura-rose'
  if (primaryAnomalyType.value === 'sponsor') return 'crisis-aura-amber'
  return 'crisis-aura-purple'
})

const crisisFlash = ref(false)
let flashTimeout: ReturnType<typeof setTimeout> | null = null

function handleShockwave() {
  if (!isEnabled.value) return
  crisisFlash.value = true
  if (flashTimeout) clearTimeout(flashTimeout)
  flashTimeout = setTimeout(() => {
    crisisFlash.value = false
    flashTimeout = null
  }, 220)
}

function handleTap() {
  if (!isEnabled.value) return
  smudgePulse.value = true
  if (pulseTimeout) clearTimeout(pulseTimeout)
  pulseTimeout = setTimeout(() => {
    smudgePulse.value = false
    pulseTimeout = null
  }, 220)
}

onMounted(() => {
  window.addEventListener('doomscroll:tap', handleTap)
  window.addEventListener('doomscroll:shockwave', handleShockwave)
})

onUnmounted(() => {
  window.removeEventListener('doomscroll:tap', handleTap)
  window.removeEventListener('doomscroll:shockwave', handleShockwave)
  if (pulseTimeout) {
    clearTimeout(pulseTimeout)
    pulseTimeout = null
  }
  if (flashTimeout) {
    clearTimeout(flashTimeout)
    flashTimeout = null
  }
})
</script>

<template>
  <div
    v-if="isEnabled"
    class="pointer-events-none fixed inset-0 z-40 overflow-hidden select-none"
    aria-hidden="true"
  >
    <!-- 1. YAĞLI BAŞPARMAK İZİ LEKESİ (Sağ Alt Scroll Bölgesi) -->
    <div
      class="smudge-container absolute bottom-4 right-4 sm:bottom-8 sm:right-10 w-44 h-56 sm:w-56 sm:h-72 transition-opacity duration-300 pointer-events-none"
      :class="smudgePulse ? 'opacity-35 scale-102' : 'opacity-15'"
    >
      <svg
        viewBox="0 0 200 260"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        class="w-full h-full mix-blend-screen transform -rotate-12 filter blur-[0.6px]"
      >
        <!-- Parmak izi halkaları (Whorl lines) -->
        <g stroke="rgba(255, 255, 255, 0.45)" stroke-width="1.6" stroke-linecap="round">
          <ellipse cx="100" cy="130" rx="14" ry="24" stroke-dasharray="18 4" />
          <path d="M 85 105 C 80 120, 80 140, 86 155" />
          <path d="M 115 105 C 120 120, 120 140, 114 155" />
          <ellipse cx="100" cy="130" rx="30" ry="46" stroke-dasharray="24 6 12 5" />
          <ellipse cx="100" cy="130" rx="46" ry="68" stroke-dasharray="32 8 16 6" />
          <ellipse cx="100" cy="130" rx="62" ry="90" stroke-dasharray="40 10 20 8" />
          <ellipse cx="100" cy="130" rx="78" ry="110" stroke-dasharray="48 12 28 10" />
        </g>
        <!-- Ekran yağı radial aurası -->
        <radialGradient id="smudge-glow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stop-color="rgba(192, 132, 252, 0.22)" />
          <stop offset="45%" stop-color="rgba(56, 189, 248, 0.12)" />
          <stop offset="100%" stop-color="rgba(255, 255, 255, 0)" />
        </radialGradient>
        <ellipse cx="100" cy="130" rx="88" ry="115" fill="url(#smudge-glow)" />
      </svg>
    </div>

    <!-- 2. ÇATLAK CAM VEKTÖRÜ (Kriz Meydan Okumalarında Belirir) -->
    <div
      class="crack-container absolute top-0 left-0 w-64 h-64 sm:w-80 sm:h-80 transition-opacity duration-700 pointer-events-none"
      :class="showCracks ? 'opacity-90' : 'opacity-0'"
    >
      <svg
        viewBox="0 0 300 300"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        class="w-full h-full mix-blend-screen filter drop-shadow-[0_0_5px_rgba(244,63,94,0.6)]"
      >
        <!-- Merkez darbe noktası -->
        <circle cx="15" cy="15" r="4" fill="rgba(255, 255, 255, 0.9)" />
        <circle cx="15" cy="15" r="10" stroke="rgba(255, 255, 255, 0.7)" stroke-width="1.2" fill="none" />
        
        <!-- Ana çatlak dalları -->
        <g stroke="rgba(255, 255, 255, 0.85)" stroke-width="1.4" stroke-linecap="round">
          <path d="M 15 15 L 65 45 L 110 55 L 165 40 L 220 50 L 285 30" />
          <path d="M 65 45 L 85 95 L 130 140 L 160 210 L 180 280" />
          <path d="M 15 15 L 35 70 L 40 130 L 30 185 L 45 250 L 35 295" />
          <path d="M 110 55 L 140 100 L 205 125 L 260 170" />
        </g>

        <!-- Kılcal çatlaklar (şeffaf beyaz/neon yansıma) -->
        <g stroke="rgba(224, 231, 255, 0.5)" stroke-width="0.8">
          <path d="M 85 95 L 105 115" />
          <path d="M 130 140 L 115 170 L 125 190" />
          <path d="M 165 40 L 185 70 L 230 85" />
          <path d="M 40 130 L 70 155 L 80 185" />
          <path d="M 220 50 L 250 80" />
          <path d="M 140 100 L 175 90" />
        </g>
      </svg>
    </div>

    <!-- 3. GECE KRİZİ VE KOMBO AMBİYANS PERİMETRE IŞIĞI (Crisis Perimeter Aura) -->
    <div
      v-if="hasCrisisAura"
      class="crisis-perimeter-aura absolute inset-0 pointer-events-none transition-all duration-300"
      :class="[crisisAuraClass, crisisFlash ? 'opacity-90 scale-101' : 'opacity-40 animate-pulse']"
    ></div>
  </div>
</template>
