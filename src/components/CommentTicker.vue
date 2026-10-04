<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useGameStore } from '../stores/game'
import { sounds } from '../core/audio'
import { Heart, ChevronRight } from 'lucide-vue-next'
import { Decimal } from '../core/math'

interface CommentItem {
  id: number
  author: string
  avatarColor: string
  text: string
  category: 'innocent' | 'hypnotic' | 'crisis' | 'dawn' | 'general'
}

const store = useGameStore()

const COMMENTS: CommentItem[] = [
  // Moleküler / Masum Faz
  { id: 1, author: '@lab_stajyeri', avatarColor: '#a855f7', text: 'Tamam sadece su damlasındaki karbonu ayrıştırıp çıkacaktım...', category: 'innocent' },
  { id: 2, author: '@dr_kuantum', avatarColor: '#f59e0b', text: 'Elektron orbitalleri çöktü ama verim grafiği mükemmel görünüyor!', category: 'innocent' },
  { id: 3, author: '@guvenlik_amiri', avatarColor: '#3b82f6', text: 'Laboratuvar kapısı neden içeri doğru bükülüyor arkadaşlar?', category: 'innocent' },
  { id: 4, author: '@fizik_doktorasi', avatarColor: '#ec4899', text: 'Planck duvarında ufak bir delik açıldı ama kontrol altında... galiba.', category: 'innocent' },
  { id: 5, author: '@kimya_profesoru', avatarColor: '#10b981', text: 'Nükleer çekirdek kararsızlaştı, kahvemi yuttu. 10/10 rezonans.', category: 'innocent' },

  // Kuantum Çöküş / Hipnotik
  { id: 6, author: '@hadi_cern', avatarColor: '#f97316', text: 'Kuark çorbası reaktörden taştı, yerçekimi tersine döndü!', category: 'hypnotic' },
  { id: 7, author: '@olay_ufku_gozlem', avatarColor: '#06b6d4', text: 'Laboratuvar masası olay ufkuna girdi, laptop spagettiye dönüştü.', category: 'hypnotic' },
  { id: 8, author: '@kozmik_rapor', avatarColor: '#8b5cf6', text: 'Tebrikler: Karbon ayak iziniz sıfırlandı çünkü şehir tekilliğe çekildi.', category: 'hypnotic' },
  { id: 9, author: '@mikro_karadelik', avatarColor: '#14b8a6', text: 'Mikro-karadelik doymak bilmiyor; kütleçekim ivmesi katlanıyor.', category: 'hypnotic' },
  { id: 10, author: '@kutle_avcisi', avatarColor: '#ec4899', text: 'Birkaç gigaton daha yutarsak evrenin tüm kütlesini tek bir noktaya toplayacağız.', category: 'hypnotic' },

  // Makro Boyut / Kriz & Histeri
  { id: 11, author: '@afad_kozmik', avatarColor: '#f43f5e', text: 'DİKKAT: ATMOSFERİK BASINÇ ÇÖKTÜ, DAĞLAR MERKEZE AKIYOR!', category: 'crisis' },
  { id: 12, author: '@jeoloji_kurulu', avatarColor: '#ef4444', text: 'Tektonik plakalar birleşti, Dünya olay ufkuna doğru spiral çiziyor!', category: 'crisis' },
  { id: 13, author: '@nasa_canli', avatarColor: '#eab308', text: 'Güneş sistemi ekseninden kaydı; Ay tekillik tarafından yutuldu!', category: 'crisis' },
  { id: 14, author: '@hawking_isima', avatarColor: '#38bdf8', text: 'Hawking ışıması kör edici seviyede, uzay-zaman geometrisi yırtıldı.', category: 'crisis' },
  { id: 15, author: '@kozmik_parazit', avatarColor: '#f43f5e', text: 'Kozmik parazitler olay ufkuna yapıştı, kütle kaçırmaya çalışıyor!', category: 'crisis' },

  // Kozmik Tekillik / Şafak & Uroboros
  { id: 16, author: '@samanyolu_merkez', avatarColor: '#f59e0b', text: 'Güneş nükleer füzyonu durdurdu ve tekilliğin içinde eridi.', category: 'dawn' },
  { id: 17, author: '@galaktik_konsey', avatarColor: '#fbbf24', text: 'Samanyolu spiral kolları karadeliğin içine dökülüyor... Uroboros doymadı!', category: 'dawn' },
  { id: 18, author: '@kozmik_son', avatarColor: '#10b981', text: 'Tüm yıldızlar söndü, kütle 1.79e308 sınırına yaklaşıyor!', category: 'dawn' },
  { id: 19, author: '@tekillik_yolcusu', avatarColor: '#c084fc', text: 'Uzay ve zaman yer değiştirdi; evren sonsuz bir kütle düğümüne dönüştü.', category: 'dawn' },
  { id: 20, author: '@uroboros_tekillik', avatarColor: '#94a3b8', text: 'Yutulan kütle sonsuz, tekillik uyanık, Uroboros kendi kuyruğunu yutuyor.', category: 'dawn' }
]

const currentIndex = ref(0)
const heartsGiven = ref<Record<number, number>>({})
const isTransitioning = ref(false)
let rotateTimer: number | null = null

// Oyunun durumuna göre ağırlıklı yorum havuzu
const relevantComments = computed(() => {
  if (store.isComboActive || store.crisisBackfireDebuff > 0) {
    return COMMENTS.filter((c) => c.category === 'crisis' || c.category === 'hypnotic')
  }
  if (store.matter.gt(1e12)) {
    return COMMENTS.filter((c) => c.category === 'dawn' || c.category === 'crisis' || c.category === 'hypnotic')
  }
  return COMMENTS
})

const activeComment = computed(() => {
  const pool = relevantComments.value
  if (!pool.length) return COMMENTS[0]
  return pool[currentIndex.value % pool.length]
})

const currentLikes = computed(() => {
  const base = 42 + (activeComment.value.id * 17) % 89
  const bonus = heartsGiven.value[activeComment.value.id] || 0
  return base + bonus
})

function nextComment() {
  if (isTransitioning.value) return
  isTransitioning.value = true
  setTimeout(() => {
    currentIndex.value = (currentIndex.value + 1) % relevantComments.value.length
    isTransitioning.value = false
  }, 200)
}

function likeComment(e: MouseEvent) {
  const id = activeComment.value.id
  heartsGiven.value[id] = (heartsGiven.value[id] || 0) + 1

  // Ekran koordinatında kalp fırlat
  window.dispatchEvent(
    new CustomEvent('doomscroll:heart', {
      detail: { x: e.clientX, y: e.clientY }
    })
  )

  // Küçük dopamin prim ödülü (0.2 saniyelik üretim ya da en az 10)
  try {
    const mps = store.matterPerSecond
    const reward = mps.gt(0) ? mps.times(0.2) : new Decimal(10)
    store.matter = store.matter.plus(reward)
  } catch {
    /* break_eternity koruması */
  }

  sounds.playTallyTick()
}

onMounted(() => {
  // Her 6.5 saniyede bir sonraki yoruma geç
  rotateTimer = window.setInterval(() => {
    nextComment()
  }, 6500)
})

onUnmounted(() => {
  if (rotateTimer !== null) clearInterval(rotateTimer)
})
</script>

<template>
  <div class="comment-ticker-wrap w-full max-w-5xl mx-auto px-2 sm:px-4 py-1 select-none">
    <div
      class="ticker-bar flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl border border-white/10 bg-slate-900/70 backdrop-blur-md shadow-xs text-xs transition-all hover:border-white/20"
    >
      <!-- Sol: İkon & Canlı Rozet -->
      <div class="flex items-center gap-1.5 shrink-0">
        <span class="relative flex h-2 w-2">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-2 w-2 bg-rose-500"></span>
        </span>
        <span class="text-[10px] font-bold tracking-wider text-rose-400 uppercase hidden sm:inline">
          CANLI REELS SOHBETİ
        </span>
      </div>

      <!-- Orta: Dinamik Yorum Metni -->
      <div
        class="ticker-content flex-1 overflow-hidden transition-opacity duration-200 cursor-pointer"
        :class="{ 'opacity-0': isTransitioning, 'opacity-100': !isTransitioning }"
        @click="nextComment"
        title="Sonraki yorum için tıkla"
      >
        <div class="flex items-center gap-1.5 truncate">
          <span
            class="font-bold shrink-0 truncate max-w-[100px] sm:max-w-[130px]"
            :style="{ color: activeComment.avatarColor }"
          >
            {{ activeComment.author }}:
          </span>
          <span class="text-slate-200 truncate font-medium">
            "{{ activeComment.text }}"
          </span>
        </div>
      </div>

      <!-- Sağ: Beğeni / Kalp Aksiyon Butonu & İleri -->
      <div class="flex items-center gap-1 shrink-0">
        <button
          type="button"
          class="like-btn flex items-center gap-1 px-2 py-0.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 border border-white/5 hover:border-rose-500/30 transition-all active:scale-90"
          @click.stop="likeComment"
          title="Yoruma enerji aktar (+Kütle)"
        >
          <Heart class="w-3.5 h-3.5 fill-rose-500 text-rose-500" />
          <span class="text-[11px] font-mono tabular-nums font-semibold">{{ currentLikes }}</span>
        </button>

        <button
          type="button"
          class="p-1 text-slate-400 hover:text-white transition-colors"
          @click.stop="nextComment"
          title="Sonraki yorum"
          aria-label="Sonraki yorum"
        >
          <ChevronRight class="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ticker-bar {
  background: linear-gradient(90deg, rgba(15, 23, 42, 0.75) 0%, rgba(30, 27, 75, 0.6) 100%);
}

.like-btn:hover {
  box-shadow: 0 0 10px rgba(244, 63, 94, 0.25);
}
</style>
