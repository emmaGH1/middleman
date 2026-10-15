# Current state

## Done
- Read the user brief and three visual references. Repository was empty.
- Checked current Arc docs; legacy `.network` / Markdown views can return older testnet-only content while current `.io` HTML documents mainnet.
- Deployed Middleman and its DemoPass on Arc testnet and source-verified both on Blockscout. Completed the ten-transaction scripted happy path and independently checked receipts, historical NFT custody, settlement and gas-adjusted balances. Exact public evidence is in [DEPLOYMENTS.md](DEPLOYMENTS.md) and [DEPLOYMENTS.json](DEPLOYMENTS.json). No mainnet deployment has occurred.
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
- Both Makefile mainnet targets reject when `MAINNET_APPROVED` is unset. Only testnet was broadcast; mainnet remains unapproved.
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
- Independent security review, Arc mainnet deployment, Vercel deployment, other browser wallets and remote/mobile SDK pairing.
- Live-network two-clean-run demo and final recording. Public testnet verification includes one scripted sale and one Rabby/UI sale; refund/cancellation and failure-path evidence remain local.
- Mainnet-only grant requirements are not satisfied by these testnet receipts. No acceptance or submission-update claim is made.

## Immediate continuation gate — mainnet approval

The replacement `MIDDLEMAN_TESTNET_WALLETS` bundle is saved, its derived addresses were verified, and the deployer received 20 test USDC. It funded holder/funder/buyer with 2/3/5 test USDC respectively before testnet deployment and settlement. These keys are for testnet only and must not be reused on mainnet or exposed to Vercel. The holder has minted once; another run needs a fresh holder.

Do not fund the old address `0xE1a98416C5c1fECE3931241B2F6E62F91515bD26`; its key is unavailable. The active testnet deployer is `0x3183C93bAF4Ae7FE95Bb213a7541b1e8bd8491A2`. Mainnet still requires separate human approval, distinct mainnet credentials and a real-funds budget.

`web/.env.example` now contains the verified testnet address and deployment block. Copy it to `.env.local` for a local testnet frontend; missing configuration still disables writes. No public frontend deployment or mainnet label has been enabled.

## Public-testnet browser verification

At `615186b`, the real Rabby extension completed deal 2 through the application on Arc testnet using automated UI confirmations, not an injected signer. The owner first allowlisted the rotated holder through one explicitly authorized setup transaction; all deal actions used the UI. Proposal, acceptance, funding, collateral, atomic mint and sale passed, along with role-restricted controls, explorer receipts, prior sold deal 1 and disabled missing/combined-invalid configuration. See `DEPLOYMENTS.md` for public hashes and amounts. Both prior holders have consumed their one eligible mint.

Rabby reported unsupported custom-network simulation/unknown signature type. Each chain, signer, destination and decoded calldata was checked before approval. Test-helper timing/label corrections interrupted the procedure without duplicate or failed deal transactions; this is not an uninterrupted final submission demo. The extension session contained only testnet burner credentials, not mainnet keys. Dependency changes after that revision require a separately identified retest.

## Dependency limitation
Emma chose continued testnet hardening rather than mainnet approval. See [dependency risk review](DEPENDENCIES.md) for the remaining dependency paths, compatibility constraints and connector exposure limits. No mainnet credentials or broadcast are authorized.

The authored override in `web/package.json` is `"ws@^8.0.0": "8.21.0"`. It consolidates the nested viem/WalletConnect `ws` 8.x branches onto `8.21.0`, matching direct viem `2.57.7`; WalletConnect's `@walletconnect/jsonrpc` `ws@7.5.13` branch remains unchanged. `npm ls ws` verified the override and the unchanged 7.x branch.

UUID remediation was attempted but not accepted. With the parent-scoped overrides, `npm update uuid --package-lock-only`, `npm ci`, the focused dependency test and `npm ls uuid --all` still showed `uuid@9.0.1` under MetaMask utility packages. The authorized range-scoped `uuid@^8.0.0` / `uuid@^9.0.0` fallback also left those copies; the focused guard was 1 passed / 1 failed, and `npm ls` returned `ELSPROBLEMS`. The candidate overrides, dependency test, test-script addition and lockfile edits were then reverted. A clean `npm ci` restored the pre-experiment dependency graph.

The rejected candidate audit snapshot was 24 vulnerabilities (19 moderate, 5 high, 0 critical), but it still contained vulnerable UUID copies. After rollback, the current `npm audit --json` is **27 vulnerabilities (22 moderate, 5 high, 0 critical)**: `GHSA-vcc3-ghjq-m6fr` (`decode-uri-component` denial of service), `GHSA-vfj7-8cjw-p6xm` (`braces` stack-exhaustion denial of service), and `GHSA-w5hq-g745-h8pq` (`uuid` missing buffer bounds check). `npm run test` after rollback passed 8/8. The ABI check, lint, typecheck and configured build were not rerun in this failure branch; no external security audit was performed.

The public Rabby browser verification at `615186b` predates this dependency-remediation attempt. No browser or chain interaction was performed during this work; the read-only post-change testnet retest remains pending. Remote/mobile MetaMask SDK pairing remains untested and unregistered.

## Next steps
Deployment gates are:

1. Stop for separate explicit mainnet approval, a spending cap, agreed immutable mint price and treasury, and acknowledgement of unaudited-contract/resale risk and unresolved dependency findings.
2. Only after approval, obtain distinct mainnet deployer/holder/funder/buyer credentials securely. Never reuse testnet keys or put keys in web environment variables.
3. Follow `DEPLOYMENT.md` for mainnet deployment, verification and flow. Publish frontend configuration only for confirmed addresses. Complete the public-chain UI/demo work; script receipts do not prove wallet UI behavior.

No private keys are required for shell checks; with absent deployment configuration transaction readiness remains disabled. Never display a live deployment label without a verified address.
