# Arc integration facts

Checked 2026-10-14 against current official `.io` HTML documentation. These are documented network facts, not evidence of a Middleman deployment.

| Parameter | Mainnet | Testnet |
| --- | --- | --- |
| Chain ID | 5042 | 5042002 |
| RPC | https://rpc.mainnet.arc.io | https://rpc.testnet.arc.io |
| Explorer | https://explorer.arc.io | https://explorer.testnet.arc.io |
| Native gas currency | USDC | USDC |
| Native balance precision | 18 decimals | 18 decimals |
| USDC ERC-20 interface | `0x3600000000000000000000000000000000000000` | `0x3600000000000000000000000000000000000000` |
| ERC-20 balance precision | 6 decimals | 6 decimals |
| Faucet | None documented here; real funds required | https://faucet.circle.com |

Native and ERC-20 USDC represent the same underlying balance, not two assets. Use 6 decimals for ERC-20 approve/transferFrom and contract amounts; use 18 decimals for native gas APIs.

## EVM
Official infrastructure documentation lists the Osaka hard-fork baseline. Middleman uses Solidity 0.8.24, EVM Paris, optimizer enabled with 200 runs; that build has been deployed, source-verified and exercised on Arc testnet (see `DEPLOYMENTS.md`). `PREVRANDAO` returns zero, blob transactions are unsupported, and multiple blocks can share a timestamp. Do not build deadline logic around block counts or assume PREVRANDAO is random.

## Sources
- https://docs.arc.io/arc/references/connect-to-arc
- https://docs.arc.io/arc/references/contract-addresses
- https://docs.arc.io/integrate/infrastructure
- https://docs.arc.io/arc/concepts/gas-and-fees

Documentation caveat: the old `.network` domain and some `.md` views returned testnet-only text and `testnet.arcscan.app`; current `.io` HTML documents both networks and the explorer URLs above. Use current `.io` HTML and verify RPC chain IDs before signing or deploying. No mainnet addresses for this project should be inferred from these network parameters.
