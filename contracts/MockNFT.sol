// SPDX-License-Identifier: GPL-3.0

pragma solidity ^0.8.0;

contract MockNFT {
    mapping(uint256 => address) public owners;
    uint256 public totalSupply;

    function mint(address to, uint256 tokenId) external {
        owners[tokenId] = to;
        totalSupply++;
    }

    function safeTransferFrom(address from, address to, uint256 tokenId) external {
        require(owners[tokenId] == from, "Not the owner");
        owners[tokenId] = to;
    }

    function transferFrom(address from, address to, uint256 tokenId) external {
        require(owners[tokenId] == from, "Not the owner");
        owners[tokenId] = to;
    }

    function ownerOf(uint256 tokenId) external view returns (address) {
        return owners[tokenId];
    }
}
