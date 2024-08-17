// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

interface IERC11155 {
    function seafeTransferfrom(address from, address to, uint256 id, uint256 value, bytes calldata data) external;
    function safeBatchTransferFrom(address from, address to, uint256[] ids, uint256[] values, bytes calldata data) external;
    function balanceOf(address owner, uint256 id) external view returns (uint256);
    function balanceOfBatch(address[] calldata owners, uint256[] calldata ids) external view returns (uint256[] memory);
    function setApprovalForAll(address spender, bool approved) external;
    function isApprovedForAll(address owner, address spender) external view returns (bool);
}

interface IERC1155TokenReceiver {
    function onERC1155Received(address operator, address from, uint256 id, uint256 value, bytes calldata data) external returns (bytes4);
    function onERC1155BatchReceived(address operator, address from, uint256[] calldata ids, uint256[] calldata values, bytes calldata data) external returns (bytes4);
}