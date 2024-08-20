//SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import "./ECDSA.sol";

contract BiDirectionalPaymentChannel {
    using ECDSA for bytes32;

    address payable[2] public users;
    mapping (address=>uint256) balances;
    mapping (address=>bool) isUser;

    uint256 public expiresAt;
    uint256 public challengePeriod;
    uint256 public nonce;

    modifier checkBalances(uint256[2] memory _balances) {
        require(address(this).balance >= _balances[0] + _balances[1], "Insufficient balance");
        _;
    }

    constructor (address payable[2] memory _users, uint256[2] memory _balances, uint256 _expiresAt, uint256 _challengePeriod) payable checkBalances(_balances) {
        require(_expiresAt > block.timestamp, "Invalid expiration time");
        require(_challengePeriod > 0, "Invalid challenge period");
        for(uint256 i = 0; i < _users.length; i++) {
            require(_users[i] != address(0), "Invalid user address");
            require(!isUser[_users[i]], "User already exists");
            isUser[_users[i]] = true;
            users[i] = _users[i];
            balances[_users[i]] = _balances[i];
        }

        expiresAt = _expiresAt;
        challengePeriod = _challengePeriod;
    }

    function verify(bytes[2] memory _signatures, address _contract, address[2] memory _signers, uint256[2] memory _balances, uint256 _nonce) public view returns (bool) {
        for (uint256 i = 0; i < _signers.length; i++) {
            bool valid = _signers[i] == 
                keccak256(abi.encodePacked(_contract, _balances[i], nonce)).toEthSignedMessageHash().recover(_signatures[i]);

            if(!valid) {
                return false;
            }
        }
        return true;
    }

    modifier checkSignatures(bytes[2] memory _signatures, uint256[2] memory _balances, uint256 _nonce) {
        address[2] memory signers;
        for(uint256 i = 0; i < users.length; i++) {
            signers[i] = users[i];
        }

        require(verify(_signatures, address(this), signers, _balances, _nonce), "Invalid signatures");
        _;
    }

    modifier onlyUser() {
        require(isUser[msg.sender], "Only users can call this function");
        _;
    }

    function withdraw() public onlyUser {
        require(block.timestamp > expiresAt, "Channel is not expired");
        require(isUser[msg.sender], "Only users can call this function");
        uint256 amount = balances[msg.sender];
        balances[msg.sender] = 0;
        (bool sent, ) = msg.sender.call{value: amount}("");
        require(sent, "Failed to send Ether");
    }

    function challengeExit(bytes[2] memory _signatures, uint256[2] memory _balances, uint256 _nonce) 
        public onlyUser checkSignatures(_signatures, _balances, _nonce) {
            require(block.timestamp < expiresAt, "Challenge period expired");
            require(_nonce > nonce, "Invalid nonce");

            for(uint256 i = 0; i < users.length; i++) {
                balances[users[i]] = _balances[i];
            }

            nonce = _nonce;
            expiresAt = block.timestamp + challengePeriod;
        }
}