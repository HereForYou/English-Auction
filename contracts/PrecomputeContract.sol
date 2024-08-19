// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

contract Factory {
    function deploy (address _owner, uint256 _foo, bytes32 _salt) public payable returns (address) {
        return address(new FactoryTestContract{salt: _salt}(_owner, _foo));
    }
}

contract FactoryTestContract {
    address public owner;
    uint256 public foo;
    constructor(address _owner, uint256 _foo) payable {
        owner = _owner;
        foo = _foo;
    }

    function getBalance() public view returns (uint256) {
        return address(this).balance;
    }
}