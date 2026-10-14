// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC721Receiver} from "@openzeppelin/contracts/token/ERC721/IERC721Receiver.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {DemoPass} from "./DemoPass.sol";

/// @notice No principal withdrawal. USDC payment and NFT custody are one transaction.
contract Middleman is ReentrancyGuard, IERC721Receiver {
    using SafeERC20 for IERC20;

    enum Status {
        Proposed,
        Active,
        Funded,
        NFTLocked,
        Sold,
        Refunded,
        Cancelled
    }

    struct Deal {
        address holder;
        address funder;
        address nft;
        uint256 tokenId;
        uint256 mintCost;
        uint256 collateral;
        uint16 funderBps;
        uint64 deliverBy;
        uint256 salePrice;
        Status status;
        address proposer;
        bool principalDeposited;
        bool collateralDeposited;
        uint8 cancelVotes;
    }

    IERC20 public immutable usdc;
    DemoPass public immutable collection;
    uint256 public nextDealId = 1;
    mapping(uint256 => Deal) private _deals;
    bool private _receivingMint;

    error InvalidTerms();
    error UnknownDeal();
    error Unauthorized();
    error WrongState();
    error DeadlinePassed();
    error TooEarly();
    error AlreadyDeposited();
    error UnexpectedNFT();
    error IncorrectAmount();

    event Proposed(uint256 indexed id, address indexed holder, address indexed funder);
    event Accepted(uint256 indexed id);
    event PrincipalDeposited(uint256 indexed id, uint256 amount);
    event CollateralDeposited(uint256 indexed id, uint256 amount);
    event Funded(uint256 indexed id);
    event NFTLocked(uint256 indexed id, uint256 indexed tokenId);
    event Sold(uint256 indexed id, address indexed buyer, uint256 funderPayout, uint256 holderPayout);
    event Refunded(uint256 indexed id, uint256 funderPayout, uint256 holderPayout);
    event CancellationAgreed(uint256 indexed id, address indexed party);
    event Cancelled(uint256 indexed id);

    constructor(IERC20 usdc_, uint256 mintPrice_, address collectionOwner_) {
        usdc = usdc_;
        collection = new DemoPass(usdc_, mintPrice_, collectionOwner_, address(this));
    }

    function getDeal(uint256 id) external view returns (Deal memory) {
        return _deal(id);
    }

    function propose(
        address holder,
        address funder,
        uint256 collateral,
        uint16 funderBps,
        uint64 deliverBy,
        uint256 salePrice
    ) external nonReentrant returns (uint256 id) {
        if (msg.sender != holder && msg.sender != funder) revert Unauthorized();
        uint256 mintCost = collection.mintPrice();
        if (
            holder == address(0) || funder == address(0) || holder == funder || holder == address(this)
                || funder == address(this) || collateral > type(uint128).max || salePrice == 0
                || salePrice > type(uint128).max || funderBps > 10_000 || deliverBy <= block.timestamp
                || (salePrice < mintCost && collateral < mintCost - salePrice)
        ) revert InvalidTerms();
        id = nextDealId++;
        _deals[id] = Deal({
            holder: holder,
            funder: funder,
            nft: address(collection),
            tokenId: 0,
            mintCost: mintCost,
            collateral: collateral,
            funderBps: funderBps,
            deliverBy: deliverBy,
            salePrice: salePrice,
            status: Status.Proposed,
            proposer: msg.sender,
            principalDeposited: false,
            collateralDeposited: collateral == 0,
            cancelVotes: 0
        });
        emit Proposed(id, holder, funder);
    }

    function accept(uint256 id) external nonReentrant {
        Deal storage d = _deal(id);
        _party(d);
        if (msg.sender == d.proposer) revert Unauthorized();
        if (d.status != Status.Proposed) revert WrongState();
        _beforeDeadline(d);
        d.status = Status.Active;
        emit Accepted(id);
    }

    function fund(uint256 id) external nonReentrant {
        Deal storage d = _deal(id);
        if (msg.sender != d.funder) revert Unauthorized();
        if (d.status != Status.Active) revert WrongState();
        _beforeDeadline(d);
        if (d.principalDeposited) revert AlreadyDeposited();
        d.principalDeposited = true;
        _collect(msg.sender, d.mintCost);
        emit PrincipalDeposited(id, d.mintCost);
        _markFunded(id, d);
    }

    function postCollateral(uint256 id) external nonReentrant {
        Deal storage d = _deal(id);
        if (msg.sender != d.holder) revert Unauthorized();
        if (d.status != Status.Active) revert WrongState();
        _beforeDeadline(d);
        if (d.collateralDeposited) revert AlreadyDeposited();
        d.collateralDeposited = true;
        _collect(msg.sender, d.collateral);
        emit CollateralDeposited(id, d.collateral);
        _markFunded(id, d);
    }

    function mintAndLock(uint256 id) external nonReentrant {
        Deal storage d = _deal(id);
        if (msg.sender != d.holder) revert Unauthorized();
        if (d.status != Status.Funded) revert WrongState();
        _beforeDeadline(d);
        d.status = Status.NFTLocked;
        d.cancelVotes = 0;
        uint256 balanceBefore = usdc.balanceOf(address(this));
        usdc.forceApprove(address(collection), d.mintCost);
        _receivingMint = true;
        uint256 tokenId = collection.mintToEscrow(d.holder);
        _receivingMint = false;
        usdc.forceApprove(address(collection), 0);
        if (collection.ownerOf(tokenId) != address(this)) revert UnexpectedNFT();
        if (usdc.balanceOf(address(this)) != balanceBefore - d.mintCost) revert IncorrectAmount();
        d.tokenId = tokenId;
        emit NFTLocked(id, tokenId);
    }

    function buy(uint256 id) external nonReentrant {
        Deal storage d = _deal(id);
        if (d.status != Status.NFTLocked) revert WrongState();
        (uint256 funderPayout, uint256 holderPayout) = _payout(d);
        d.status = Status.Sold;
        _collect(msg.sender, d.salePrice);
        collection.safeTransferFrom(address(this), msg.sender, d.tokenId);
        _pay(d.funder, funderPayout);
        _pay(d.holder, holderPayout);
        emit Sold(id, msg.sender, funderPayout, holderPayout);
    }

    function salePayout(uint256 id) external view returns (uint256 funderPayout, uint256 holderPayout) {
        return _payout(_deal(id));
    }

    /// @notice Fully funded non-delivery is penalized; incomplete funding refunds each depositor.
    function claimRefund(uint256 id) external nonReentrant {
        Deal storage d = _deal(id);
        _party(d);
        if (d.status != Status.Active && d.status != Status.Funded) revert WrongState();
        if (block.timestamp < d.deliverBy) revert TooEarly();
        uint256 funderPayout = d.principalDeposited ? d.mintCost : 0;
        uint256 holderPayout = d.collateralDeposited ? d.collateral : 0;
        if (d.status == Status.Funded) {
            funderPayout += holderPayout;
            holderPayout = 0;
        }
        d.status = Status.Refunded;
        _pay(d.funder, funderPayout);
        _pay(d.holder, holderPayout);
        emit Refunded(id, funderPayout, holderPayout);
    }

    function cancel(uint256 id) external nonReentrant {
        Deal storage d = _deal(id);
        _party(d);
        if (d.status != Status.Proposed && d.status != Status.Active) revert WrongState();
        _cancel(id, d);
    }

    function agreeCancel(uint256 id) external nonReentrant {
        Deal storage d = _deal(id);
        _party(d);
        if (d.status != Status.Funded) revert WrongState();
        uint8 vote = msg.sender == d.holder ? 1 : 2;
        if (d.cancelVotes & vote != 0) revert WrongState();
        d.cancelVotes |= vote;
        emit CancellationAgreed(id, msg.sender);
        if (d.cancelVotes == 3) _cancel(id, d);
    }

    function onERC721Received(address operator, address from, uint256, bytes calldata)
        external
        view
        returns (bytes4)
    {
        if (
            msg.sender != address(collection) || !_receivingMint || from != address(0)
                || operator != address(this)
        ) revert UnexpectedNFT();
        return IERC721Receiver.onERC721Received.selector;
    }

    function _deal(uint256 id) private view returns (Deal storage d) {
        if (id == 0 || id >= nextDealId) revert UnknownDeal();
        d = _deals[id];
    }

    function _party(Deal storage d) private view {
        if (msg.sender != d.holder && msg.sender != d.funder) revert Unauthorized();
    }

    function _beforeDeadline(Deal storage d) private view {
        if (block.timestamp >= d.deliverBy) revert DeadlinePassed();
    }

    function _markFunded(uint256 id, Deal storage d) private {
        if (d.principalDeposited && d.collateralDeposited) {
            d.status = Status.Funded;
            emit Funded(id);
        }
    }

    function _payout(Deal storage d) private view returns (uint256 funderPayout, uint256 holderPayout) {
        funderPayout = d.mintCost;
        if (d.salePrice > d.mintCost) funderPayout += (d.salePrice - d.mintCost) * d.funderBps / 10_000;
        holderPayout = d.salePrice + d.collateral - funderPayout;
    }

    function _collect(address from, uint256 amount) private {
        uint256 beforeBalance = usdc.balanceOf(address(this));
        usdc.safeTransferFrom(from, address(this), amount);
        if (usdc.balanceOf(address(this)) != beforeBalance + amount) revert IncorrectAmount();
    }

    function _pay(address to, uint256 amount) private {
        if (amount != 0) usdc.safeTransfer(to, amount);
    }

    function _cancel(uint256 id, Deal storage d) private {
        d.status = Status.Cancelled;
        _pay(d.funder, d.principalDeposited ? d.mintCost : 0);
        _pay(d.holder, d.collateralDeposited ? d.collateral : 0);
        emit Cancelled(id);
    }
}
