export function hostLanguage(): string {
  return window.nimiqPay?.language
    || navigator.language.split('-')[0]
    || 'en'
}

export function hostNetwork(): 'mainnet' | 'testnet' | 'preview' {
  const injected = window.nimiqPay?.network
  if (injected === 'mainnet' || injected === 'testnet') return injected
  return 'preview'
}
