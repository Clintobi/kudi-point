export type Rail = 'Bank transfer' | 'OPay' | 'PalmPay' | 'Cash'
export type Token = 'NIM' | 'USDT'
export type Direction = 'cash-in' | 'cash-out'

export interface Desk {
  id: string
  name: string
  area: string
  hours: string
  rails: readonly Rail[]
  nimAddress: string
  usdtAddress: string
  note: string
}

/**
 * Sample cash desks. Receive addresses are the official tutorial examples
 * (Nimiq Provider zero address and the EVM-tokens example recipient).
 * They are labeled sample so nobody treats them as a live settlement rail.
 */
export const desks: readonly Desk[] = [
  {
    id: 'yaba',
    name: 'Mama Nkechi',
    area: 'Yaba, Lagos',
    hours: '8:00–19:00 WAT',
    rails: ['Bank transfer', 'Cash'],
    nimAddress: 'NQ07 0000 0000 0000 0000 0000 0000 0000 0000',
    usdtAddress: '0x1234567890abcdef1234567890abcdef12345678',
    note: 'Opposite Tejuosho market. Ask for the Nimiq book.',
  },
  {
    id: 'wuse',
    name: 'Desk 14',
    area: 'Wuse II, Abuja',
    hours: '9:00–18:00 WAT',
    rails: ['OPay', 'PalmPay', 'Bank transfer'],
    nimAddress: 'NQ07 0000 0000 0000 0000 0000 0000 0000 0000',
    usdtAddress: '0x1234567890abcdef1234567890abcdef12345678',
    note: 'Inside the plaza, first floor. Sample desk addresses only.',
  },
  {
    id: 'amadi',
    name: 'Waterfront Desk',
    area: 'Trans Amadi, Port Harcourt',
    hours: '8:30–17:30 WAT',
    rails: ['Bank transfer', 'Cash', 'OPay'],
    nimAddress: 'NQ07 0000 0000 0000 0000 0000 0000 0000 0000',
    usdtAddress: '0x1234567890abcdef1234567890abcdef12345678',
    note: 'Near the roundabout. Bring transfer receipt.',
  },
]

export const LAST_RAIL_KEY = 'kudi-point-last-rail'

export function readLastRail(): Rail | null {
  try {
    const value = localStorage.getItem(LAST_RAIL_KEY)
    if (value === 'Bank transfer' || value === 'OPay' || value === 'PalmPay' || value === 'Cash') {
      return value
    }
  }
  catch {
    // localStorage can throw in some WebViews
  }
  return null
}

export function writeLastRail(rail: Rail): void {
  try {
    localStorage.setItem(LAST_RAIL_KEY, rail)
  }
  catch {
    // ignore quota / private-mode failures
  }
}
