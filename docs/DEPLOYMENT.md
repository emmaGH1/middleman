# Deployment runbook — approval required

Status: no public addresses or transaction hashes exist yet. Never substitute local Anvil addresses. Native and ERC-20 USDC are the same underlying balance on Arc (18 and 6 decimal interfaces respectively); leave headroom for gas. Reviewed official docs: https://docs.arc.io/arc/tutorials/deploy-on-arc and https://docs.arc.io/arc/tutorials/install-arc-foundry.

## 1. Testnet first

Use the current Arc Foundry toolchain from the official installation documentation. Ensure `~/.local/bin` is on `PATH`, then run `arc-forge test --network arc --match-contract MiddlemanTest -vv` in addition to generic EVM tests. Verify the RPC returns chain ID `5042002` and the documented USDC interface has code. Local successful tests alone are not a substitute for this gate.

Provision four funded testnet wallets through secure environment variables: `DEPLOYER_PK`, `HOLDER_PK`, `FUNDER_PK`, `BUYER_PK`. Never paste keys into chat, commands, logs, source, or Vercel. Use the Circle faucet at https://faucet.circle.com; faucet USDC has no monetary value. `Deploy.s.sol` defaults `MINT_PRICE` to `1_000_000` USDC atomic units, or 1 USDC at six decimals. `Flow.s.sol` sets collateral to one quarter of that amount and the sale price to three times it; at the default, the holder needs more than 0.25 USDC, the funder more than 1 USDC, and the buyer more than 3 USDC, plus USDC gas headroom. Set and export any `MINT_PRICE` override before deployment; it is a six-decimal atomic-unit integer, and the same value must be used for source verification. Holder/funder/buyer must be distinct; use a fresh holder per replay (DemoPass allows one mint per holder).

From the repo root with the keys provided securely to the process:

```sh
export MINT_PRICE="${MINT_PRICE:-1000000}"
make deploy-testnet
# Set MIDDLEMAN_ADDRESS to the confirmed deployed address, then:
make flow-testnet
```

Record deployment receipt, chain ID, block number, Middleman address, its `collection()` address, mint price and all scripted flow receipts. Verify `usdc()`, `DemoPass.escrow()`, `DemoPass.usdc()`, final deal status, buyer ownership, and actual USDC payouts on the live RPC. Account balance differences also include gas on Arc.

Verify source on Blockscout with the same compiler/optimizer settings:

```sh
# In a new shell, set MINT_PRICE to the exact deployed value (default: 1000000).
MINT_PRICE="${MINT_PRICE:-1000000}"
arc-forge verify-contract "$MIDDLEMAN_ADDRESS" src/Middleman.sol:Middleman \
  --chain-id 5042002 --verifier blockscout \
  --verifier-url https://explorer.testnet.arc.io/api/ \
  --constructor-args "$(arc-cast abi-encode 'constructor(address,uint256,address)' 0x3600000000000000000000000000000000000000 "$MINT_PRICE" "$DEPLOYER_ADDRESS")"
```

Run from `contracts/`. Also verify the internally created DemoPass with constructor `(address,uint256,address,address)` = USDC,mintPrice,deployer,Middleman. This is a documented command recipe, not a completed verification claim.

## 2. Human mainnet gate

**STOP after testnet results.** Obtain explicit approval and a funded mainnet deployer plus three burner wallets through the secret UI. Do not automatically reuse testnet keys or set `MAINNET_APPROVED=true`. Confirm the per-deal real-USDC budget, gas headroom, immutable mint price (default 1 USDC), DemoPass owner/treasury, unaudited-contract risk and unresolved dependency findings before proceeding.

Both Solidity scripts and Makefile reject mainnet without `MAINNET_APPROVED=true`. A flag alone is not human approval. After approval and live chain-ID verification for `5042`: `make deploy-mainnet`, source verification against the mainnet explorer, then `make flow-mainnet`. This script buys the NFT and moves actual funds; do not run it as a harmless smoke test.

## 3. Frontend / Vercel

Set public variables only: `NEXT_PUBLIC_ARC_CHAIN_ID`, `NEXT_PUBLIC_MIDDLEMAN_ADDRESS`, `NEXT_PUBLIC_DEPLOYMENT_BLOCK`, optionally `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`. The app validates the escrow/collection/USDC binding against the RPC before enabling writes. Local/demo flags are rejected on Vercel builds. Never deploy burner keys or injected local testing providers.

Only publish a live-mainnet label after confirmed deployment and end-to-end receipts. Record the addresses in this document and in the frontend environment; never invent an explorer link. Complete a two-clean-run live UI demo and recording after the mainnet gate, using isolated burner-wallet configuration; local recordings are not a substitute. Do not submit the hackathon entry.
