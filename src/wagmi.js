import { createConfig, http } from 'wagmi'
import { mainnet, sepolia, polygon, polygonAmoy } from 'wagmi/chains'
import { walletConnect, injected } from 'wagmi/connectors'
import { chains as lensChains } from '@lens-chain/sdk/viem'

export const config = createConfig({
  chains: [mainnet, sepolia, polygon, polygonAmoy, lensChains.testnet],
  connectors: [
    injected(),
  ],
  transports: {
    [mainnet.id]: http(),
    [sepolia.id]: http(),
    [polygon.id]: http(),
    [polygonAmoy.id]: http(),
    [lensChains.testnet.id]: http(),
  },
})