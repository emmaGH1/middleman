# Middleman V2: Arc Studio contribution

## Scope and attribution

Middleman existed before this collaboration. Arc Studio contributed a new read-only TypeScript receipt/event adapter and its unit tests. It did not create the original app, design or deployed contracts, operate wallets, deploy contracts, or authorize spending. Devin reviewed and hardened the returned source, integrated it into the existing frontend, and built the Deal Room UI and transaction protections.

- Official CLI: `@circle-fin/arc-studio-cli` 1.2.1, Node 24.21.0.
- Workspace: https://studio.arc.io/app/07943013-3823-45c2-a167-ea1be5f49717 (may require account access).
- App ID: `07943013-3823-45c2-a167-ea1be5f49717`.
- Thread ID: `16e4301c-fe71-4a82-9660-a553d42ad6e1`.
- CLI session alias: `middleman-v2-adapter`.
- The CLI authenticated successfully. The public repository was cloned into the live sandbox under `middleman/` using the supported clone flow.
- The completed run reported exactly two changed files: `middleman/web/src/lib/receipt-adapter.ts` and `middleman/web/src/lib/receipt-adapter.test.ts`.
- Export used `arc-studio pull --session middleman-v2-adapter --paths 'middleman/web/src/lib/receipt-adapter*' --dry-run --diff`, then a scoped pull into a staging directory. Both files were inspected before local integration.
- Credentials and private progress logs are not included here.

## Task given to Arc Studio

Implement `EvidenceScope`, `verifyDealReceipts`, `readDealEventWindow` and `interpretDeal`, plus `node:test` tests. Candidate hashes are untrusted hints. Validate chain, successful receipt, receipt identity, block bounds, canonical block hash, log membership and deal ID. Normalize event order and duplicates. Limit receipt count and block windows. Distinguish computed economics from observed payments, zero collateral, incomplete versus fully funded timeout, cancellation and post-mint risks.

The workspace was explicitly restricted to these two read-only source/test files. No Solidity, dependency, UI, deployment, wallet, signing, faucet or transaction changes were authorized.

## Manual review and integration corrections

The returned source was useful but not accepted unchanged:

1. Fixed the inclusive 2,000-block window boundary and rejected negative block ranges.
2. Rejected over-limit receipt lists rather than silently truncating them; normalized hash-case duplicates.
3. Added receipt/log block-number and transaction-index consistency checks and integer log-index validation.
4. Switched to strict ABI decoding for known events.
5. Filtered other deal IDs before receipt verification in bounded RPC windows. The original window reader could collect unrelated transactions and then fail verification.
6. Made a changing tip hash fail closed instead of issuing only a console warning.
7. Reused the existing `payouts` and `returnedDeposits` helpers, including coverage validation, rather than duplicating financial formulas.
8. Added focused regression tests for these integration defects. Clarified that synthetic decoder fixtures are not public-chain evidence.

Devin integration adds untrusted explorer discovery with bounded RPC fallback, manual receipt-hash verification, explicit incomplete-history labels, pinned state/payout/NFT reads, lifecycle rendering, financial disclosures, role/deadline action gating, and receipt reconciliation after an uncertain broadcast.

## Verification status

Arc Studio reported 24/24 sandbox tests. Independently, the locally adapted adapter passed 27/27 tests; the combined focused adapter/action/history tests passed 32/32 and the complete frontend suite passed 40/40. ABI consistency, TypeScript and a production build passed. Lint had no errors and eight unused-symbol warnings in adapter test fixtures. Hosted/testnet gates and limitations are recorded separately in `CURRENT_STATE.md` as they complete.

Focused command from `web/`:

```sh
npx tsx --test src/lib/receipt-adapter.test.ts
```

The adapter tests are also included in `npm test`. Unit fixtures do not prove public Arc execution. Receipt checks rely on the configured RPC and do not independently prove consensus, finality or complete indexer history.

## Commit and release boundaries

Integration is being developed on `devin/1792100153-middleman-v2-deal-room`. Resulting commit and PR links will be added after verification. The existing non-upgradeable contracts remain unchanged. Mainnet deployment/source verification is separate from testnet deal evidence. No funded mainnet flow, production promotion, grant eligibility or new demo is claimed by this document.
