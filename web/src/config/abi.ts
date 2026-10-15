import { parseAbi } from "viem";

export const middlemanAbi = parseAbi([
  "function collection() view returns (address)",
  "function usdc() view returns (address)",
  "function nextDealId() view returns (uint256)",
  "function getDeal(uint256 id) view returns ((address holder,address funder,address nft,uint256 tokenId,uint256 mintCost,uint256 collateral,uint16 funderBps,uint64 deliverBy,uint256 salePrice,uint8 status,address proposer,bool principalDeposited,bool collateralDeposited,uint8 cancelVotes))",
  "function salePayout(uint256 id) view returns (uint256 funderPayout,uint256 holderPayout)",
  "function propose(address holder,address funder,uint256 collateral,uint16 funderBps,uint64 deliverBy,uint256 salePrice) returns (uint256 id)",
  "function accept(uint256 id)", "function fund(uint256 id)", "function postCollateral(uint256 id)",
  "function mintAndLock(uint256 id)", "function buy(uint256 id)", "function cancel(uint256 id)",
  "function agreeCancel(uint256 id)", "function claimRefund(uint256 id)",
  "event Proposed(uint256 indexed id,address indexed holder,address indexed funder)",
  "event Accepted(uint256 indexed id)", "event PrincipalDeposited(uint256 indexed id,uint256 amount)",
  "event CollateralDeposited(uint256 indexed id,uint256 amount)", "event Funded(uint256 indexed id)",
  "event NFTLocked(uint256 indexed id,uint256 indexed tokenId)",
  "event Sold(uint256 indexed id,address indexed buyer,uint256 funderPayout,uint256 holderPayout)",
  "event Refunded(uint256 indexed id,uint256 funderPayout,uint256 holderPayout)",
  "event CancellationAgreed(uint256 indexed id,address indexed party)", "event Cancelled(uint256 indexed id)",
  "error InvalidTerms()", "error UnknownDeal()", "error Unauthorized()", "error WrongState()",
  "error DeadlinePassed()", "error TooEarly()", "error AlreadyDeposited()", "error UnexpectedNFT()", "error IncorrectAmount()",
]);

export const demoPassAbi = parseAbi([
  "function owner() view returns (address)",
  "function escrow() view returns (address)", "function usdc() view returns (address)",
  "function mintPrice() view returns (uint256)", "function allowlisted(address) view returns (bool)",
  "function minted(address) view returns (bool)", "function ownerOf(uint256) view returns (address)",
  "function mint() returns (uint256)", "error NotEligible()", "error OnlyEscrow()",
]);
