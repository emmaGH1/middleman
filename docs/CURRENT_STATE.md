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

At that baseline, `test` passed4/4 deal tests; `check:abi` confirmed the frontend ABIs match the compiled Middleman and DemoPass artifacts, including named return tuples. The production build generated `/`, `/deals`, `/deals/new`, `/deals/probe`, and `/mint` as static routes, and `/deals/[id]` as a dynamic server-rendered route. For the terminal-display follow-up, `npm run test` passed5/5 tests, including returned-deposit amounts for timeout, cancellation and partial deposits; lint and typecheck passed. Production was rebuilt for the focused browser retest, which passed. The unchanged ABI check was not rerun.

The app remains fail-closed when deployment configuration is absent: source configuration requires the escrow address and deployment block, and transaction readiness also requires a connected wallet on the configured chain and a verified deployment.

## Not done
- Independent security review, Arc testnet/mainnet deployment, real-wallet or public-chain validation, Vercel deployment.
- Real demo, submission text, grant rule verification.

## Dependency limitation
`npm audit --json` reports 29 vulnerabilities (23 moderate, 6 high, 0 critical). The high-severity entries include `braces` advisory GHSA-vfj7-8cjw-p6xm in the ESLint dependency chain and two `ws` advisories, GHSA-58qx-3vcg-4xpx and GHSA-96hv-2xvq-fx4p. npm's suggested remediations include downgrading `eslint-config-next` to 14.2.35 or migrating wagmi to v3; neither was applied because they conflict with the requested Next.js/wagmi versions. No force fix or security bypass was used. Review the upstream fixes before expanding deployment scope.

## Next steps
The focused visual retest of the refunded/cancelled terminal display is pending in the testing-owned local setup. Follow `docs/DEPLOYMENT.md` for testnet-first deployment; the local browser runs and Arc Foundry test do not establish public-chain or real-wallet behavior.

No private keys are required for shell checks; with absent deployment configuration transaction readiness remains disabled. Existing Anvil/Next services owned by the testing setup were left untouched. Never display a live deployment label without a verified address.
