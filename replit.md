# Zk Ghost Swap - Privacy-First Cryptocurrency Exchange

## Overview

Zk Ghost Swap is a privacy-focused cryptocurrency platform that enables anonymous asset swapping and token mixing without KYC requirements or user registration. The platform features two core privacy tools: (1) Cross-chain crypto swaps via ChangeNOW API, and (2) Meme Mixer - a pool-based mixer that pools user deposits and sends randomized payouts to break on-chain transaction links. Built with a cyberpunk/Matrix-inspired aesthetic, the application provides streamlined interfaces for creating and tracking privacy-enhanced transactions with real-time status updates.

**Key Privacy Features:**

**Cross-Chain Swaps:**
- Anonymous users: Orders expire and are deleted after timer runs out (no persistent history)
- Wallet-connected users: Transaction history accessible only through wallet dropdown menu
- Disconnect confirmation: Prevents accidental wallet disconnection with warning dialog
- **Cancel Order**: Users can manually cancel active orders via confirmation dialog; canceled orders are permanently removed and do not reappear on page reload

**Meme Mixer (Pool-Based Mixer):**
- **Pool Architecture**: Backend-controlled privacy pool for breaking on-chain transaction links
- **Deposit Flow**: Backend generates unique Solana keypairs, encrypts private keys with AES-256
- **Pooling Mechanism**: Multiple users' deposits pooled together to obscure transaction links
- **Randomized Payouts**: 5-30 minute random delays before sending to recipients
- **Security**: Private keys encrypted using crypto-js with MIXER_ENCRYPTION_KEY environment variable
- **Order Management**: 20-minute order expiry, automatic deposit detection via Solana RPC polling
- **Cancel Order**: Users can manually cancel active orders via confirmation dialog; canceled orders are permanently removed
- **Anonymous Flow**: Create order → Send to deposit address → Automatic pool mixing → Randomized payout
- **Storage**: depositAddress, depositPrivateKey (encrypted), depositedAmount, depositedAt, payoutScheduledAt, depositTxSignature fields in database

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture

**Framework & Build System**
- **React 18** with TypeScript for type-safe component development
- **Vite** as the build tool and development server, providing fast HMR and optimized production builds
- **Wouter** for lightweight client-side routing (single-page application with swap page and 404 fallback)

**UI Component System**
- **shadcn/ui** component library (New York style variant) built on Radix UI primitives
- **Tailwind CSS** for utility-first styling with custom design tokens
- **CSS Variables** approach for theming with dark mode as the primary (and only supported) theme
- **Custom Design System**: Cyberpunk/Matrix aesthetic with specific typography hierarchy using Space Grotesk (primary), JetBrains Mono (monospace for addresses/amounts), and custom color scheme with HSL-based tokens
- **Responsive Navigation**: Three-column grid layout with logo/brand flush left, Swap/Mixer/Docs navigation centered, and wallet button on right; icon-only mode for screens under 475px
- **Smart Currency Search**: Custom sorting algorithm prioritizes exact ticker matches first, then partial ticker matches, then name matches for intuitive search results
- **Dropdown Menu**: Wallet address button opens menu with Transaction History and Disconnect options
- **Alert Dialogs**: Confirmation dialogs for critical actions (disconnect wallet, cancel order)

**State Management & Data Fetching**
- **TanStack Query (React Query)** for server state management, caching, and API request handling
- Query client configured with no automatic refetching (staleTime: Infinity) to prevent unnecessary API calls
- Custom `apiRequest` utility for standardized fetch requests with credential inclusion

**Solana Integration**
- **@solana/web3.js** for blockchain interaction and transaction building
- **@solana/spl-token** for SPL token transfers
- **Phantom Wallet Integration** via WalletContext for authentication
- Direct RPC connection to Solana mainnet for deposit detection and payouts
- **Custodial Keypair Management**: Backend generates and encrypts Solana keypairs for deposit addresses

**Form Handling & Validation**
- **React Hook Form** with **@hookform/resolvers** for form state management
- **Zod** schemas (via drizzle-zod) for runtime validation of exchange creation inputs
- Validation ensures proper currency selection, positive amounts, and valid payout addresses

### Backend Architecture

**Runtime & Framework**
- **Node.js** with **Express.js** for HTTP server
- **TypeScript** throughout (ESM modules) with strict type checking
- **esbuild** for production bundling with platform-specific optimizations

**API Design Pattern**
- RESTful API with clear endpoint structure:
  - **Swap Endpoints:**
    - `GET /api/swap/currencies` - Fetch available cryptocurrencies
    - `GET /api/swap/estimate` - Get exchange rate estimates
    - `POST /api/swap/exchange` - Create new exchange transaction
    - `GET /api/swap/exchange/:id` - Track exchange status
    - `POST /api/swap/auto-close/:id` - Permanently cancel/close an exchange order
  - **Mixer Endpoints:**
    - `POST /api/mixer/order` - Create custodial mixer order (generates deposit address with encrypted private key)
    - `GET /api/mixer/deposit/:orderId` - Check deposit status via Solana RPC polling
    - `POST /api/mixer/auto-close/:id` - Permanently cancel/close a mixer order
  - **Support Endpoints:**
    - `POST /api/support/tickets` - Submit support request with file attachments (max 3 files, 5MB each)
  - **Chat Endpoints:**
    - `POST /api/chat/message` - Send message to AI chatbot and receive response
    - `GET /api/chat/history/:sessionId` - Retrieve chat conversation history
- Request/response logging middleware for debugging and monitoring
- Raw body preservation for webhook verification scenarios

**Development Setup**
- **tsx** for running TypeScript in development without compilation
- **Vite middleware mode** integration for seamless dev server with HMR
- Custom error overlay via Replit plugins
- Separate development and production modes with environment-based configuration

### Data Storage Solutions

**In-Memory Storage (Current Implementation)**
- `MemStorage` class implementing `IStorage` interface
- Map-based storage for exchange records and mixer orders
- No persistence - data lost on server restart
- Suitable for MVP/development phase

**Database Ready Architecture**
- **Drizzle ORM** configured with PostgreSQL dialect
- Schema defined in `shared/schema.ts` for type-safe database operations:
  - `exchanges` table for swap orders
  - `mixerOrders` table for confidential transfer orders with order IDs, token info, and expiry timestamps
  - `rateHistory` table for exchange rate tracking
  - `supportTickets` table for support requests with contact email, order ID, description, and file attachment metadata
  - `chatSessions` table for AI chatbot conversation history with messages stored as jsonb
- Migration system ready (`drizzle-kit`) with migrations output to `./migrations`
- **Neon Database** serverless Postgres driver included
- Database credentials expected via `DATABASE_URL` environment variable
- Storage interface abstraction (`IStorage`) allows seamless transition from memory to database storage

**Session Management**
- **express-session** with **connect-pg-simple** for PostgreSQL-backed sessions (when database is provisioned)
- Session configuration present but not actively used (no authentication required for privacy-first approach)

### External Dependencies

**ChangeNOW API Integration**
- Primary exchange service provider for cryptocurrency swapping
- API v2 endpoints used for all operations
- API key required via `CHANGENOW_API_KEY` environment variable
- Key operations:
  - Currency listing with active status filtering
  - Exchange amount estimation with network selection support (using separate `fromNetwork` and `toNetwork` query parameters)
  - Exchange creation returning payin address and transaction details (with network as separate fields in request body)
  - Status tracking for monitoring transaction progress
- Error handling for API failures with status code propagation
- **Network Parameter Format**: Networks are passed as separate parameters (e.g., `fromCurrency=bnb&fromNetwork=bsc`) rather than appended to ticker (not `bnb_bsc`)

**OpenAI Integration (AI Chatbot)**
- **Replit AI Integrations** for OpenAI access without requiring own API key
- Uses OpenAI GPT-5 model for chatbot assistance
- Environment variables: `AI_INTEGRATIONS_OPENAI_BASE_URL` and `AI_INTEGRATIONS_OPENAI_API_KEY`
- Charges billed to Replit credits
- Chatbot capabilities:
  - Answers platform questions (how swaps work, privacy features, timelines)
  - Automatic order ID detection from conversation (regex pattern matching)
  - Order status lookup from exchanges/mixerOrders tables
  - Comprehensive platform context including FAQ and privacy guarantees
  - Redirects complex issues to support request submission
  - Conversation history persisted in chat_sessions table

**Third-Party UI Libraries**
- **Radix UI** primitives (20+ components) for accessible, unstyled UI foundations
- **Lucide React** for consistent iconography across the application
- **cmdk** for command palette interfaces
- **embla-carousel-react** for carousel functionality
- **date-fns** for date manipulation and formatting
- **class-variance-authority** for component variant management
- **clsx** and **tailwind-merge** for conditional className composition
- **nodemailer** for email notifications (support tickets)
- **multer** for file upload handling (support ticket attachments)

**Development Tools**
- **Replit-specific plugins**: Cartographer (mapping), Dev Banner, Runtime Error Modal
- **PostCSS** with **Autoprefixer** for CSS processing
- **TypeScript** with path aliases (`@/`, `@shared/`, `@assets/`) for clean imports

**Asset Management**
- Static assets served from `attached_assets` directory
- Vite alias configuration for `@assets` path resolution
- Custom fonts loaded from Google Fonts (Space Grotesk, JetBrains Mono)
- File upload storage for support ticket attachments in `server/uploads/support`

### Documentation

**Privacy Whitepaper**
- Comprehensive technical documentation in `WHITEPAPER.md`
- Covers ZK privacy principles, anonymity features, and security model
- Explains privacy guarantees, threat model, and trust assumptions
- Includes use cases, comparisons with traditional exchanges, and future roadmap
- Designed for privacy-conscious users and technical audience
- Emphasizes financial sovereignty and censorship resistance