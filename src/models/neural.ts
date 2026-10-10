/** Noral agac tipleri: dugum tanimlari ve toplanmis sayisal etkiler. */
/** Nöral Ağaç dalı: kök, pasif (uyku), aktif (başparmak) ve hibrit köprü */
export type NeuralBranch = 'root' | 'passive' | 'active' | 'hybrid'

/**

 * Nöral Ağaç düğümü (kalıcı SP yetenek ağacı).
 * effect, neuralEffects getter'ında sayısal etkiye çevrilen tanımlayıcı id'dir.
 * Tekrarlanabilir düğümler maxLevel + costMult alanlerini kullanır.
 */
export interface NeuralNode {
  id: string
  name: string
  icon: string
  desc: string
  branch: NeuralBranch
  cost: number // SP cinsinden taban maliyet
  maxLevel?: number // Belirtilmezse 1 (tek seferlik)
  costMult?: number // Seviye başına maliyet çarpanı (belirtilmezse 1)
  requires: string[] // Satın alınması gereken öncül düğüm id'leri
  effect: string // Etki tanımlayıcı id (neuralEffects içinde işlenir)
  choiceGroup?: string // Aynı gruptaki düğümler birbirini hariç tutar (prestijde kilidi açılır)
}

/** Satın alınan Nöral Ağaç düğümlerinin toplanmış sayısal etkileri */
export interface NeuralEffects {
  productionMult: number // Tüm istasyon üretim çarpanı
  clickMult: number // Manuel tıklama gücü çarpanı
  offlineGainBonus: number // Çevrimdışı ilerleme ek oranı (additif, 0.25 = +%25)
  crisisRewardMult: number // Vicdan Azabı prim çarpanı
  breedRateMult: number // Koloni üreme hızı çarpanı
  botFrequencyMult: number // Otomatik bot frekans çarpanı
  dawnSpeedMult: number // Şafak (tekillik) kazancı çarpanı
  cpsSyncLevel: number // CPS-to-click senkron düğümü seviyesi (0-4)
  comboUnlocked: boolean // Combo sistemi açıldı mı
}
