.PHONY: contracts-test deploy-testnet deploy-mainnet flow-testnet flow-mainnet

ARC_FORGE ?= arc-forge
contracts-test:
	cd contracts && forge test

deploy-testnet:
	cd contracts && $(ARC_FORGE) script script/Deploy.s.sol:Deploy --rpc-url https://rpc.testnet.arc.io --chain 5042002 --broadcast

deploy-mainnet:
	@test "$$MAINNET_APPROVED" = "true" || (echo 'Human approval required: MAINNET_APPROVED=true'; exit 1)
	cd contracts && $(ARC_FORGE) script script/Deploy.s.sol:Deploy --rpc-url https://rpc.mainnet.arc.io --chain 5042 --broadcast

flow-testnet:
	cd contracts && $(ARC_FORGE) script script/Flow.s.sol:Flow --rpc-url https://rpc.testnet.arc.io --chain 5042002 --broadcast --slow

flow-mainnet:
	@test "$$MAINNET_APPROVED" = "true" || (echo 'Human approval required: MAINNET_APPROVED=true'; exit 1)
	cd contracts && $(ARC_FORGE) script script/Flow.s.sol:Flow --rpc-url https://rpc.mainnet.arc.io --chain 5042 --broadcast --slow
