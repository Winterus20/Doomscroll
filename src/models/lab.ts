/** Algoritma Lab tipleri: tohum turleri, lab kipleri ve hucre durumu. */
export type LabSeedType =
  | 'photon_resonator'
  | 'heavy_nucleon'
  | 'gluon_binder'
  | 'graviton_trap'
  | 'dark_matter_core'
  | 'magnetic_shield'
  | 'tachyon_flux'
  | 'higgs_boson'

export type LabMode = 'overdrive' | 'superconductor' | 'fluctuation'

export interface LabCell {
  id: number
  seedType: LabSeedType | null
  age: number
  matureAge: number
  maxAge: number
  isMature: boolean
}
