import { useState } from 'react'
import { useAccount, useWalletClient, useSwitchChain } from 'wagmi'
import { encodeFunctionData, createWalletClient, createPublicClient, http } from 'viem'
import { chains } from '@lens-chain/sdk/viem'
import { storageClient } from '../storage-client'
import { textOnly, video } from '@lens-protocol/metadata'
import { uri } from '@lens-protocol/client'
import { FEED_ABI, ACCOUNT_ABI, LENS_V3_ADDRESSES } from '../contracts/abis'
import { createLitClient, authManager } from '../lit-config'
import { WalletClientAuthenticator } from '@lit-protocol/auth'

const styles = {
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
    background: '#8b5cf6',
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

export default function DirectContractPost() {
  const { address, isConnected, chainId } = useAccount()
  const { data: walletClient } = useWalletClient()
  const { switchChain } = useSwitchChain()

  const [accountAddress, setAccountAddress] = useState('')
  const [feedAddress, setFeedAddress] = useState(LENS_V3_ADDRESSES.GLOBAL_FEED)

  // Post type and content
  const [postType, setPostType] = useState('text') // 'text' or 'video'
  const [postContent, setPostContent] = useState('')
  const [videoFile, setVideoFile] = useState(null)
  const [videoTitle, setVideoTitle] = useState('')
  const [customAttributes, setCustomAttributes] = useState('')

  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(null)
  const [error, setError] = useState(null)

  // PKP state
  const [pkpPublicKey, setPkpPublicKey] = useState('')
  const [pkpWalletClient, setPkpWalletClient] = useState(null)
  const [pkpPublicClient, setPkpPublicClient] = useState(null)
  const [pkpAddress, setPkpAddress] = useState('')
  const [pkpAuthLoading, setPkpAuthLoading] = useState(false)
  const [pkpAuthError, setPkpAuthError] = useState(null)

  const authenticatePKP = async () => {
    if (!walletClient || !isConnected) {
      setPkpAuthError('Please connect your wallet first')
      return
    }

    setPkpAuthLoading(true)
    setPkpAuthError(null)

    try {
      console.log('🔌 [PKP] Creating Lit client...')
      const litClient = await createLitClient()

      console.log('🔐 [PKP] Authenticating wallet...')
      const authData = await WalletClientAuthenticator.authenticate(walletClient)

      console.log('🎯 [PKP] Creating PKP auth context...')
      const normalizedPkpPubKey = pkpPublicKey.startsWith('0x') ? pkpPublicKey : `0x${pkpPublicKey}`

      const pkpAuthContext = await authManager.createPkpAuthContext({
        authData,
        pkpPublicKey: normalizedPkpPubKey,
        authConfig: {
          resources: [
            ['pkp-signing', '*'],
            ['lit-action-execution', '*']
          ],
          expiration: new Date(Date.now() + 1000 * 60 * 60 * 24).toISOString(),
          statement: '',
          domain: window.location.origin,
        },
        litClient,
      })

      console.log('🔧 [PKP] Getting PKP Viem account...')
      const pkpViemAccount = await litClient.getPkpViemAccount({
        pkpPublicKey: normalizedPkpPubKey,
        authContext: pkpAuthContext,
        chainConfig: chains.testnet,
      })

      const derivedPkpAddress = pkpViemAccount.address
      console.log('✅ [PKP] PKP Address:', derivedPkpAddress)

      console.log('🔧 [PKP] Creating PKP wallet client...')
      const pkpWallet = createWalletClient({
        account: pkpViemAccount,
        chain: chains.testnet,
        transport: http(),
      })

      console.log('🔧 [PKP] Creating public client for reading receipts...')
      const publicClient = createPublicClient({
        chain: chains.testnet,
        transport: http(),
      })

      setPkpWalletClient(pkpWallet)
      setPkpPublicClient(publicClient)
      setPkpAddress(derivedPkpAddress)
      setPkpAuthError(null)
      console.log('✅ [PKP] PKP wallet client ready!')
    } catch (err) {
      console.error('❌ [PKP] Authentication error:', err)
      setPkpAuthError(err.message || 'Failed to authenticate PKP')
    } finally {
      setPkpAuthLoading(false)
    }
  }

  const createPostDirectly = async () => {
    if (!pkpWalletClient) {
      setError('Please authenticate PKP first')
      return
    }

    // Check if on Lens network
    if (chainId !== 37111) {
      try {
        await switchChain({ chainId: 37111 })
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (err) {
        setError('Please switch to Lens Testnet (Chain ID: 37111)')
        return
      }
    }

    setLoading(true)
    setError(null)
    setSuccess(null)

    try {
      console.log('🔧 [Direct Contract] Starting post creation...')

      // Parse custom attributes if provided
      let parsedAttributes = []
      if (customAttributes.trim()) {
        try {
          parsedAttributes = JSON.parse(customAttributes)
          if (!Array.isArray(parsedAttributes)) {
            setError('Custom attributes must be a JSON array')
            setLoading(false)
            return
          }

          // Validate each attribute has required fields
          for (let i = 0; i < parsedAttributes.length; i++) {
            const attr = parsedAttributes[i]
            if (!attr.key || typeof attr.key !== 'string') {
              setError(`Custom attribute ${i} must have a "key" field (string)`)
              setLoading(false)
              return
            }
            if (attr.value === undefined) {
              setError(`Custom attribute ${i} must have a "value" field`)
              setLoading(false)
              return
            }
            if (!attr.type || !['Boolean', 'Date', 'Number', 'String', 'JSON'].includes(attr.type)) {
              setError(`Custom attribute ${i} must have a "type" field: Boolean, Date, Number, String, or JSON`)
              setLoading(false)
              return
            }
          }
        } catch (err) {
          setError('Invalid JSON in custom attributes: ' + err.message)
          setLoading(false)
          return
        }
      }

      let metadata
      let contentURI

      if (postType === 'video') {
        if (!videoFile) {
          setError('Please select a video file')
          setLoading(false)
          return
        }

        // Step 1a: Upload video file
        console.log('📹 [Direct Contract] Uploading video file...')
        const videoResources = await storageClient.uploadFile(videoFile)
        console.log('✅ [Direct Contract] Video URI:', videoResources.uri)

        // Step 1b: Create video metadata
        console.log('📝 [Direct Contract] Creating video metadata...')
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
        console.log('📝 [Direct Contract] Creating text metadata...')
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
      console.log('☁️ [Direct Contract] Uploading metadata...')
      const metadataResources = await storageClient.uploadAsJson(metadata)
      contentURI = metadataResources.uri
      console.log('✅ [Direct Contract] Metadata URI:', contentURI)

      // Step 2: Encode Feed.createPost call
      console.log('🔧 [Direct Contract] Encoding Feed.createPost...')
      const createPostData = encodeFunctionData({
        abi: FEED_ABI,
        functionName: 'createPost',
        args: [
          // postParams
          {
            author: accountAddress,
            contentURI: contentURI,
            repostedPostId: 0n,
            quotedPostId: 0n,
            repliedPostId: 0n,
            ruleChanges: [],
            extraData: []
          },
          // customParams
          [],
          // feedRulesParams
          [],
          // rootPostRulesParams
          [],
          // quotedPostRulesParams
          []
        ]
      })
      console.log('✅ [Direct Contract] Encoded data length:', createPostData.length)

      // Step 3: Encode Account.executeTransaction call
      console.log('🔧 [Direct Contract] Encoding Account.executeTransaction...')
      const executeTransactionData = encodeFunctionData({
        abi: ACCOUNT_ABI,
        functionName: 'executeTransaction',
        args: [
          feedAddress,  // target
          0n,          // value
          createPostData  // data
        ]
      })

      // Step 4: Send transaction
      console.log('📤 [Direct Contract] Sending transaction to Account contract...')
      console.log('  Account:', accountAddress)
      console.log('  Feed:', feedAddress)
      console.log('  Manager (PKP):', pkpAddress)

      const txHash = await pkpWalletClient.sendTransaction({
        to: accountAddress,
        data: executeTransactionData,
        account: pkpWalletClient.account,
        chain: pkpWalletClient.chain,
      })

      console.log('⏳ [Direct Contract] Transaction sent:', txHash)
      console.log('⏳ [Direct Contract] Waiting for confirmation...')

      // Step 5: Wait for transaction receipt
      const receipt = await pkpPublicClient.waitForTransactionReceipt({
        hash: txHash,
        confirmations: 1
      })

      console.log('✅ [Direct Contract] Transaction confirmed!')
      console.log('  Status:', receipt.status)
      console.log('  Block:', receipt.blockNumber)
      console.log('  Gas used:', receipt.gasUsed.toString())

      // Step 6: Decode the return data to get post ID
      let postId = 'Unknown'
      if (receipt.logs && receipt.logs.length > 0) {
        console.log('📊 [Direct Contract] Transaction emitted', receipt.logs.length, 'logs')
        // The post ID would typically be in the return data or logs
        // For now we'll show the transaction was successful
      }

      setSuccess({
        txHash,
        postId,
        contentURI,
        blockNumber: receipt.blockNumber.toString(),
        gasUsed: receipt.gasUsed.toString(),
        type: postType,
        content: postType === 'video' ? videoTitle : postContent
      })

      setPostContent('')
      setVideoFile(null)
      setVideoTitle('')
      setCustomAttributes('')
    } catch (err) {
      console.error('❌ [Direct Contract] Error:', err)
      setError(err.message || err.shortMessage || 'Transaction failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={styles.card}>
      <h2 style={styles.cardTitle}>⚡ Direct Contract Interaction (PKP Signed)</h2>

      <div style={{
        background: '#1a1a3a',
        border: '1px solid #3396ff',
        borderRadius: '8px',
        padding: '12px',
        marginBottom: '16px',
        fontSize: '12px',
        color: '#aaa',
        lineHeight: '1.6'
      }}>
        <div style={{ color: '#3396ff', fontWeight: '500', marginBottom: '4px' }}>
          ℹ️ Direct Contract Mode with PKP Signing
        </div>
        This section uses PKP to sign direct V3 contract calls:
        <br/>• Authenticates PKP using your connected wallet
        <br/>• Creates PKP viem account for signing
        <br/>• Encodes <code style={{ color: '#8b5cf6' }}>Feed.createPost()</code> with your content
        <br/>• Calls <code style={{ color: '#8b5cf6' }}>Account.executeTransaction()</code> signed by PKP
        <br/>• No Lens SDK, just raw contract calls + PKP signatures
      </div>

      {/* PKP Authentication Section */}
      <div style={{
        background: '#1a1a1a',
        border: '1px solid #444',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '16px',
      }}>
        <h3 style={{ fontSize: '14px', fontWeight: '500', marginBottom: '12px', color: '#fff' }}>
          Step 1: Authenticate PKP
        </h3>

        <label style={styles.label}>PKP Public Key</label>
        <input
          type="text"
          style={styles.input}
          placeholder="0x04..."
          value={pkpPublicKey}
          onChange={(e) => setPkpPublicKey(e.target.value)}
        />

        <button
          style={{
            ...styles.button,
            background: '#8b5cf6',
            ...(pkpAuthLoading || !pkpPublicKey || !isConnected || pkpWalletClient ? styles.buttonDisabled : {}),
          }}
          onClick={authenticatePKP}
          disabled={pkpAuthLoading || !pkpPublicKey || !isConnected || pkpWalletClient}
        >
          {pkpAuthLoading ? 'Authenticating PKP...' : pkpWalletClient ? '✅ PKP Authenticated' : 'Authenticate PKP'}
        </button>

        {pkpWalletClient && (
          <div style={{
            ...styles.success,
            marginTop: '12px'
          }}>
            <p style={styles.successText}>✅ PKP Wallet Client Ready</p>
            <div style={styles.code}>
              <div><strong>PKP Address:</strong> {pkpAddress}</div>
            </div>
            <button
              style={{
                ...styles.button,
                background: '#666',
                marginTop: '8px',
              }}
              onClick={() => {
                setPkpWalletClient(null)
                setPkpPublicClient(null)
                setPkpAddress('')
              }}
            >
              Reset PKP
            </button>
          </div>
        )}

        {pkpAuthError && (
          <div style={{
            ...styles.error,
            marginTop: '12px'
          }}>
            <p style={styles.errorText}>{pkpAuthError}</p>
          </div>
        )}

        {!isConnected && (
          <div style={{
            ...styles.error,
            marginTop: '12px'
          }}>
            <p style={styles.errorText}>⚠️ Please connect your wallet at the top right first</p>
          </div>
        )}
      </div>

      {/* Post Creation Section */}
      <div style={{
        background: '#1a1a1a',
        border: '1px solid #444',
        borderRadius: '8px',
        padding: '16px',
        marginBottom: '16px',
        opacity: pkpWalletClient ? 1 : 0.5,
        pointerEvents: pkpWalletClient ? 'auto' : 'none',
      }}>
        <h3 style={{ fontSize: '14px', fontWeight: '500', marginBottom: '12px', color: '#fff' }}>
          Step 2: Create Post via Direct Contract Call
        </h3>

        <label style={styles.label}>Lens Account Address</label>
        <input
          type="text"
          style={styles.input}
          placeholder="0x... (your Lens Account contract address)"
          value={accountAddress}
          onChange={(e) => setAccountAddress(e.target.value)}
        />

        <label style={styles.label}>Feed Address</label>
        <input
          type="text"
          style={styles.input}
          placeholder="0x..."
          value={feedAddress}
          onChange={(e) => setFeedAddress(e.target.value)}
        />
        <div style={{ fontSize: '11px', color: '#666', marginTop: '-8px', marginBottom: '12px' }}>
          Default: Global Feed ({LENS_V3_ADDRESSES.GLOBAL_FEED})
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
          background: '#0a0a0a',
          borderRadius: '6px',
          border: '1px solid #333',
        }}>
          Add custom key-value metadata to your post. Must be a JSON array where each object has:
          <div style={{ marginTop: '4px', fontFamily: 'monospace', fontSize: '10px', color: '#8b5cf6' }}>
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
            ...(loading || !accountAddress || !feedAddress || (!postContent && postType === 'text') || (!videoFile && postType === 'video') || !pkpWalletClient ? styles.buttonDisabled : {}),
          }}
          onClick={createPostDirectly}
          disabled={loading || !accountAddress || !feedAddress || (!postContent && postType === 'text') || (!videoFile && postType === 'video') || !pkpWalletClient}
        >
          {loading ? 'Creating Post (PKP Signing)...' : 'Create Post (PKP Signed)'}
        </button>

        {success && (
          <div style={styles.success}>
            <p style={styles.successText}>✅ Post Created via PKP-Signed Contract Call!</p>
            <div style={styles.code}>
              <div><strong>Type:</strong> {success.type}</div>
              <div><strong>Content:</strong> {success.content}</div>
              <div><strong>PKP Address:</strong> {pkpAddress}</div>
              <div><strong>Transaction:</strong> {success.txHash}</div>
              <div><strong>Block:</strong> {success.blockNumber}</div>
              <div><strong>Gas Used:</strong> {success.gasUsed}</div>
              <div><strong>Content URI:</strong> {success.contentURI}</div>
            </div>
            <div style={{ fontSize: '11px', color: '#4ade80', marginTop: '8px' }}>
              View on{' '}
              <a
                href={`https://block-explorer.testnet.lens.dev/tx/${success.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{ color: '#4ade80', textDecoration: 'underline' }}
              >
                Lens Block Explorer
              </a>
            </div>
          </div>
        )}

        {error && (
          <div style={styles.error}>
            <p style={styles.errorText}>❌ {error}</p>
          </div>
        )}
      </div>
    </div>
  )
}
