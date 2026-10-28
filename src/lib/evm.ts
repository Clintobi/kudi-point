import { encodeFunctionData, formatUnits, parseUnits } from 'viem'

/** Official Polygon USDT from Nimiq EVM-tokens docs. 6 decimals. */
export const POLYGON_CHAIN_ID = '0x89'
export const POLYGON_USDT = '0xc2132D05D31c914a87C6611C10748AEb04B58e8F' as const

const ERC20_BALANCE = [{
  name: 'balanceOf',
  type: 'function',
  stateMutability: 'view',
  inputs: [{ name: 'account', type: 'address' }],
  outputs: [{ name: '', type: 'uint256' }],
}] as const

const ERC20_TRANSFER = [{
  name: 'transfer',
  type: 'function',
  stateMutability: 'nonpayable',
  inputs: [
    { name: 'to', type: 'address' },
    { name: 'amount', type: 'uint256' },
  ],
  outputs: [{ name: '', type: 'bool' }],
}] as const

export function explainEvmError(error: unknown): string {
  const record = error as { code?: number | string, message?: string } | null
  const code = record && typeof record === 'object' ? Number(record.code) : NaN
  if (code === 4001) {
    return 'You cancelled the Polygon request. Nothing left the wallet.'
  }
  if (code === 4902) {
    return 'Polygon is not configured in this wallet yet. Tap Switch to Polygon.'
  }
  return record?.message || (error instanceof Error ? error.message : String(error))
}

export function evmErrorCode(error: unknown): number | null {
  const record = error as { code?: number | string } | null
  if (!record || typeof record !== 'object' || record.code === undefined) return null
  const code = Number(record.code)
  return Number.isFinite(code) ? code : null
}

export async function requestEthAccounts(): Promise<string[]> {
  if (!window.ethereum) {
    throw new Error('Open this Mini App inside Nimiq Pay to use Polygon USDT.')
  }
  const accounts = await window.ethereum.request({
    method: 'eth_requestAccounts',
  }) as string[]
  if (!accounts.length) throw new Error('Nimiq Pay did not share a Polygon address.')
  return accounts
}

export async function switchToPolygon(): Promise<void> {
  if (!window.ethereum) {
    throw new Error('Open this Mini App inside Nimiq Pay to use Polygon USDT.')
  }
  try {
    await window.ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: POLYGON_CHAIN_ID }],
    })
  }
  catch (error) {
    if (evmErrorCode(error) !== 4902) throw error
    await window.ethereum.request({
      method: 'wallet_addEthereumChain',
      params: [{
        chainId: POLYGON_CHAIN_ID,
        chainName: 'Polygon',
        rpcUrls: ['https://polygon-bor-rpc.publicnode.com'],
        nativeCurrency: { name: 'MATIC', symbol: 'MATIC', decimals: 18 },
        blockExplorerUrls: ['https://polygonscan.com'],
      }],
    })
  }
}

export async function readUsdtBalance(userAddress: string): Promise<string> {
  if (!window.ethereum) {
    throw new Error('Open this Mini App inside Nimiq Pay to use Polygon USDT.')
  }
  const data = encodeFunctionData({
    abi: ERC20_BALANCE,
    functionName: 'balanceOf',
    args: [userAddress as `0x${string}`],
  })
  const rawBalance = await window.ethereum.request({
    method: 'eth_call',
    params: [{ to: POLYGON_USDT, data }, 'latest'],
  }) as string
  return formatUnits(BigInt(rawBalance), 6)
}

export async function sendUsdt(from: string, to: string, amount: string): Promise<string> {
  if (!window.ethereum) {
    throw new Error('Open this Mini App inside Nimiq Pay to use Polygon USDT.')
  }
  const data = encodeFunctionData({
    abi: ERC20_TRANSFER,
    functionName: 'transfer',
    args: [to as `0x${string}`, parseUnits(amount, 6)],
  })
  return await window.ethereum.request({
    method: 'eth_sendTransaction',
    params: [{
      from,
      to: POLYGON_USDT,
      data,
      value: '0x0',
    }],
  }) as string
}

export function shortEthAddress(address: string): string {
  if (address.length <= 12) return address
  return `${address.slice(0, 6)}…${address.slice(-4)}`
}
