import type { Direction, Token } from './desks'

/** Labeled sample desk board. Not a live CBN, bank, or oracle rate. */
export const SAMPLE_NIM_NGN = 185
export const SAMPLE_USDT_NGN = 1540
export const SAMPLE_DESK_FEE = 0.012
export const MIN_NGN = 2000
export const MAX_NGN = 500_000

export interface DeskQuote {
  ngn: number
  token: Token
  direction: Direction
  rate: number
  feeNgn: number
  netNgn: number
  tokenAmount: number
}

export function parseNgn(raw: string): number | null {
  const cleaned = raw.replace(/,/g, '').trim()
  if (!cleaned) return null
  const value = Number(cleaned)
  if (!Number.isFinite(value)) return null
  return Math.round(value)
}

export function quoteFor(direction: Direction, token: Token, ngn: number): DeskQuote {
  const rate = token === 'NIM' ? SAMPLE_NIM_NGN : SAMPLE_USDT_NGN
  const feeNgn = Math.round(ngn * SAMPLE_DESK_FEE)
  const netNgn = Math.max(0, ngn - feeNgn)
  const tokenAmount = netNgn / rate
  return { ngn, token, direction, rate, feeNgn, netNgn, tokenAmount }
}

export function formatNgn(value: number): string {
  return `₦${value.toLocaleString('en-NG')}`
}

export function formatToken(amount: number, token: Token): string {
  if (token === 'NIM') return `${amount.toFixed(2)} NIM`
  return `${amount.toFixed(2)} USDT`
}

export function amountHint(ngn: number | null): string | null {
  if (ngn === null) return 'Enter how much naira you want to move.'
  if (ngn < MIN_NGN) return `Desks on this board start at ${formatNgn(MIN_NGN)}.`
  if (ngn > MAX_NGN) return `This slice caps a ticket at ${formatNgn(MAX_NGN)}.`
  return null
}
