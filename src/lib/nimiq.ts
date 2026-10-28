import { init, NimiqProviderError } from '@nimiq/mini-app-sdk'

export type NimiqClient = Awaited<ReturnType<typeof init>>

export function startNimiq(timeout = 10_000): ReturnType<typeof init> {
  return init({ timeout })
}

export function explainNimiqError(error: unknown): string {
  if (NimiqProviderError.is(error)) {
    if (error.type === 'PERMISSION_DENIED') {
      return 'You cancelled the Nimiq Pay request. The desk is still here — try again when you are ready.'
    }
    if (error.type === 'NETWORK_ERROR') {
      return error.message || 'Nimiq Pay could not reach the network. Check connection, then retry.'
    }
    if (error.type === 'INVALID_TRANSACTION' || error.type === 'INVALID_REQUEST') {
      return error.message || 'That Nimiq request was rejected. Check the address and amount.'
    }
    return error.message || `Nimiq Pay returned ${error.type}.`
  }
  return error instanceof Error ? error.message : String(error)
}

export function lunaFromNim(nim: number): number {
  return Math.round(nim * 100_000)
}

export function nimFromLuna(luna: number): number {
  return luna / 100_000
}

export function shortNimiqAddress(address: string): string {
  const compact = address.replace(/\s+/g, '')
  if (compact.length <= 16) return address
  return `${compact.slice(0, 8)}…${compact.slice(-4)}`
}
