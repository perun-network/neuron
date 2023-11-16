import { mkWalletServiceServer } from '@polycrypt/perun-wallet-wrapper/services'
import { IPCWalletBackend } from './wallet-backend'

// Entry point for the GRPC wallet service.
function main() {
  try {
    const localUrl = '127.0.0.1:50051'
    const backend = new IPCWalletBackend()
    const server = mkWalletServiceServer(backend, () => {
      return {}
    })
    server.listen(localUrl).then(port => {
      console.log(`Wallet service listening on localhost on port ${port}`)
    })
  } catch (e) {
    console.error('GRPC:', e)
  }
}

main()
