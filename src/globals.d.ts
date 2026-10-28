export {}

interface EthereumProvider {
  request: (args: {
    method: string
    params?: unknown[] | Record<string, unknown>
  }) => Promise<unknown>
}

declare global {
  interface Window {
    ethereum?: EthereumProvider
    nimiqPay?: {
      language?: string
      network?: 'mainnet' | 'testnet'
      requestFullscreen?: () => Promise<void>
    }
  }
}
