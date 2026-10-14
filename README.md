# Middleman

The contract in between the wallet with a whitelist spot and the wallet with USDC.

**Current deliverable: a landing-page and deal-page design probe. Not deployed. Not audited. No deposits accepted.**

The intended product agrees terms onchain, escrows collateral and the minted NFT, and splits a fixed-price sale. The refund model needs resolution before smart-contract implementation: principal withdrawn for a mint cannot also remain protected in escrow.

## Local development

```sh
cd web
npm install
npm run dev
```

Open `/` for the landing page and `/deals/probe` for the clearly labelled contract-screen layout. No wallet or chain credentials are needed.

```sh
npm run lint
npm run typecheck
npm run build
```

See `docs/DESIGN.md` for the design rationale and `docs/CURRENT_STATE.md` for boundaries and blockers.
