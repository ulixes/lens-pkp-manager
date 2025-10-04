import { PublicClient, testnet } from '@lens-protocol/client'

// Lens testnet playground app address
export const LENS_APP_ADDRESS = '0xC75A89145d765c396fd75CbD16380Eb184Bd2ca7'

// Create Lens client
export const lensClient = PublicClient.create({
  environment: testnet,
})
