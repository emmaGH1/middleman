# Atomic mint security boundary

Emma approved DemoPass-only atomic minting, with resale risk disclosed. This supersedes the withdrawal/deposit sequence in the original brief.

## Value flow

1. Either party proposes immutable terms; only the other party can accept.
2. The funder deposits the collection's fixed mint cost and the holder deposits agreed collateral. Either order works. Zero collateral is allowed only if the sale price covers principal.
3. Only the holder can call `mintAndLock` before the deadline. Middleman temporarily approves exactly the mint cost to its immutable DemoPass, which checks the holder's allowlist eligibility, collects payment and mints directly into escrow. The approval is cleared and ownership checked in the same transaction. Any failure rolls everything back. There is no withdrawal or arbitrary call target.
4. A buyer pays the immutable sale price. The NFT transfers and both payouts execute atomically. Above cost, the funder receives principal plus their share of profit, rounded down to a USDC base unit; the holder receives the rest and collateral. Below cost, collateral covers the entire shortfall. Uncovered sale terms are rejected at proposal.
5. At/after the deadline, an unminted fully funded deal refunds principal plus collateral to the funder. Incomplete funding returns each actual deposit to its owner; an unfunded counterparty cannot steal collateral. Either party can execute this deterministic timeout.

Before full funding either party may cancel and deposits are returned. After full funding, both parties must consent to cancellation. Pending cancellation is not a mint freeze; minting consumes the vote state. After mint, there is no cancellation or deadline refund: the NFT stays listed until purchased. One eligible mint per holder, even across multiple deals; holders must not double-commit their whitelist.

## What this does NOT promise

- No guaranteed buyer, liquidity, yield, NFT value, or cash refund after a successful mint. Capital and collateral may remain locked indefinitely if no buyer appears. No mutable sale price or emergency rescue exists.
- No support for arbitrary NFT collections or EOA-only whitelist functions. Each Middleman deployment creates and permanently binds one non-upgradeable DemoPass. No user-supplied adapter can spend principal or forge custody.
- No audit. Do not use meaningful amounts before independent review.
- DemoPass has an owner for allowlist administration only. The immutable treasury receives mint revenue; neither the owner nor treasury can withdraw escrow assets, change the mint price, or seize NFTs. Allowlist revocation or a holder minting elsewhere can prevent escrow minting; fully funded timeout still awards collateral to the funder.
- Arc USDC blocking/pausing can make deposits or payouts revert. Direct atomic payouts can stall a deal if a recipient cannot receive USDC. Other deals do not reuse its reserved balances.
- ERC-721 receivers may reject a purchase; payment and state then revert. Never send assets directly to escrow: only the guarded safe-mint callback is accepted, and unsolicited ERC-20 or unsafe ERC-721 transfers have no recovery function.
- This implementation assumes the documented Arc USDC interface (6 decimals, no transfer fees). Native gas uses the same underlying balance at 18 decimals. Keep gas headroom and never add the two balances.

Compiler is pinned to Solidity 0.8.24, EVM `paris` (a conservative subset of Arc's documented Osaka baseline), with OpenZeppelin 5.0.2. Local Anvil/MockUSDC results do not prove Arc precompile behavior. Arc testnet execution must precede mainnet approval.

## Frontend and dependencies

Public deployments require an explicit Arc chain ID (`5042002` or `5042`), valid nonzero addresses and a numeric deployment block. Missing/unsupported network settings disable deployment reads and transactions instead of silently enabling testnet. Local Anvil requires the exact local opt-in flag and its own token address; Vercel rejects local/demo mode. RPC chain and contract bindings are checked separately before writes.

See [dependency risk review](DEPENDENCIES.md) for unresolved advisories. A passing build or contract suite does not resolve wallet-library vulnerabilities or prove browser-wallet behavior.
