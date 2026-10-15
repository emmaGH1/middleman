# Dependency risk review

This is dependency triage, not an independent security audit or a claim of exploitability. `npm audit --json` reports **27 affected packages: 22 moderate, 5 high, 0 critical** in the current lockfile. Many entries propagate the same underlying advisory through parent packages; there are three distinct advisory IDs below. The existing `ws@^8.0.0` override remains unchanged.

| Advisory | Installed path | Exposure and disposition |
| --- | --- | --- |
| [braces stack-exhaustion DoS](https://github.com/advisories/GHSA-vfj7-8cjw-p6xm) | `eslint-config-next → @next/eslint-plugin-next → fast-glob → micromatch → braces@3.0.3` | Development lint tooling. npm's latest release is still 3.0.3, within the advisory's `<=3.0.3` range. Do not run tooling over untrusted glob patterns. No patched release was available during this review. |
| [decode-uri-component decoding DoS](https://github.com/advisories/GHSA-vcc3-ghjq-m6fr) | `wagmi → @wagmi/connectors → @walletconnect/ethereum-provider → @walletconnect/utils → query-string@7.1.3 → decode-uri-component@0.2.2` | WalletConnect dependency. The patched 0.5.0 release is ESM-only, whereas this `query-string` imports it with CommonJS `require`. A blind override across that module boundary is not a verified fix; upgrade the parent integration and test its wallet flows together. |
| [uuid buffer bounds check](https://github.com/advisories/GHSA-w5hq-g745-h8pq) | MetaMask SDK/utilities (also reached through Gemini and legacy Coinbase connector dependencies), `uuid@8.3.2` / `9.0.1` | Advisory affects versions below 11.1.1 and names v3/v5/v6 with a supplied buffer. A forced major override is not a verified SDK compatibility fix. Prefer parent-supported updates with connector tests. No blanket override was applied. |

`Providers` registers only the injected-wallet connector unless `NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID` is supplied, in which case WalletConnect is also offered. It does not register MetaMask SDK, Gemini or Coinbase-specific connectors. Installed dependency presence alone does not establish that the vulnerable function executes in this app, but connector selection is **not** proof those dependencies are absent from bundles or safe. This review did not establish end-to-end exploitability or certify runtime reachability.

## Release boundary

- Keep mainnet paused. Keep WalletConnect unconfigured until its dependency path has a supported fix and its actual UI flow is tested; installed/injected wallets remain available.
- Do not downgrade Next/ESLint or migrate wagmi major versions solely to satisfy npm's suggested remediation. Its suggestions currently include `eslint-config-next@14.2.35` and `wagmi@3.7.7`, not compatible in-place patches for this stack.
- Review upstream releases, regenerate the lockfile, and run tests, ABI checks, lint, typecheck and production build before accepting dependency changes. Wallet-stack changes also need real connector testing.
- Re-run `npm audit --json` when dependencies change. Counts are lockfile/advisory snapshots, not a permanent safety rating. These findings remain open.

Evidence for this review: current `npm audit --json`, `npm ls decode-uri-component braces uuid --all`, npm release metadata, `query-string/index.js`, and the connector list in `web/src/components/providers.tsx`.
