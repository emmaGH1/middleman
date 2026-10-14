// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script, console2} from "forge-std/Script.sol";
import {Middleman} from "../src/Middleman.sol";
import {DemoPass} from "../src/DemoPass.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Flow is Script {
    function run() external {
        require(block.chainid == 5042002 || block.chainid == 5042, "Arc only");
        if (block.chainid == 5042) require(vm.envBool("MAINNET_APPROVED"), "Human approval required");
        Middleman escrow = Middleman(vm.envAddress("MIDDLEMAN_ADDRESS"));
        DemoPass pass = escrow.collection();
        IERC20 usdc = escrow.usdc();
        uint256 ownerKey = vm.envUint("DEPLOYER_PK");
        uint256 holderKey = vm.envUint("HOLDER_PK");
        uint256 funderKey = vm.envUint("FUNDER_PK");
        uint256 buyerKey = vm.envUint("BUYER_PK");
        address holder = vm.addr(holderKey);
        address funder = vm.addr(funderKey);
        address buyer = vm.addr(buyerKey);
        require(holder != funder && holder != buyer && funder != buyer, "Distinct demo wallets required");
        uint256 cost = pass.mintPrice();
        uint256 collateral = cost / 4;
        uint256 price = cost * 3;
        require(!pass.minted(holder), "Use a fresh allowlisted holder for each flow");
        require(
            usdc.balanceOf(holder) > collateral && usdc.balanceOf(funder) > cost
                && usdc.balanceOf(buyer) > price,
            "Fund burners and leave gas headroom"
        );

        vm.startBroadcast(ownerKey);
        pass.setAllowlisted(holder, true);
        vm.stopBroadcast();
        vm.startBroadcast(holderKey);
        uint256 id = escrow.propose(holder, funder, collateral, 6000, uint64(block.timestamp + 1 days), price);
        vm.stopBroadcast();
        vm.startBroadcast(funderKey);
        escrow.accept(id);
        usdc.approve(address(escrow), cost);
        escrow.fund(id);
        vm.stopBroadcast();
        vm.startBroadcast(holderKey);
        usdc.approve(address(escrow), collateral);
        escrow.postCollateral(id);
        escrow.mintAndLock(id);
        vm.stopBroadcast();
        vm.startBroadcast(buyerKey);
        usdc.approve(address(escrow), price);
        escrow.buy(id);
        vm.stopBroadcast();
        _verifySettlement(escrow, pass, id, buyer);
        console2.log("Settled deal", id);
    }

    function _verifySettlement(Middleman escrow, DemoPass pass, uint256 id, address buyer) private view {
        Middleman.Deal memory deal = escrow.getDeal(id);
        require(deal.status == Middleman.Status.Sold, "Flow did not settle");
        require(pass.ownerOf(deal.tokenId) == buyer, "Wrong NFT owner");
    }
}
