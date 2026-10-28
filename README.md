# Kudi Point

Cycle III **On/Off-Ramp** Mini App for Clinton Obi. It matches Nigerians with a cash desk so they can buy NIM or Polygon USDT with naira, or cash out the other way.

This is a Nimiq Pay Mini App (official Mini Apps Framework). It is not a standalone wallet. Keys stay in Nimiq Pay.

## Locked category

**On/Off-Ramp**, not Pay. Official Cycle III copy is “get money in and out of Nimiq Pay” via local top-ups, bank/mobile-money cash-out, and merchant cash-in points. The confirmed provider APIs cover NIM and Polygon USDT. There is no official naira rail, so this slice uses labeled sample desk quotes and sample receive addresses.

Pay (one tip / invoice / split) is unused fallback.

Deadline: Wednesday 11 November 2026, Africa/Lagos.

## Run locally

Needs Node.js 22+.

```bash
npm install
npm run dev
```

The Vite server binds `0.0.0.0:43173`. Note the **Network** URL in the terminal (not `localhost`).

### Load it in Nimiq Pay

1. Phone and this machine on the same Wi-Fi.
2. Open Nimiq Pay → Mini Apps → Custom URL.
3. Paste `http://<your-lan-ip>:43173`.
4. Tap **Run 3 Nimiq requests**, then walk Cash in or Cash out.

Providers only inject inside Nimiq Pay. A desktop browser shows a labeled preview so you can still walk the desk flow.

Test NIM sends on Nimiq **testnet** first: in Nimiq Pay, long-press Settings for 10 seconds, switch to Testnet, then use **Get free NIM**. The testnet switch does not move EVM off mainnet. Do not send real funds to the sample desk addresses.

## What this slice calls

Confirmed APIs only:

- `@nimiq/mini-app-sdk` `init()` → `listAccounts`, `isConsensusEstablished`, `getBlockNumber`, `getBalance`, `sendBasicTransactionWithData`
- `window.ethereum` → `eth_requestAccounts`, `wallet_switchEthereumChain` (`0x89`), `wallet_addEthereumChain` on `4902`, `eth_call` / `eth_sendTransaction` for Polygon USDT `0xc2132D05D31c914a87C6611C10748AEb04B58e8F` (6 decimals)
- `window.nimiqPay.language` and `window.nimiqPay.network`

A returned transaction hash is not finality. User cancel (`NimiqProviderError` `PERMISSION_DENIED` / EIP-1193 `4001`) leaves the screen usable.

## Official sources

- [Cycle III](https://miniappscompetition.com/cycle3)
- [Starter Kit](https://miniappscompetition.com/starterkit)
- [Rules](https://miniappscompetition.com/rules)
- [FAQ](https://miniappscompetition.com/faq)
- [Build Your First Mini App](https://nimiq.dev/mini-apps/tutorials/mini-app-tutorial)
- [Build with AI](https://nimiq.dev/mini-apps/development/build-with-ai)
- [Dual-chain tutorial](https://nimiq.dev/mini-apps/tutorials/dual-chain-mini-app-tutorial)
- [Nimiq Provider](https://nimiq.dev/mini-apps/api-reference/nimiq-provider)
- [EVM tokens](https://nimiq.dev/mini-apps/features/evm-tokens)

## License

MIT
