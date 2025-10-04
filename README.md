# Lens PKP Manager

A React application demonstrating **Lit Protocol PKP (Programmable Key Pair)** integration with **Lens Protocol V3** using direct contract interactions.

## 🌟 Features

### PKP Authentication & Signing
- Authenticate PKP using Lit Protocol
- Create PKP viem account for transaction signing
- Direct contract calls signed by PKP (no private keys!)

### Direct V3 Contract Interaction
- **Bypasses Lens SDK entirely** - raw viem contract calls
- Calls `Account.executeTransaction()` as a manager
- Executes `Feed.createPost()` through the Account contract
- Full control over transaction parameters

### Post Creation
- **Text Posts**: Simple text content
- **Video Posts**: Upload video files with metadata
- **Custom JSON Attributes**: Add structured metadata to posts
  - Supports: `Boolean`, `Date`, `Number`, `String`, `JSON` types

### Manager Features
- Login as account owner
- Login as account manager (regular wallet)
- Login as account manager (PKP wallet)
- Add managers to accounts
- View owned and managed accounts

## 🏗️ Architecture

### The Flow

```
User Wallet (WalletConnect)
    ↓ (authenticates PKP ownership)
Lit Protocol Network
    ↓ (creates PKP session & derives account)
PKP Viem Account
    ↓ (signs transaction)
Lens Account Contract
    ↓ (executes as manager)
Feed Contract
    ↓ (creates post)
Post Created ✅
```

### Contract Interaction Pattern

```javascript
// 1. Encode Feed.createPost()
const createPostData = encodeFunctionData({
  abi: FEED_ABI,
  functionName: 'createPost',
  args: [postParams, customParams, ...]
})

// 2. Encode Account.executeTransaction()
const executeTransactionData = encodeFunctionData({
  abi: ACCOUNT_ABI,
  functionName: 'executeTransaction',
  args: [feedAddress, 0, createPostData]
})

// 3. PKP signs and sends transaction
const txHash = await pkpWalletClient.sendTransaction({
  to: accountAddress,
  data: executeTransactionData,
  account: pkpViemAccount
})
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- WalletConnect compatible wallet
- Lens testnet account
- PKP from [Lit Protocol](https://naga-v8-interactive-docs.vercel.app/eoa-auth)

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

### Environment Setup

The app connects to:
- **Lens Network**: Testnet (Chain ID: 37111)
- **Lit Network**: naga-dev
- **Storage**: Arweave (via Lens storage client)

### Get Test Tokens

- **Lit Tokens**: [Chronicle Yellowstone Faucet](https://chronicle-yellowstone-faucet.getlit.dev/)
- **Lens GRASS**: [Lens Testnet Faucet](https://testnet.lenscan.io/faucet)

## 📖 Usage

### 1. Connect Wallet
Click "Connect Wallet" in the top right corner.

### 2. Authenticate PKP
- Enter your PKP Public Key (from Lit Protocol)
- Click "Authenticate PKP"
- Your wallet will sign a message to prove PKP ownership
- PKP wallet client is created ✅

### 3. Create Post
- Enter your **Lens Account Address** (your account contract)
- Enter **Feed Address** (defaults to Global Feed)
- Select post type: **Text** or **Video**
- Add content (text or upload video)
- Optional: Add custom JSON metadata
- Click "Create Post (PKP Signed)"

### 4. Transaction Flow
1. Content is uploaded to Arweave
2. Metadata is created and uploaded
3. `Feed.createPost()` is encoded with metadata URI
4. `Account.executeTransaction()` is encoded with Feed call
5. PKP signs transaction
6. Transaction sent to Account contract
7. Account contract executes Feed.createPost()
8. Post created! ✅

## 🔑 Key Contracts

### Lens V3 Testnet Addresses

- **Global Feed**: `0x31232Cb7dE0dce17949ffA58E9E38EEeB367C871`
- **Your Account Contract**: Use your own Lens Account address

### Contract Methods

- `Account.executeTransaction(target, value, data)`: Execute transactions as manager
- `Feed.createPost(postParams, customParams, ...)`: Create a post on the feed

## 🛠️ Tech Stack

- **React 18** - UI framework
- **Viem** - Ethereum library for contract interactions
- **Wagmi** - React hooks for wallet connection
- **ConnectKit** - Wallet connection UI
- **Lit Protocol** - PKP authentication and signing
- **Lens Protocol V3** - Decentralized social protocol
- **Arweave** - Decentralized storage (via Lens storage client)

## 📁 Project Structure

```
src/
├── components/
│   ├── DirectContractPost.jsx    # PKP-signed contract interaction
│   └── ManagerWalletSection.jsx  # Regular wallet manager login
├── contracts/
│   └── abis.js                   # Feed & Account contract ABIs
├── config.js                      # Lens client configuration
├── lit-config.js                  # Lit Protocol configuration
├── storage-client.js              # Arweave storage client
├── wagmi.js                       # Wagmi configuration
└── App.jsx                        # Main app component
```

## 🔐 Security Notes

- Your wallet only authenticates PKP ownership
- PKP signs transactions via Lit Protocol nodes (distributed MPC)
- No private keys are stored or transmitted
- Manager permissions are enforced on-chain by Account contract

## 📚 Resources

- [Lens Protocol V3 Docs](https://docs.lens.xyz)
- [Lit Protocol Docs](https://developer.litprotocol.com)
- [Lens V3 Contract Reference](https://github.com/lens-protocol/lens-v3)
- [Viem Docs](https://viem.sh)

## 🤝 Contributing

Contributions welcome! Please open an issue or PR.

## 📄 License

MIT

---

**Built with ❤️ using Lens Protocol V3 and Lit Protocol**
