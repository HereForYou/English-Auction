//SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

contract TimeLock {
    error NotOwner();
    error AlreadyQueuedError(bytes32 txId);
    error TimestampNotInRangeError(uint256 blockTimestamp, uint256 timestamp);
    error TimestampNotPassedError(uint256 blockTimestamp, uint256 timestamp);
    error TimestampExpiredError(uint256 blockTimestamp, uint256 timestamp);
    error TxFailedError(bytes32 txId);
    error NotQueuedError(bytes32 txId);

    event Queue(
        bytes32 indexed txId,
        address indexed target,
        uint256 value,
        string func,
        bytes data,
        uint256 timestamp
    );

    event Execute(
        bytes32 indexed txId,
        address indexed target,
        uint256 value,
        string func,
        bytes data,
        uint256 timestamp
    );

    event Cancel(bytes32 indexed txId);

    uint256 public constant MIN_DELAY = 10;
    uint256 public constant MAX_DELAY = 1000;
    uint256 public constant GRACE_PERIOD = 1000;

    address public owner;
    mapping(bytes32 => bool) public queued;

    constructor() {
        owner = msg.sender;
    }

    modifier onlyOwner() {
        require(msg.sender == owner, "Not owner");
        _;
    }

    function getTxId(address _target, uint256 _value, string memory _func, bytes memory _data, uint256 _timestamp) public pure returns (bytes32) {
        return keccak256(abi.encode(_target, _value, _func, _data, _timestamp));
    }

    function queue(address _target, uint256 _value, string memory _func, bytes memory _data, uint256 _timestamp) external onlyOwner returns (bytes32 txId) {
        txId = getTxId(_target, _value, _func, _data, _timestamp);

        if(queued[txId]) {
            revert AlreadyQueuedError(txId);
        }
        if(_timestamp < block.timestamp + MIN_DELAY || _timestamp > block.timestamp + MAX_DELAY) {
            revert TimestampNotInRangeError(block.timestamp, _timestamp);
        }
        queued[txId] = true;
        emit Queue(txId, _target, _value, _func, _data, _timestamp);
    }

    function execute(address _target, uint256 _value, string memory _func, bytes memory _data, uint256 _timestamp) external payable onlyOwner returns (bytes memory) {
        bytes32 txId = getTxId(_target, _value, _func, _data, _timestamp);
        if(!queued[txId]) {
            revert NotQueuedError(txId);
        }
        if(_timestamp > block.timestamp) {
            revert TimestampNotPassedError(block.timestamp, _timestamp);
        }
        if(block.timestamp > _timestamp + GRACE_PERIOD) {
            revert TimestampExpiredError(block.timestamp, _timestamp);
        }

        queued[txId] = false;

        bytes memory data;
        if(bytes(_func).length > 0){
            data = abi.encodePacked(bytes4(keccak256(bytes(_func))), _data);
        } else {
            data = _data;
        }

        (bool ok, bytes memory res) = _target.call{value: _value}(data);

        if(!ok) {
            revert TxFailedError(txId);
        }

        emit Execute(txId, _target, _value, _func, _data, _timestamp);

        return res;
    }

    function cancel(bytes32 _txId) external onlyOwner {
        if(!queued[_txId]) {
            revert NotQueuedError(_txId);
        }
        queued[_txId] = false;

        emit Cancel(_txId);
    }
}