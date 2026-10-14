// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";

/// @notice Deliberately integrated collection, not an adapter for arbitrary whitelists.
contract DemoPass is ERC721, Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable usdc;
    address public immutable escrow;
    address public immutable treasury;
    uint256 public immutable mintPrice;
    uint256 public nextTokenId = 1;
    mapping(address => bool) public allowlisted;
    mapping(address => bool) public minted;

    error NotEligible();
    error OnlyEscrow();
    error InvalidConfiguration();
    event AllowlistUpdated(address indexed wallet, bool allowed);
    event Minted(address indexed holder, address indexed recipient, uint256 indexed tokenId);

    constructor(IERC20 usdc_, uint256 price_, address owner_, address escrow_)
        ERC721("Middleman DemoPass", "MMPASS")
        Ownable(owner_)
    {
        if (
            address(usdc_).code.length == 0 || price_ == 0 || price_ > type(uint128).max
                || escrow_ == address(0) || owner_ == escrow_
        ) revert InvalidConfiguration();
        usdc = usdc_;
        mintPrice = price_;
        treasury = owner_;
        escrow = escrow_;
    }

    function setAllowlisted(address wallet, bool allowed) external onlyOwner {
        allowlisted[wallet] = allowed;
        emit AllowlistUpdated(wallet, allowed);
    }

    function mint() external nonReentrant returns (uint256) {
        return _mintPass(msg.sender, msg.sender);
    }

    function mintToEscrow(address holder) external nonReentrant returns (uint256) {
        if (msg.sender != escrow) revert OnlyEscrow();
        return _mintPass(holder, escrow);
    }

    function _mintPass(address holder, address recipient) private returns (uint256 tokenId) {
        if (!allowlisted[holder] || minted[holder]) revert NotEligible();
        minted[holder] = true;
        tokenId = nextTokenId++;
        usdc.safeTransferFrom(msg.sender, treasury, mintPrice);
        _safeMint(recipient, tokenId);
        emit Minted(holder, recipient, tokenId);
    }

    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        _requireOwned(tokenId);
        string memory svg = Base64.encode(
            bytes(
                '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="600" viewBox="0 0 600 600">'
                '<rect width="600" height="600" fill="black"/><g fill="white" font-family="monospace" font-size="24">'
                '<text x="60" y="200">+----------------------------+</text>'
                '<text x="60" y="250">|       [ MIDDLEMAN ]         |</text>'
                '<text x="60" y="300">|        DEMO PASS           |</text>'
                '<text x="60" y="350">+----------------------------+</text>'
                '<text x="60" y="440">A spot. A backer. One vault.</text></g></svg>'
            )
        );
        return string.concat(
            "data:application/json;base64,",
            Base64.encode(
                bytes(
                    string.concat(
                        '{"name":"Middleman DemoPass","description":"Demo collection. No investment return guaranteed.","image":"data:image/svg+xml;base64,',
                        svg,
                        '"}'
                    )
                )
            )
        );
    }
}
