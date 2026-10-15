# Deployment evidence — Arc mainnet and testnet

## Arc mainnet — deployment only

Deployed after explicit human approval on October 15, 2026. **No funded mainnet deal, mint or sale was run.** End-to-end deal evidence below is from testnet, not mainnet.

| Field | RPC-confirmed value |
| --- | --- |
| Network | Arc mainnet, chain ID `5042` |
| Middleman | [`0x18f7407d76429f66a5a977eac0a71cbc9fe05036`](https://explorer.arc.io/address/0x18f7407d76429f66a5a977eac0a71cbc9fe05036) |
| DemoPass | [`0xEdD3cBF58B797B2d4bc06e62C1cFbD42e4BaD229`](https://explorer.arc.io/address/0xEdD3cBF58B797B2d4bc06e62C1cFbD42e4BaD229) |
| Deployment transaction | [`0x57a9677d2613a7e1fcf6f28381ff08256245b46c03f2f8d63b518269e3f7d6d6`](https://explorer.arc.io/tx/0x57a9677d2613a7e1fcf6f28381ff08256245b46c03f2f8d63b518269e3f7d6d6) |
| Deployment block | `26090372` |
| USDC interface | `0x3600000000000000000000000000000000000000` |
| Immutable mint price | `10000` atomic units = **0.01 USDC** |
| DemoPass owner/treasury | `0xA4697789777947a670a647cB1139f86E58C764Ee` |
| Actual deployment fee | **0.074113725 USDC**; approved cap 0.25 USDC |
| Compiler | Solidity `0.8.24`, EVM Paris, optimizer 200 runs |
| Source verification | **Pending:** explorer API returned Cloudflare challenge HTML, not a verification result |

The one creation transaction deploys both contracts. Live RPC readback confirmed Middleman's USDC/collection bindings and DemoPass's USDC, escrow, owner, treasury and mint price. Runtime code exists at both addresses. This is deployment/configuration evidence, not an independent audit or successful mainnet deal.

The bounded deployment used compiled Foundry bytecode through viem with a fixed 4,000,000 gas limit and 50 Gwei maximum fee per gas: maximum transaction fee 0.20 USDC, below the approved 0.25 cap. Actual gas used was 3,529,225 at 21 Gwei. The fresh deployer was not reused from testnet. Public raw evidence is in [MAINNET_DEPLOYMENT.json](MAINNET_DEPLOYMENT.json).

## Arc testnet — source-verified and settled

The following contracts and receipts are **testnet**. They must not be presented as mainnet settlement evidence.

## Contracts

| Field | Verified value |
| --- | --- |
| Network | Arc testnet, chain ID `5042002` |
| Middleman | [`0x15C72Ed9a299c69eB1F216ce56710498Cc5Ff8e7`](https://explorer.testnet.arc.io/address/0x15C72Ed9a299c69eB1F216ce56710498Cc5Ff8e7) |
| DemoPass | [`0xd792097E69c7846c50144B9De5559f2a7FE7FA3b`](https://explorer.testnet.arc.io/address/0xd792097E69c7846c50144B9De5559f2a7FE7FA3b) |
| Deployment transaction | [`0x0bbc97a9ad1d8f376dbd3aa1223b4fc7a7417eeef7f033983e5ec2bd50f0b8b5`](https://explorer.testnet.arc.io/tx/0x0bbc97a9ad1d8f376dbd3aa1223b4fc7a7417eeef7f033983e5ec2bd50f0b8b5) |
| Deployment block | `67275471` |
| USDC interface | `0x3600000000000000000000000000000000000000` (6 decimals) |
| Immutable mint price | `1000000` atomic units = 1 test USDC |
| DemoPass owner/treasury | `0x3183C93bAF4Ae7FE95Bb213a7541b1e8bd8491A2` |
| Compiler | Solidity `0.8.24`, EVM Paris, optimizer 200 runs |
| Source verification | Both contracts: Blockscout `Pass - Verified` |

Middleman has no owner/admin. Its USDC and collection bindings, and DemoPass's escrow, USDC, owner and mint price were read back from the live RPC and matched the deployment configuration.

## Scripted deal 1

The ten transactions below all have successful RPC receipts. Principal was 1 test USDC, collateral 0.25, sale price 3, and the funder's profit share 60%.

| Action | Transaction |
| --- | --- |
| Allowlist holder | [Receipt](https://explorer.testnet.arc.io/tx/0x59f8bc4ae0c10d6ebb7bf8cc785b272797d4c366a836ebde573d8e30b36a035f) |
| Propose | [Receipt](https://explorer.testnet.arc.io/tx/0x2dc7bbcb981f373236ac9a80dd9688c92e1616327d877e5f81d58ae48f9ebaad) |
| Accept | [Receipt](https://explorer.testnet.arc.io/tx/0xe91307d824bb010f8339198928875048c4fee1a765868c978b1da5584a5809b3) |
| Approve principal | [Receipt](https://explorer.testnet.arc.io/tx/0x7327bea164caea344c6c83f844192791d93c7ab51ff0a3e51bac9980c5c6aa18) |
| Fund | [Receipt](https://explorer.testnet.arc.io/tx/0x23548f9db3d0edf7e80f2efbe2567763e8cf428cb78a805fa1ac70c2aa973f48) |
| Approve collateral | [Receipt](https://explorer.testnet.arc.io/tx/0xbfe44aa8629ecbf4087b1f021fc03225286acb0382c9039bb62d9c5e3078758c) |
| Post collateral | [Receipt](https://explorer.testnet.arc.io/tx/0x628c448a9903ea6432b7cd3a42c8c4030624769328565422ad5f362ff454d55d) |
| Atomic mint and lock | [Receipt](https://explorer.testnet.arc.io/tx/0xc6d092243ec0cc11646c1a16685cce029c0ee8a45fb3940036662cee5977a07c) |
| Approve purchase | [Receipt](https://explorer.testnet.arc.io/tx/0x7f7eb34589df5f927058f610da925d6205fd0358d6a3f29559e6f719a8bba19f) |
| Buy and settle | [Receipt](https://explorer.testnet.arc.io/tx/0xd12be1028a3e6b1c1274727d57023177cdf40b4597a5f9205a6eb3983b1ef562) |

At settlement block `67275630`, deal 1 is `Sold`, NFT 1 belongs to buyer `0x17802B6ccc41d22F8BdF6F930761604CcF16Ae87`, and escrow's USDC balance is zero. At mint block `67275622`, NFT 1 belonged to Middleman. The holder received no mint funds (native balance delta plus that transaction's gas was zero).

| Role | Gross sale payout | Net flow value, excluding gas |
| --- | --- | --- |
| Funder | 2.20 test USDC | +1.20 test USDC after 1.00 principal deposit |
| Holder | 1.05 test USDC | +0.80 test USDC after 0.25 collateral deposit |
| Buyer | NFT 1 | −3.00 test USDC |
| DemoPass treasury | 1.00 test USDC mint payment (not sale payout) | +1.00 test USDC |

The `Sold` event and `salePayout(1)` both report `2200000 / 1050000`. Native balances at blocks `67275585` and `67275630`, adjusted by the sum of each wallet's receipt `gasUsed * effectiveGasPrice`, independently match the net values above. Native balances use 18 decimals; contract USDC amounts use 6. Do not add the two interfaces as separate assets.

## Evidence and limits

[Machine-readable public evidence](DEPLOYMENTS.json) contains funding receipts, all flow receipts, pinned balance snapshots, gas calculations and final assertions. It contains no keys.

The original JSON proves one scripted happy-path execution on public Arc testnet. The browser-wallet run below is separate evidence, not a mainnet run, audit, refund-path test on Arc, or guarantee of future execution. Local failure/refund/cancellation tests are documented separately in `CURRENT_STATE.md`. The original holder has already minted; do not replay this flow with that holder. Mainnet, Vercel and the final submission demo remain gated/pending.

## Browser-wallet deal 2

The application at revision `615186b` completed a second sale on the same public testnet deployment using the **Rabby browser extension**, with automated UI confirmations (not injected private-key signing or human confirmations). The holder was rotated to `0x17802B6ccc41d22F8BdF6F930761604CcF16Ae87`, funder to `0x2BBbC332e6cFD4088B716e78734c91aDaeD2ABDc`, and buyer to `0x9386A1e40F2e701F5B9cc296450CA43613031b9E`. The owner stayed unchanged. No new deployment was needed.

| Action | Public testnet receipt |
| --- | --- |
| Owner allowlists fresh holder (setup only) | [Receipt](https://explorer.testnet.arc.io/tx/0xa1be9f3cf96659b1c99ee40aa3660b02c0d02acabeb2381f8c8966d9233f31de) |
| Propose through app | [Receipt](https://explorer.testnet.arc.io/tx/0x22aefcaae1361019e59cb5f40a1f2b872975a4a89b2fa191c736936348b3c8db) |
| Accept | [Receipt](https://explorer.testnet.arc.io/tx/0xf1196b335a8ff1dc307c73e31839621cfe68db35f862298dde11d30ff6f3616b) |
| Fund 1 test USDC | [Receipt](https://explorer.testnet.arc.io/tx/0xd79172240d8a89fd2d1303770449044c5eccf6e8cd9d4bc56402a89abf029157) |
| Post 0.25 collateral | [Receipt](https://explorer.testnet.arc.io/tx/0x06cbe5c2a7f73ffe7190224b28c93dca1ed52a6a468255b311edc42faf74c7d5) |
| Atomic mint | [Receipt](https://explorer.testnet.arc.io/tx/0x9be46102b24c329657cf32d38b1b5e98f889cbc609b7cd837a85d37517e16074) |
| Buy for 3 test USDC | [Receipt](https://explorer.testnet.arc.io/tx/0x702548496f0668b165de00ef396c79659de358af0aa07cbd4affda168a2591bd) |

The app displayed `Sold`, gross sale payouts of 2.20/1.05 test USDC and zero reserves. NFT 2 reached the buyer; the sale receipt matched those payouts and escrow's USDC balance was zero. Minting paid the treasury 1 test USDC and put NFT 2 in escrow without paying mint principal to the holder. Role-restricted controls, receipt links and the prior deal 1 display passed browser checks. Separate missing/combined-invalid configuration screens disabled transaction buttons.

**Limits:** Rabby displayed “Simulation Not Supported / Unknown Signature Type” for custom-network contract calls. Chain, signer, destination and decoded calldata were checked before each signature. Helper-label/raw-preview timing corrections interrupted the procedure, but produced no duplicate or failed deal transactions. This is not the final uninterrupted submission demo. Other browser wallets, individual invalid-config permutations, public-chain refund/failure cases, mainnet and Vercel remain untested. Both holders used for deals 1 and 2 have consumed their one eligible mint.
