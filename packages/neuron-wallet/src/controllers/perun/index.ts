import EventEmitter from 'events'
import PerunRequestSubject from '../../models/subjects/perun'
import PerunService from '../../services/perun/service'
import logger from '../../utils/logger'
import { ResponseCode } from '../../utils/const'
import { SimpleChannelServiceClient } from '@polycrypt/perun-wallet-wrapper/services'
import { AddressEncoder, channelIdFromString, channelIdToString } from '@polycrypt/perun-wallet-wrapper/translator'
import { mkSimpleChannelServiceClient } from '@polycrypt/perun-wallet-wrapper/client'
import { bytes } from '@ckb-lumos/codec'
import { Allocation, Balances } from '@polycrypt/perun-wallet-wrapper/wire'

const defaultAddressEncoder: AddressEncoder = (add: Uint8Array | string) => {
  if (typeof add === 'string') {
    return bytes.bytify(add)
  }
  return add
}

export default class PerunController {
  static emiter = new EventEmitter()
  private static instance: PerunController
  private static serviceClient: SimpleChannelServiceClient

  public static getInstance() {
    if (!PerunController.instance) {
      PerunController.instance = new PerunController()
      PerunController.serviceClient = PerunController.mkClient()
    }
    return PerunController.instance
  }


  public async start() {
    return PerunService.getInstance().start()
  }

  public mount() {
    this.registerHandlers()
  }

  private registerHandlers = () => {
    PerunController.emiter.on('perun-request', req => {
      logger.info('PerunController: received perun request', req)
      PerunRequestSubject.next(req)
    })
  }

  public respondPerunRequest(params: Controller.Params.RespondPerunRequestParams): Promise<Controller.Response> {
    if (!PerunController.emiter.emit('perun-response', params)) {
      return Promise.reject(new Error('Failed to send perun response, no listener registered'))
    }
    return Promise.resolve({
      status: ResponseCode.Success,
    })
  }

  public perunServiceAction(params: Controller.Params.PerunServiceActionParams): Promise<Controller.Response> {
    switch (params.type) {
      case 'open':
        return this.openChannel(params.payload as Controller.Params.OpenChannelParams)
      case 'update':
        return this.updateChannel(params.payload as Controller.Params.UpdateChannelParams)
      case 'close':
        return this.closeChannel(params.payload as Controller.Params.CloseChannelParams)
      default:
        return Promise.reject(new Error('Invalid perun service action type'))
    }
  }
  // Create a new client for each call, in case the connection break for some reason.
  private static mkClient(): SimpleChannelServiceClient {
    const rpcEndpoint = 'http://localhost:42025'
    return mkSimpleChannelServiceClient(defaultAddressEncoder, rpcEndpoint)
  }

  async openChannel(params: Controller.Params.OpenChannelParams): Promise<Controller.Response> {

    const alloc = Allocation.create({
      assets: [new Uint8Array(32)],
      balances: Balances.create({
        balances: [
          {
            balance: params.balances,
          },
        ],
      }),
    })
    const res = await PerunController.serviceClient.openChannel(params.me, params.peer, alloc, params.challengeDuration).catch(e => {
      return {
        rejected: {
          reason: e.message,
        },
        channelId: undefined,
      }
    })
    if (res.rejected) {
      return {
        status: ResponseCode.Fail,
        message: res.rejected.reason,
      }
    }
    const channelId = channelIdToString(new Uint8Array(res.channelId!))
    console.log('Controler Buffer channelId', res.channelId!)
    console.log('Controler channelID', channelId)
    return {
      status: ResponseCode.Success,
      result: {
        channelId: channelId,
        alloc: alloc,
      },
    }
  }

  async updateChannel(params: Controller.Params.UpdateChannelParams): Promise<Controller.Response> {
    const res = await PerunController.serviceClient.updateChannel(channelIdFromString(params.channelId), params.index, params.amount).catch(e => {
      return {
        rejected: {
          reason: e.message,
        },
        update: undefined,
      }
    })

    if (res.rejected) {
      return {
        status: ResponseCode.Fail,
        message: res.rejected.reason,
      }
    }

    const state = res.update!.state!

    return {
      status: ResponseCode.Success,
      result: {
        state: state,
      },
    }
  }

  async closeChannel(params: Controller.Params.CloseChannelParams): Promise<Controller.Response> {
    const res = await PerunController.serviceClient.closeChannel(params.channelId)

    if (res.rejected) {
      return {
        status: ResponseCode.Fail,
        message: res.rejected.reason,
      }
    }

    return {
      status: ResponseCode.Success,
      result: {
        channelId: res.close!.channelId!,
      },
    }
  }
}
