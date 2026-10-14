# Current state

## Done
- Read the user brief and three visual references. Repository was empty.
- Checked current Arc docs; legacy `.network` / Markdown views can return older testnet-only content while current `.io` HTML documents mainnet. No deployment has been performed.
- Implemented the Next.js app with landing, deal list/create/detail, mint, and explicitly labelled visual-probe routes.
- Installed actual shadcn/ui Button with Radix Slot, Tailwind 4, and locally packaged Inter Tight / IBM Plex Mono fonts.
- Shell lint, TypeScript, tests, ABI check, and production build pass on Next.js 16.4.1; details below.
- Landing and deal-probe visual review was completed in a prior handoff in rendered Chrome at 1440×900 and 390×844. CTA routes to the labelled probe. Screenshots saved in `docs/screens/`. The additional deal/mint routes have not had browser/rendered validation in this handoff.

## Contracts — local verification complete
The approved model is DemoPass-only atomic minting. There is no holder withdrawal or guaranteed resale liquidity; payment and NFT custody succeed in one transaction, and a successful mint does not guarantee a buyer or cash recovery. Fully funded non-delivery refunds principal and collateral to the funder; incomplete funding returns each actual deposit. Sale terms must be covered by price plus collateral. See `SECURITY.md` for cancellation, timeout, whitelist and liquidity limits.

- `forge build --sizes` compiled contracts, tests and deployment scripts with Solidity 0.8.24; `MiddlemanTest` passed 16/16, including 1,000 payout fuzz runs.
- Both Makefile mainnet targets fail without `MAINNET_APPROVED=true`. No broadcast or deployment was performed.
- Local tests are not an independent audit or evidence of Arc precompile behavior.

## Contract setup and verification
From the repository root:

```sh
curl -L https://getfoundry.sh/install | bash
export PATH="$PATH:$HOME/.foundry/bin"
foundryup --install 1.8.5
cd contracts
forge install --root "$PWD" OpenZeppelin/openzeppelin-contracts@v5.0.2 foundry-rs/forge-std@v1.9.7
forge fmt
forge build --sizes
forge test --match-contract MiddlemanTest -vv
```

`MiddlemanTest` is currently the only test contract, so this filtered command covers the full contract test suite.

## Web app — shell verification

Pinned direct dependencies in `web/package.json` / `web/package-lock.json`: wagmi 2.17.5, viem 2.57.7, @tanstack/react-query 5.104.2, @rainbow-me/rainbowkit 2.2.11, and tsx 4.23.15. The wagmi v2.17.5 release meets RainbowKit's v2 peer range and uses the v5 connector line; wagmi 2.19.5's connector tree caused Turbopack to fail resolving optional `@x402/*` imports, so no missing-module errors were suppressed.

From `web/`, the final shell checks passed in this order:

```sh
npm run test
npm run check:abi
npm run lint
npm run typecheck
npm run build
```

`test` passed 4/4 deal tests. `check:abi` confirmed the frontend ABIs match the compiled Middleman and DemoPass contract artifacts, including named return tuples. The production build generated `/`, `/deals`, `/deals/new`, `/deals/probe`, and `/mint` as static routes, and `/deals/[id]` as a dynamic server-rendered route. These results verify shell/build status only; no browser, wallet, or live-chain validation of these routes was performed here.

The app remains fail-closed when deployment configuration is absent: source configuration requires the escrow address and deployment block, and transaction readiness also requires a connected wallet on the configured chain and a verified deployment.

## Not done
- Independent security review, production deployment, browser/wallet/live-chain validation of the deal and mint flows, Vercel deployment.
- Real demo, submission text, grant rule verification.

## Dependency limitation
`npm audit --json` reports 29 vulnerabilities (23 moderate, 6 high, 0 critical). The high-severity entries include `braces` advisory GHSA-vfj7-8cjw-p6xm in the ESLint dependency chain and two `ws` advisories, GHSA-58qx-3vcg-4xpx and GHSA-96hv-2xvq-fx4p. npm's suggested remediations include downgrading `eslint-config-next` to 14.2.35 or migrating wagmi to v3; neither was applied because they conflict with the requested Next.js/wagmi versions. No force fix or security bypass was used. Review the upstream fixes before expanding deployment scope.

## Next commands
From `web/`, install dependencies with `npm install`, then run the shell checks listed above. `npm run dev` starts a local preview on port 3000 when needed; any existing preview was left untouched in this handoff. Screenshots are design evidence, not evidence of a working escrow.

No private keys are required for shell checks; with absent deployment configuration transaction readiness remains disabled. Never display a live deployment label without a verified address.
