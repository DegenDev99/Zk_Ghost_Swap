# ZK Swap - Privacy-First Cryptocurrency Exchange

## Overview

ZK Swap is a privacy-focused cryptocurrency exchange application that enables anonymous asset swapping without KYC requirements or user registration. The platform integrates with ChangeNOW API to facilitate cross-chain cryptocurrency exchanges while maintaining user privacy. Built with a cyberpunk/Matrix-inspired aesthetic, the application provides a streamlined interface for creating and tracking exchanges with real-time status updates and countdown timers.

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

**State Management & Data Fetching**
- **TanStack Query (React Query)** for server state management, caching, and API request handling
- Query client configured with no automatic refetching (staleTime: Infinity) to prevent unnecessary API calls
- Custom `apiRequest` utility for standardized fetch requests with credential inclusion

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
  - `GET /api/swap/currencies` - Fetch available cryptocurrencies
  - `GET /api/swap/estimate` - Get exchange rate estimates
  - `POST /api/swap/exchange` - Create new exchange transaction
  - `GET /api/swap/exchange/:id` - Track exchange status
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
- Map-based storage for exchange records
- No persistence - data lost on server restart
- Suitable for MVP/development phase

**Database Ready Architecture**
- **Drizzle ORM** configured with PostgreSQL dialect
- Schema defined in `shared/schema.ts` for type-safe database operations
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
  - Exchange amount estimation with network selection support
  - Exchange creation returning payin address and transaction details
  - Status tracking for monitoring transaction progress
- Error handling for API failures with status code propagation

**Third-Party UI Libraries**
- **Radix UI** primitives (20+ components) for accessible, unstyled UI foundations
- **Lucide React** for consistent iconography across the application
- **cmdk** for command palette interfaces
- **embla-carousel-react** for carousel functionality
- **date-fns** for date manipulation and formatting
- **class-variance-authority** for component variant management
- **clsx** and **tailwind-merge** for conditional className composition

**Development Tools**
- **Replit-specific plugins**: Cartographer (mapping), Dev Banner, Runtime Error Modal
- **PostCSS** with **Autoprefixer** for CSS processing
- **TypeScript** with path aliases (`@/`, `@shared/`, `@assets/`) for clean imports

**Asset Management**
- Static assets served from `attached_assets` directory
- Vite alias configuration for `@assets` path resolution
- Custom fonts loaded from Google Fonts (Space Grotesk, JetBrains Mono)