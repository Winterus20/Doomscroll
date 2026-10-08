/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

declare module 'break_eternity.js' {
  type DecimalSource = Decimal | number | string
  export default class Decimal {
    sign: number
    mag: number
    layer: number
    constructor(value?: DecimalSource)
    static fromDecimal(value: Decimal): Decimal
    static pow(base: DecimalSource, exponent: DecimalSource): Decimal
    static floor(value: DecimalSource): Decimal
    plus(other: DecimalSource): Decimal
    minus(other: DecimalSource): Decimal
    times(other: DecimalSource): Decimal
    div(other: DecimalSource): Decimal
    neg(): Decimal
    abs(): Decimal
    pow(exp: DecimalSource): Decimal
    log10(): Decimal
    floor(): Decimal
    eq(other: DecimalSource): boolean
    neq(other: DecimalSource): boolean
    lt(other: DecimalSource): boolean
    lte(other: DecimalSource): boolean
    gt(other: DecimalSource): boolean
    gte(other: DecimalSource): boolean
    isNan(): boolean
    isFinite(): boolean
    toNumber(): number
    toString(): string
  }
}
