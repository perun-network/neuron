import { bytes } from '@ckb-lumos/codec'
import { UpdateNotificationRequest, SignTransactionRequest } from '@polycrypt/perun-wallet-wrapper/perun-wallet'
import { WalletBackend } from '@polycrypt/perun-wallet-wrapper/services'
import { ValidOpenChannelRequest, ValidSignMessageRequest } from '@polycrypt/perun-wallet-wrapper/verifier'
import * as wire from '@polycrypt/perun-wallet-wrapper/wire'

export type IPCMessageRequest =
  | 'openChannelRequest'
  | 'updateNotificationRequest'
  | 'signMessageRequest'
  | 'signTransactionRequest'
export type IPCMessageResponse =
  | 'openChannelResponse'
  | 'updateNotificationResponse'
  | 'signMessageResponse'
  | 'signTransactionResponse'

// The IPCWalletBackend is a WalletBackend that uses IPC to communicate with
// the wallet. It expects to be run in a separate process from the wallet but
// communicates with it via IPC.
export class IPCWalletBackend implements WalletBackend<{}> {
  openChannelRequest(
    req: ValidOpenChannelRequest
  ): Promise<{ rejected?: { reason?: string }; nonceShare?: Uint8Array }> {
    // Create a new Promise which resovles if the response from the IPC parent process is received.
    return new Promise((resolve, reject) => {
      // Send the request to the IPC parent process.
      console.log('IPCWalletBackend: sending openChannelRequest to HOST process')
      const res = process.send!({ type: 'openChannelRequest', req })
      if (!res) {
        return reject(new Error('Failed to send IPC message'))
      }

      console.log('IPCWalletBackend: waiting for HOST process response')
      // Listen for the response from the IPC parent process.
      // TODO: Unsubscribe from the message listener when the promise is resolved.
      process.once('message', (message: { type: IPCMessageResponse; req: unknown }) => {
        console.log('IPCWalletBackend: received HOST process response', message)
        if (message.type === 'openChannelResponse') {
          // Resolve the promise with the response.
          return resolve(message.req as any)
        }
      })
    })
  }

  updateNotificationRequest(req: UpdateNotificationRequest): Promise<{ accepted?: boolean | undefined }> {
    return new Promise((resolve, reject) => {
      // Make sure we send the serialized state, otherwise we have to account for weird IPC serialization issues.
      const encodedState = wire.State.encode(req.state!).finish()
      const res = process.send!({
        type: 'updateNotificationRequest',
        req: {
          encodedState: encodedState,
        },
      })
      if (!res) {
        return reject(new Error('Failed to send IPC message'))
      }

      process.once('message', (message: { type: IPCMessageResponse; req: unknown }) => {
        if (message.type === 'updateNotificationResponse') {
          return resolve(message.req as any)
        }
      })
    })
  }

  signMessageRequest(
    req: ValidSignMessageRequest<{}>
  ): Promise<{ rejected?: { reason?: string | undefined } | undefined; signature?: Uint8Array | undefined }> {
    return new Promise((resolve, reject) => {
      const res = process.send!({ type: 'signMessageRequest', req })
      if (!res) {
        return reject(new Error('Failed to send IPC message'))
      }

      process.once('message', (message: { type: IPCMessageResponse; req: any }) => {
        if (message.type === 'signMessageResponse') {
          console.info('received signMessageResponse', message)
          // The resulting signature is string, so we convert it back into a
          // Uint8Array.
          return resolve({
            signature: bytes.bytify(message.req.signature as string),
          })
        }
        console.error("signMessageRequest: message.type != 'signMessageResponse'", message)
      })
    })
  }

  signTransactionRequest(
    req: SignTransactionRequest
  ): Promise<{ rejected?: { reason?: string | undefined } | undefined; transaction?: Uint8Array | undefined }> {
    return new Promise((resolve, reject) => {
      console.log('signTransactionRequest', req)
      console.log(new Uint8Array((req as any).identifier))
      console.log(new Uint8Array((req as any).transaction))
      const stringifiedReq: any = {
        identifier: new TextDecoder('utf-8').decode(new Uint8Array((req as any).identifier)),
        transaction: new TextDecoder('utf-8').decode(new Uint8Array((req as any).transaction)),
      }
      console.log('Sending signTransactionRequest', stringifiedReq)
      const res = process.send!({
        type: 'signTransactionRequest',
        req: stringifiedReq,
      })
      if (!res) {
        return reject(new Error('Failed to send IPC message'))
      }

      process.once('message', (message: { type: IPCMessageResponse; req: unknown }) => {
        if (message.type === 'signTransactionResponse') {
          console.log('Received signTransactionResponse', message)
          return resolve({
            transaction: new TextEncoder().encode((message.req as any).transaction),
          })
        }
      })
    })
  }
}
