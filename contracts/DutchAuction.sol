// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

interface IERC721 {
    function transferFrom(address, address, uint256) external;
}

contract DutchAuction {
    uint256 private constant DURATION = 7 days;

    IERC721 public immutable nft;
    uint256 public immutable nftId;

    address payable public immutable seller;
    uint256 public immutable startingPrice;
    uint256 public immutable startAt;
    uint256 public immutable expiresAt;
    uint256 public immutable discountRate;


    constructor(uint256 _startingPrice, uint256 _discountRate, address _nft, uint256 _nftId) {
        seller = payable(msg.sender);
        startingPrice = _startingPrice;
        startAt = block.timestamp;
        expiresAt = block.timestamp + DURATION;
        discountRate = _discountRate;

        require(_startingPrice > _discountRate * DURATION, "startingPrice isn't enough.");

        nft = IERC721(_nft);
        nftId = _nftId;
    }
    
    function getPrice() public view returns(uint256) {
        uint256 timeElapsed = block.timestamp - startAt;
        uint256 discount = timeElapsed * discountRate;
        return startingPrice - discount;
    }

    function buy() external payable {
        require(block.timestamp < expiresAt, "Auction has been ended.");

        uint256 price = getPrice();
        require(msg.value >= price, "cost < price");

        nft.transferFrom(seller, msg.sender, nftId);
        uint256 refund = msg.value - price;
        if(refund > 0) {
            payable(msg.sender).transfer(refund);
        }
        selfdestruct(seller);
    }
}