// Otomatik cekim botu maliyet/kilit verisi ve interval yardimcilari.
// Saf moduldur; store import etmez.
import { Decimal } from '../core/math'
import type { AutobuyerMode } from '../models/types'

// ADR-0032: Idle bootstrap kilidini kaldırmak için bot maliyetleri gevşetildi.
// Eski maliyetler (dim1 1e12, shift 1e26) pure-idle oyuncuyu log10=12.41'de
// sonsuza dek kilitliyordu çünkü shift yapmadan 1e26'ya asla ulaşamıyordu.
export const AUTOBUYER_COSTS: Record<string, Decimal> = {
  dim1: new Decimal(1e9),
  dim2: new Decimal(1e12),
  dim3: new Decimal(1e15),
  dim4: new Decimal(1e18),
  dim5: new Decimal(1e22),
  dim6: new Decimal(1e26),
  dim7: new Decimal(1e30),
  dim8: new Decimal(1e35),
  tickspeed: new Decimal(1e11),
  shift: new Decimal(1e10), // Idle oyuncu artık ilk sıçrama botuna erken erişebilir
  galaxy: new Decimal(1e28),
  singularity: new Decimal(1.79e308) // Şafak Nöbeti Botu: tekillik eşiğinin kendisi
}

// 3 katmanlı pacing: maliyet + ilerleme kilidi + yavaş tekli hız
// dim1 tadımlık erken açılır, dim2/tickspeed D3 ister, dim3-4 ilk sıçramayı ister,
// dim5-8 ikinci sıçramayı ister, shift/galaxy botu ancak ilk sıçrama/kümeden sonra açılır.
export const AUTOBUYER_PROGRESS_REQ: Record<string, { shifts?: number; galaxies?: number; needTier?: number; singularities?: number }> = {
  dim1: {},
  dim2: { needTier: 3 },
  dim3: { shifts: 1 },
  dim4: { shifts: 1 },
  dim5: { shifts: 1 },
  dim6: { shifts: 2 },
  dim7: { shifts: 3 },
  dim8: { shifts: 4 },
  tickspeed: { needTier: 3 },
  shift: { shifts: 0 },
  galaxy: { galaxies: 1 },
  singularity: { singularities: 3 }
}

export function getAutobuyerRequirementText(id: string): string {
  const req = AUTOBUYER_PROGRESS_REQ[id]
  if (!req) return ''
  const parts: string[] = []
  if (req.needTier) parts.push(`D${req.needTier} sahibi ol`)
  if (req.shifts) parts.push(`${req.shifts} Sıçrama`)
  if (req.galaxies) parts.push(`${req.galaxies} Küme`)
  if (req.singularities) parts.push(`${req.singularities} kez Çöküş`)
  return parts.length > 0 ? parts.join(' + ') : ''
}

// Hibrit kademe: tekli dopaminle açılır, toplu shift ister, max galaxy ister
export const AUTOBUYER_BULK_COST = new Decimal(1e28)
export const AUTOBUYER_BULK_SHIFT_REQ = 1
export const AUTOBUYER_MAX_COST = new Decimal(1e32)
export const AUTOBUYER_MAX_GALAXY_REQ = 1

export function getAutobuyerCategory(id: string): 'dim' | 'tickspeed' | 'shift' | 'galaxy' | 'singularity' {
  if (id.startsWith('dim')) return 'dim'
  if (id === 'tickspeed') return 'tickspeed'
  if (id === 'shift') return 'shift'
  if (id === 'singularity') return 'singularity'
  return 'galaxy'
}

export function getAutobuyerInterval(id: string, mode: AutobuyerMode): number {
  const cat = getAutobuyerCategory(id)
  if (cat === 'dim') {
    if (mode === 'bulk') return 1.5
    if (mode === 'max') return 0.5
    return 8.0
  }
  if (cat === 'tickspeed') {
    if (mode === 'bulk') return 2.0
    if (mode === 'max') return 0.5
    return 10.0
  }
  if (cat === 'shift') {
    if (mode === 'bulk') return 4.0
    if (mode === 'max') return 2.0
    return 15.0
  }
  // Şafak Nöbeti Botu: tetik koşulu kazanç/eğim bazlı, interval sadece kontrol periyodu
  if (cat === 'singularity') return 10.0
  if (mode === 'bulk') return 6.0
  if (mode === 'max') return 3.0
  return 20.0
}
