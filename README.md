# Middleman

The contract in between the wallet with a whitelist spot and the wallet with USDC.

**Deployed and script-tested on Arc testnet. Not deployed on mainnet. Not audited. Do not send real funds.**

Middleman is a DemoPass-only USDC escrow. A whitelist holder and funder agree immutable terms, deposit collateral and principal, then mint the NFT directly into escrow. Payment and custody succeed in the same transaction or both revert. A fixed-price purchase transfers the NFT and settles the split automatically.

**Non-delivery protection is not an investment guarantee.** After a successful mint the principal has purchased an NFT. There is no deadline refund, repricing, or guaranteed buyer; the NFT and collateral can remain locked indefinitely. Before minting, fully funded non-delivery pays principal plus collateral to the funder. Partial-funding refunds and cancellation return each party’s own deposit. See [security and financial rules](docs/SECURITY.md).

## What is real today

- Solidity `Middleman` / `DemoPass`, OpenZeppelin, no escrow admin or platform fee.
- 16 contract tests, including atomic rollback, custody, timeout, cancellation and 1,000 payout fuzz cases.
- Next.js routes `/deals`, `/deals/new`, `/deals/[id]`, `/mint` with wagmi/viem, RainbowKit, deployment binding checks, simulation and confirmed receipts.
- Two clean local production-browser sale runs, plus a recorded third run, against real contracts on Anvil with test USDC. These are not Arc transactions or a mainnet demo.
- Arc testnet deployment and ten-transaction scripted flow completed: deal 1 sold, NFT delivered to buyer, payouts and gas-adjusted balance changes verified against RPC. Both contracts are source-verified. Mainnet and the submission demo remain pending.

## Verified Arc testnet deployment

- [Middleman escrow](https://explorer.testnet.arc.io/address/0x15C72Ed9a299c69eB1F216ce56710498Cc5Ff8e7)
- [DemoPass](https://explorer.testnet.arc.io/address/0xd792097E69c7846c50144B9De5559f2a7FE7FA3b)
- [Deployment transaction](https://explorer.testnet.arc.io/tx/0x0bbc97a9ad1d8f376dbd3aa1223b4fc7a7417eeef7f033983e5ec2bd50f0b8b5)
- [Completed sale](https://explorer.testnet.arc.io/tx/0xd12be1028a3e6b1c1274727d57023177cdf40b4597a5f9205a6eb3983b1ef562)

See [deployment evidence](docs/DEPLOYMENTS.md) for the full receipt list, amounts and verification boundaries. These are **testnet**, not proof of a mainnet deployment.

## Local development

```sh
cd web
npm install
npm run dev
```

Open `/` for the landing page and `/deals/new` for agreement creation. Without public deployment configuration, transactions are disabled. Copy `web/.env.example` to `web/.env.local` to use the verified testnet deployment, then restart/rebuild. Never put private keys in any web environment. The historical `/deals/probe` remains explicitly labelled non-live.

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

No mainnet or Vercel deployment exists yet. The public-chain flow was executed by scripts, not browser-wallet confirmations. Dependency audit findings remain in the wallet/ESLint trees (see current state); there is no independent contract audit. Resolve/review these before considering real funds. Mainnet requires separate human approval and credentials; testnet receipts do not satisfy a mainnet-only submission requirement.
