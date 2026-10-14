// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {Middleman} from "../src/Middleman.sol";
import {DemoPass} from "../src/DemoPass.sol";

contract MockUSDC is ERC20 {
    constructor() ERC20("Test USDC", "USDC") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}

contract RejectingBuyer is IERC721Receiver {
    function onERC721Received(address, address, uint256, bytes calldata) external pure returns (bytes4) {
        revert("Cannot receive");
    }
}

contract MiddlemanTest is Test {
    MockUSDC token;
    Middleman escrow;
    DemoPass pass;
    address holder = makeAddr("holder");
    address funder = makeAddr("funder");
    address buyer = makeAddr("buyer");
    address treasury = makeAddr("treasury");
    uint256 constant COST = 100e6;
    uint256 constant COLLATERAL = 25e6;

    function setUp() public {
        token = new MockUSDC();
        escrow = new Middleman(token, COST, treasury);
        pass = escrow.collection();
        vm.prank(treasury);
        pass.setAllowlisted(holder, true);
        address[3] memory parties = [holder, funder, buyer];
        for (uint256 i; i < parties.length; ++i) {
            token.mint(parties[i], 1000e6);
            vm.prank(parties[i]);
            token.approve(address(escrow), type(uint256).max);
        }
    }

    function propose(uint256 collateral, uint16 bps, uint256 price) internal returns (uint256 id) {
        vm.prank(holder);
        id = escrow.propose(holder, funder, collateral, bps, uint64(block.timestamp + 1 days), price);
    }

    function activate(uint256 id) internal {
        vm.prank(funder);
        escrow.accept(id);
    }

    function funded() internal returns (uint256 id) {
        id = propose(COLLATERAL, 6000, 300e6);
        activate(id);
        vm.prank(funder);
        escrow.fund(id);
        vm.prank(holder);
        escrow.postCollateral(id);
    }

    function locked() internal returns (uint256 id) {
        id = funded();
        vm.prank(holder);
        escrow.mintAndLock(id);
    }

    function testAtomicMintAndSale() public {
        uint256 id = locked();
        Middleman.Deal memory d = escrow.getDeal(id);
        assertEq(uint256(d.status), uint256(Middleman.Status.NFTLocked));
        assertEq(pass.ownerOf(d.tokenId), address(escrow));
        assertEq(token.balanceOf(holder), 975e6);
        assertEq(token.balanceOf(treasury), COST);
        assertEq(token.balanceOf(address(escrow)), COLLATERAL);
        assertEq(token.allowance(address(escrow), address(pass)), 0);
        vm.prank(buyer);
        escrow.buy(id);
        assertEq(pass.ownerOf(d.tokenId), buyer);
        assertEq(token.balanceOf(funder), 1120e6);
        assertEq(token.balanceOf(holder), 1080e6);
        assertEq(token.balanceOf(buyer), 700e6);
        assertEq(token.balanceOf(address(escrow)), 0);
        assertEq(uint256(escrow.getDeal(id).status), uint256(Middleman.Status.Sold));
    }

    function testEligibilityFailureKeepsPrincipalAndCollateral() public {
        uint256 id = funded();
        vm.prank(treasury);
        pass.setAllowlisted(holder, false);
        vm.expectRevert(DemoPass.NotEligible.selector);
        vm.prank(holder);
        escrow.mintAndLock(id);
        assertEq(token.balanceOf(address(escrow)), 125e6);
        assertEq(token.balanceOf(treasury), 0);
        assertFalse(pass.minted(holder));
        assertEq(token.allowance(address(escrow), address(pass)), 0);
        assertEq(uint256(escrow.getDeal(id).status), uint256(Middleman.Status.Funded));
    }

    function testCustodyCheckFailureRollsBackMintAndPayment() public {
        uint256 id = funded();
        vm.mockCall(address(pass), abi.encodeWithSelector(pass.ownerOf.selector, 1), abi.encode(holder));
        vm.expectRevert(Middleman.UnexpectedNFT.selector);
        vm.prank(holder);
        escrow.mintAndLock(id);
        vm.clearMockedCalls();
        assertEq(pass.nextTokenId(), 1);
        assertFalse(pass.minted(holder));
        assertEq(token.balanceOf(address(escrow)), 125e6);
        assertEq(token.balanceOf(treasury), 0);
    }

    function testRefundAtDeadlineAndNoLateMint() public {
        uint256 id = funded();
        vm.warp(escrow.getDeal(id).deliverBy);
        vm.expectRevert(Middleman.DeadlinePassed.selector);
        vm.prank(holder);
        escrow.mintAndLock(id);
        vm.prank(funder);
        escrow.claimRefund(id);
        assertEq(token.balanceOf(funder), 1025e6);
        assertEq(token.balanceOf(holder), 975e6);
        assertEq(token.balanceOf(address(escrow)), 0);
        vm.expectRevert(Middleman.WrongState.selector);
        vm.prank(funder);
        escrow.claimRefund(id);
    }

    function testNoEarlyOrPostMintRefund() public {
        uint256 id = funded();
        vm.expectRevert(Middleman.TooEarly.selector);
        vm.prank(funder);
        escrow.claimRefund(id);
        vm.prank(holder);
        escrow.mintAndLock(id);
        vm.warp(escrow.getDeal(id).deliverBy);
        vm.expectRevert(Middleman.WrongState.selector);
        vm.prank(funder);
        escrow.claimRefund(id);
    }

    function testPartialFundingReturnsOnlyDepositedAssets() public {
        uint256 id = propose(COLLATERAL, 6000, 300e6);
        activate(id);
        vm.prank(holder);
        escrow.postCollateral(id);
        vm.warp(escrow.getDeal(id).deliverBy);
        vm.prank(holder);
        escrow.claimRefund(id);
        assertEq(token.balanceOf(holder), 1000e6);
        assertEq(token.balanceOf(funder), 1000e6);
        assertEq(token.balanceOf(address(escrow)), 0);
    }

    function testMutualCancelAndDuplicateVoteBlocked() public {
        uint256 id = funded();
        vm.expectRevert(Middleman.WrongState.selector);
        vm.prank(holder);
        escrow.cancel(id);
        vm.prank(holder);
        escrow.agreeCancel(id);
        assertEq(token.balanceOf(address(escrow)), 125e6);
        vm.expectRevert(Middleman.WrongState.selector);
        vm.prank(holder);
        escrow.agreeCancel(id);
        vm.prank(funder);
        escrow.agreeCancel(id);
        assertEq(token.balanceOf(holder), 1000e6);
        assertEq(token.balanceOf(funder), 1000e6);
        assertEq(uint256(escrow.getDeal(id).status), uint256(Middleman.Status.Cancelled));
    }

    function testCancelPartialFunding() public {
        uint256 id = propose(COLLATERAL, 6000, 300e6);
        activate(id);
        vm.prank(funder);
        escrow.fund(id);
        vm.prank(holder);
        escrow.cancel(id);
        assertEq(token.balanceOf(funder), 1000e6);
        assertEq(token.balanceOf(address(escrow)), 0);
    }

    function testCounterpartyMustAcceptAndNonPartiesBlocked() public {
        uint256 id = propose(COLLATERAL, 6000, 300e6);
        vm.expectRevert(Middleman.Unauthorized.selector);
        vm.prank(holder);
        escrow.accept(id);
        vm.expectRevert(Middleman.Unauthorized.selector);
        vm.prank(buyer);
        escrow.accept(id);
        activate(id);
        vm.expectRevert(Middleman.Unauthorized.selector);
        vm.prank(buyer);
        escrow.fund(id);
        vm.expectRevert(Middleman.Unauthorized.selector);
        vm.prank(buyer);
        escrow.postCollateral(id);
        vm.expectRevert(Middleman.Unauthorized.selector);
        vm.prank(buyer);
        escrow.cancel(id);
        vm.expectRevert(DemoPass.OnlyEscrow.selector);
        vm.prank(buyer);
        pass.mintToEscrow(holder);
    }

    function testDoubleMintAndLegacyWithdrawalBlocked() public {
        uint256 id = locked();
        vm.expectRevert(Middleman.WrongState.selector);
        vm.prank(holder);
        escrow.mintAndLock(id);
        vm.prank(holder);
        (bool success,) = address(escrow).call(abi.encodeWithSignature("withdrawMintFunds(uint256)", id));
        assertFalse(success);
        assertEq(token.balanceOf(address(escrow)), COLLATERAL);
    }

    function testSaleBelowMintCostCoveredByCollateral() public {
        uint256 id = propose(COLLATERAL, 6000, 80e6);
        activate(id);
        vm.prank(holder);
        escrow.postCollateral(id);
        vm.prank(funder);
        escrow.fund(id);
        vm.prank(holder);
        escrow.mintAndLock(id);
        vm.prank(buyer);
        escrow.buy(id);
        assertEq(token.balanceOf(funder), 1000e6);
        assertEq(token.balanceOf(holder), 980e6);
        assertEq(token.balanceOf(address(escrow)), 0);
    }

    function testUncoveredLossRejected() public {
        vm.expectRevert(Middleman.InvalidTerms.selector);
        propose(COLLATERAL, 6000, 74e6);
    }

    function testZeroCollateralAndUnknownDeal() public {
        uint256 id = propose(0, 0, COST);
        activate(id);
        vm.prank(funder);
        escrow.fund(id);
        assertEq(uint256(escrow.getDeal(id).status), uint256(Middleman.Status.Funded));
        vm.expectRevert(Middleman.UnknownDeal.selector);
        escrow.getDeal(0);
    }

    function testRejectedBuyerRollsBackSale() public {
        uint256 id = locked();
        RejectingBuyer rejecting = new RejectingBuyer();
        token.mint(address(rejecting), 300e6);
        vm.prank(address(rejecting));
        token.approve(address(escrow), 300e6);
        vm.expectRevert("Cannot receive");
        vm.prank(address(rejecting));
        escrow.buy(id);
        assertEq(token.balanceOf(address(rejecting)), 300e6);
        assertEq(pass.ownerOf(escrow.getDeal(id).tokenId), address(escrow));
        assertEq(uint256(escrow.getDeal(id).status), uint256(Middleman.Status.NFTLocked));
    }

    function testMultipleDealsKeepOtherPrincipalUntouched() public {
        uint256 first = funded();
        uint256 second = funded();
        vm.prank(holder);
        escrow.mintAndLock(first);
        assertEq(token.balanceOf(address(escrow)), 150e6);
        vm.expectRevert(DemoPass.NotEligible.selector);
        vm.prank(holder);
        escrow.mintAndLock(second);
        vm.warp(escrow.getDeal(second).deliverBy);
        vm.prank(funder);
        escrow.claimRefund(second);
        assertEq(token.balanceOf(address(escrow)), COLLATERAL);
        vm.prank(buyer);
        escrow.buy(first);
        assertEq(token.balanceOf(address(escrow)), 0);
    }

    function testFuzzPayoutConservesFunds(uint128 rawPrice, uint128 rawCollateral, uint16 rawBps) public {
        uint256 price = bound(rawPrice, 1, type(uint128).max);
        uint256 collateral = bound(rawCollateral, price < COST ? COST - price : 0, type(uint128).max);
        uint16 bps = uint16(bound(rawBps, 0, 10_000));
        uint256 id = propose(collateral, bps, price);
        (uint256 f, uint256 h) = escrow.salePayout(id);
        assertEq(f + h, price + collateral);
        assertGe(f, COST);
        assertEq(f, COST + (price > COST ? (price - COST) * bps / 10_000 : 0));
        activate(id);
        token.mint(holder, collateral);
        token.mint(buyer, price);
        vm.prank(funder);
        escrow.fund(id);
        if (collateral != 0) {
            vm.prank(holder);
            escrow.postCollateral(id);
        }
        vm.prank(holder);
        escrow.mintAndLock(id);
        uint256 holderBefore = token.balanceOf(holder);
        uint256 funderBefore = token.balanceOf(funder);
        vm.prank(buyer);
        escrow.buy(id);
        assertEq(token.balanceOf(holder) - holderBefore, h);
        assertEq(token.balanceOf(funder) - funderBefore, f);
        assertEq(token.balanceOf(address(escrow)), 0);
    }
}
