# DEVIN — MIDDLEMAN · Arc Microgrants · UNATTENDED SPRINT

Mode: Unattended sprint (playbook Mode C) using the hackathon-playbook rules. The concept is APPROVED. Do NOT do ideation.
Hard time box: 5h 15m of work, then STOP and hand off. The human submits.
Use Fusion. Do not loop on blind retries: after 2 different failed fixes, take the smaller fallback and write it down.
Commit and push to `main` every ~30 minutes with clear messages. Never commit secrets or private keys.

## 0. What we are building
**Middleman** is trustless USDC escrow for NFT whitelist deals on Arc mainnet.
Problem: Wallet A has a whitelist spot but no money. Wallet B has the money but no spot. Today B just sends funds to a stranger and hopes.
Middleman: both wallets sign one on-chain deal. The funder's money and the holder's collateral get locked. The minted NFT is held in escrow. When the NFT sells, the proceeds are split automatically. If the holder never delivers, the funder gets the mint money back plus the holder's collateral.

Grant rules: deployed and working on **Arc MAINNET**, public GitHub repo, not testnet-only, not a mockup.

## 1. Arc facts — VERIFY FIRST (docs.arc.network / docs.arc.io)
Before writing code, confirm these and record them in `docs/ARC.md`:
- mainnet chain ID, RPC URL, explorer URL; testnet chain ID/RPC/faucet
- USDC is the native gas token. Find the USDC ERC-20 interface address on mainnet and testnet, and its decimals. The native balance and the ERC-20 balance may use different decimals; write down which is which.
- any EVM quirks (Prague/Osaka opcodes? required solc version / evm_version)
If you can't find something, stop and write the blocker in `docs/CURRENT_STATE.md`. Don't guess.

## 2. Contracts (Foundry, Solidity ^0.8.24, OpenZeppelin)
`src/Middleman.sol` — one contract holding many deals. USDC is moved by ERC-20 `transferFrom`.
```
struct Deal {
  address holder;        // has whitelist
  address funder;        // provides liquidity
  address nft;           // collection address
  uint256 tokenId;       // set on deposit
  uint256 mintCost;      // USDC funder locks
  uint256 collateral;    // USDC holder locks
  uint16  funderBps;     // funder share of sale profit (0-10000)
  uint64  deliverBy;     // deadline to deposit NFT
  uint256 salePrice;     // fixed list price set at creation (can be updated by mutual sign)
  Status  status;        // Proposed, Active, Funded, NFTLocked, Sold, Refunded, Cancelled
}
```
Flow and functions:
1. `propose(...)` holder OR funder creates the terms → Proposed
2. `accept(id)` the counterparty agrees → Active (both wallets have signed on-chain)
3. `fund(id)` funder deposits `mintCost`; `postCollateral(id)` holder deposits `collateral`. When both are in → Funded
4. `withdrawMintFunds(id)` holder pulls `mintCost` so they can mint (allowed only when Funded)
5. `depositNFT(id, tokenId)` holder transfers the NFT in (`IERC721Receiver`) before `deliverBy` → NFTLocked
6. `buy(id)` anyone pays `salePrice` → NFT goes to the buyer, then the payout runs. Funder gets `mintCost` back first. The profit (salePrice − mintCost) is split by `funderBps`. Holder gets the rest plus their collateral back. If salePrice < mintCost, the funder gets everything up to mintCost and the holder covers the shortfall from collateral first.
7. `claimRefund(id)` funder, after `deliverBy` with no NFT → funder gets the collateral (and the mintCost if it's still in the contract) → Refunded
8. `cancel(id)` before Funded: either party; after Funded: only if BOTH have called `agreeCancel` → everything returned → Cancelled
9. `agreeRelease(id)` both agree → NFT goes to the holder, the holder repays mintCost + funder share at the list price… CUT this if you're short on time.
- Events for every state change. Use ReentrancyGuard and SafeERC20. No admin, no owner, no upgradeability, no fees.

`src/DemoPass.sol` — a tiny whitelist NFT so the demo is real on Arc: owner sets the allowlist, `mint()` costs X USDC (ERC-20), and only allowlisted wallets can mint. Simple text-only `tokenURI` that returns an ASCII-art SVG.

Tests (`forge test`) must cover: happy path through buy+split, refund after deadline, mutual cancel, a non-party being blocked, double-withdraw blocked, and the salePrice<mintCost case. Fuzz the split math. All tests green before deploy.

## 3. Deploy (HUMAN GATE)
- Deploy both to Arc TESTNET first and run the full flow with scripts (`script/Flow.s.sol`).
- **STOP**, then ask the human for: the mainnet deployer key (provided by env var `DEPLOYER_PK` only) and 3 burner wallets (HOLDER, FUNDER, BUYER) funded with small USDC. Then deploy to MAINNET and verify the contracts on the explorer.
- Record the addresses + tx hashes in `docs/DEPLOYMENTS.md` and `web/src/config/contracts.ts`.
- If the human hasn't replied by T+3h, keep building against testnet and leave the mainnet deploy as a one-command script: `make deploy-mainnet`.

## 4. Web app
Next.js (App Router) + TypeScript + Tailwind + REAL shadcn/ui primitives + wagmi/viem + RainbowKit or ConnectKit (whichever has the least friction with a custom chain). Add the Arc chain via viem `defineChain`. Deploy to Vercel.
Routes:
- `/` landing page (the poster) — see Design
- `/deals/new` create deal: counterparty address, NFT collection, mint cost, collateral, split slider, deadline, list price. A live plain-language preview: "FUNDER puts in 100 USDC. HOLDER puts in 25 USDC collateral. On sale at 300: funder gets 200, holder gets 125."
- `/deals/[id]` the core screen: an ASCII state machine timeline PROPOSED → ACTIVE → FUNDED → NFT LOCKED → SOLD, with the current state highlighted. It shows only the actions the connected wallet can take, plus balances held in escrow, and every tx linked to the explorer.
- `/deals` my deals (read from events/contract)
- `/mint` DemoPass mint page (for the demo whitelist)
All data comes from the chain. No fake numbers, no fake activity, no mock "live" states.

## 5. Design — black & white ASCII, modern, zero slop
Human-provided inspiration: `design/inspo/` (USE THESE — study them first and write `docs/DESIGN.md` with: 3–5 adjectives, type, grid, motif, components).
Direction:
- Pure #000 / #FFF. Allowed: one gray for secondary text, and red ONLY for error/refund states. No gradients, glow, glass, blobs, shadows, or pulsing dots.
- Type: one monospace (e.g. JetBrains Mono / IBM Plex Mono / Departure Mono) plus one sharp grotesk for big headlines (e.g. Inter Tight / Neue Haas alternative / Geist). At most 2 families.
- Motif: ASCII art is the product language, not decoration. Two wallets drawn in ASCII with a vault "[ MIDDLEMAN ]" between them. Value moving through it is shown as animated ASCII characters along the lines. The deal state machine and the progress bars are ASCII (`[████░░░░]`). Use box-drawing borders.
- Square corners (radius 0–2px), 1px rules, strong grid, generous whitespace, left-aligned layout, no endless card grids.
- Landing first fold: a big headline ("Don't trust strangers. Trust the contract." — refine it), the ASCII wallet↔vault↔wallet diagram animating, ONE primary CTA "Start a deal", a small "Live on Arc mainnet" line with the contract address linked to the explorer (real). Below the fold: a 3-step how-it-works drawn as ASCII, then the footer. That's it.
- Make it readable at 1440×900 for recording. Keep it responsive down to mobile.
- Before propagating the UI: build the landing page + deal page probe, take screenshots, and save them to `docs/screens/`. Run the AI-slop lint from the playbook and fix anything it flags. (Unattended: continue after self-review; the human reviews the screenshots later.)

## 6. Demo video (Devin produces it)
The demo must use the LIVE site look and the REAL contracts — same build, same deployed addresses.
- `demo/run-demo.ts` Playwright, 1440×900, recordVideo on. For wallet signing, use a wagmi `mock`/private-key connector that is ONLY enabled when `NEXT_PUBLIC_DEMO_CONNECTOR=1` in a LOCAL production build (`next build && next start`) pointing at mainnet contracts. Never deploy burner keys to Vercel. Switching between HOLDER/FUNDER/BUYER = a reload with a different key (show the address change on screen).
- Judge story (~75–90s):
  1. 0–8s landing page, ASCII diagram animating, the problem in one line
  2. HOLDER creates a deal (100 USDC mint, 25 collateral, 60/40 split, list 300)
  3. FUNDER accepts + funds → ASCII coins flow into the vault
  4. HOLDER posts collateral, withdraws mint funds, mints DemoPass (whitelisted), deposits the NFT → state NFT LOCKED
  5. BUYER buys → **demo moment:** the vault splits, and the ASCII animation sends USDC to both wallets with exact amounts
  6. Explorer tab: real Arc mainnet txs
  7. Close: "Middleman — trustless whitelist deals on Arc." plus the URL
- Pacing per the playbook: wait on real tx receipts, not sleeps; pause on reveals; cursor out of the way. Fill confirmation waits with an on-screen ASCII caption.
- Captions: burned-in monospace captions, black bars, white text (no TTS unless the human provides an ElevenLabs key). Assemble with ffmpeg → `demo/middleman-demo.mp4` (1080p, <3 min). Also export one 1440×900 landing screenshot as `docs/cover.png`.
- `demo/reset-demo.ts` creates fresh state (a new deal id). Get 2 clean runs before the final recording.
- Mainnet gas/USDC: the demo uses small amounts (scale down to e.g. 1 / 0.25 / 3 USDC if the burners are low). Never spend more than the burners hold, and never touch other funds.

## 7. Repo + handoff
README: the problem, how it works (ASCII diagram), mainnet addresses + explorer links, live URL, demo video link, local setup, test command, the security notes and limits (no audit, fixed-price sale only).
`docs/CURRENT_STATE.md` is always up to date: done / not done / blockers / exact next commands.
Final STOP condition: tests green, mainnet deployed (or one-command ready), Vercel live, demo mp4 rendered, README complete. Then write the grant submission text draft in `docs/SUBMISSION.md`. DO NOT submit.

## 8. Timeline (hard)
- T+0:00–0:20 verify Arc facts, scaffold the monorepo (`contracts/`, `web/`, `demo/`), read the inspo
- T+0:20–1:30 contracts + tests → testnet deploy + scripted flow
- T+1:30–2:00 design probe (landing + deal page) and screenshots
- T+2:00–3:15 full web flow wired to testnet, Vercel deployed
- T+3:15–3:45 mainnet deploy (human gate), switch config, verify
- T+3:45–4:45 demo runner, recording, captions, mp4
- T+4:45–5:15 README, SUBMISSION.md, final push, handoff
Cut order if behind: agreeRelease → /deals list → mobile polish → animated ASCII flow (keep it static) → captions polish. NEVER cut: the mainnet deploy, the real deal page flow, tests.
