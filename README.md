
# 🌑 Zk Ghost Swap

**Privacy-First Cross-Chain Cryptocurrency Exchange**

![Zk Ghost Swap](https://img.shields.io/badge/Privacy-First-6600FF?style=for-the-badge) ![No KYC](https://img.shields.io/badge/No%20KYC-Ever-00D9FF?style=for-the-badge) ![Cross-Chain](https://img.shields.io/badge/Cross--Chain-1200%2B%20Assets-00FF94?style=for-the-badge)

---

## 🔒 Overview

**Zk Ghost Swap** is a privacy-preserving cryptocurrency platform that enables anonymous asset swapping and token mixing without KYC requirements or user registration. Built with a cyberpunk/Matrix-inspired aesthetic, the platform provides two core privacy tools:

1. **Cross-Chain Crypto Swaps**
2. **Meme Mixer**

---

## ✨ Key Features

### 🔐 Privacy-First Architecture
- ✅ **Zero KYC/AML** - No identity verification ever required
- ✅ **No Account Creation** - Ephemeral sessions only  
- ✅ **No Email/Password** - Complete anonymity by default
- ✅ **Non-Custodial** - You control your assets at all times
- ✅ **Automatic Data Deletion** - Orders auto-expire and are permanently removed

### 🌐 Cross-Chain Swaps
- **1,200+ cryptocurrencies** supported across all major blockchains
- **Anonymous users**: Orders expire and are deleted after timer runs out (no persistent history)
- **Wallet-connected users**: Transaction history accessible only through wallet dropdown menu
- **Real-time status tracking** with visual privacy indicators
- **Manual order cancellation** via confirmation dialog

### 🎭 Meme Mixer
- **Break Transaction Links** - Pool multiple users' deposits to obscure on-chain connections
- **Backend-Controlled** - Automated deposit detection via Solana RPC polling
- **Encrypted Key Storage** - AES-256 encryption with environment variable secret
- **Randomized Payouts** - 5-30 minute random delays before sending to recipients
- **Fee Sponsorship** - Master wallet pays all transaction fees (no SOL required from users)
- **20-Minute Expiry** - Time-limited orders prevent indefinite lingering

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- npm or yarn
- Solana wallet (Phantom) for Meme Mixer features

### Installation

```bash
# Clone the repository
git clone https://github.com/yourusername/zk-ghost-swap.git
cd zk-ghost-swap

# Install dependencies
npm install

# Set up environment variables
# Create a .env file with:
# CHANGENOW_API_KEY=your_changenow_api_key
# MIXER_ENCRYPTION_KEY=your_encryption_key_for_mixer
# SOLANA_RPC_URL=your_solana_rpc_url
# FEE_PAYER_PRIVATE_KEY=your_fee_payer_wallet_private_key

# Run development server
npm run dev
```

The application will be available at `http://localhost:5000`

### Production Build

```bash
# Build frontend and backend
npm run build

# Start production server
npm start
```

---

## 🏗️ Architecture

### Frontend Stack
- **React 18** with TypeScript
- **Vite** for build tooling
- **Wouter** for client-side routing
- **shadcn/ui** component library (Radix UI primitives)
- **Tailwind CSS** for styling with cyberpunk/Matrix aesthetic
- **TanStack Query** for server state management
- **@solana/web3.js** for blockchain interaction

### Backend Stack
- **Node.js** with Express.js
- **TypeScript** (ESM modules)
- **Drizzle ORM** with PostgreSQL (database-ready)
- **ChangeNOW API** integration for cross-chain swaps
- **Solana RPC** for SPL token deposit detection and transfers
- **crypto-js** for AES-256 encryption of mixer private keys

### Privacy Architecture
- **Ephemeral Sessions** - No persistent user tracking
- **In-Memory Storage** - Data lost on server restart (production uses database)
- **Automatic Cleanup** - Completed orders deleted after 10 minutes
- **ZK Privacy Tunnel** - Visual cryptographic proof interface
- **Mixer** - Backend controls mixer deposit addresses for privacy pooling

---

## 📚 Documentation

### Core Concepts

**Cross-Chain Swaps:**
1. User selects currencies and enters amount
2. Backend fetches real-time rate from ChangeNOW
3. User creates order (no wallet signature required)
4. User sends funds to generated deposit address
5. Exchange executes automatically
6. User receives swapped assets at payout address

**Meme Mixer Flow:**
1. User creates mixer order (token mint, amount, recipient)
2. Backend generates unique Solana deposit keypair
3. Private key encrypted with AES-256 and stored
4. User sends tokens to deposit address
5. Backend detects deposit via RPC polling
6. Order waits in privacy pool with randomized delay
7. Backend decrypts key and sends to recipient
8. All transaction fees sponsored by master wallet

### API Endpoints

**Swap Endpoints:**
- `GET /api/swap/currencies` - Fetch available cryptocurrencies
- `GET /api/swap/estimate` - Get exchange rate estimates
- `POST /api/swap/exchange` - Create new exchange transaction
- `GET /api/swap/exchange/:id` - Track exchange status
- `POST /api/swap/auto-close/:id` - Cancel/close an order

**Mixer Endpoints:**
- `POST /api/mixer/order` - Create mixer order
- `GET /api/mixer/deposit/:orderId` - Check deposit status
- `POST /api/mixer/auto-close/:id` - Cancel/close a mixer order

---

## 🎨 Design Philosophy

**Cyberpunk Matrix Aesthetic** - Inspired by crypto-native platforms like Uniswap and privacy tools like Tornado Cash, combined with Matrix/cyberpunk visual language.

### Typography
- **Primary**: Space Grotesk (clean, technical sans-serif)
- **Monospace**: JetBrains Mono (addresses, amounts, timers, order IDs)

### Color Scheme
- Dark mode only (privacy-focused)
- HSL-based custom tokens
- Primary: `#00D9FF` (cyan)
- Secondary: `#6600FF` (purple)
- Accent: `#00FF94` (green)

---

## 🔒 Privacy Guarantees

### What We Protect Against
- ✅ **Blockchain Analytics Firms** - Cannot link swap transactions across chains
- ✅ **Government Surveillance** - No KYC data to subpoena, no logs
- ✅ **Network Adversaries** - No IP logging, encrypted connections
- ✅ **Transaction Graph Analysis** - Mixer pooling breaks on-chain links

### Trust Model
- **Non-Custodial Swaps** - We never hold your swap funds
- **Mixer** - Backend controls mixer deposit addresses for privacy pooling
- **Open Source** - All code is public and auditable
- **Minimal Trust** - Designed to require minimal trust in operators

---

## 📖 Full Documentation

For complete technical documentation, privacy guarantees, and security model, see:
- [Privacy Whitepaper](WHITEPAPER.md)
- [Design Guidelines](design_guidelines.md)
- [Project Documentation](replit.md)

---

## 🛡️ Security

- **AES-256 Encryption** for mixer private keys
- **Environment Variable Secrets** for encryption keys
- **Automatic Order Expiry** prevents indefinite data retention
- **Non-Custodial Architecture** for swaps (you control your assets)
- **Fee Sponsorship** eliminates need for users to hold SOL

---

## 🌟 Use Cases

- **Privacy-Conscious Investors** - Protect portfolio composition from public visibility
- **Cross-Border Remittances** - Send money instantly with minimal fees, no ID required
- **Censorship Resistance** - Permissionless transactions that cannot be blocked
- **Commercial Privacy** - Keep supplier relationships and pricing confidential
- **Personal Safety** - Reduce attack surface for high-net-worth individuals

---

## 🚧 Future Roadmap

### Phase 1: Privacy Enhancements (Q2 2025)
- Full ZK-SNARK integration with production proof circuits
- Native Tor hidden service (.onion address)
- Multi-hop swaps through privacy coins

### Phase 2: Decentralization (Q3 2025)
- Decentralized exchange network with P2P liquidity
- IPFS frontend hosting for censorship resistance
- DAO governance for protocol upgrades

### Phase 3: Advanced Features (Q4 2025)
- Lightning Network integration for instant BTC swaps
- Private stablecoin support
- Native mobile applications (iOS & Android)

---

## 📄 License

MIT License - See LICENSE file for details

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

## 📞 Contact

For issues, please contact: `security@zkghostswap.org`

---

**Privacy is not a privilege. It's a fundamental human right.**

*Welcome to Zk Ghost Swap. Swap freely. Stay invisible.* 👻
