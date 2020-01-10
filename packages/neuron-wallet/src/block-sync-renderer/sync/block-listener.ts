import { BehaviorSubject, Subscription } from 'rxjs'
import logger from 'utils/logger'

import Queue from './queue'
import RangeForCheck from './range-for-check'
import BlockNumber from './block-number'
import RpcService from 'services/rpc-service'
import NodeService from 'services/node'

export default class BlockListener {
  private lockHashes: string[]
  private queue: Queue | undefined
  private rangeForCheck: RangeForCheck
  private currentBlockNumber: BlockNumber
  private tipNumberSubject: BehaviorSubject<string | undefined>
  private tipNumberListener: Subscription | undefined
  private url: string

  constructor(
    url: string,
    lockHashes: string[],
    tipNumberSubject: BehaviorSubject<string | undefined> = NodeService.getInstance().tipNumberSubject
  ) {
    this.url = url
    this.lockHashes = lockHashes
    this.currentBlockNumber = new BlockNumber()
    this.rangeForCheck = new RangeForCheck(url)
    this.tipNumberSubject = tipNumberSubject
  }

  public setLockHashes = (lockHashes: string[]) => {
    const hashes = [...new Set(lockHashes)]
    this.lockHashes = hashes
    if (!this.queue) {
      return
    }
    this.queue.setLockHashes(hashes)
  }

  public appendLockHashes = (lockHashes: string[]) => {
    const hashes = this.lockHashes.concat(lockHashes)
    this.setLockHashes(hashes)
  }

  public getLockHashes = (): string[] => {
    return this.lockHashes
  }

  // start listening
  public start = async () => {
    try {
      const rpcService = new RpcService(this.url)
      const currentTip = await rpcService.getTipBlockNumber()
      this.queue = new Queue(
        this.url,
        this.lockHashes,
        currentTip,
        this.currentBlockNumber,
        this.rangeForCheck
      )
      this.queue.start()
    } catch (err) {
      logger.error(`BlockListener start error:`, err)
    }

    this.tipNumberListener = this.tipNumberSubject.subscribe(async num => {
      if (num) {
        await this.regenerate(num)
      }
    })
  }

  public stop = () => {
    if (this.tipNumberListener) {
      this.tipNumberListener.unsubscribe()
    }
    if (this.queue) {
      this.queue.stop()
    }
  }

  public stopAndWait = async () => {
    this.stop()
    if (this.queue) {
      await this.queue.waitForDrained()
    }
  }

  public regenerate = async (tipNumber: string): Promise<void> => {
    if (this.queue) {
      if (BigInt(tipNumber) > BigInt(0)) {
        this.queue.resetEndBlockNumber(tipNumber)
      }
    } else {
      this.queue = new Queue(
        this.url,
        this.lockHashes,
        tipNumber,
        this.currentBlockNumber,
        this.rangeForCheck
      )
      this.queue.start()
    }
  }
}
