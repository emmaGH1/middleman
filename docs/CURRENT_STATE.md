# Current state

## Done
- Read the user brief and three visual references. Repository was empty.
- Checked current Arc docs; legacy `.network` / Markdown views can return older testnet-only content while current `.io` HTML documents mainnet. No deployment has been performed.
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
- Both Makefile mainnet targets reject when `MAINNET_APPROVED` is unset. No broadcast or deployment was performed.
- Tests are not an independent audit or proof of real-wallet behavior.

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

The app remains fail-closed when deployment configuration is absent: source configuration requires the escrow address and deployment block, and transaction readiness also requires a connected wallet on the configured chain and a verified deployment.

## Not done
- Independent security review, Arc testnet/mainnet deployment, real-wallet or public-chain validation, Vercel deployment.
- Real demo, submission text, grant rule verification.

## Immediate continuation gate — testnet faucet

The original testnet wallet bundle was unavailable after restart. Bounded filename-only searches of likely local storage directories and exact Keychain service checks found no surviving bundle. Replacement testnet-only wallets have now been generated and a personal secure-save prompt for `MIDDLEMAN_TESTNET_WALLETS` has been offered. Accept that prompt before funding; an unsaved shell environment does not survive a restart. No private keys were displayed or committed, and no broadcast occurred.

Do not fund the old Arc testnet address `0xE1a98416C5c1fECE3931241B2F6E62F91515bD26`: its key is unavailable and its last checked balance was zero. The replacement deployer is `0x3183C93bAF4Ae7FE95Bb213a7541b1e8bd8491A2`. After saving the replacement wallet bundle, fund that address using Arc Testnet at https://faucet.circle.com, then follow `docs/DEPLOYMENT.md` for deployment/flow and public receipts. No public contract deployment has happened. Mainnet still requires separate human approval and a real-funds budget.

## Dependency limitation
The authored override in `web/package.json` is `"ws@^8.0.0": "8.21.0"`. It consolidates the nested viem/WalletConnect `ws` 8.x branches onto `8.21.0`, matching direct viem `2.57.7`; WalletConnect's `@walletconnect/jsonrpc` `ws@7.5.13` branch remains unchanged. `npm ls ws` verified the override and the unchanged 7.x branch.

After `npm install --package-lock-only` and `npm ci`, `npm audit --json` reports 27 vulnerabilities (22 moderate, 5 high, 0 critical). Remaining advisories are `GHSA-vcc3-ghjq-m6fr` (`decode-uri-component` denial of service), `GHSA-vfj7-8cjw-p6xm` (`braces` stack-exhaustion denial of service), and `GHSA-w5hq-g745-h8pq` (`uuid` missing buffer bounds check). No `npm audit fix`, force fix, major migration, or unrelated upgrade was used. Review upstream fixes before expanding deployment scope.

## Next steps
Deployment gates are:

1. Establish access to the intended testnet-only deployer, holder, funder, and buyer private keys and verify their public addresses. Never fund an address whose corresponding key is unavailable.
2. After key access is confirmed, fund only the Arc testnet deployer, execute the documented testnet deployment/flow, and record public receipts. Local browser runs and Arc Foundry tests do not establish public-chain or real-wallet behavior.
3. Consider mainnet only after testnet evidence, a separate explicit human approval, and a real-funds budget. No mainnet broadcast is authorized by local checks alone.

No private keys are required for shell checks; with absent deployment configuration transaction readiness remains disabled. Never display a live deployment label without a verified address.
