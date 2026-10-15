# Middleman

**One wallet has the spot. Another has the funds. Middleman makes the deal.**

Getting an NFT mint allowlist spot does not always mean having the money to mint. Someone else might have the funds but no access. Working together should be simple, except neither party wants to send money or an NFT to a stranger and hope for the best.

Middleman explores a different arrangement: agree on the terms first, escrow the funds in USDC, mint into smart-contract custody, then distribute the proceeds of a fixed-price NFT sale according to the agreed split. The whitelist holder contributes eligibility; the funder contributes capital. Neither has to personally hold the other's contribution during the deal.

**Current scope:** this is an Arc-based proof of concept using its own **DemoPass** allowlist NFT collection, *not* a general-purpose escrow for third-party NFT drops. Both contracts are deployed and source-verified on **Arc mainnet**. Complete mint-to-sale settlement has been demonstrated on **Arc testnet only**; **no funded mainnet deal has been executed**. Contracts are unaudited.

![Middleman homepage](docs/homepage.png)

## Links and proof

- **[Open Middleman](https://trymiddlemanonarc.vercel.app)** — live frontend configured for Arc mainnet; mainnet deployment demonstration, not a completed mainnet deal.
- **[Launch post on X](https://x.com/_HEISEMMA/status/2110807103602352554)** — introduction from the builder.
- **[Mainnet deployment receipt](https://explorer.arc.io/tx/0x57a9677d2613a7e1fcf6f28381ff08256245b46c03f2f8d63b518269e3f7d6d6)** — contract creation on Arc mainnet.
- **[Testnet sale receipt](https://explorer.testnet.arc.io/tx/0x702548496f0668b165de00ef396c79659de358af0aa07cbd4affda168a2591bd)** — wallet-driven NFT purchase and settlement on Arc testnet.
- **[Deployment evidence](docs/DEPLOYMENTS.md)** · **[Security and financial rules](docs/SECURITY.md)** · **[Design rationale](docs/DESIGN.md)**

## How a deal works

1. **Propose:** set the allowlisted holder, funder, collateral, deadlines, fixed sale price and profit split.
2. **Accept:** the counterparty agrees to the same immutable onchain terms.
3. **Fund:** the funder deposits USDC; the holder posts collateral.
4. **Mint atomically:** the escrow pays DemoPass and receives the NFT in the same transaction. If payment or delivery fails, the transaction reverts; the holder cannot withdraw the funder's principal.
5. **Purchase:** a buyer pays the pre-agreed USDC price and receives the NFT.
6. **Settle:** the contract returns the funder's principal and distributes the remaining proceeds and collateral under the agreed rules.

**Why Arc?** USDC is both the escrow asset and native gas currency: no separate volatile gas token is needed. Deals, NFT custody and settlement receipts are inspectable on Arc. Native gas accounting uses 18 decimals; the ERC-20 USDC interface uses 6 decimals, backed by the same balance.

## Arc mainnet deployment

| Item | Arc mainnet · chain `5042` |
| --- | --- |
| Middleman | [`0x18f7407d76429f66a5a977eac0a71cbc9fe05036`](https://explorer.arc.io/address/0x18f7407d76429f66a5a977eac0a71cbc9fe05036) |
| DemoPass | [`0xEdD3cBF58B797B2d4bc06e62C1cFbD42e4BaD229`](https://explorer.arc.io/address/0xEdD3cBF58B797B2d4bc06e62C1cFbD42e4BaD229) |
| Deployment date | October 15, 2026 (after the Microgrants submission deadline) |
| Deployment block | `26090372` |
| Immutable DemoPass mint price | **0.01 USDC** |
| Creation fee, both contracts | **0.074113725 USDC** |
| Checks completed | Successful receipt; code and USDC/collection/escrow/owner/treasury/price bindings read back from RPC |
| Source verification | Both contracts: exact match via Blockscout Bytecode Database |
| Not performed | Complete funded mainnet deal validation |

[Full deployment evidence](docs/DEPLOYMENTS.md) · [Raw mainnet receipt/configuration](docs/MAINNET_DEPLOYMENT.json)

## Validation and testing

- **20 contract tests**, including 1,000 payout fuzz cases, passed with standard and Arc Foundry. Covers payment/payout/refund rollback, custody, timeout, cancellation and reentrancy.
- **Arc testnet:** source-verified contracts, one scripted settlement and a separate complete real-Rabby-wallet UI sale. The latter paid 2.20 test USDC to the funder and 1.05 to the holder, delivered the NFT to the buyer and left zero escrow reserves.
- **8 web tests** cover amounts and fail-closed deployment configuration. ABI checks, lint, typecheck and production build are release checks.
- Rabby could not simulate the custom-network calls; signer, destination and calldata were checked before signing. Other wallets and public-chain refund/failure paths remain unverified.

## Limits and risks

V1 supports **DemoPass only**, not arbitrary third-party collections or real-world whitelist transfers. DemoPass eligibility is managed by its owner. The escrow has no administrator and charges no platform fee. This prototype does not establish a safe way to trade whitelist access for external projects.

Atomic minting protects against **non-delivery, not investment losses**. After minting, principal has bought an NFT: no guaranteed buyer, repricing or deadline refund exists. The NFT and collateral can remain locked indefinitely. Before minting, timeout/cancellation outcomes depend on funding state; see [financial and security rules](docs/SECURITY.md).

**No independent audit.** The last dependency review found 27 unresolved advisories (5 high, 22 moderate); see [dependency disclosure](docs/DEPENDENCIES.md). USDC restrictions can prevent transfers. **Do not treat this prototype as production-ready or send meaningful funds to the contracts.** Mainnet deployment is not a claim of grant eligibility or acceptance.

## Run locally

```sh
cd web
npm ci
cp .env.example .env.local # public TESTNET settings only
npm run dev
```

Routes: `/` · `/deals` · `/deals/new` · `/deals/[id]` · `/mint`. Missing deployment settings disable transactions. Never place private keys in frontend or Vercel variables.

```sh
# contracts/ — install the pinned toolchain/dependencies from the runbook first
forge test
arc-forge test --network arc --match-contract MiddlemanTest -vv

# web/ — after compiling contracts
npm run test
npm run check:abi
npm run lint
npm run typecheck
npm run build
```

Built with Solidity, OpenZeppelin, Foundry, Next.js, TypeScript, shadcn/ui, wagmi, viem and RainbowKit.

**Builder:** [@_HEISEMMA](https://x.com/_HEISEMMA) · [GitHub](https://github.com/emmaGH1)

[Deployment runbook](docs/DEPLOYMENT.md) · [Current state and setup](docs/CURRENT_STATE.md) · [Design rationale](docs/DESIGN.md)
