//SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import "./ECDSA.sol";

contract ReentrancyGuard {
    bool private locked;

    modifier guard() {
        require(!locked, "ReentrancyGuard: reentrant call");
        locked = true;
        _;
        locked = false;
    }
}

contract UniDirectionalPaymentChannel is ReentrancyGuard {
    using ECDSA for bytes32;
    address payable public sender;
    address payable public reciever;

    uint256 private duration = 7 * 24 * 60 * 60;
    uint256 public expiresAt;

    constructor (address payable _receiver) payable {
        require(_receiver != address(0), "Invalid receiver address");
        reciever = _receiver;
        sender = payable(msg.sender);
        expiresAt = block.timestamp + duration;
    }

    function _getHash(uint256 _amount) private view returns (bytes32) {
        return keccak256(abi.encodePacked(address(this), _amount));
    }

    function getHash(uint256 _amount) external view returns (bytes32) {
        return _getHash(_amount);
    }

    function _getEthSignedHash(uint256 _amount) private view returns (bytes32) {
        return _getHash(_amount).toEthSignedMessageHash();
    }

    function getEthsignedHash(uint256 _amount) external view returns (bytes32) {
       return  _getEthSignedHash(_amount);
    }

    function _verify(uint256 _amount, bytes memory _sig) private view returns (bool) {
        return _getEthSignedHash(_amount).recover(_sig) == sender;
    }

    function verify(uint256 _amount, bytes memory _sig) external view returns (bool) {
        return _verify(_amount, _sig);
    }

    function close(uint256 _amount, bytes memory _sig) external guard {
        require(msg.sender == reciever, "Only receiver can close the channel");
        require(_verify(_amount, _sig), "Invalid signature");

        (bool send, ) = reciever.call{value: _amount}("");
        require(send, "Failed to send Ether");
        selfdestruct(sender);
    }
    
    function cancel() external {
        require(msg.sender == sender, "Only sender can cancel the channel");
        require(block.timestamp >= expiresAt, "Channel is not expired yet");
        selfdestruct(sender);
    }
}