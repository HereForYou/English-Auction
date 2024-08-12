// SPDX-License-Identifier: GPL-3.0
pragma solidity ^0.8.24;

interface IERC721 {
    function safeTransferFrom(address from, address to, uint256 amount) external;
    function transferFrom(address, address, uint256) external;
}

contract EnglishAuction {
    event Start();
    event Bid(address indexed sender, uint256 amount);
    event Withdraw(address indexed bidder, uint256 amount);
    event End(address winner, uint256 amount);

    IERC721 public nft;
    uint256 public nftId;

    address payable seller;
    uint256 public endAt;
    bool public started;
    bool public ended;

    address public highestBidder;
    uint256 public highestBid;
    mapping (address=>uint256) public bids;

    constructor(address _nft, uint256 _nftId, uint256 startBid) {
        nft = IERC721(_nft);
        nftId = _nftId;

        seller = payable(msg.sender);
        highestBid = startBid;
    }

    function start() external {
        require(!started, "Auction has been already started");
        require(seller == msg.sender, "You are not seller");

        nft.transferFrom(msg.sender, address(this), nftId);
        started = true;
        endAt = block.timestamp + 7 days;

        emit Start();
    }

    function bid() external payable {
        require(started, "Auction is not started yet.");
        require(block.timestamp < endAt, "Auction has been already ended.");
        require(msg.value > highestBid, "Cost is not enough");

        if(highestBidder != address(0)) {
            bids[highestBidder] += highestBid;
        }

        highestBid = msg.value;
        highestBidder = msg.sender;
    }

    function withdraw() external {
        uint256 bal = bids[msg.sender];
        bids[msg.sender] = 0;
        payable(msg.sender).transfer(bal);

        emit Withdraw(msg.sender, bal);
    }

    function end() external {
        require(started, "Auction hasn't been started yet");
        require(block.timestamp > endAt, "Auction hasn't ended yet");
        require(!ended, "Auction has been already ended.");
        require(seller == msg.sender, "You are not seller");

        ended = true;
        if (highestBidder != address(0)) {
            nft.safeTransferFrom(address(this), highestBidder, nftId);
            seller.transfer(highestBid);
        } else {
            nft.safeTransferFrom(address(this), seller, nftId);
        }

        emit End(highestBidder,highestBid);
    }
}