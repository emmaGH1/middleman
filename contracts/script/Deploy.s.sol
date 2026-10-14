// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {Middleman} from "../src/Middleman.sol";

contract Deploy is Script {
    function run() external returns (Middleman escrow) {
        require(block.chainid == 5042002 || block.chainid == 5042, "Arc only");
        if (block.chainid == 5042) require(vm.envBool("MAINNET_APPROVED"), "Human approval required");
        uint256 key = vm.envUint("DEPLOYER_PK");
        uint256 price = vm.envOr("MINT_PRICE", uint256(1e6));
        address owner = vm.addr(key);
        vm.startBroadcast(key);
        escrow = new Middleman(IERC20(0x3600000000000000000000000000000000000000), price, owner);
        vm.stopBroadcast();
        console2.log("Middleman", address(escrow));
        console2.log("DemoPass", address(escrow.collection()));
    }
}
