# Zk Ghost Swap Design Guidelines

## Design Approach
**Cyberpunk Matrix Aesthetic** - Drawing inspiration from crypto-native platforms like Uniswap, dYdX, and privacy tools like Tornado Cash, combined with Matrix/cyberpunk visual language. This creates a technical, anonymous, hacker-aesthetic that reinforces privacy and trustlessness.

## Typography System

### Font Families
- **Primary**: Inter or Space Grotesk (clean, technical sans-serif)
- **Monospace**: JetBrains Mono or Fira Code (for addresses, amounts, timers, order IDs)
- **Display**: Orbitron or Rajdhana (cyberpunk accent for "ZK GHOST SWAP" branding)

### Hierarchy
- **Hero Title**: Display font, text-5xl to text-6xl, bold (700-800)
- **Section Headers**: Primary font, text-2xl to text-3xl, semibold (600)
- **Currency Labels**: Monospace, text-xs uppercase, tracking-wider
- **Amounts**: Monospace, text-2xl to text-3xl, bold (700)
- **Body Text**: Primary font, text-sm to text-base, regular (400)
- **Status/Timer**: Monospace, text-lg, bold (700)

## Layout System

### Spacing Primitives
Use Tailwind units: **2, 4, 6, 8, 12, 16** for consistent rhythm
- Component padding: p-6 to p-8
- Section spacing: space-y-6 to space-y-8
- Card gaps: gap-4 to gap-6
- Micro spacing: gap-2 for icons+text

### Grid Structure
- **Swap Interface**: Centered single column, max-w-2xl
- **Exchange Details**: 2-column grid on desktop (grid-cols-2), single column mobile
- **Side Panel**: max-w-md for status tracking/instructions

## Core Components

### Swap Card
- Centered vertical layout with generous padding (p-8)
- Currency selectors with network badges (when applicable)
- Large input fields with monospace amounts
- Swap direction button (centered, circular with icon)
- Real-time estimation display below inputs
- Prominent "Create Exchange" CTA at bottom

### Exchange Tracking View
- Two-column desktop layout (main card + status sidebar)
- **Main Card**: Deposit address (large monospace text), QR code, copy button, countdown timer
- **Status Sidebar**: Step-by-step progress tracker, transaction details, order ID
- Status badges with glowing effects for active states

### Currency Selector (Combobox)
- Search input at top with icon
- Scrollable list with currency icons + names
- Network badges for multi-network tokens (USDT, USDC)
- Hover states with subtle glow

### Status Indicators
- **Timer**: Large monospace countdown with clock icon, pulsing animation
- **Progress Steps**: Vertical timeline with checkmarks/spinners
- **Status Badge**: Pill-shaped with icon (waiting/confirming/exchanging/finished)

### Buttons
- Primary CTA: Large (h-12), full-width on mobile, bold text
- Copy buttons: Icon + text, medium size (h-10)
- Icon buttons: Circular, 40px diameter for swap direction

## Animations

**Minimal and Purposeful**:
- Countdown timer: Subtle pulse when under 5 minutes
- Status transitions: Gentle fade-in when status updates
- Copy confirmation: Checkmark icon transition
- Loading states: Simple spinner, no elaborate effects
- **NO** scroll animations, parallax, or decorative motion

## Technical Aesthetics

### Matrix/Cyber Elements
- Monospace everywhere for technical data (addresses, amounts, IDs)
- Grid patterns or subtle scan-line overlays in backgrounds
- Terminal-style borders (dashed or dotted for accent areas)
- Hexagonal or angular shapes for containers (optional accent)
- Glitch effect on main "ZK GHOST SWAP" title (subtle, static)

### Privacy Emphasis
- Minimal branding, no logos beyond ZK GHOST SWAP
- No user accounts, no personal data collection messaging
- "Anonymous Exchange" subheading
- Copy that emphasizes "No KYC", "Privacy-First", "Trustless"

## Images

### Hero Section
**No large hero image** - This is a functional swap interface, not a marketing page. Lead immediately with the swap card.

### Currency Icons
Use cryptocurrency icon libraries (e.g., cryptocurrency-icons CDN) for accurate, recognizable token logos in currency selectors.

### QR Code
Generate QR code for deposit address (use qrcode.react library or similar) displayed prominently in exchange view.

### Background Treatment
Subtle grid pattern or matrix-style code rain effect (CSS/canvas background), very low opacity to not distract from interface.

## Component Enrichment

### Swap Page Header
- "ZK GHOST SWAP" title with gradient text effect
- Tagline: "Privacy-First Asset Swapping"
- Network status indicator (subtle)

### Footer Elements
- Powered by ChangeNOW (small attribution)
- Security notice: "Non-custodial • Trustless • Anonymous"
- Link to order tracking (if user has order ID)

### Form Enhancements
- Real-time validation with inline error states
- Network fee warnings when applicable
- Estimated time display from API response
- Min/max amount hints below inputs

### Exchange View Additions
- Copy success toast notifications
- Status explanation tooltips
- Support contact (minimal, icon-based)
- "Create New Exchange" button when finished

## Accessibility
- Maintain WCAG AA contrast ratios despite dark theme
- Monospace text at minimum 14px for readability
- Clear focus states with outline glow
- Icon buttons include aria-labels
- Status updates announced to screen readers