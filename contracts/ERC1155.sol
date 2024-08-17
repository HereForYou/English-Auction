// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import './IERC1155.sol';

contract ERC1155 is IERC11155 {
    mapping (address => mapping (uint256 => uint256)) public balanceOf;
    mapping (address => mapping (address => bool)) public isApprovedForAll;

    function balanceOfBatch(address[] memory owners, uint256[] memory ids) public view returns (uint256[] memory) {
        require(owners.length == ids.length, "ERC1155: owners and ids length mismatch");
        uint256[] memory balances = new uint256[](owners.length);
        for(uint256 i = 0; i < owners.length; i++) {
            balances[i] = balanceOf[owners[i]][ids[i]];
        }
        return balances;
    }

    function setApprovalForAll(address operator, bool approved) public {
        isApprovedForAll[msg.sender][operator] = approved;
    }

    function safeTransferFrom(address from, address to, uint256 id, uint256 value, bytes memory data) public {
        require(msg.sender == from || isApprovedForAll[from][msg.sender], "ERC1155: caller is not owner nor approved");
        require(to != address(0), "ERC1155: transfer to the zero address");
        require(balanceOf[from][id] >= value, "ERC1155: insufficient balance for transfer");

        balanceOf[from][id] -= value;
        balanceOf[to][id] += value;

        require(to.code.length == 0 || IERC1155TokenReceiver(to).onERC1155Received(msg.sender, from, id, value, data) == IERC1155TokenReceiver.onERC1155Received.selector, "ERC1155: transfer to non ERC1155Receiver implementer");
    }

    function safeBatchTransferFrom(address from, address to, uint256[] memory ids, uint256[] memory values, bytes memory data) public {
        require(msg.sender == from || isApprovedForAll[from][msg.sender], "ERC1155: caller is not owner nor approved");
        require(to != address(0), "ERC1155: transfer to the zero address");
        require(ids.length == values.length, "ERC1155: ids and values length mismatch");

        for(uint256 i = 0; i < ids.length; i++) {
            require(balanceOf[from][ids[i]] >= values[i], "ERC1155: insufficient balance for transfer");
            balanceOf[from][ids[i]] -= values[i];
            balanceOf[to][ids[i]] += values[i];
        }

        require(to.code.length == 0 || IERC1155TokenReceiver(to).onERC1155BatchReceived(msg.sender, from, ids, values, data) == IERC1155TokenReceiver.onERC1155BatchReceived.selector, "ERC1155: transfer to non ERC1155Receiver implementer");
    }

    function supportsInterface(bytes4 interfaceId) external pure returns (bool) {
        return interfaceId == 0x01ffc9a7 // ERC165 Interface ID for ERC165
            || interfaceId == 0xd9b67a26 // ERC165 Interface ID for ERC1155
            || interfaceId == 0x0e89341c; // ERC165 Interface ID for ERC1155MetadataURI
    }

    function uri(uint256 id) public view virtual returns (string memory) {}

    function _mint(address to, uint256 id, uint256 value, bytes memory data) internal {
        require(to != address(0), "ERC1155: mint to the zero address");
        balanceOf[to][id] += value;

        require(to.code.length == 0 || IERC1155TokenReceiver(to).onERC1155Received(msg.sender, address(0), id, value, data) == IERC1155TokenReceiver.onERC1155Received.selector, "ERC1155: mint to non ERC1155Receiver implementer");
    }

    function _batchMint(address to, uint256[] memory ids, uint256[] memory values, bytes memory data) internal {
        require(to != address(0), "ERC1155: mint to the zero address");
        require(ids.length == values.length, "ERC1155: ids and values length mismatch");
        for(uint256 i = 0; i < ids.length; i++) {
            balanceOf[to][ids[i]] += values[i];
        }

        require(to.code.length == 0 || IERC1155TokenReceiver(to).onERC1155BatchReceived(msg.sender, address(0), ids, values, data) == IERC1155TokenReceiver.onERC1155BatchReceived.selector, "ERC1155: mint to non ERC1155Receiver implementer");
    }

    function _burn(address from, uint256 id, uint256 value) internal {
        require(from != address(0), "ERC1155: burn from the zero address");
        balanceOf[from][id] -= value;
    }
    
    function _batchBurn(address from, uint256[] memory ids, uint256[] memory values) internal {
        require(from != address(0), "ERC1155: burn from the zero address");
        require(ids.length == values.length, "ERC1155: ids and values length mismatch");
        for(uint256 i = 0; i < ids.length; i++) {
            balanceOf[from][ids[i]] -= values[i];
        }
    }
}

contract MultiSmartFox is ERC1155 {
    function mint(uint256 id, uint256 value, bytes memory data) public {
        _mint(msg.sender, id, value, data);
    }

    function batcMint(uint256[] memory ids, uint256[] memory values, bytes memory data) public {
        _batchMint(msg.sender, ids, values, data);
    }

    function burn(uint256 id, uint256 value) public {
        _burn(msg.sender, id, value);
    }

    function batchBurn(uint256[] memory ids, uint256[] memory values) public {
        _batchBurn(msg.sender, ids, values);
    }
}