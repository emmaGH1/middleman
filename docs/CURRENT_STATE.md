# Current state

## Latest release — October 15, 2026

**Mainnet deployment only is complete.** Explicit approval covered one deployment with a 0.25-USDC fee cap, 0.01-USDC mint price and a fresh deployer as DemoPass owner/treasury, with audit/dependency/resale risks acknowledged. Actual fee: 0.074113725 USDC. See [DEPLOYMENTS.md](DEPLOYMENTS.md) and [MAINNET_DEPLOYMENT.json](MAINNET_DEPLOYMENT.json) for the actual addresses, receipt and confirmed bindings. Both mainnet contracts now show exact-match source verification via Blockscout Bytecode Database, confirmed in the live browser. The earlier CLI/API requests were challenged by Cloudflare; no successful CLI submission is claimed. No mainnet deal, mint or purchase was run, and no further mainnet spending is authorized.

The frontend is live at **https://trymiddlemanonarc.vercel.app**, under `emmagh1s-projects/trymiddlemanonarc` on Vercel Hobby. Production deployment `dpl_GTCV1TbKF3993qY3kb96715BUp2a` built from `ddfed84` passed and received the requested alias. Only five public configuration variables were added; local/demo flags are zero and environment files are excluded from uploads. Unauthenticated HTTP returned 200. Hosted desktop/mobile read-only checks confirmed the mainnet deployment notice, correct addresses, 0.01-USDC mint price, no page errors and no mobile overflow. No wallet connection, signature or mainnet transaction was performed during those checks.

Navigation and CTA refinements preserve the monochrome ASCII-vault identity. The mainnet app explicitly separates deployment checks from testnet-only end-to-end validation. The release passed eight web tests, ABI consistency, lint, typecheck and a production build with isolated public mainnet configuration. The Vercel build also passed. No repository CI workflow is configured.

The 90–120-second founder demo remains pending final narration approval: 1080p, clean Mac frame, clearly labelled testnet interaction, owned `my voice` clone with account-available ElevenLabs v4, free licensed quiet music, one-line subtitles below the app. No grant submission or amendment is authorized.

The sections below retain the historical verification record; earlier test counts and gates describe those revisions, not new spending approval.

## Done
- Read the user brief and three visual references. Repository was empty.
- Checked current Arc docs; legacy `.network` / Markdown views can return older testnet-only content while current `.io` HTML documents mainnet.
- Deployed Middleman and its DemoPass on Arc testnet and source-verified both on Blockscout. Completed the ten-transaction scripted happy path and independently checked receipts, historical NFT custody, settlement and gas-adjusted balances. Exact public evidence is in [DEPLOYMENTS.md](DEPLOYMENTS.md) and [DEPLOYMENTS.json](DEPLOYMENTS.json). The subsequent mainnet deployment is recorded separately above.
- Implemented the Next.js app with landing, deal list/create/detail, mint, and explicitly labelled visual-probe routes.
- Installed actual shadcn/ui Button with Radix Slot, Tailwind 4, and locally packaged Inter Tight / IBM Plex Mono fonts.
- Shell lint, TypeScript, tests, ABI check, and production build pass on Next.js 16.4.1; details below.
- Landing and deal-probe visual review was completed in rendered Chrome at 1440×900 and 390×844. The landing CTA now opens real agreement creation, not the historical visual probe.
- Local production-browser testing completed two clean sale runs plus a recorded third against local Anvil with test USDC. It found a terminal-amount display defect, corrected at `0e3ccc6` and visually retested after a production rebuild: refund125/0, mutual cancellation100/25, partial cancellation100/0, and sold regression220/105 all match onchain results. Terminal reserves show0; desktop1440/mobile390 views have no clipped payouts or horizontal overflow. These runs are not real-wallet or public Arc proof.

## Contracts — local verification complete
The approved model is DemoPass-only atomic minting. There is no holder withdrawal or guaranteed resale liquidity; payment and NFT custody succeed in one transaction, and a successful mint does not guarantee a buyer or cash recovery. Fully funded non-delivery refunds principal and collateral to the funder; incomplete funding returns each actual deposit. Sale terms must be covered by price plus collateral. See `SECURITY.md` for cancellation, timeout, whitelist and liquidity limits.

- `forge build --sizes` compiled contracts, tests and deployment scripts with Solidity 0.8.24; `MiddlemanTest` passed 16/16, including 1,000 payout fuzz runs.
- The official Arc Foundry `v0.8.0-2` macOS Apple Silicon release is installed as `~/.local/bin/arc-forge`, `arc-cast`, and `arc-anvil` (release archive SHA-256 verified); this host also needed Homebrew `libusb` 1.0.30. Arc Foundry reports `1.7.1-dev`; standard Foundry 1.8.5 remains installed separately.
- `arc-forge test --network arc --match-contract MiddlemanTest -vv` passed 16/16 tests, including 1,000 payout fuzz runs. `contracts/foundry.toml` targets Solidity 0.8.24 and EVM Paris, previously compiled and tested with generic Forge. The Arc Foundry test is not a public deployment or proof of deployed Arc runtime behavior.
- Both Makefile mainnet targets reject when `MAINNET_APPROVED` is unset. At that stage only testnet was broadcast. The subsequent deployment-only approval has now been consumed.
- Tests are not an independent audit or proof of real-wallet behavior.
- Hardening verification added four local regression cases for mint-payment rollback/retry, holder-payout rollback/retry, refund rollback/retry and callback reentrancy. `forge fmt` and `forge build --sizes` passed; the focused suite passed 4/4, and both `forge test --match-contract MiddlemanTest -vv` and `arc-forge test --network arc --match-contract MiddlemanTest -vv` passed 20/20. These cases use local MockUSDC/ReentrantBuyer fixtures and do not claim public-chain failure-path coverage. No external security audit was performed.

## Contract setup and verification
From the repository root:

```sh
curl -L https://getfoundry.sh/install | bash
export PATH="$HOME/.local/bin:$HOME/.foundry/bin:$PATH"
foundryup --install 1.8.5
cd contracts
forge install --root "$PWD" OpenZeppelin/openzeppelin-contracts@v5.0.2 foundry-rs/forge-std@v1.9.7
forge fmt
forge build --sizes
forge test --match-contract MiddlemanTest -vv
arc-forge test --network arc --match-contract MiddlemanTest -vv
```

`MiddlemanTest` is currently the only test contract, so the filtered commands cover the contract test suite. Arc Foundry's official macOS Apple Silicon release is available at https://github.com/circlefin/arc-foundry/releases/tag/v0.8.0-2; it is separate from standard Foundry.

## Web app — shell verification

Pinned direct dependencies in `web/package.json` / `web/package-lock.json`: wagmi 2.17.5, viem 2.57.7, @tanstack/react-query 5.104.2, @rainbow-me/rainbowkit 2.2.11, and tsx 4.23.15. The wagmi v2.17.5 release meets RainbowKit's v2 peer range and uses the v5 connector line; wagmi 2.19.5's connector tree caused Turbopack to fail resolving optional `@x402/*` imports, so no missing-module errors were suppressed.

From `web/`, the full shell checks at the accepted `2461315` baseline passed in this order:

```sh
npm run test
npm run check:abi
npm run lint
npm run typecheck
npm run build
```

At that baseline, `test` passed4/4 deal tests; `check:abi` confirmed the frontend ABIs match the compiled Middleman and DemoPass artifacts, including named return tuples. The production build generated `/`, `/deals`, `/deals/new`, `/deals/probe`, and `/mint` as static routes, and `/deals/[id]` as a dynamic server-rendered route. For the terminal-display follow-up, `npm run test` passed5/5 tests, including returned-deposit amounts for timeout, cancellation and partial deposits; lint and typecheck passed. Production was rebuilt for the focused browser retest, which passed.

For the dependency follow-up, `npm install --package-lock-only` regenerated the lockfile and `npm ci` completed. The required commands then passed in order: `npm run test` (5/5), `npm run check:abi`, `npm run lint`, `npm run typecheck`, and `npm run build`. These are shell/build checks, not real-wallet or public-chain validation.

The configured production build also passed with the verified testnet public settings: chain `5042002`, escrow `0x15C72Ed9a299c69eB1F216ce56710498Cc5Ff8e7`, deployment block `67275471`, local-chain flag `0`, and demo-connector flag `0`. The build environment was isolated to these public values and required host paths; no secret environment variables were bound. This does not validate browser-wallet behavior or deploy the frontend.

For the hardening follow-up, the subprocess config suite passed 3/3 while importing the actual config module. It covers the explicit Arc network allowlist, exact local opt-in and local USDC requirement, and invalid address/block fail-closed behavior. The expanded `npm run test` then passed 8/8; `npm run check:abi`, `npm run lint`, `npm run typecheck`, and the configured production build also passed. That historical audit snapshot was 27 findings (22 moderate, 5 high, 0 critical), as documented in `DEPENDENCIES.md`.

The app remains fail-closed when deployment configuration is absent: source configuration requires the escrow address and deployment block, and transaction readiness also requires a connected wallet on the configured chain and a verified deployment.

## Not done
- Independent security review, mainnet deal validation, other browser wallets and remote/mobile SDK pairing.
- Live-network two-clean-run demo and final recording. Public testnet verification includes one scripted sale and one Rabby/UI sale; refund/cancellation and failure-path evidence remain local.
- Mainnet-only grant requirements are not satisfied by these testnet receipts. No acceptance or submission-update claim is made.

## Historical credential setup

The replacement `MIDDLEMAN_TESTNET_WALLETS` bundle is saved, its derived addresses were verified, and the deployer received 20 test USDC. It funded holder/funder/buyer with 2/3/5 test USDC respectively before testnet deployment and settlement. These keys are for testnet only and must not be reused on mainnet or exposed to Vercel. The holder has minted once; another run needs a fresh holder.

Do not fund the old address `0xE1a98416C5c1fECE3931241B2F6E62F91515bD26`; its key is unavailable. The active testnet deployer is `0x3183C93bAF4Ae7FE95Bb213a7541b1e8bd8491A2`. The later mainnet deployment used a distinct fresh deployer, explicit approval and a bounded fee budget. Further transactions require separate approval.

`web/.env.example` contains the verified testnet address and deployment block. Copy it to `.env.local` for a local testnet frontend; missing configuration still disables writes. The later hosted mainnet release uses the separately recorded mainnet configuration, as described above.

## Public-testnet browser verification

At `615186b`, the real Rabby extension completed deal 2 through the application on Arc testnet using automated UI confirmations, not an injected signer. The owner first allowlisted the rotated holder through one explicitly authorized setup transaction; all deal actions used the UI. Proposal, acceptance, funding, collateral, atomic mint and sale passed, along with role-restricted controls, explorer receipts, prior sold deal 1 and disabled missing/combined-invalid configuration. See `DEPLOYMENTS.md` for public hashes and amounts. Both prior holders have consumed their one eligible mint.

Rabby reported unsupported custom-network simulation/unknown signature type. Each chain, signer, destination and decoded calldata was checked before approval. Test-helper timing/label corrections interrupted the procedure without duplicate or failed deal transactions; this is not an uninterrupted final submission demo. The extension session contained only testnet burner credentials, not mainnet keys. Dependency changes after that revision require a separately identified retest.

## Dependency limitation
Emma chose continued testnet hardening rather than mainnet approval. See [dependency risk review](DEPENDENCIES.md) for the remaining dependency paths, compatibility constraints and connector exposure limits. The later deployment-only approval did not resolve these findings and does not authorize additional broadcasts.

The authored override in `web/package.json` is `"ws@^8.0.0": "8.21.0"`. It consolidates the nested viem/WalletConnect `ws` 8.x branches onto `8.21.0`, matching direct viem `2.57.7`; WalletConnect's `@walletconnect/jsonrpc` `ws@7.5.13` branch remains unchanged. `npm ls ws` verified the override and the unchanged 7.x branch.

UUID remediation was attempted but not accepted. With the parent-scoped overrides, `npm update uuid --package-lock-only`, `npm ci`, the focused dependency test and `npm ls uuid --all` still showed `uuid@9.0.1` under MetaMask utility packages. The authorized range-scoped `uuid@^8.0.0` / `uuid@^9.0.0` fallback also left those copies; the focused guard was 1 passed / 1 failed, and `npm ls` returned `ELSPROBLEMS`. The candidate overrides, dependency test, test-script addition and lockfile edits were then reverted. A clean `npm ci` restored the pre-experiment dependency graph.

The rejected candidate audit snapshot was 24 vulnerabilities (19 moderate, 5 high, 0 critical), but it still contained vulnerable UUID copies. After rollback, the current `npm audit --json` is **27 vulnerabilities (22 moderate, 5 high, 0 critical)**: `GHSA-vcc3-ghjq-m6fr` (`decode-uri-component` denial of service), `GHSA-vfj7-8cjw-p6xm` (`braces` stack-exhaustion denial of service), and `GHSA-w5hq-g745-h8pq` (`uuid` missing buffer bounds check). `npm run test` after rollback passed 8/8. The ABI check, lint, typecheck and configured build were not rerun in this failure branch; no external security audit was performed.

The public Rabby browser verification at `615186b` predates this dependency-remediation attempt. After restoring the exact dependency graph, a read-only recovery check at `df7cc2d` passed: deal 2 still rendered Sold, gross payouts 2.20/1.05 test USDC and zero reserves; the existing buyer connection and account controls persisted, and the sold state offered no money actions. No new approvals, signatures or chain writes were performed. The original full-flow evidence remains applicable because product code and dependencies were restored unchanged. Remote/mobile MetaMask SDK pairing remains untested and unregistered.

## Next steps

1. Keep the public mainnet frontend's deployment-only/testnet-validation boundaries intact; deployment and source verification are now complete.
2. Complete the approved testnet founder demo after final narration approval. Script receipts do not prove wallet UI behavior.
3. Obtain separate approval and role wallets before any funded mainnet deal. Never reuse testnet keys or put keys in frontend/Vercel variables.
4. Do not submit or amend the grant application.

No private keys are required for shell checks. Missing deployment configuration disables transactions.
