# Current state

## Done
- Read the user brief and three visual references. Repository was empty.
- Checked current Arc docs; legacy `.network` / Markdown views can return older testnet-only content while current `.io` HTML documents mainnet. No deployment has been performed.
- Authored a Next.js landing and explicitly labelled deal-page visual probe.
- Installed actual shadcn/ui Button with Radix Slot, Tailwind 4, and locally packaged Inter Tight / IBM Plex Mono fonts.
- Lint, TypeScript and production build pass on Next.js 16.4.1.
- Visually reviewed landing and deal probe in rendered Chrome at 1440×900 and 390×844. CTA routes to the labelled probe. Screenshots saved in `docs/screens/`.

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

## Not done
- Independent security review, Arc testnet/mainnet deployments, chain-connected routes, Vercel deployment.
- Real demo, submission text, grant rule verification.

## Dependency limitation
After supported dependency updates, npm audit still reports five high-severity package entries from one unpatched advisory, GHSA-vfj7-8cjw-p6xm, in the ESLint development dependency chain (`eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch → braces@3.0.3`). No security checks were disabled and no forced downgrade was applied. This is not a clean security audit; review the upstream fix before expanding deployment scope.

## Next commands
From `web/`: `npm install`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run dev`. The local preview runs on port 3000. Screenshots are design evidence, not evidence of a working escrow.

No private keys are required for the design probe. Never display a live deployment label without a verified address.
