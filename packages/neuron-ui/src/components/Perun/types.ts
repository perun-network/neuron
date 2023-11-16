export class Balance {
  balance: Uint8Array[]

  constructor(balance: Uint8Array[]) {
    this.balance = balance
  }
}

export class Balances {
  balances: Balance[]

  constructor(balances: Balance[]) {
    this.balances = balances
  }
}

interface IndexMap {
  indexMap: number[]
}

interface SubAlloc {
  id: Uint8Array
  bals: Balance | undefined
  indexMap: IndexMap | undefined
}

export class Allocation {
  assets: Uint8Array[]
  balances: Balances | undefined
  locked: SubAlloc[]

  constructor(assets: Uint8Array[], balances: Balances | undefined, locked: SubAlloc[]) {
    this.assets = assets
    this.balances = balances
    this.locked = locked
  }
}

export class ChannelState {
  id: Uint8Array
  version: number
  app: Uint8Array
  allocation: Allocation | undefined
  data: Uint8Array
  isFinal: boolean

  constructor(
    id: Uint8Array,
    version: number,
    app: Uint8Array,
    allocation: Allocation | undefined,
    data: Uint8Array,
    isFinal: boolean
  ) {
    this.id = id
    this.version = version
    this.app = app
    this.allocation = allocation
    this.data = data
    this.isFinal = isFinal
  }
}
