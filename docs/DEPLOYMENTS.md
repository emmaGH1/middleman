# Verified deployment — Arc testnet only

No mainnet deployment exists. These receipts must not be described as mainnet proof.

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

This proves one scripted happy-path execution on public Arc testnet, not a browser-wallet test, mainnet run, audit, refund-path test on Arc, or guarantee of future execution. Local failure/refund/cancellation tests are documented separately in `CURRENT_STATE.md`. The holder has already minted; do not replay this flow with the same holder. Mainnet, Vercel and the live browser demo remain gated/pending.
