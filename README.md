# XRPL Stablecoin Portal

A full-featured web portal for issuing, managing, and exchanging fiat-backed stablecoins on the [XRP Ledger](https://xrpl.org). The system bridges traditional banking with decentralized ledger technology, enabling seamless conversion between fiat currency (JPY) and XRPL-based tokens.

## Overview

The portal consists of two independent applications within a single monorepo:

- **Token Portal** — End-user facing. Manage XRPL wallets, deposit/withdraw funds, exchange between fiat and stablecoins, and track transaction history.
- **Bank Portal** — Bank operator facing. Handle account management, ATM operations, inter-account transfers, and virtual account provisioning.

Both applications share a common design system and communicate with their respective backend services through a unified REST API layer.

## Architecture

```text
xrpl-stablecoin-portal/
├── sites/
│   ├── token/          # Token Portal (end-user)
│   └── bank/           # Bank Portal (operator)
├── packages/
│   └── shared/         # Shared library
├── cloudbuild.yaml     # GCP Cloud Build pipeline
└── firebase.json       # Firebase Hosting config
```

**Monorepo** managed by pnpm workspaces. Each site is an independent Vite application with its own build pipeline, deployed to separate Firebase Hosting targets via Google Cloud Build.

## Token Portal

### Wallet & Trust Lines

Users are assigned a custodial XRPL wallet on registration. Before receiving any stablecoin, an [XRPL TrustLine](https://xrpl.org/docs/concepts/tokens/fungible-tokens#trust-lines) must be established between the user's wallet and the token issuer — this is handled with a single click from the dashboard.

### Fiat On/Off-Ramp

- **Deposit**: Each user receives a dedicated virtual bank account. JPY transferred to this account is credited to the user's fiat balance in the system.
- **Withdrawal**: Withdraw JPY to any whitelisted bank account. Requires MFA verification and KYC approval.

### XRPL Token Operations

- **Deposit**: Display wallet address and QR code for receiving tokens from external XRPL wallets.
- **Withdrawal**: Send tokens to whitelisted XRPL addresses. All outbound transactions reference an on-ledger transaction hash linked to the XRPL explorer.
- **Exchange**: Bi-directional conversion between fiat (JPY) and stablecoins. Exchange orders are tracked through a state machine (`pending → debited/burned → completed`).

### Security & Compliance

| Layer | Implementation |
| - | - |
| **Authentication** | Firebase Authentication with Google OAuth |
| **MFA** | TOTP-based (Google Authenticator compatible). Required at login if enrolled, and on-demand for sensitive operations (withdrawals, whitelist changes) via short-lived MFA tokens |
| **KYC** | Identity verification with Japanese address validation (postal code auto-lookup via zipcloud API), phone verification, and full-width character validation |
| **Whitelist** | Both bank accounts and XRPL addresses must be pre-approved before they can be used as withdrawal destinations. Adding/removing entries requires MFA |

### Internationalization

Four languages (Japanese (default), English, Chinese, Korean) supported with a custom i18n provider.

## Bank Portal

A traditional banking interface for account operations:

- **Account Management** — Registration, login (branch code + account number + PIN), profile settings
- **ATM** — Cash deposit and withdrawal with PIN verification and real-time balance updates
- **Transfers** — Inter-account bank transfers with recipient lookup and three-step confirmation flow
- **Virtual Accounts** — Corporate accounts can provision virtual sub-accounts for tracking deposits from multiple sources
- **Transaction History** — Full audit trail with running balances, counterparty details, and sequence numbers

## Tech Stack

| Category | Technology |
| - | - |
| Framework | React 19, TypeScript 6 |
| Build | Vite 8, pnpm workspaces |
| Styling | Tailwind CSS 4, Radix UI, shadcn/ui |
| Auth | Firebase Authentication (OAuth + TOTP MFA) |
| Blockchain | XRP Ledger (Testnet / Devnet / Mainnet) |
| Routing | React Router v7 |
| Linting | ESLint 10, Prettier 3 |
| Deployment | Firebase Hosting, Google Cloud Build |
| Utilities | qrcode.react, input-otp, ripple-address-codec, lucide-react |

## License

[MIT](LICENSE)
