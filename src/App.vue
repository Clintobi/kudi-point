<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { desks, readLastRail, writeLastRail, type Desk, type Direction, type Rail, type Token } from './lib/desks'
import { evmErrorCode, explainEvmError, readUsdtBalance, requestEthAccounts, sendUsdt, shortEthAddress, switchToPolygon } from './lib/evm'
import { hostLanguage, hostNetwork } from './lib/host'
import { createTicketId } from './lib/ids'
import { amountHint, formatNgn, formatToken, parseNgn, quoteFor, type DeskQuote } from './lib/quotes'
import { explainNimiqError, lunaFromNim, nimFromLuna, shortNimiqAddress, startNimiq, type NimiqClient } from './lib/nimiq'

let nimiqPromise: ReturnType<typeof startNimiq> | null = null

const language = ref(hostLanguage())
const network = ref(hostNetwork())
const isConnecting = ref(true)
const isReady = ref(false)
const previewMode = ref(false)
const banner = ref<string | null>(null)

const direction = ref<Direction | null>(null)
const token = ref<Token>('NIM')
const ngnInput = ref('20000')
const rail = ref<Rail>(readLastRail() ?? 'Bank transfer')
const desk = ref<Desk | null>(null)

const nimiqAccounts = ref<string[] | null>(null)
const consensus = ref<boolean | null>(null)
const blockNumber = ref<number | null>(null)
const nimBalance = ref<string | null>(null)
const ethAddress = ref<string | null>(null)
const usdtBalance = ref<string | null>(null)
const polygonReady = ref(false)

const ticketId = ref<string | null>(null)
const txHash = ref<string | null>(null)
const busy = ref<string | null>(null)

const ngn = computed(() => parseNgn(ngnInput.value))
const quote = computed<DeskQuote | null>(() => {
  if (!direction.value || ngn.value === null) return null
  return quoteFor(direction.value, token.value, ngn.value)
})
const quoteError = computed(() => amountHint(ngn.value))
const canQuote = computed(() => Boolean(direction.value && quote.value && !quoteError.value))
const railsForDesk = computed(() => desk.value?.rails ?? [])

onMounted(async () => {
  language.value = hostLanguage()
  network.value = hostNetwork()
  try {
    nimiqPromise = startNimiq()
    await nimiqPromise
    isReady.value = true
    previewMode.value = false
    network.value = hostNetwork()
    banner.value = null
  }
  catch (error) {
    previewMode.value = true
    isReady.value = false
    banner.value = error instanceof Error
      ? error.message
      : 'Nimiq Pay did not inject the provider. This is preview mode.'
  }
  finally {
    isConnecting.value = false
  }
})

watch(rail, (value) => {
  writeLastRail(value)
})

function pickDirection(next: Direction) {
  direction.value = next
  desk.value = null
  ticketId.value = null
  txHash.value = null
  banner.value = previewMode.value
    ? 'Preview mode: walk the desk flow here, then open the same URL in Nimiq Pay to move NIM or USDT.'
    : null
}

function pickDesk(next: Desk) {
  desk.value = next
  if (!next.rails.includes(rail.value)) {
    rail.value = next.rails[0]
  }
  ticketId.value = createTicketId()
  txHash.value = null
}

async function runThreeRequests() {
  if (!nimiqPromise) {
    banner.value = 'Open this Mini App inside Nimiq Pay to check the Nimiq wallet.'
    return
  }

  busy.value = 'Checking Nimiq wallet…'
  banner.value = null

  try {
    const nimiq = await nimiqPromise
    const [accountsResult, consensusResult, blockResult] = await Promise.all([
      nimiq.listAccounts(),
      nimiq.isConsensusEstablished(),
      nimiq.getBlockNumber(),
    ])
    nimiqAccounts.value = accountsResult
    consensus.value = consensusResult
    blockNumber.value = blockResult
    if (accountsResult[0] && typeof nimiq.getBalance === 'function') {
      const luna = await nimiq.getBalance(accountsResult[0])
      nimBalance.value = nimFromLuna(luna).toFixed(2)
    }
  }
  catch (error) {
    banner.value = explainNimiqError(error)
  }
  finally {
    busy.value = null
  }
}

async function connectNim() {
  if (!nimiqPromise) {
    banner.value = 'Preview: your NIM address appears here inside Nimiq Pay.'
    return
  }

  busy.value = 'Asking Nimiq Pay for your NIM address…'
  banner.value = null

  try {
    const nimiq = await nimiqPromise
    const accounts = await nimiq.listAccounts()
    nimiqAccounts.value = accounts
    if (!accounts[0]) throw new Error('Nimiq Pay did not share a NIM address.')
    if (typeof nimiq.getBalance === 'function') {
      const luna = await nimiq.getBalance(accounts[0])
      nimBalance.value = nimFromLuna(luna).toFixed(2)
    }
  }
  catch (error) {
    banner.value = explainNimiqError(error)
  }
  finally {
    busy.value = null
  }
}

async function connectUsdt() {
  if (!window.ethereum) {
    banner.value = 'Preview: your Polygon address appears here inside Nimiq Pay.'
    return
  }

  busy.value = 'Asking Nimiq Pay for your Polygon address…'
  banner.value = null
  polygonReady.value = false

  try {
    const accounts = await requestEthAccounts()
    ethAddress.value = accounts[0]
  }
  catch (error) {
    banner.value = explainEvmError(error)
  }
  finally {
    busy.value = null
  }
}

async function usePolygon() {
  if (!window.ethereum) {
    banner.value = 'Preview: Polygon switching only runs inside Nimiq Pay.'
    return
  }

  busy.value = 'Switching Nimiq Pay to Polygon…'
  banner.value = null

  try {
    await switchToPolygon()
    polygonReady.value = true
    if (ethAddress.value) {
      usdtBalance.value = await readUsdtBalance(ethAddress.value)
    }
  }
  catch (error) {
    polygonReady.value = false
    banner.value = explainEvmError(error)
  }
  finally {
    busy.value = null
  }
}

async function sendCashOut() {
  if (!desk.value || !quote.value) return

  if (previewMode.value) {
    banner.value = 'Preview only. Open this URL in Nimiq Pay to send NIM or USDT to the desk.'
    return
  }

  busy.value = token.value === 'NIM' ? 'Waiting for Nimiq Pay to confirm the NIM send…' : 'Waiting for Nimiq Pay to confirm the USDT send…'
  banner.value = null
  txHash.value = null

  try {
    if (token.value === 'NIM') {
      if (!nimiqPromise) throw new Error('Nimiq provider is not ready.')
      const nimiq: NimiqClient = await nimiqPromise
      txHash.value = await nimiq.sendBasicTransactionWithData({
        recipient: desk.value.nimAddress,
        value: lunaFromNim(quote.value.tokenAmount),
        data: `Kudi Point ${desk.value.id} ${ticketId.value ?? ''}`.trim(),
      })
    }
    else {
      if (!ethAddress.value) throw new Error('Share your Polygon address first.')
      if (!polygonReady.value) throw new Error('Switch to Polygon before sending USDT.')
      txHash.value = await sendUsdt(
        ethAddress.value,
        desk.value.usdtAddress,
        quote.value.tokenAmount.toFixed(6),
      )
    }
  }
  catch (error) {
    if (token.value === 'USDT' && evmErrorCode(error) === 4001) {
      banner.value = explainEvmError(error)
    }
    else if (token.value === 'NIM') {
      banner.value = explainNimiqError(error)
    }
    else {
      banner.value = explainEvmError(error)
    }
  }
  finally {
    busy.value = null
  }
}

function resetTicket() {
  direction.value = null
  desk.value = null
  ticketId.value = null
  txHash.value = null
  banner.value = null
}
</script>

<template>
  <div class="sheet">
    <header class="mast">
      <p class="eyebrow">Cycle III · On/Off-Ramp · Nigeria</p>
      <h1>Kudi Point</h1>
      <p class="lede">
        Pay naira at a nearby desk. Collect NIM or USDT in Nimiq Pay.
        Cash out the other way: send from the wallet, collect naira.
      </p>
      <p class="meta">
        Language {{ language }} ·
        {{ isConnecting ? 'Waiting for Nimiq Pay…' : (isReady ? `Nimiq ${network}` : 'Browser preview') }}
      </p>
    </header>

    <aside v-if="previewMode && !isConnecting" class="banner warn" role="status">
      Preview mode. Providers only inject inside Nimiq Pay. Walk the desk here, then paste the Network URL in Mini Apps → Custom URL.
    </aside>
    <aside v-if="banner" class="banner" :class="previewMode ? 'warn' : 'note'" role="status">
      {{ banner }}
    </aside>
    <aside v-if="busy" class="banner note" role="status">{{ busy }}</aside>

    <section class="card wallet">
      <div class="card-head">
        <h2>Nimiq wallet check</h2>
        <p>Official hello-world: accounts, consensus, block height.</p>
      </div>
      <button class="primary" type="button" :disabled="Boolean(busy) || isConnecting || !isReady" @click="runThreeRequests">
        Run 3 Nimiq requests
      </button>
      <dl v-if="nimiqAccounts || consensus !== null || blockNumber !== null" class="facts">
        <div v-if="nimiqAccounts">
          <dt>Accounts</dt>
          <dd>{{ nimiqAccounts.map(shortNimiqAddress).join(', ') }}</dd>
        </div>
        <div v-if="consensus !== null">
          <dt>Consensus</dt>
          <dd>{{ consensus ? 'Ready' : 'Not yet' }}</dd>
        </div>
        <div v-if="blockNumber !== null">
          <dt>Block</dt>
          <dd>{{ blockNumber }}</dd>
        </div>
        <div v-if="nimBalance !== null">
          <dt>NIM</dt>
          <dd>{{ nimBalance }}</dd>
        </div>
      </dl>
    </section>

    <section class="card">
      <div class="card-head">
        <h2>What do you want to do?</h2>
        <p>One ticket at a time. Naira stays at the desk; NIM and USDT move in Nimiq Pay.</p>
      </div>
      <div class="choice">
        <button type="button" :class="{ on: direction === 'cash-in' }" @click="pickDirection('cash-in')">
          Cash in
          <span>Bring naira. Collect crypto.</span>
        </button>
        <button type="button" :class="{ on: direction === 'cash-out' }" @click="pickDirection('cash-out')">
          Cash out
          <span>Send crypto. Collect naira.</span>
        </button>
      </div>
    </section>

    <section v-if="direction" class="card">
      <div class="card-head">
        <h2>{{ direction === 'cash-in' ? 'How much naira are you bringing?' : 'How much naira do you want to collect?' }}</h2>
        <p>Sample desk board — not a live bank or CBN rate.</p>
      </div>
      <label class="field">
        <span>Amount (NGN)</span>
        <input
          v-model="ngnInput"
          inputmode="numeric"
          autocomplete="off"
          placeholder="20000"
        >
      </label>
      <div class="pills" role="group" aria-label="Token">
        <button type="button" :class="{ on: token === 'NIM' }" @click="token = 'NIM'">NIM</button>
        <button type="button" :class="{ on: token === 'USDT' }" @click="token = 'USDT'">USDT on Polygon</button>
      </div>
      <p v-if="quoteError" class="hint">{{ quoteError }}</p>
      <div v-else-if="quote" class="quote">
        <p class="stamp">Sample rate · {{ formatNgn(quote.rate) }} / {{ token }}</p>
        <p class="big">
          {{ direction === 'cash-in' ? 'You collect' : 'You send' }}
          <strong>{{ formatToken(quote.tokenAmount, token) }}</strong>
        </p>
        <p class="hint">Desk fee {{ formatNgn(quote.feeNgn) }} · net {{ formatNgn(quote.netNgn) }}</p>
      </div>
    </section>

    <section v-if="canQuote" class="card">
      <div class="card-head">
        <h2>Pick a desk</h2>
        <p>Hours in Africa/Lagos. Addresses below are official tutorial samples — replace them before sending real funds.</p>
      </div>
      <ul class="desks">
        <li v-for="item in desks" :key="item.id">
          <button type="button" :class="{ on: desk?.id === item.id }" @click="pickDesk(item)">
            <strong>{{ item.name }}</strong>
            <span>{{ item.area }} · {{ item.hours }}</span>
            <span>{{ item.rails.join(' · ') }}</span>
          </button>
        </li>
      </ul>
    </section>

    <section v-if="desk && quote && direction" class="card ticket">
      <div class="card-head">
        <h2>{{ direction === 'cash-in' ? 'Cash-in ticket' : 'Cash-out ticket' }}</h2>
        <p>{{ desk.name }} · {{ desk.area }}</p>
      </div>
      <p class="hint">{{ desk.note }}</p>
      <label class="field">
        <span>How you will pay or collect naira</span>
        <select v-model="rail">
          <option v-for="option in railsForDesk" :key="option" :value="option">{{ option }}</option>
        </select>
      </label>

      <template v-if="direction === 'cash-in'">
        <p>
          Pay <strong>{{ formatNgn(quote.ngn) }}</strong> by {{ rail.toLowerCase() }} at the desk.
          They credit <strong>{{ formatToken(quote.tokenAmount, token) }}</strong> to the address you share.
        </p>
        <button
          v-if="token === 'NIM'"
          class="primary"
          type="button"
          :disabled="Boolean(busy)"
          @click="connectNim"
        >
          Show my NIM address
        </button>
        <p v-if="token === 'NIM' && nimiqAccounts?.[0]" class="address">{{ nimiqAccounts[0] }}</p>
        <template v-if="token === 'USDT'">
          <button class="primary" type="button" :disabled="Boolean(busy)" @click="connectUsdt">
            Show my Polygon address
          </button>
          <p v-if="ethAddress" class="address">{{ ethAddress }}</p>
        </template>
      </template>

      <template v-else>
        <p>
          Send <strong>{{ formatToken(quote.tokenAmount, token) }}</strong> from Nimiq Pay, then collect
          <strong>{{ formatNgn(quote.netNgn) }}</strong> by {{ rail.toLowerCase() }}.
        </p>
        <p class="address">
          Desk {{ token }}:
          {{ token === 'NIM' ? desk.nimAddress : desk.usdtAddress }}
        </p>
        <div class="stack">
          <button
            v-if="token === 'NIM'"
            class="ghost"
            type="button"
            :disabled="Boolean(busy)"
            @click="connectNim"
          >
            Share NIM address
          </button>
          <template v-else>
            <button class="ghost" type="button" :disabled="Boolean(busy)" @click="connectUsdt">
              Share Polygon address
            </button>
            <button class="ghost" type="button" :disabled="Boolean(busy)" @click="usePolygon">
              Switch to Polygon
            </button>
            <p v-if="ethAddress" class="hint">
              {{ shortEthAddress(ethAddress) }}
              <span v-if="usdtBalance !== null"> · {{ usdtBalance }} USDT</span>
              <span v-if="polygonReady"> · Polygon ready</span>
            </p>
          </template>
          <button class="primary" type="button" :disabled="Boolean(busy)" @click="sendCashOut">
            {{ previewMode ? 'Preview send (opens in Nimiq Pay)' : `Send ${token} to desk` }}
          </button>
        </div>
        <p v-if="txHash" class="ok">
          Wallet accepted the send. Hash is not finality:
          <span class="address">{{ txHash }}</span>
        </p>
      </template>

      <p v-if="ticketId" class="hint">Ticket {{ ticketId }}</p>
      <button class="text" type="button" @click="resetTicket">Start a new desk ticket</button>
    </section>

    <footer class="colophon">
      <p>Official Nimiq Pay Mini Apps Framework. Not a standalone wallet. No keys leave Nimiq Pay.</p>
      <p>USDT contract on Polygon: 0xc2132D05D31c914a87C6611C10748AEb04B58e8F (6 decimals).</p>
    </footer>
  </div>
</template>

<style scoped>
.sheet {
  width: min(34rem, 100%);
  margin: 0 auto;
  padding: 1.25rem 1rem 3rem;
}

.mast h1,
.card-head h2,
.big strong,
.stamp {
  font-family: Fraunces, 'Times New Roman', serif;
}

.eyebrow {
  margin: 0 0 0.35rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--forest);
}

h1 {
  margin: 0;
  font-size: clamp(2rem, 9vw, 3rem);
  line-height: 0.95;
}

.lede,
.meta,
.hint,
.colophon,
.card-head p {
  color: var(--ink-soft);
}

.lede {
  margin: 0.75rem 0 0.4rem;
}

.meta,
.colophon,
.hint,
.card-head p,
.eyebrow {
  font-size: 0.92rem;
}

.banner,
.card,
.quote {
  border: 1px solid var(--line);
  background: #fffaf1;
  box-shadow: var(--shadow);
}

.banner {
  margin: 0.85rem 0;
  padding: 0.85rem 0.95rem;
  min-height: 44px;
}

.banner.warn {
  background: #f7e4d4;
  border-color: #d7a07a;
}

.banner.note {
  background: #eef3ea;
}

.card {
  margin: 1rem 0;
  padding: 1rem;
}

.card-head h2 {
  margin: 0 0 0.25rem;
  font-size: 1.35rem;
}

.card-head p,
.hint {
  margin: 0 0 0.85rem;
}

.choice,
.pills,
.stack,
.desks {
  display: grid;
  gap: 0.7rem;
}

.choice button,
.desks button,
.pills button,
.primary,
.ghost,
.text,
select,
input {
  min-height: 44px;
  width: 100%;
  border-radius: 0.35rem;
  border: 1px solid var(--line);
  background: #fff;
  color: var(--ink);
  text-align: left;
  padding: 0.7rem 0.85rem;
}

.choice button span,
.desks button span {
  display: block;
  color: var(--ink-soft);
  font-size: 0.9rem;
}

.choice button.on,
.desks button.on,
.pills button.on {
  border-color: var(--forest);
  background: #e7f0e8;
  box-shadow: inset 0 0 0 1px var(--forest);
}

.primary,
.ghost {
  text-align: center;
  font-weight: 700;
}

.primary {
  background: var(--forest);
  border-color: var(--forest-deep);
  color: #f7f1e6;
}

.primary:disabled,
.ghost:disabled,
.choice button:disabled {
  opacity: 0.55;
}

.ghost {
  background: transparent;
}

.text {
  border: 0;
  background: transparent;
  box-shadow: none;
  text-decoration: underline;
  text-underline-offset: 0.15em;
}

.field {
  display: grid;
  gap: 0.35rem;
  margin-bottom: 0.85rem;
}

.field span {
  font-weight: 600;
}

.quote {
  padding: 0.9rem;
}

.stamp {
  margin: 0 0 0.35rem;
  color: var(--stamp);
  font-weight: 700;
}

.big {
  margin: 0;
  font-size: 1.15rem;
}

.facts {
  display: grid;
  gap: 0.45rem;
  margin: 0.85rem 0 0;
}

.facts div {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
}

.facts dt {
  color: var(--ink-soft);
}

.facts dd,
.address {
  margin: 0;
  overflow-wrap: anywhere;
  word-break: break-word;
}

.address {
  font-family: ui-monospace, 'Cascadia Code', monospace;
  font-size: 0.88rem;
  background: var(--paper-deep);
  padding: 0.65rem 0.7rem;
}

.ok {
  color: var(--ok);
}

.desks {
  list-style: none;
  margin: 0;
  padding: 0;
}

.colophon {
  margin-top: 1.5rem;
}

.colophon p {
  margin: 0 0 0.35rem;
}

@media (min-width: 640px) {
  .choice,
  .pills {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
