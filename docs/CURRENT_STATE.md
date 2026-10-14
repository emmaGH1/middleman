# Current state

## Done
- Read the user brief and three visual references. Repository was empty.
- Checked current Arc docs; legacy `.network` / Markdown views can return older testnet-only content while current `.io` HTML documents mainnet. No deployment has been performed.
- Authored a Next.js landing and explicitly labelled deal-page visual probe.
- Installed actual shadcn/ui Button with Radix Slot, Tailwind 4, and locally packaged Inter Tight / IBM Plex Mono fonts.
- Lint, TypeScript and production build pass on Next.js 16.4.1.
- Visually reviewed landing and deal probe in rendered Chrome at 1440×900 and 390×844. CTA routes to the labelled probe. Screenshots saved in `docs/screens/`.

## Needs a decision
The brief promises the funder mint principal plus collateral after non-delivery, but also allows the holder to withdraw principal before minting. With 100 USDC principal and 25 USDC collateral, only 25 remains recoverable after withdrawal. A contract cannot return funds it no longer holds. Money-moving implementation is paused pending a choice: retain the specified collateral-only refund with explicit risk, or change the mint architecture to protect principal. No choice has been made for the user.

## Not done
- Contracts, test suite, chain-connected routes, testnet/mainnet deployments, Vercel deployment.
- Real demo, submission text, grant rule verification.

## Dependency limitation
After supported dependency updates, npm audit still reports five high-severity package entries from one unpatched advisory, GHSA-vfj7-8cjw-p6xm, in the ESLint development dependency chain (`eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch → braces@3.0.3`). No security checks were disabled and no forced downgrade was applied. This is not a clean security audit; review the upstream fix before expanding deployment scope.

## Next commands
From `web/`: `npm install`, `npm run lint`, `npm run typecheck`, `npm run build`, `npm run dev`. The local preview runs on port 3000. Screenshots are design evidence, not evidence of a working escrow.

No private keys are required for the design probe. Never display a live deployment label without a verified address.
