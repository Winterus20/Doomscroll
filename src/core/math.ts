import Decimal from 'break_eternity.js'

export { Decimal }

export type DecimalSource = Decimal | number | string

export function D(value: DecimalSource): Decimal {
  if (value instanceof Decimal) return value
  return new Decimal(value)
}

export const D_0 = new Decimal(0)
export const D_1 = new Decimal(1)
export const D_2 = new Decimal(2)
export const D_10 = new Decimal(10)

// 1.7976931348623157e308 (Standart JS float sınırı - İlk Tekillik eşiği)
export const D_INFINITY = new Decimal('1.7976931348623157e308')
