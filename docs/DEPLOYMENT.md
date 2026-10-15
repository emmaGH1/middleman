# Deployment runbook — approval required

Status: Arc mainnet **deployment only** is complete, with a 0.01-USDC immutable mint price. Both contracts show exact-match source verification via Blockscout Bytecode Database; no mainnet deal was run. Testnet deployment, scripted/browser settlement and source verification are complete; see [addresses and receipts](DEPLOYMENTS.md). Never substitute testnet or local Anvil addresses for mainnet settlement evidence. Native and ERC-20 USDC are the same underlying balance on Arc (18 and 6 decimal interfaces respectively); leave headroom for gas. Reviewed official docs: https://docs.arc.io/arc/tutorials/deploy-on-arc and https://docs.arc.io/arc/tutorials/install-arc-foundry.

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

Run from `contracts/`. Also verify the internally created DemoPass with constructor `(address,uint256,address,address)` = USDC,mintPrice,deployer,Middleman. Both verifications completed with `Pass - Verified` for the testnet addresses in `DEPLOYMENTS.md`; repeat verification for any new deployment.

## 2. Human mainnet gate

**Deployment-only approval was granted and consumed for the recorded deployment.** The approved fee cap was 0.25 USDC, mint price 0.01 USDC, and fresh deployer was the agreed DemoPass owner/treasury. No additional deployment or funded flow is authorized by that approval. Obtain new explicit approval for further spending. A funded mainnet flow additionally needs three separate role wallets, a per-deal budget and risk acknowledgement. Do not reuse testnet keys or automatically set `MAINNET_APPROVED=true`.

Both Solidity scripts and Makefile reject mainnet without `MAINNET_APPROVED=true`. A flag alone is not human approval. The existing deployment must not be repeated automatically. `make flow-mainnet` buys the NFT and moves real funds; it is outside the consumed deployment-only approval and must not be run as a harmless smoke test.

## 3. Frontend / Vercel

Live: **https://trymiddlemanonarc.vercel.app**. Project: `emmagh1s-projects/trymiddlemanonarc` (Hobby), Next.js preset, Node 24.x, web-directory CLI deployment. The initial production release was built from `ddfed84`. No Git auto-deploy integration has been configured.

Production public configuration:

```env
NEXT_PUBLIC_ARC_CHAIN_ID=5042
NEXT_PUBLIC_MIDDLEMAN_ADDRESS=0x18f7407d76429f66a5a977eac0a71cbc9fe05036
NEXT_PUBLIC_DEPLOYMENT_BLOCK=26090372
NEXT_PUBLIC_LOCAL_CHAIN=0
NEXT_PUBLIC_DEMO_CONNECTOR=0
```

Hosted read-only checks passed on desktop/mobile: public HTTP 200, confirmed deployment notice and addresses, 0.01-USDC mint price, no page errors or mobile overflow. No funded mainnet flow was attempted. `.vercelignore` excludes environment files; the deployment input review contained no credential files.

Set public variables only: `NEXT_PUBLIC_ARC_CHAIN_ID`, `NEXT_PUBLIC_MIDDLEMAN_ADDRESS`, `NEXT_PUBLIC_DEPLOYMENT_BLOCK`, optionally `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID`. The app validates the escrow/collection/USDC binding against the RPC before enabling writes. Local/demo flags are rejected on Vercel builds. Never deploy burner keys or injected local testing providers.

The approved low-cost release publishes actual mainnet addresses with an explicit **deployment only / end-to-end testing on testnet** disclosure. Never claim a verified mainnet flow without its own receipts. Any future funded mainnet validation requires separate approval and isolated role wallets; local or testnet recordings are not a substitute. Do not submit or amend the grant/hackathon entry.
