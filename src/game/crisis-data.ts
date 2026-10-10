// Kriz mudahaleleri (Crisis 3.0) veri tablolari. Saf moduldur.
import type { CrisisInterventionType, CrisisSpellType } from '../models/types'

export const CRISIS_INTERVENTIONS = [
  {
    id: 'quantum_compression' as CrisisInterventionType,
    name: 'Kuantum Sıkıştırma',
    icon: '⚡',
    heatChange: 25,
    baseCooldown: 20,
    desc: 'Olay ufkunda kuantum tekilliği sıkıştırır; ekrana anında 1 adet Altın Kozmik Dalgalanma (Anomali) fırlatır.',
    tacticalTip: 'Hızlı anomali zincirleri ve kombo çarpanlarını başlatmak için idealdir. (Bekleme: 20s)'
  },
  {
    id: 'time_dilation' as CrisisInterventionType,
    name: 'Zaman Genleşmesi',
    icon: '⏳',
    heatChange: 20,
    baseCooldown: 25,
    desc: 'Gravitasyonel zaman kuyusu oluşturur; ekranda aktif tüm geçici güçlendirmelerin süresine +15 saniye ekler (azami 120s tavan).',
    tacticalTip: 'Süpernova (7×) ve Kütle Patlaması zirvelerini uzatır; 120s tavanı aşamaz. (Bekleme: 25s)'
  },
  {
    id: 'magnetic_vent' as CrisisInterventionType,
    name: 'Manyetik Tahliye',
    icon: '🧲',
    heatChange: -35,
    baseCooldown: 2,
    desc: '1 Kriyojenik Kartuş harcayarak plazmayı tahliye eder; ısıyı 35 puan soğutur, parazitleri temizler ve %175 primle bozdurur.',
    tacticalTip: 'Kriyojenik kartuş harcar (35s dolum). Aşırı ısınmayı önlemek ve Tatlı Noktada kalmak için soğutma valfidir.'
  },
  {
    id: 'planck_surge' as CrisisInterventionType,
    name: 'Planck Patlaması',
    icon: '💥',
    heatChange: 45,
    baseCooldown: 45,
    desc: 'Planck ölçeğindeki vakum enerjisini serbest bırakır; 20 sn boyunca Çekim Hızını 4× ve Manuel Yutma gücünü 10× yapar.',
    tacticalTip: 'Yüksek risk, devasa getiri! Isı sınırına dikkat edin; Tatlı Noktada patlatın. (Bekleme: 45s)'
  }
]

/** Geriye dönük uyumluluk takma listesi */
export const CRISIS_SPELLS = CRISIS_INTERVENTIONS.map((intv) => ({
  id: intv.id as CrisisSpellType,
  name: intv.name,
  icon: intv.icon,
  desc: intv.desc,
  energyCost: Math.abs(intv.heatChange),
  backfireChance: 0,
  backfireDesc: ''
}))
