import { createLitClient as createClient } from '@lit-protocol/lit-client'
import { nagaDev } from '@lit-protocol/networks'
import { createAuthManager, storagePlugins } from '@lit-protocol/auth'

// Lit Network Configuration
export const LIT_NETWORK = 'naga-dev'

// Create Lit Client
export async function createLitClient() {
  console.log('🔌 Creating Lit client with naga-dev network...')
  const litClient = await createClient({
    network: nagaDev,
  })

  console.log('✅ Connected to Lit Network:', LIT_NETWORK)

  return litClient
}

// Create Auth Manager with browser localStorage
export const authManager = createAuthManager({
  storage: storagePlugins.localStorage({
    appName: 'lens-manager-app',
    networkName: LIT_NETWORK,
  }),
})

console.log('✅ Auth Manager created')
