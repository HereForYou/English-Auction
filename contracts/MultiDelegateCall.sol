//SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

contract MultiDelegateCall {
    error DelegatecallFailed();

    function multiDelegatecall(bytes[] memory data)
        external
        payable
        returns (bytes[] memory)
    {
        bytes[] memory results = new bytes[](data.length);

        for (uint256 i; i < data.length; i++) {
            (bool ok, bytes memory res) = address(this).delegatecall(data[i]);
            if (!ok) {
                revert DelegatecallFailed();
            }
            results[i] = res;
        }
        return results;
    }
}

contract TestMultiDelegateCall is MultiDelegateCall {
    function func1(uint256 x, uint256 y) external pure returns (uint256) {
        return x + y;
    }

    function func2() external pure returns (uint256) {
        return 123;
    }

    mapping (address=>uint256) public balanceOf;

    function mint() external payable {
        balanceOf[msg.sender] += msg.value;
    }
}

contract HelperTestMultiDelegateCall {
    function getFunc1Data(uint256 x, uint256 y) external pure returns (bytes memory) {
        return abi.encodeWithSelector(TestMultiDelegateCall.func1.selector, x, y);
    }

    function getFunc2Data() external pure returns (bytes memory) {
        return abi.encodeWithSelector(TestMultiDelegateCall.func2.selector);
    }

    function getMiintData() external pure returns (bytes memory) {
        return abi.encodeWithSelector(TestMultiDelegateCall.mint.selector);
    }
}