import { Decimal } from '../core/math'
import type {
  AchievementCategoryId,
  AchievementDef,
  AchievementRewardKind
} from '../models/types'

// ---- Denge Sabitleri ----
// Taslak plandaki (×1.03 / ×1.10) değerler 56 başarımda toplam ×4.5+ veriyordu;
// onaylanan "tam sette ~×2.5-3" hedefini tutturmak için aşağı ayarlandı.
// Tam set (67 + 8 tam satır): 1.012^67 × 1.06^8 ≈ ×3.55 (8 Meydan Okuma başarımı dahil)
export const PER_ACHIEVEMENT_MULT = 1.012
export const ROW_COMPLETION_MULT = 1.06

export interface AchievementCategoryMeta {
  id: AchievementCategoryId
  name: string
  desc: string
  icon: string
}

export const ACHIEVEMENT_CATEGORIES: AchievementCategoryMeta[] = [
  { id: 'dopamine', name: 'Dopamin Bağımlılığı', desc: 'Yukarı kaydır, üret, biriktir. Başparmağın kaderi.', icon: '📱' },
  { id: 'dimensions', name: 'Boyut Yozlaşması', desc: 'İstasyonlar, frekans, sıçrama ve kümeler.', icon: '🏭' },
  { id: 'automation', name: 'Otomasyon Ordusu', desc: 'Botları aç, toplu ve max moda geçir.', icon: '🤖' },
  { id: 'crisis', name: 'Gece Krizleri', desc: 'Anomaliler, rezonans komboları ve gece kararları.', icon: '🌃' },
  { id: 'guilt', name: 'Vicdan Azapları', desc: 'Dadanırlar, emerler, susturulurlar.', icon: '😈' },
  { id: 'lab', name: 'Algoritma Laboratuvarı', desc: 'Tohum ek, olgunlaştır, hasat et, mutasyona uğrat.', icon: '🧪' },
  { id: 'singularity', name: 'Tekillik Yolculuğu', desc: 'Şafağı gör, çök, SP biriktir, nöbette kal.', icon: '🌅' },
  { id: 'challenges', name: 'Meydan Okumalar', desc: 'Gece Kriz Meydan Okumalarını tamamla.', icon: '🏆' }
]

// Eşik sabitleri (string tabanlı: float kayması yok)
const N1E6 = new Decimal('1e6')
const N1E12 = new Decimal('1e12')
const N1E30 = new Decimal('1e30')
const N1E50 = new Decimal('1e50')
const N1E75 = new Decimal('1e75')
const N1E105 = new Decimal('1e105')
const N1E140 = new Decimal('1e140')
const N1E180 = new Decimal('1e180')
const N1E225 = new Decimal('1e225')
const N1E270 = new Decimal('1e270')
const N1E308 = new Decimal('1e308')
const SP10 = new Decimal(10)
const SP1000 = new Decimal(1000)

export const ACHIEVEMENTS: AchievementDef[] = [
  // ---- 1. Dopamin Bağımlılığı (ADR-0032: 0 → 1e308 ölçek merdiveni) ----
  { id: 'dop_first', name: 'İlk Yukarı Kaydırma', desc: '1 kez yukarı kaydır', icon: '👆', category: 'dopamine', check: (c) => c.manualClicks >= 1 },
  { id: 'dop_100', name: 'Başparmak Isınması', desc: '100 kez yukarı kaydır', icon: '👍', category: 'dopamine', check: (c) => c.manualClicks >= 100 },
  { id: 'dop_1000', name: 'Kaydırma Maratonu', desc: '1.000 kez yukarı kaydır', icon: '🔥', category: 'dopamine', check: (c) => c.manualClicks >= 1000 },
  {
    id: 'dop_10k', name: 'Durdurulamaz Başparmak', desc: '10.000 kez yukarı kaydır', icon: '🌀', category: 'dopamine',
    reward: { kind: 'click_x2', desc: 'Kalıcı ödül: Yukarı Kaydırma ×2' },
    check: (c) => c.manualClicks >= 10000
  },
  { id: 'dop_million', name: 'İlk Viral Patlama', desc: 'Toplam 1e6 Dopamin üret', icon: '📈', category: 'dopamine', check: (c) => c.totalMatter.gte(N1E6) },
  { id: 'dop_trillion', name: 'Gece 3 Fenomeni', desc: 'Toplam 1e12 Dopamin üret', icon: '🌙', category: 'dopamine', check: (c) => c.totalMatter.gte(N1E12) },
  { id: 'dop_baron', name: 'Dopamin Baronu', desc: 'Toplam 1e30 Dopamin üret', icon: '👑', category: 'dopamine', check: (c) => c.totalMatter.gte(N1E30) },
  { id: 'dop_50', name: 'Gece Nöbetçisi', desc: 'Toplam 1e50 Dopamin üret', icon: '🕯️', category: 'dopamine', check: (c) => c.totalMatter.gte(N1E50) },
  { id: 'dop_75', name: 'Uykusuzluğun Eşiği', desc: 'Toplam 1e75 Dopamin üret', icon: '👁️', category: 'dopamine', check: (c) => c.totalMatter.gte(N1E75) },
  {
    id: 'dop_padisah', name: 'Dopamin Padişahı', desc: 'Toplam 1e105 Dopamin üret', icon: '💎', category: 'dopamine',
    reward: { kind: 'prod_x125', desc: 'Kalıcı ödül: Tüm üretim ×1.25' },
    check: (c) => c.totalMatter.gte(N1E105)
  },
  {
    id: 'dop_yasa', name: 'Gece Yasası', desc: 'Toplam 1e140 Dopamin üret', icon: '📜', category: 'dopamine',
    reward: { kind: 'dim_cost_x085', desc: 'Kalıcı ödül: Boyut maliyeti -%15' },
    check: (c) => c.totalMatter.gte(N1E140)
  },
  {
    id: 'dop_donus_yok', name: 'Sabaha Dönüş Yok', desc: 'Toplam 1e180 Dopamin üret', icon: '⚡', category: 'dopamine',
    reward: { kind: 'click_x3', desc: 'Kalıcı ödül: Yukarı Kaydırma ×3' },
    check: (c) => c.totalMatter.gte(N1E180)
  },
  {
    id: 'dop_sonsuz_akis', name: 'Sonsuz Akış', desc: 'Toplam 1e225 Dopamin üret', icon: '🌌', category: 'dopamine',
    reward: { kind: 'shift_power_boost', desc: 'Kalıcı ödül: Sıçrama tabanı 1.66 → 1.9' },
    check: (c) => c.totalMatter.gte(N1E225)
  },
  { id: 'dop_safak_yolu', name: 'Şafak Yolu', desc: 'Toplam 1e270 Dopamin üret', icon: '🌅', category: 'dopamine', check: (c) => c.totalMatter.gte(N1E270) },
  {
    id: 'dop_tekillik', name: 'Dopamin Tekilliği', desc: 'Toplam 1e308 Dopamin üret — Şafak kapısı', icon: '☀️', category: 'dopamine',
    reward: { kind: 'prod_x2', desc: 'Kalıcı ödül: Tüm üretim ×2' },
    check: (c) => c.totalMatter.gte(N1E308)
  },
  { id: 'dop_247', name: 'Gece 02:47 Kulübü', desc: 'Saat 02:00-03:00 arasında oyunu aç', icon: '🦉', category: 'dopamine', secret: true, check: (c) => c.wallHour === 2 },

  // ---- 2. Boyut Yozlaşması ----
  { id: 'dim_d1', name: 'Kedi Videosu Bağımlılığı', desc: 'D1 istasyonundan 10 adet al', icon: '🐱', category: 'dimensions', check: (c) => c.dimBought0 >= 10 },
  { id: 'dim_army', name: 'Reels Ordusu', desc: 'Toplam 100 istasyon al', icon: '🏭', category: 'dimensions', check: (c) => c.dimBoughtTotal >= 100 },
  { id: 'dim_tick5', name: 'Frekans Yükseltmesi', desc: 'Algoritma Frekansı 5 Hz', icon: '📻', category: 'dimensions', check: (c) => c.tickspeedBought >= 5 },
  {
    id: 'dim_tick20', name: 'Algoritma Overclock', desc: 'Algoritma Frekansı 20 Hz', icon: '⚡', category: 'dimensions',
    reward: { kind: 'tickspeed_discount', desc: 'Kalıcı ödül: Frekans maliyeti -%5' },
    check: (c) => c.tickspeedBought >= 20
  },
  { id: 'dim_shift', name: 'İlk Akış Sıçraması', desc: '1 Akış Sıçraması yap', icon: '🎢', category: 'dimensions', check: (c) => c.shifts >= 1 },
  { id: 'dim_shift4', name: 'Tam Ekran Modu', desc: '4 Akış Sıçraması yap (D8 açılır)', icon: '📺', category: 'dimensions', check: (c) => c.shifts >= 4 },
  { id: 'dim_galaxy', name: 'Sonsuz Akış Kümesi', desc: '1 Akış Kümesi yarat', icon: '🌌', category: 'dimensions', check: (c) => c.galaxies >= 1 },
  { id: 'dim_fresh', name: 'Temiz Sayfa', desc: 'Sıçrama/Küme yapmadan 1e6 Dopamine ulaş', icon: '📄', category: 'dimensions', secret: true, check: (c) => c.matter.gte(N1E6) && c.shifts === 0 && c.galaxies === 0 },

  // ---- 3. Otomasyon Ordusu ----
  { id: 'auto_first', name: 'İlk Vardiyalı Bot', desc: '1 bot kilidi aç', icon: '🤖', category: 'automation', check: (c) => c.unlockedBots.length >= 1 },
  { id: 'auto_half', name: 'Bot Çiftliği', desc: '6 bot kilidi aç', icon: '⚙️', category: 'automation', check: (c) => c.unlockedBots.length >= 6 },
  { id: 'auto_all', name: 'Tam Otomasyon', desc: '11 botun tamamını aç', icon: '🧠', category: 'automation', check: (c) => c.unlockedBots.length >= 11 },
  { id: 'auto_bulk', name: 'Toplu Üretim Bandı', desc: 'Toplu (Bulk) modunu aç', icon: '📦', category: 'automation', check: (c) => c.bulkUnlocked },
  { id: 'auto_max', name: 'Maksimum Verimlilik', desc: 'Max modunu aç', icon: '🚀', category: 'automation', check: (c) => c.maxUnlocked },
  { id: 'auto_freq', name: 'Frekans Teknisyeni', desc: 'Frekans (Hz) botunu aç', icon: '🎛️', category: 'automation', check: (c) => c.unlockedBots.includes('tickspeed') },
  { id: 'auto_shift', name: 'Sıçrama Operatörü', desc: 'Akış Sıçraması botunu aç', icon: '🔁', category: 'automation', check: (c) => c.unlockedBots.includes('shift') },
  { id: 'auto_galaxy', name: 'Küme Mimarı', desc: 'Akış Kümeleri botunu aç', icon: '🛸', category: 'automation', secret: true, check: (c) => c.unlockedBots.includes('galaxy') },
  { id: 'colony_hatch', name: 'Nöral Çekirdek', desc: 'Nöral izleme kolonisini aktif et', icon: '🧠', category: 'automation', check: (c) => c.neuralBots.gt(0) },
  { id: 'colony_nap', name: 'İlk Toplu Uyku', desc: '1 Toplu Uyku (Power Nap) yap', icon: '😴', category: 'automation', check: (c) => c.napCount >= 1 },
  { id: 'colony_million', name: 'Milyonlarca Alt-Rutin', desc: '1.000.000 nöral bot yetiştir', icon: '🐜', category: 'automation', secret: true, check: (c) => c.neuralBots.gte(N1E6) },

  // ---- 4. Gece Krizleri ----
  { id: 'cri_first', name: 'İlk Gece Krizi', desc: '1 Gece Krizine dokun', icon: '✨', category: 'crisis', check: (c) => c.anomaliesClicked >= 1 },
  { id: 'cri_10', name: 'Kriz Avcısı', desc: '10 Gece Krizine dokun', icon: '🎯', category: 'crisis', check: (c) => c.anomaliesClicked >= 10 },
  {
    id: 'cri_50', name: 'Gece Vardiyası', desc: '50 Gece Krizine dokun', icon: '🌃', category: 'crisis',
    reward: { kind: 'anomaly_rate', desc: 'Kalıcı ödül: Kriz sıklığı +%10' },
    check: (c) => c.anomaliesClicked >= 50
  },
  { id: 'cri_combo', name: 'Rezonans Hipnozu', desc: 'İlk Süper Rezonans komboyu tetikle (7× + 300×)', icon: '💥', category: 'crisis', check: (c) => c.combosTriggered >= 1 },
  { id: 'cri_void', name: 'Void Reel Avcısı', desc: 'Nadir Void Reel Tekilliğini yakala', icon: '🌌', category: 'crisis', secret: true, check: (c) => (c.mythicsClicked || 0) >= 1 },
  { id: 'cri_combo5', name: 'Hipnoz Ustası', desc: '5 Süper Rezonans kombo tetikle', icon: '💫', category: 'crisis', check: (c) => c.combosTriggered >= 5 },
  { id: 'cri_spell', name: 'İlk Gece Kararı', desc: '1 gece kriz kararı al', icon: '☕', category: 'crisis', check: (c) => c.spellsCast >= 1 },
  {
    id: 'cri_spells', name: 'Kriz Yöneticisi', desc: '10 gece kriz kararı al', icon: '⚡', category: 'crisis',
    reward: { kind: 'buff_duration', desc: 'Kalıcı ödül: Kriz buff süresi +%20' },
    check: (c) => c.spellsCast >= 10
  },
  { id: 'cri_100', name: 'Kriz Manyağı', desc: '100 Gece Krizine dokun', icon: '👁️', category: 'crisis', secret: true, check: (c) => c.anomaliesClicked >= 100 },

  // ---- 5. Vicdan Azapları ----
  { id: 'gui_seen', name: 'İlk Vicdan Azabı', desc: 'Ekranda 1 azap belirsin', icon: '👀', category: 'guilt', check: (c) => c.activeSlackers >= 1 || c.slackersFired >= 1 },
  { id: 'gui_fired', name: 'Susturma', desc: '1 vicdan azabını sustur', icon: '🔇', category: 'guilt', check: (c) => c.slackersFired >= 1 },
  { id: 'gui_5', name: 'Vicdan Susturucu', desc: '5 vicdan azabı sustur', icon: '🧹', category: 'guilt', check: (c) => c.slackersFired >= 5 },
  {
    id: 'gui_25', name: 'Taş Kalp', desc: '25 vicdan azabı sustur', icon: '🗿', category: 'guilt',
    reward: { kind: 'leech_reduction', desc: 'Kalıcı ödül: Azap sızıntısı -%15' },
    check: (c) => c.slackersFired >= 25
  },
  { id: 'gui_full', name: 'Tam Vicdan Heyeti', desc: 'Aynı anda 5 azap ekranda olsun', icon: '👥', category: 'guilt', check: (c) => c.activeSlackers >= 5 },
  { id: 'gui_leech', name: 'Semiren Vicdan', desc: 'Azaplar toplam 1e6 Dopamin emmiş olsun', icon: '🩸', category: 'guilt', check: (c) => c.leechedTotal.gte(N1E6) },
  { id: 'gui_drug', name: 'Vicdan Uyuşturucu', desc: 'SP dükkanından Vicdan Uyuşturucu al', icon: '💊', category: 'guilt', check: (c) => c.guiltImmunityLvl >= 1 },
  { id: 'gui_100', name: 'Vicdan Katili', desc: '100 vicdan azabı sustur', icon: '⚔️', category: 'guilt', secret: true, check: (c) => c.slackersFired >= 100 },

  // ---- 6. Algoritma Laboratuvarı ----
  { id: 'lab_seed', name: 'İlk Format', desc: 'Laboratuvara 1 ses/trend formatı ek', icon: '🌱', category: 'lab', check: (c) => c.seedsPlanted >= 1 },
  { id: 'lab_harvest', name: 'İlk Hasat', desc: '1 trend hasadı yap', icon: '🌾', category: 'lab', check: (c) => c.labHarvests >= 1 },
  { id: 'lab_10', name: 'Trend Küratörü', desc: '10 trend formatı hasat et', icon: '🎧', category: 'lab', check: (c) => c.labHarvests >= 10 },
  {
    id: 'lab_25', name: 'Endüstriyel Brainrot', desc: '25 trend hasadı yap', icon: '🏗️', category: 'lab',
    reward: { kind: 'lab_yield', desc: 'Kalıcı ödül: Lab hasadı +%10' },
    check: (c) => c.labHarvests >= 25
  },
  { id: 'lab_mature3', name: 'Olgun Hasat Zamanı', desc: 'Aynı anda 3 olgun hücre', icon: '🌿', category: 'lab', check: (c) => c.matureCells >= 3 },
  { id: 'lab_full', name: 'Tam Matris', desc: 'Aynı anda 9 olgun trend hücresi', icon: '🎛️', category: 'lab', check: (c) => c.matureCells >= 9 },
  { id: 'lab_mutant', name: 'Mutasyon Gözlemcisi', desc: 'Saf Nöron Çürütücü filizlensin (🐱+🗿)', icon: '👾', category: 'lab', check: (c) => c.hasBrainrot },
  { id: 'lab_mutant2', name: 'Saf Nöron Çürütücü', desc: 'Brainrot Remix olgunlaşsın', icon: '🧬', category: 'lab', secret: true, check: (c) => c.hasMatureBrainrot },

  // ---- 7. Tekillik Yolculuğu ----
  { id: 'sin_sight', name: 'Şafağı Görmek', desc: '1e30 Dopamine ulaş (Şafak sekmesi açılır)', icon: '🌇', category: 'singularity', check: (c) => c.matter.gte(N1E30) },
  {
    id: 'sin_first', name: 'İlk Çöküş', desc: 'İlk Sabah 06:00 Çöküşünü yaşa', icon: '🌅', category: 'singularity',
    reward: { kind: 'caffeine_regen', desc: 'Kalıcı ödül: Kafein yenilenmesi +%25' },
    check: (c) => c.singularityCount >= 1
  },
  {
    id: 'sin_3', name: 'Üç Gecelik Nöbet', desc: '3 Tekillik yaşa', icon: '🌠', category: 'singularity',
    reward: { kind: 'starting_matter', desc: 'Kalıcı ödül: Sıfırlanma sonrası 1.000 Dopaminle başla' },
    check: (c) => c.singularityCount >= 3
  },
  {
    id: 'sin_sp', name: 'Uykusuzluk Birikimi', desc: '10 SP biriktir', icon: '🏦', category: 'singularity',
    reward: { kind: 'caffeine_boost', desc: 'Kalıcı ödül: Kafein Serumu +%25 güçlü' },
    check: (c) => c.sp.gte(SP10)
  },
  {
    id: 'sin_shop', name: 'Dükkan Müptelası', desc: 'SP dükkanında toplam 3 seviye al', icon: '🛒', category: 'singularity',
    reward: { kind: 'sp_discount', desc: 'Kalıcı ödül: SP dükkanı -%5' },
    check: (c) => c.spUpgradesTotal >= 3
  },
  { id: 'sin_hour', name: 'Bir Saatlik Nöbet', desc: 'Toplam 1 saat oyna', icon: '⏰', category: 'singularity', check: (c) => c.playtime >= 3600 },
  { id: 'sin_3h', name: 'Tam Mesai', desc: 'Toplam 3 saat oyna', icon: '🕰️', category: 'singularity', check: (c) => c.playtime >= 10800 },
  { id: 'sin_whale', name: 'Uykusuzluk İmparatorluğu', desc: '1.000 SP biriktir', icon: '🏆', category: 'singularity', secret: true, check: (c) => c.sp.gte(SP1000) },

  // ---- 8. Meydan Okumalar (her Gece Krizi'ne 1; koşu ödülü challenge'dan, buradaki plaket global çarpana işler) ----
  { id: 'chl_c1', name: 'Uçak Modu: İniş', desc: 'Uçak Modu meydan okumasını tamamla', icon: '✈️', category: 'challenges', check: (c) => c.completedChallenges.includes('c1') },
  { id: 'chl_c2', name: 'Priz Bulundu', desc: 'Şarj Aleti Temassızlığı meydan okumasını tamamla', icon: '🔌', category: 'challenges', check: (c) => c.completedChallenges.includes('c2') },
  { id: 'chl_c3', name: 'Önbellek Temizliği', desc: 'Önbellekteki Videolar meydan okumasını tamamla', icon: '💾', category: 'challenges', check: (c) => c.completedChallenges.includes('c3') },
  { id: 'chl_c4', name: 'Sansürü Aşmak', desc: 'Sansür Matrisi meydan okumasını tamamla', icon: '🚫', category: 'challenges', check: (c) => c.completedChallenges.includes('c4') },
  { id: 'chl_c5', name: 'Enflasyon Canavarı', desc: 'Gece Enflasyonu meydan okumasını tamamla', icon: '📈', category: 'challenges', check: (c) => c.completedChallenges.includes('c5') },
  { id: 'chl_c6', name: 'Göz Damlası', desc: 'Göz Kuruluğu meydan okumasını tamamla', icon: '👁️', category: 'challenges', check: (c) => c.completedChallenges.includes('c6') },
  { id: 'chl_c7', name: 'Kısıtlamayı Delmek', desc: 'Hesap Kısıtlaması meydan okumasını tamamla', icon: '🔒', category: 'challenges', check: (c) => c.completedChallenges.includes('c7') },
  { id: 'chl_c8', name: 'Sessize Alınmış', desc: 'Grup Sohbeti Cehennemi meydan okumasını tamamla', icon: '💬', category: 'challenges', secret: true, check: (c) => c.completedChallenges.includes('c8') }
]

export function getAchievement(id: string): AchievementDef | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id)
}

export function categoryDefs(categoryId: AchievementCategoryId): AchievementDef[] {
  return ACHIEVEMENTS.filter((a) => a.category === categoryId)
}

export function isCategoryComplete(categoryId: AchievementCategoryId, unlockedIds: readonly string[]): boolean {
  return categoryDefs(categoryId).every((a) => unlockedIds.includes(a.id))
}

export function countCompletedRows(unlockedIds: readonly string[]): number {
  return ACHIEVEMENT_CATEGORIES.filter((c) => isCategoryComplete(c.id, unlockedIds)).length
}

// Global kalıcı çarpan: 1.012^(başarım) × 1.06^(tam satır). SP kazancına uygulanmaz.
export function calcAchievementMultiplier(unlockedIds: readonly string[]): Decimal {
  const per = Decimal.pow(PER_ACHIEVEMENT_MULT, unlockedIds.length)
  const rows = Decimal.pow(ROW_COMPLETION_MULT, countCompletedRows(unlockedIds))
  return per.times(rows)
}

export function hasAchievementReward(unlockedIds: readonly string[], kind: AchievementRewardKind): boolean {
  return ACHIEVEMENTS.some((a) => a.reward?.kind === kind && unlockedIds.includes(a.id))
}
