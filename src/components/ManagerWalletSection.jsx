import { useState, useEffect } from 'react'
import { useConnect, useAccount as useWagmiAccount, useWalletClient as useWagmiWalletClient, useDisconnect } from 'wagmi'
import { lensClient, LENS_APP_ADDRESS } from '../config'
import { evmAddress } from '@lens-protocol/client'
import { signMessageWith } from '@lens-protocol/client/viem'
import { fetchApp, fetchApps, fetchAppFeeds, fetchFeed, fetchPosts } from '@lens-protocol/client/actions'

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

export default function ManagerWalletSection({ onSessionCreated, selectedAccount }) {
  const { connect, connectors } = useConnect()
  const { address, isConnected } = useWagmiAccount()
  const { data: walletClient } = useWagmiWalletClient()
  const { disconnect } = useDisconnect()

  const [walletLensAccount, setWalletLensAccount] = useState('')
  const [walletLoading, setWalletLoading] = useState(false)
  const [walletSuccess, setWalletSuccess] = useState(null)
  const [walletError, setWalletError] = useState(null)

  // App and Feed selection
  const [selectedApp, setSelectedApp] = useState(LENS_APP_ADDRESS)
  const [appData, setAppData] = useState(null)
  const [selectedFeed, setSelectedFeed] = useState('')
  const [loadingApp, setLoadingApp] = useState(false)
  const [availableApps, setAvailableApps] = useState([])
  const [allApps, setAllApps] = useState([])
  const [appSearchQuery, setAppSearchQuery] = useState('')
  const [manualAppAddress, setManualAppAddress] = useState('')
  const [loadingAllApps, setLoadingAllApps] = useState(false)

  // Feed posting eligibility
  const [feedEligibility, setFeedEligibility] = useState(null)
  const [checkingEligibility, setCheckingEligibility] = useState(false)
  const [sessionClient, setSessionClient] = useState(null)

  // Update lens account when selectedAccount prop changes
  useEffect(() => {
    if (selectedAccount) {
      setWalletLensAccount(selectedAccount)
    }
  }, [selectedAccount])

  // Check feed eligibility when feed is selected
  useEffect(() => {
    if (selectedFeed && sessionClient) {
      checkFeedEligibility(selectedFeed)
    } else {
      setFeedEligibility(null)
    }
  }, [selectedFeed, sessionClient])

  // Update parent when app or feed selection changes
  useEffect(() => {
    if (sessionClient && walletSuccess) {
      onSessionCreated({
        sessionClient,
        selectedApp,
        selectedFeed,
      })
    }
  }, [selectedApp, selectedFeed])

  const loadAppFeeds = async () => {
    setLoadingApp(true)
    setAppData(null)

    try {
      // First get the app data
      const appResult = await fetchApp(lensClient, {
        app: evmAddress(selectedApp.toLowerCase())
      })

      if (appResult.isOk()) {
        const app = appResult.value

        // Then fetch all feeds for this app using fetchAppFeeds
        const feedsResult = await fetchAppFeeds(lensClient, {
          app: evmAddress(selectedApp.toLowerCase())
        })

        let feedsList = []
        if (feedsResult.isOk()) {
          const appFeeds = feedsResult.value.items || []
          console.log(`✅ Loaded ${appFeeds.length} feeds for app ${selectedApp}`)

          // AppFeed only has feed address and timestamp, fetch full feed details
          const feedPromises = appFeeds.map(async (appFeed) => {
            const feedDetail = await fetchFeed(lensClient, {
              feed: evmAddress(appFeed.feed.toLowerCase())
            })
            return feedDetail.isOk() ? feedDetail.value : null
          })

          feedsList = (await Promise.all(feedPromises)).filter(feed => feed !== null)
          console.log(`✅ Loaded full details for ${feedsList.length} feeds`)
        }

        setAppData({
          address: app.address,
          defaultFeed: app.defaultFeed,
          feeds: feedsList
        })

        if (app.defaultFeed) {
          setSelectedFeed(app.defaultFeed)
        }
      } else {
        setWalletError(appResult.error.message)
      }
    } catch (err) {
      setWalletError(err.message)
    } finally {
      setLoadingApp(false)
    }
  }

  const handleConnect = async () => {
    const injectedConnector = connectors.find(c => c.id === 'injected')
    if (injectedConnector) {
      try {
        await connect({ connector: injectedConnector })
      } catch (err) {
        setWalletError(err.message)
      }
    }
  }

  const loadAllApps = async () => {
    setLoadingAllApps(true)
    try {
      const result = await fetchApps(lensClient, {})
      if (result.isOk()) {
        setAllApps(result.value.items || [])
        console.log(`✅ Loaded ${result.value.items?.length || 0} total apps`)
      }
    } catch (err) {
      console.error('Failed to load all apps:', err)
      setWalletError(err.message)
    } finally {
      setLoadingAllApps(false)
    }
  }

  const loadAccountAppsAndFeeds = async (sessionClient, accountAddress) => {
    try {
      // Load account's posting history to find apps/feeds they've used
      const postsResult = await fetchPosts(sessionClient, {
        filter: {
          authors: [evmAddress(accountAddress.toLowerCase())]
        }
      })

      if (postsResult.isOk()) {
        const posts = postsResult.value.items || []
        console.log(`✅ Found ${posts.length} posts from account ${accountAddress}`)

        // Extract unique apps from posting history
        const appSet = new Set()
        posts.forEach(post => {
          if (post.app) {
            appSet.add(post.app)
          }
        })

        // Load full app data for each unique app
        const appPromises = Array.from(appSet).map(async (appAddress) => {
          const appResult = await fetchApp(sessionClient, {
            app: evmAddress(appAddress.toLowerCase())
          })
          return appResult.isOk() ? appResult.value : null
        })

        const apps = (await Promise.all(appPromises)).filter(app => app !== null)
        setAvailableApps(apps)
        console.log(`✅ Loaded ${apps.length} apps from posting history`)

        // Set first app from history as default, or use LENS_APP_ADDRESS
        if (apps.length > 0) {
          setSelectedApp(apps[0].address)
        }
      }
    } catch (err) {
      console.error('Failed to load account apps/feeds:', err)
    }
  }

  const handleManualAppSubmit = () => {
    if (manualAppAddress && manualAppAddress.startsWith('0x')) {
      setSelectedApp(manualAppAddress)
      setManualAppAddress('')
      setWalletError(null)
    } else {
      setWalletError('Please enter a valid app address starting with 0x')
    }
  }

  const checkFeedEligibility = async (feedAddress) => {
    if (!feedAddress || !sessionClient) {
      setFeedEligibility(null)
      return
    }

    setCheckingEligibility(true)
    setFeedEligibility(null)

    try {
      const feedResult = await fetchFeed(sessionClient, {
        feed: evmAddress(feedAddress.toLowerCase())
      })

      if (feedResult.isOk() && feedResult.value) {
        const feed = feedResult.value
        const canPostOutcome = feed.operations?.canPost

        if (!canPostOutcome) {
          setFeedEligibility({
            canPost: false,
            message: 'Unable to check posting permissions'
          })
          return
        }

        switch (canPostOutcome.__typename) {
          case 'FeedOperationValidationPassed':
            setFeedEligibility({ canPost: true })
            break

          case 'FeedOperationValidationFailed': {
            const unsatisfied = canPostOutcome.unsatisfiedRules
            const reasons = []

            if (unsatisfied?.required && unsatisfied.required.length > 0) {
              reasons.push({
                type: 'required',
                title: 'You must satisfy ALL of the following:',
                rules: unsatisfied.required
              })
            }

            if (unsatisfied?.anyOf && unsatisfied.anyOf.length > 0) {
              reasons.push({
                type: 'anyOf',
                title: 'You must satisfy AT LEAST ONE of the following:',
                rules: unsatisfied.anyOf
              })
            }

            setFeedEligibility({
              canPost: false,
              message: canPostOutcome.reason,
              details: reasons
            })
            break
          }

          case 'FeedOperationValidationUnknown':
            setFeedEligibility({
              canPost: false,
              message: 'Additional verification required',
              extraChecks: canPostOutcome.extraChecksRequired
            })
            break
        }
      } else {
        setFeedEligibility({
          canPost: false,
          message: 'Feed not found or unable to fetch'
        })
      }
    } catch (err) {
      console.error('Failed to check feed eligibility:', err)
      setFeedEligibility({
        canPost: false,
        message: err.message
      })
    } finally {
      setCheckingEligibility(false)
    }
  }

  const formatRuleReason = (reason) => {
    switch (reason) {
      case 'GROUP_GATED_NOT_A_MEMBER':
        return 'Not a member of required group'
      case 'TOKEN_GATED_NOT_A_TOKEN_HOLDER':
        return 'Missing required token'
      case 'ACCOUNT_BLOCKED':
        return 'Account is blocked'
      case 'SIMPLE_PAYMENT_NOT_ENOUGH_BALANCE':
        return 'Insufficient balance'
      default:
        return reason
    }
  }

  const loginWithWallet = async () => {
    if (!address || !walletClient) {
      setWalletError('Please connect manager wallet first')
      return
    }

    setWalletLoading(true)
    setWalletError(null)
    setWalletSuccess(null)

    try {
      const result = await lensClient.login({
        accountManager: {
          account: evmAddress(walletLensAccount.toLowerCase()),
          manager: evmAddress(address.toLowerCase()),
          app: evmAddress(LENS_APP_ADDRESS.toLowerCase()),
        },
        signMessage: signMessageWith(walletClient),
      })

      if (result.isOk()) {
        const newSessionClient = result.value
        setSessionClient(newSessionClient)
        setWalletSuccess({
          account: walletLensAccount,
          manager: address,
        })

        // Load account's apps and feeds from posting history
        await loadAccountAppsAndFeeds(newSessionClient, walletLensAccount)

        onSessionCreated({
          sessionClient: newSessionClient,
          selectedApp,
          selectedFeed,
        })
      } else {
        setWalletError(result.error.message)
      }
    } catch (err) {
      setWalletError(err.message)
    } finally {
      setWalletLoading(false)
    }
  }

  return (
    <div style={styles.card}>
      <div style={{ marginBottom: '16px' }}>
        <h2 style={styles.cardTitle}>✅ Manager Wallet Login</h2>
        {isConnected && address && (
          <div style={{
            background: '#1a2a1a',
            border: '1px solid #4ade80',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '12px',
          }}>
            <div style={{ fontSize: '11px', color: '#4ade80', marginBottom: '4px' }}>
              Manager Wallet Connected
            </div>
            <div style={{ fontFamily: 'monospace', fontSize: '12px', color: '#e0e0e0' }}>
              {address}
            </div>
          </div>
        )}
        {!isConnected && (
          <div style={{
            background: '#3a1a1a',
            border: '1px solid #ff6b6b',
            borderRadius: '8px',
            padding: '12px',
            marginBottom: '12px',
          }}>
            <div style={{ fontSize: '12px', color: '#ff6b6b' }}>
              ⚠️ Please connect your wallet at the top right of the page first
            </div>
          </div>
        )}
      </div>

      <label style={styles.label}>Lens Account Address</label>
      <input
        type="text"
        style={styles.input}
        placeholder="0x..."
        value={walletLensAccount}
        onChange={(e) => setWalletLensAccount(e.target.value)}
      />

      <button
        style={{
          ...styles.button,
          ...(walletLoading || !walletLensAccount || !isConnected ? styles.buttonDisabled : {}),
        }}
        onClick={loginWithWallet}
        disabled={walletLoading || !walletLensAccount || !isConnected}
      >
        {walletLoading ? 'Logging in...' : 'Login as Manager'}
      </button>

      {walletSuccess && (
        <>
          <div style={styles.success}>
            <p style={styles.successText}>✅ Login Successful!</p>
            <div style={styles.code}>
              <div>Account: {walletSuccess.account}</div>
              <div>Manager: {walletSuccess.manager}</div>
            </div>
          </div>

          {/* App and Feed Selection */}
          <div style={{ marginTop: '24px', paddingTop: '24px', borderTop: '1px solid #222' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '500', marginBottom: '12px', color: '#fff' }}>
              Select App & Feed for Posting
            </h3>

            <label style={styles.label}>App Selection</label>

            {/* Apps from posting history */}
            {availableApps.length > 0 && (
              <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '11px', color: '#4ade80', marginBottom: '4px' }}>
                  📚 From your posting history:
                </div>
                <select
                  style={{
                    ...styles.input,
                    marginBottom: 0,
                    cursor: 'pointer',
                  }}
                  value={selectedApp}
                  onChange={(e) => setSelectedApp(e.target.value)}
                >
                  <option value={LENS_APP_ADDRESS}>Default Lens App</option>
                  {availableApps.map((app) => (
                    <option key={app.address} value={app.address}>
                      {app.metadata?.name || app.address}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Browse all apps */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                <div style={{ fontSize: '11px', color: '#888', flex: 1 }}>
                  🔍 Browse all apps:
                </div>
                <button
                  style={{
                    ...styles.button,
                    width: 'auto',
                    padding: '8px 12px',
                    fontSize: '12px',
                    marginBottom: 0,
                    ...(loadingAllApps ? styles.buttonDisabled : {}),
                  }}
                  onClick={loadAllApps}
                  disabled={loadingAllApps}
                >
                  {loadingAllApps ? 'Loading...' : allApps.length > 0 ? 'Refresh' : 'Load All Apps'}
                </button>
              </div>

              {allApps.length > 0 && (
                <>
                  <input
                    type="text"
                    style={{
                      ...styles.input,
                      marginBottom: '8px',
                      fontSize: '12px',
                    }}
                    placeholder="Search apps by name or address..."
                    value={appSearchQuery}
                    onChange={(e) => setAppSearchQuery(e.target.value)}
                  />
                  <select
                    style={{
                      ...styles.input,
                      marginBottom: 0,
                      cursor: 'pointer',
                      maxHeight: '150px',
                    }}
                    size="5"
                    value={selectedApp}
                    onChange={(e) => setSelectedApp(e.target.value)}
                  >
                    {allApps
                      .filter(app => {
                        if (!appSearchQuery) return true
                        const query = appSearchQuery.toLowerCase()
                        const name = app.metadata?.name?.toLowerCase() || ''
                        const address = app.address.toLowerCase()
                        return name.includes(query) || address.includes(query)
                      })
                      .map((app) => (
                        <option key={app.address} value={app.address}>
                          {app.metadata?.name ? `${app.metadata.name} (${app.address.slice(0, 8)}...)` : app.address}
                        </option>
                      ))}
                  </select>
                  {appSearchQuery && (
                    <div style={{ fontSize: '11px', color: '#666', marginTop: '4px' }}>
                      {allApps.filter(app => {
                        const query = appSearchQuery.toLowerCase()
                        const name = app.metadata?.name?.toLowerCase() || ''
                        const address = app.address.toLowerCase()
                        return name.includes(query) || address.includes(query)
                      }).length} results
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Manual app address input */}
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '11px', color: '#888', marginBottom: '4px' }}>
                ✏️ Or enter app address manually:
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  type="text"
                  style={{
                    ...styles.input,
                    flex: 1,
                    marginBottom: 0,
                    fontSize: '12px',
                  }}
                  placeholder="0x..."
                  value={manualAppAddress}
                  onChange={(e) => setManualAppAddress(e.target.value)}
                />
                <button
                  style={{
                    ...styles.button,
                    width: 'auto',
                    padding: '12px 16px',
                    fontSize: '12px',
                    marginBottom: 0,
                    ...(!manualAppAddress ? styles.buttonDisabled : {}),
                  }}
                  onClick={handleManualAppSubmit}
                  disabled={!manualAppAddress}
                >
                  Use
                </button>
              </div>
            </div>

            {/* Current selection and Load Feeds button */}
            <div style={{
              background: '#1a2a1a',
              border: '1px solid #4ade80',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '12px',
            }}>
              <div style={{ fontSize: '11px', color: '#4ade80', marginBottom: '4px' }}>
                Selected App:
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: '11px', color: '#e0e0e0', marginBottom: '8px' }}>
                {selectedApp}
              </div>
              <button
                style={{
                  ...styles.button,
                  width: '100%',
                  ...(loadingApp ? styles.buttonDisabled : {}),
                }}
                onClick={loadAppFeeds}
                disabled={loadingApp}
              >
                {loadingApp ? 'Loading...' : 'Load Feeds for Selected App'}
              </button>
            </div>

            {appData && (
              <>
                <label style={styles.label}>Feed</label>
                <select
                  style={{
                    ...styles.input,
                    cursor: 'pointer',
                  }}
                  value={selectedFeed}
                  onChange={(e) => setSelectedFeed(e.target.value)}
                >
                  <option value="">Global Feed (no specific feed)</option>
                  {appData.feeds.map((feed) => {
                    const feedAddress = feed.address || feed
                    const feedName = feed.metadata?.name || ''
                    const isDefault = feedAddress === appData.defaultFeed

                    return (
                      <option key={feedAddress} value={feedAddress}>
                        {feedName
                          ? `${feedName} ${isDefault ? '(Default)' : ''}`
                          : `${feedAddress.slice(0, 8)}...${feedAddress.slice(-6)} ${isDefault ? '(Default)' : ''}`
                        }
                      </option>
                    )
                  })}
                </select>
                <div style={{ fontSize: '11px', color: '#666', marginTop: '8px' }}>
                  {appData.feeds.length > 0
                    ? `${appData.feeds.length} feed(s) available. Selected: ${selectedFeed ? `${selectedFeed.slice(0, 10)}...${selectedFeed.slice(-8)}` : 'Global Feed'}`
                    : 'No feeds found for this app. Using Global Feed.'
                  }
                </div>

                {/* Feed Posting Eligibility Status */}
                {selectedFeed && (
                  <>
                    {checkingEligibility && (
                      <div style={{
                        background: '#1a1a3a',
                        border: '1px solid #3396ff',
                        borderRadius: '8px',
                        padding: '12px',
                        marginTop: '12px',
                        fontSize: '12px',
                        color: '#3396ff',
                      }}>
                        ⏳ Checking posting permissions...
                      </div>
                    )}

                    {!checkingEligibility && feedEligibility && feedEligibility.canPost && (
                      <div style={{
                        background: '#1a3a1a',
                        border: '1px solid #4ade80',
                        borderRadius: '8px',
                        padding: '12px',
                        marginTop: '12px',
                      }}>
                        <div style={{ fontSize: '12px', color: '#4ade80', fontWeight: '500' }}>
                          ✅ You can post to this feed
                        </div>
                      </div>
                    )}

                    {!checkingEligibility && feedEligibility && !feedEligibility.canPost && (
                      <div style={{
                        background: '#3a1a1a',
                        border: '1px solid #ff6b6b',
                        borderRadius: '8px',
                        padding: '12px',
                        marginTop: '12px',
                      }}>
                        <div style={{ fontSize: '12px', color: '#ff6b6b', fontWeight: '500', marginBottom: '8px' }}>
                          ❌ Cannot post to this feed
                        </div>
                        <div style={{ fontSize: '11px', color: '#ffaaaa', marginBottom: '8px' }}>
                          {feedEligibility.message}
                        </div>
                        {feedEligibility.details && feedEligibility.details.map((section, idx) => (
                          <div key={idx} style={{ marginTop: '8px' }}>
                            <div style={{ fontSize: '11px', color: '#ffaaaa', fontWeight: '500', marginBottom: '4px' }}>
                              {section.title}
                            </div>
                            {section.rules.map((rule, ruleIdx) => (
                              <div key={ruleIdx} style={{
                                fontSize: '10px',
                                color: '#ff9999',
                                marginLeft: '8px',
                                marginBottom: '4px',
                                paddingLeft: '8px',
                                borderLeft: '2px solid #ff6b6b',
                              }}>
                                • {rule.message} ({formatRuleReason(rule.reason)})
                              </div>
                            ))}
                          </div>
                        ))}
                        {feedEligibility.extraChecks && (
                          <div style={{ fontSize: '10px', color: '#ff9999', marginTop: '8px' }}>
                            Additional runtime checks required
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </div>
        </>
      )}

      {walletError && (
        <div style={styles.error}>
          <p style={styles.errorText}>{walletError}</p>
        </div>
      )}
    </div>
  )
}
