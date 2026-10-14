# Middleman

The contract in between the wallet with a whitelist spot and the wallet with USDC.

**Implemented and locally tested. Not deployed on Arc. Not audited. Do not send real funds.**

Middleman is a DemoPass-only USDC escrow. A whitelist holder and funder agree immutable terms, deposit collateral and principal, then mint the NFT directly into escrow. Payment and custody succeed in the same transaction or both revert. A fixed-price purchase transfers the NFT and settles the split automatically.

**Non-delivery protection is not an investment guarantee.** After a successful mint the principal has purchased an NFT. There is no deadline refund, repricing, or guaranteed buyer; the NFT and collateral can remain locked indefinitely. Before minting, fully funded non-delivery pays principal plus collateral to the funder. Partial-funding refunds and cancellation return each party’s own deposit. See [security and financial rules](docs/SECURITY.md).

## What is real today

- Solidity `Middleman` / `DemoPass`, OpenZeppelin, no escrow admin or platform fee.
- 16 contract tests, including atomic rollback, custody, timeout, cancellation and 1,000 payout fuzz cases.
- Next.js routes `/deals`, `/deals/new`, `/deals/[id]`, `/mint` with wagmi/viem, RainbowKit, deployment binding checks, simulation and confirmed receipts.
- Two clean local production-browser sale runs, plus a recorded third run, against real contracts on Anvil with test USDC. These are not Arc transactions or a mainnet demo.
- Arc-aware deployment and scripted flow, with an explicit mainnet approval gate. Public deployment and the submission demo remain pending.

## Local development

```sh
cd web
npm install
npm run dev
```

Open `/` for the landing page and `/deals/new` for agreement creation. Without public deployment configuration, transactions are disabled. Copy `web/.env.example` to `web/.env.local` only when verified contract addresses and deployment block are available. Never put private keys in any web environment. The historical `/deals/probe` remains explicitly labelled non-live.

```sh
npm run test
npm run check:abi # first compile contracts with forge build
npm run lint
npm run typecheck
npm run build
```

Contract setup and exact verification commands are in [current state](docs/CURRENT_STATE.md). Deployment/funding gates are in [deployment runbook](docs/DEPLOYMENT.md). The [design rationale](docs/DESIGN.md) records the reference-led monochrome typography and ASCII vault direction.

## Example split (not live balances)

100 USDC principal + 25 collateral; sale at 300; funder gets 60% of the 200 profit. On sale: funder220, holder105 including collateral. If a fully funded deal times out before minting: funder125, holder0. If both cancel before minting: funder100, holder25.

## Release blockers

No Arc testnet/mainnet or Vercel deployment exists yet. Local Anvil does not reproduce native-USDC gas behavior or validate real wallet confirmations. Dependency audit findings remain in the wallet/ESLint trees (see current state); there is no independent contract audit. Resolve/review these before considering real funds. No hackathon submission has been made.
