/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
  export default component
}

declare module 'break_eternity.js' {
  export default class Decimal {
    sign: number
    mag: number
    layer: number
    constructor(value?: string | number | Decimal)
    static fromDecimal(value: Decimal): Decimal
    static pow(base: any, exponent: any): Decimal
    static floor(value: any): Decimal
    plus(other: any): Decimal
    minus(other: any): Decimal
    times(other: any): Decimal
    div(other: any): Decimal
    neg(): Decimal
    abs(): Decimal
    pow(exp: any): Decimal
    log10(): Decimal
    floor(): Decimal
    eq(other: any): boolean
    neq(other: any): boolean
    lt(other: any): boolean
    lte(other: any): boolean
    gt(other: any): boolean
    gte(other: any): boolean
    isNan(): boolean
    isFinite(): boolean
    toNumber(): number
    toString(): string
  }
}
