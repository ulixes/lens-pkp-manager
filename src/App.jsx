import { useState, useEffect } from 'react'
import { useAccount, useWalletClient, useSwitchChain } from 'wagmi'
import { ConnectKitButton } from 'connectkit'
import { lensClient, LENS_APP_ADDRESS } from './config'
import { createLitClient, authManager } from './lit-config'
import { evmAddress, uri } from '@lens-protocol/client'
import { signMessageWith, handleOperationWith } from '@lens-protocol/client/viem'
import { post, addAccountManager, fetchAccountsBulk, fetchAccountsAvailable, fetchApp, fetchAppUsers } from '@lens-protocol/client/actions'
import { WalletClientAuthenticator } from '@lit-protocol/auth'
import { createWalletClient, http } from 'viem'
import { chains } from '@lens-chain/sdk/viem'
import { textOnly, video } from '@lens-protocol/metadata'
import { storageClient } from './storage-client'
import ManagerWalletSection from './components/ManagerWalletSection'
import DirectContractPost from './components/DirectContractPost'

const styles = {
  container: {
    minHeight: '100vh',
    background: '#0a0a0a',
    color: '#e0e0e0',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  header: {
    padding: '20px',
    borderBottom: '1px solid #222',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    fontSize: '20px',
    fontWeight: '600',
    margin: 0,
  },
  main: {
    maxWidth: '1200px',
    margin: '40px auto',
    padding: '0 20px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '24px',
    marginTop: '24px',
  },
  card: {
    background: '#111',
    border: '1px solid #222',
    borderRadius: '12px',
    padding: '24px',
  },
  cardTitle: {
    fontSize: '16px',
    fontWeight: '500',
    marginBottom: '16px',
    color: '#fff',
  },
  input: {
    width: 'calc(100% - 24px)',
    padding: '12px',
    background: '#1a1a1a',
    border: '1px solid #333',
    borderRadius: '8px',
    color: '#e0e0e0',
    fontSize: '14px',
    marginBottom: '12px',
    boxSizing: 'border-box',
  },
  button: {
    width: 'calc(100% - 24px)',
    padding: '12px 24px',
    background: '#3396ff',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
    boxSizing: 'border-box',
  },
  buttonDisabled: {
    opacity: 0.5,
    cursor: 'not-allowed',
  },
  success: {
    background: '#1a3a1a',
    border: '1px solid #4ade80',
    borderRadius: '8px',
    padding: '16px',
    marginTop: '16px',
  },
  error: {
    background: '#3a1a1a',
    border: '1px solid #ff6b6b',
    borderRadius: '8px',
    padding: '16px',
    marginTop: '16px',
  },
  successText: {
    color: '#4ade80',
    fontSize: '14px',
    margin: 0,
  },
  errorText: {
    color: '#ff6b6b',
    fontSize: '13px',
    margin: 0,
    lineHeight: '1.6',
  },
  label: {
    display: 'block',
    fontSize: '13px',
    color: '#888',
    marginBottom: '8px',
  },
  code: {
    background: '#1a1a1a',
    padding: '8px',
    borderRadius: '4px',
    fontFamily: 'monospace',
    fontSize: '12px',
    marginTop: '8px',
    wordBreak: 'break-all',
  },
}

export default function App() {
  const { address, isConnected, chainId } = useAccount()
  const { data: walletClient } = useWalletClient()
  const { switchChain } = useSwitchChain()

  // Account Owner Login State
  const [ownerAccountAddress, setOwnerAccountAddress] = useState('')
  const [ownerLoading, setOwnerLoading] = useState(false)
  const [ownerSuccess, setOwnerSuccess] = useState(null)
  const [ownerError, setOwnerError] = useState(null)

  // Load Accounts State
  const [loadingAccounts, setLoadingAccounts] = useState(false)
  const [ownedAccounts, setOwnedAccounts] = useState([])
  const [managedAccounts, setManagedAccounts] = useState([])
  const [accountsError, setAccountsError] = useState(null)
  const [accountsTab, setAccountsTab] = useState('owned') // 'owned' or 'managed'

  // Add Manager State
  const [managerAddress, setManagerAddress] = useState('')
  const [addManagerLoading, setAddManagerLoading] = useState(false)
  const [addManagerSuccess, setAddManagerSuccess] = useState(null)
  const [addManagerError, setAddManagerError] = useState(null)

  // Manager Wallet Session State
  const [walletSessionClient, setWalletSessionClient] = useState(null)
  const [selectedLensAccount, setSelectedLensAccount] = useState('')
  const [managerSessionApp, setManagerSessionApp] = useState('')
  const [managerSessionFeed, setManagerSessionFeed] = useState('')

  // Post State
  const [postType, setPostType] = useState('text') // 'text' or 'video'
  const [postContent, setPostContent] = useState('')
  const [videoFile, setVideoFile] = useState(null)
  const [videoTitle, setVideoTitle] = useState('')
  const [customAttributes, setCustomAttributes] = useState('')
  const [postLoading, setPostLoading] = useState(false)
  const [postSuccess, setPostSuccess] = useState(null)
  const [postError, setPostError] = useState(null)

  // PKP Login State
  const [pkpPublicKey, setPkpPublicKey] = useState('')
  const [pkpLensAccount, setPkpLensAccount] = useState('')
  const [pkpLoading, setPkpLoading] = useState(false)
  const [pkpError, setPkpError] = useState(null)

  const loginAsOwner = async () => {
    setOwnerLoading(true)
    setOwnerError(null)
    setOwnerSuccess(null)

    try {
      const result = await lensClient.login({
        accountOwner: {
          account: evmAddress(ownerAccountAddress.toLowerCase()),
          app: evmAddress(LENS_APP_ADDRESS.toLowerCase()),
          owner: evmAddress(address.toLowerCase()),
        },
        signMessage: signMessageWith(walletClient),
      })

      if (result.isOk()) {
        setOwnerSuccess({
          sessionClient: result.value,
          account: ownerAccountAddress,
        })
      } else {
        setOwnerError(result.error.message)
      }
    } catch (err) {
      setOwnerError(err.message)
    } finally {
      setOwnerLoading(false)
    }
  }

  const addManager = async () => {
    if (!ownerSuccess?.sessionClient) return

    setAddManagerLoading(true)
    setAddManagerError(null)
    setAddManagerSuccess(null)

    try {
      // Check if on Lens network
      if (chainId !== 37111) {
        try {
          await switchChain({ chainId: 37111 })
          // Wait a bit for chain switch to complete
          await new Promise(resolve => setTimeout(resolve, 1000))
        } catch (err) {
          setAddManagerError('Please switch to Lens Testnet (Chain ID: 37111)')
          setAddManagerLoading(false)
          return
        }
      }

      const result = await addAccountManager(ownerSuccess.sessionClient, {
        address: evmAddress(managerAddress.toLowerCase()),
        permissions: {
          canExecuteTransactions: true,
          canTransferTokens: true,
          canTransferNative: true,
          canSetMetadataUri: true,
        },
      }).andThen(handleOperationWith(walletClient))

      if (result.isOk()) {
        setAddManagerSuccess({
          manager: managerAddress,
        })
        setManagerAddress('')
      } else {
        setAddManagerError(result.error.message)
      }
    } catch (err) {
      setAddManagerError(err.message)
    } finally {
      setAddManagerLoading(false)
    }
  }

  const loadUserAccounts = async () => {
    if (!address) return

    setLoadingAccounts(true)
    setOwnedAccounts([])
    setManagedAccounts([])
    setAccountsError(null)

    try {
      // Load owned accounts
      const ownedResult = await fetchAccountsBulk(lensClient, {
        ownedBy: [evmAddress(address.toLowerCase())],
      })

      if (ownedResult.isOk()) {
        setOwnedAccounts(ownedResult.value)
      }

      // Load managed accounts using fetchAccountsAvailable
      const managedResult = await fetchAccountsAvailable(lensClient, {
        managedBy: evmAddress(address.toLowerCase()),
        includeOwned: false,
      })

      if (managedResult.isOk()) {
        // fetchAccountsAvailable returns items with different structure
        // Each item has { account, username } where account is the Account object
        const items = managedResult.value.items || []
        setManagedAccounts(items)
      }

      if (ownedResult.isErr() && managedResult.isErr()) {
        setAccountsError(ownedResult.error.message)
      }
    } catch (err) {
      setAccountsError(err.message)
    } finally {
      setLoadingAccounts(false)
    }
  }

  // Auto-load accounts when wallet connects
  useEffect(() => {
    if (isConnected && address) {
      loadUserAccounts()
    }
  }, [isConnected, address])

  const handleManagerSessionCreated = (data) => {
    setWalletSessionClient(data.sessionClient)
    setManagerSessionApp(data.selectedApp)
    setManagerSessionFeed(data.selectedFeed)
  }

  const createPost = async () => {
    if (!walletSessionClient) {
      setPostError('Please login first')
      return
    }

    // Check if on Lens network
    if (chainId !== 37111) {
      try {
        await switchChain({ chainId: 37111 })
      } catch (err) {
        setPostError('Please switch to Lens Testnet')
        return
      }
    }

    setPostLoading(true)
    setPostError(null)
    setPostSuccess(null)

    try {
      let metadata
      let contentUri

      // Parse custom attributes if provided
      let parsedAttributes = []
      if (customAttributes.trim()) {
        try {
          parsedAttributes = JSON.parse(customAttributes)
          if (!Array.isArray(parsedAttributes)) {
            setPostError('Custom attributes must be a JSON array')
            setPostLoading(false)
            return
          }

          // Validate each attribute has required fields
          for (let i = 0; i < parsedAttributes.length; i++) {
            const attr = parsedAttributes[i]
            if (!attr.key || typeof attr.key !== 'string') {
              setPostError(`Custom attribute ${i} must have a "key" field (string)`)
              setPostLoading(false)
              return
            }
            if (attr.value === undefined) {
              setPostError(`Custom attribute ${i} must have a "value" field`)
              setPostLoading(false)
              return
            }
            if (!attr.type || !['Boolean', 'Date', 'Number', 'String', 'JSON'].includes(attr.type)) {
              setPostError(`Custom attribute ${i} must have a "type" field: Boolean, Date, Number, String, or JSON`)
              setPostLoading(false)
              return
            }
          }
        } catch (err) {
          setPostError('Invalid JSON in custom attributes: ' + err.message)
          setPostLoading(false)
          return
        }
      }

      if (postType === 'video') {
        if (!videoFile) {
          setPostError('Please select a video file')
          setPostLoading(false)
          return
        }

        // Step 1: Upload video file
        console.log('📹 Uploading video file...')
        const videoResources = await storageClient.uploadFile(videoFile)
        console.log('✅ Video URI:', videoResources.uri)

        // Step 2: Create video metadata
        console.log('📝 Creating video metadata...')
        const videoMetadata = {
          title: videoTitle || 'Video Post',
          content: postContent,
          video: {
            item: videoResources.uri,
            type: videoFile.type,
          },
        }

        // Add custom attributes if provided
        if (parsedAttributes.length > 0) {
          videoMetadata.attributes = parsedAttributes
        }

        metadata = video(videoMetadata)
      } else {
        // Step 1: Create text metadata
        console.log('📝 Creating post metadata...')
        const textMetadata = {
          content: postContent,
        }

        // Add custom attributes if provided
        if (parsedAttributes.length > 0) {
          textMetadata.attributes = parsedAttributes
        }

        metadata = textOnly(textMetadata)
      }

      // Step 2: Upload metadata
      console.log('☁️ Uploading metadata...')
      const metadataResources = await storageClient.uploadAsJson(metadata)
      console.log('✅ Metadata URI:', metadataResources.uri)

      // Step 3: Create post
      console.log('📤 Creating post...')
      const postRequest = {
        contentUri: uri(metadataResources.uri)
      }

      // Add feed address if provided from manager session
      if (managerSessionFeed) {
        postRequest.feed = evmAddress(managerSessionFeed.toLowerCase())
        console.log('📍 Posting to feed:', managerSessionFeed)
      } else {
        console.log('📍 Posting to global feed')
      }

      const postResult = await post(walletSessionClient, postRequest)

      if (postResult.isErr()) {
        setPostError(postResult.error.message)
        return
      }

      console.log('🔐 Signing transaction...')
      const txResult = await handleOperationWith(walletClient)(postResult.value)

      if (txResult.isErr()) {
        setPostError(txResult.error.message)
        return
      }

      console.log('⏳ Waiting for transaction confirmation...')
      const finalResult = await walletSessionClient.waitForTransaction(txResult.value)

      if (finalResult.isOk()) {
        console.log('✅ Post created successfully!')
        setPostSuccess({
          uri: metadataResources.uri,
          content: postType === 'video' ? videoTitle : postContent,
          type: postType,
        })
        setPostContent('')
        setVideoFile(null)
        setVideoTitle('')
      } else {
        setPostError(finalResult.error.message)
      }
    } catch (err) {
      console.error('❌ Post creation error:', err)
      setPostError(err.message)
    } finally {
      setPostLoading(false)
    }
  }

  const loginWithPKP = async () => {
    setPkpLoading(true)
    setPkpError(null)

    try {
      // Step 1: Create Lit client
      console.log('🔌 Creating Lit client...')
      const litClient = await createLitClient()

      // Step 2: Authenticate wallet to get authData
      console.log('🔐 Authenticating wallet...')
      const authData = await WalletClientAuthenticator.authenticate(walletClient)

      // Step 3: Create PKP auth context
      console.log('🎯 Creating PKP auth context...')
      const normalizedPkpPubKey = pkpPublicKey.startsWith('0x') ? pkpPublicKey : `0x${pkpPublicKey}`

      const pkpAuthContext = await authManager.createPkpAuthContext({
        authData,
        pkpPublicKey: normalizedPkpPubKey,
        authConfig: {
          resources: [
            ['pkp-signing', '*'],
            ['lit-action-execution', '*']
          ],
          expiration: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(), // 24 hours
          statement: '',
          domain: window.location.origin,
        },
        litClient,
      })

      // Step 4: Get PKP Viem Account
      console.log('🔧 Getting PKP Viem account...')
      const pkpViemAccount = await litClient.getPkpViemAccount({
        pkpPublicKey: normalizedPkpPubKey,
        authContext: pkpAuthContext,
        chainConfig: chains.testnet,
      })

      const pkpAddress = pkpViemAccount.address
      console.log('✅ PKP Address:', pkpAddress)

      // Step 5: Create wallet client with PKP account
      const pkpWalletClient = createWalletClient({
        account: pkpViemAccount,
        chain: chains.testnet,
        transport: http(),
      })

      // Step 6: Try to login to Lens (this will fail with ERC-1271 error)
      console.log('🎯 Attempting Lens login with PKP...')
      const result = await lensClient.login({
        accountManager: {
          account: evmAddress(pkpLensAccount.toLowerCase()),
          manager: evmAddress(pkpAddress.toLowerCase()),
          app: evmAddress(LENS_APP_ADDRESS.toLowerCase()),
        },
        signMessage: signMessageWith(pkpWalletClient),
      })

      if (result.isErr()) {
        setPkpError({
          message: result.error.message,
          pkpAddress,
        })
      }
    } catch (err) {
      console.error('❌ PKP login error:', err)
      setPkpError({
        message: err.message,
        raw: err,
      })
    } finally {
      setPkpLoading(false)
    }
  }

  return (
    <div style={styles.container}>
      <header style={styles.header}>
        <h1 style={styles.title}>🐛 Lit PKP + Lens Protocol Issue</h1>
        <ConnectKitButton />
      </header>

      <main style={styles.main}>
        {!isConnected ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <p style={{ fontSize: '16px', color: '#888' }}>Connect your wallet to start</p>
          </div>
        ) : (
          <>
            <div style={{
              background: '#1a1a1a',
              border: '1px solid #333',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '24px',
            }}>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>
                Connected: <span style={{ color: '#4ade80', fontFamily: 'monospace' }}>{address}</span>
              </div>
              <div style={{ fontSize: '12px', color: '#888', lineHeight: '1.6' }}>
                <div style={{ marginBottom: '8px', color: '#aaa' }}>
                  💰 <strong>Need test tokens?</strong>
                </div>
                <div style={{ marginBottom: '8px', paddingLeft: '12px' }}>
                  • Lit tokens: <a href="https://chronicle-yellowstone-faucet.getlit.dev/" target="_blank" rel="noopener noreferrer" style={{ color: '#3396ff' }}>Chronicle Yellowstone Faucet</a>
                </div>
                <div style={{ marginBottom: '12px', paddingLeft: '12px' }}>
                  • Lens GRASS: <a href="https://testnet.lenscan.io/faucet" target="_blank" rel="noopener noreferrer" style={{ color: '#3396ff' }}>Lens Testnet Faucet</a>
                </div>
                <div style={{ marginBottom: '8px', color: '#aaa' }}>
                  📝 <strong>How to test:</strong>
                </div>
                <div style={{ marginBottom: '4px' }}>
                  • <strong>Left:</strong> Enter Lens account → Login with your wallet (works ✅)
                </div>
                <div style={{ marginBottom: '4px' }}>
                  • <strong>Right:</strong> Get PKP from{' '}
                  <a
                    href="https://naga-v8-interactive-docs.vercel.app/eoa-auth"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#3396ff' }}
                  >
                    here
                  </a>
                  {' '}→ Enter PKP + Lens account → Login (fails ❌)
                </div>
              </div>
            </div>

            <div style={styles.grid}>
              {/* LEFT: Wallet Login (Works) - Separate Wagmi Instance */}
              <div>
                <ManagerWalletSection
                  onSessionCreated={handleManagerSessionCreated}
                  selectedAccount={selectedLensAccount}
                />

                {/* Post Section */}
                {walletSessionClient && (
                  <div style={{ ...styles.card, marginTop: '24px' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '500', marginBottom: '12px', color: '#fff' }}>
                      Create Post
                    </h3>

                    {/* Show selected app and feed */}
                    <div style={{
                      background: '#1a1a1a',
                      border: '1px solid #333',
                      borderRadius: '8px',
                      padding: '12px',
                      marginBottom: '16px',
                    }}>
                      <div style={{ fontSize: '11px', color: '#888', marginBottom: '8px' }}>
                        Posting to:
                      </div>
                      <div style={{ fontSize: '12px', color: '#e0e0e0', marginBottom: '4px' }}>
                        <strong>App:</strong> {managerSessionApp ? `${managerSessionApp.slice(0, 8)}...${managerSessionApp.slice(-6)}` : 'Default'}
                      </div>
                      <div style={{ fontSize: '12px', color: '#e0e0e0' }}>
                        <strong>Feed:</strong> {managerSessionFeed ? `${managerSessionFeed.slice(0, 8)}...${managerSessionFeed.slice(-6)}` : 'Global Feed'}
                      </div>
                      <div style={{ fontSize: '10px', color: '#666', marginTop: '8px' }}>
                        Change app/feed in the section above
                      </div>
                    </div>

                    <label style={styles.label}>Post Type</label>
                    <div style={{ marginBottom: '12px' }}>
                      <label style={{ marginRight: '20px', fontSize: '14px', color: '#e0e0e0' }}>
                        <input
                          type="radio"
                          value="text"
                          checked={postType === 'text'}
                          onChange={(e) => setPostType(e.target.value)}
                          style={{ marginRight: '6px' }}
                        />
                        Text
                      </label>
                      <label style={{ fontSize: '14px', color: '#e0e0e0' }}>
                        <input
                          type="radio"
                          value="video"
                          checked={postType === 'video'}
                          onChange={(e) => setPostType(e.target.value)}
                          style={{ marginRight: '6px' }}
                        />
                        Video
                      </label>
                    </div>

                    {postType === 'video' && (
                      <>
                        <label style={styles.label}>Video Title</label>
                        <input
                          type="text"
                          style={styles.input}
                          placeholder="Enter video title"
                          value={videoTitle}
                          onChange={(e) => setVideoTitle(e.target.value)}
                        />

                        <label style={styles.label}>Video File</label>
                        <input
                          type="file"
                          accept="video/*"
                          style={{
                            ...styles.input,
                            padding: '8px',
                          }}
                          onChange={(e) => setVideoFile(e.target.files?.[0])}
                        />
                      </>
                    )}

                    <label style={styles.label}>{postType === 'video' ? 'Description' : 'Post Content'}</label>
                    <textarea
                      style={{
                        ...styles.input,
                        minHeight: '80px',
                        fontFamily: 'inherit',
                        resize: 'vertical',
                      }}
                      placeholder={postType === 'video' ? 'Add a description...' : "What's on your mind?"}
                      value={postContent}
                      onChange={(e) => setPostContent(e.target.value)}
                    />

                    <label style={styles.label}>Post Metadata - Custom Attributes (Optional)</label>
                    <div style={{
                      fontSize: '11px',
                      color: '#888',
                      marginBottom: '8px',
                      marginTop: '-8px',
                      padding: '8px',
                      background: '#1a1a1a',
                      borderRadius: '6px',
                      border: '1px solid #333',
                    }}>
                      Add custom key-value metadata to your post. Must be a JSON array where each object has:
                      <div style={{ marginTop: '4px', fontFamily: 'monospace', fontSize: '10px', color: '#3396ff' }}>
                        • <strong>key</strong>: string (e.g., "app_type")<br/>
                        • <strong>value</strong>: any value (string, number, etc.)<br/>
                        • <strong>type</strong>: "Boolean" | "Date" | "Number" | "String" | "JSON"
                      </div>
                    </div>
                    <textarea
                      style={{
                        ...styles.input,
                        minHeight: '100px',
                        fontFamily: 'monospace',
                        fontSize: '12px',
                        resize: 'vertical',
                      }}
                      placeholder={`Example:\n[\n  {\n    "key": "category",\n    "value": "music",\n    "type": "String"\n  },\n  {\n    "key": "duration",\n    "value": "180",\n    "type": "Number"\n  }\n]`}
                      value={customAttributes}
                      onChange={(e) => setCustomAttributes(e.target.value)}
                    />

                    <button
                      style={{
                        ...styles.button,
                        ...(postLoading || (!postContent && postType === 'text') || (!videoFile && postType === 'video') ? styles.buttonDisabled : {}),
                      }}
                      onClick={createPost}
                      disabled={postLoading || (!postContent && postType === 'text') || (!videoFile && postType === 'video')}
                    >
                      {postLoading ? 'Creating Post...' : 'Create Post'}
                    </button>

                    {postSuccess && (
                      <div style={styles.success}>
                        <p style={styles.successText}>✅ Post Created!</p>
                        <div style={styles.code}>
                          <div>Type: {postSuccess.type}</div>
                          <div>Content: {postSuccess.content}</div>
                          <div>URI: {postSuccess.uri}</div>
                        </div>
                      </div>
                    )}

                    {postError && (
                      <div style={styles.error}>
                        <p style={styles.errorText}>{postError}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* RIGHT: PKP Login (Fails) */}
              <div style={styles.card}>
                <h2 style={styles.cardTitle}>❌ PKP Login</h2>

                <label style={styles.label}>PKP Public Key</label>
                <input
                  type="text"
                  style={styles.input}
                  placeholder="0x04..."
                  value={pkpPublicKey}
                  onChange={(e) => setPkpPublicKey(e.target.value)}
                />

                <label style={styles.label}>Lens Account Address</label>
                <input
                  type="text"
                  style={styles.input}
                  placeholder="0x..."
                  value={pkpLensAccount}
                  onChange={(e) => setPkpLensAccount(e.target.value)}
                />

                <button
                  style={{
                    ...styles.button,
                    background: '#8b5cf6',
                    ...(pkpLoading || !pkpPublicKey || !pkpLensAccount ? styles.buttonDisabled : {}),
                  }}
                  onClick={loginWithPKP}
                  disabled={pkpLoading || !pkpPublicKey || !pkpLensAccount}
                >
                  {pkpLoading ? 'Logging in...' : 'Login with PKP'}
                </button>

                {pkpError && (
                  <div style={styles.error}>
                    <p style={{ ...styles.errorText, fontWeight: '600', marginBottom: '8px' }}>
                      ❌ ERC-1271 Error
                    </p>
                    {pkpError.pkpAddress && (
                      <div style={styles.code}>
                        <div>PKP Address: {pkpError.pkpAddress}</div>
                      </div>
                    )}
                    <p style={{ ...styles.errorText, marginTop: '12px' }}>{pkpError.message}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Direct Contract Interaction Section */}
            <div style={{ marginTop: '40px' }}>
              <DirectContractPost />
            </div>

            {/* Account Management Grid */}
            <div style={{ ...styles.grid, marginTop: '40px' }}>
              {/* Load User Accounts Section */}
              <div style={styles.card}>
                <h2 style={styles.cardTitle}>📋 My Accounts</h2>

                {/* Tabs */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', borderBottom: '1px solid #222' }}>
                  <button
                    style={{
                      background: accountsTab === 'owned' ? '#1a1a1a' : 'transparent',
                      border: 'none',
                      borderBottom: accountsTab === 'owned' ? '2px solid #4ade80' : '2px solid transparent',
                      color: accountsTab === 'owned' ? '#4ade80' : '#888',
                      padding: '12px 16px',
                      fontSize: '13px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onClick={() => setAccountsTab('owned')}
                  >
                    Owned ({ownedAccounts.length})
                  </button>
                  <button
                    style={{
                      background: accountsTab === 'managed' ? '#1a1a1a' : 'transparent',
                      border: 'none',
                      borderBottom: accountsTab === 'managed' ? '2px solid #3396ff' : '2px solid transparent',
                      color: accountsTab === 'managed' ? '#3396ff' : '#888',
                      padding: '12px 16px',
                      fontSize: '13px',
                      fontWeight: '500',
                      cursor: 'pointer',
                      transition: 'all 0.2s',
                    }}
                    onClick={() => setAccountsTab('managed')}
                  >
                    Managing ({managedAccounts.length})
                  </button>
                </div>

                {loadingAccounts && (
                  <div style={{ padding: '16px', textAlign: 'center', color: '#888' }}>
                    Loading accounts...
                  </div>
                )}

                {!loadingAccounts && accountsTab === 'owned' && ownedAccounts.length === 0 && !accountsError && (
                  <div style={{ padding: '16px', textAlign: 'center', color: '#888' }}>
                    No owned Lens accounts found
                  </div>
                )}

                {!loadingAccounts && accountsTab === 'managed' && managedAccounts.length === 0 && !accountsError && (
                  <div style={{ padding: '16px', textAlign: 'center', color: '#888' }}>
                    No managed Lens accounts found
                  </div>
                )}

                {accountsTab === 'owned' && ownedAccounts.length > 0 && (
                  <div style={{ marginTop: '12px' }}>
                    {ownedAccounts.map((account, idx) => (
                      <div key={idx} style={{
                        background: '#1a1a1a',
                        border: '1px solid #333',
                        borderRadius: '8px',
                        padding: '14px',
                        marginTop: idx > 0 ? '8px' : 0,
                        transition: 'all 0.2s',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#4ade80'
                        e.currentTarget.style.background = '#1a2a1a'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#333'
                        e.currentTarget.style.background = '#1a1a1a'
                      }}
                      onClick={() => setSelectedLensAccount(account.address)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                          {account.username?.value && (
                            <div style={{ fontSize: '14px', color: '#4ade80', fontWeight: '500' }}>
                              @{account.username.value}
                            </div>
                          )}
                          <button
                            style={{
                              background: 'transparent',
                              border: '1px solid #444',
                              borderRadius: '4px',
                              color: '#888',
                              padding: '4px 8px',
                              fontSize: '11px',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                            onClick={(e) => {
                              e.stopPropagation()
                              navigator.clipboard.writeText(account.address)
                              const btn = e.currentTarget
                              btn.textContent = '✓ Copied'
                              setTimeout(() => {
                                if (btn) btn.textContent = '📋 Copy'
                              }, 1500)
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = '#666'
                              e.currentTarget.style.color = '#aaa'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = '#444'
                              e.currentTarget.style.color = '#888'
                            }}
                          >
                            📋 Copy
                          </button>
                        </div>
                        <div style={{
                          fontFamily: 'monospace',
                          fontSize: '11px',
                          color: '#888',
                          wordBreak: 'break-all',
                          lineHeight: '1.4'
                        }}>
                          {account.address}
                        </div>
                        <div style={{ fontSize: '10px', color: '#666', marginTop: '8px' }}>
                          Click to use in login
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {accountsTab === 'managed' && managedAccounts.length > 0 && (
                  <div style={{ marginTop: '12px' }}>
                    {managedAccounts.map((item, idx) => (
                      <div key={idx} style={{
                        background: '#1a1a1a',
                        border: '1px solid #333',
                        borderRadius: '8px',
                        padding: '14px',
                        marginTop: idx > 0 ? '8px' : 0,
                        transition: 'all 0.2s',
                        cursor: 'pointer',
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#3396ff'
                        e.currentTarget.style.background = '#1a1a2a'
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#333'
                        e.currentTarget.style.background = '#1a1a1a'
                      }}
                      onClick={() => setSelectedLensAccount(item.account.address)}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                          {item.username && (
                            <div style={{ fontSize: '14px', color: '#3396ff', fontWeight: '500' }}>
                              @{item.username}
                            </div>
                          )}
                          <button
                            style={{
                              background: 'transparent',
                              border: '1px solid #444',
                              borderRadius: '4px',
                              color: '#888',
                              padding: '4px 8px',
                              fontSize: '11px',
                              cursor: 'pointer',
                              transition: 'all 0.2s',
                            }}
                            onClick={(e) => {
                              e.stopPropagation()
                              navigator.clipboard.writeText(item.account.address)
                              const btn = e.currentTarget
                              btn.textContent = '✓ Copied'
                              setTimeout(() => {
                                if (btn) btn.textContent = '📋 Copy'
                              }, 1500)
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = '#666'
                              e.currentTarget.style.color = '#aaa'
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = '#444'
                              e.currentTarget.style.color = '#888'
                            }}
                          >
                            📋 Copy
                          </button>
                        </div>
                        <div style={{
                          fontFamily: 'monospace',
                          fontSize: '11px',
                          color: '#888',
                          wordBreak: 'break-all',
                          lineHeight: '1.4'
                        }}>
                          {item.account.address}
                        </div>
                        <div style={{ fontSize: '10px', color: '#666', marginTop: '8px' }}>
                          Click to use in login • Manager role
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {accountsError && (
                  <div style={styles.error}>
                    <p style={styles.errorText}>{accountsError}</p>
                  </div>
                )}
              </div>

              {/* Account Owner Section */}
              <div style={styles.card}>
                <h2 style={styles.cardTitle}>👑 Account Owner</h2>

                <label style={styles.label}>Account Address</label>
                <input
                  type="text"
                  style={styles.input}
                  placeholder="0x..."
                  value={ownerAccountAddress}
                  onChange={(e) => setOwnerAccountAddress(e.target.value)}
                />

                <button
                  style={{
                    ...styles.button,
                    ...(ownerLoading || !ownerAccountAddress ? styles.buttonDisabled : {}),
                  }}
                  onClick={loginAsOwner}
                  disabled={ownerLoading || !ownerAccountAddress}
                >
                  {ownerLoading ? 'Logging in...' : 'Login as Owner'}
                </button>

                {ownerSuccess && (
                  <div style={styles.success}>
                    <p style={styles.successText}>✅ Logged in as Owner!</p>
                    <div style={styles.code}>
                      <div>Account: {ownerSuccess.account}</div>
                    </div>
                  </div>
                )}

                {ownerError && (
                  <div style={styles.error}>
                    <p style={styles.errorText}>{ownerError}</p>
                  </div>
                )}

                {/* Add Manager Section */}
                {ownerSuccess && (
                  <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #222' }}>
                    <h3 style={{ fontSize: '14px', fontWeight: '500', marginBottom: '12px', color: '#fff' }}>
                      Add Manager
                    </h3>

                    <label style={styles.label}>Manager Address</label>
                    <input
                      type="text"
                      style={styles.input}
                      placeholder="0x..."
                      value={managerAddress}
                      onChange={(e) => setManagerAddress(e.target.value)}
                    />

                    <button
                      style={{
                        ...styles.button,
                        background: '#10b981',
                        ...(addManagerLoading || !managerAddress ? styles.buttonDisabled : {}),
                      }}
                      onClick={addManager}
                      disabled={addManagerLoading || !managerAddress}
                    >
                      {addManagerLoading ? 'Adding...' : 'Add Manager'}
                    </button>

                    {addManagerSuccess && (
                      <div style={styles.success}>
                        <p style={styles.successText}>✅ Manager Added!</p>
                        <div style={styles.code}>
                          <div>Manager: {addManagerSuccess.manager}</div>
                        </div>
                      </div>
                    )}

                    {addManagerError && (
                      <div style={styles.error}>
                        <p style={styles.errorText}>{addManagerError}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
