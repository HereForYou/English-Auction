//SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

import "./ERC20.sol";

contract UniswapV2Swap {
    address private constant UNISWAP_V2_ROUTER = 0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D;

    address private constant WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2;
    address private constant DAI = 0x6B175474E89094C44Da98b954EedeAC495271d0F;
    address private constant USDC = 0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48;

    IUniswapV2Router private router = IUniswapV2Router(UNISWAP_V2_ROUTER);
    IERC20 private dai = IERC20(DAI);
    // IERC20 private usdc = IERC20(USDC);
    IERC20 private weth = IERC20(WETH);

    function swapSingleHopExactAmountIn(uint256 amountIn, uint256 amountOutMin) external returns(uint256 amountOut){
        weth.transferFrom(msg.sender, address(this), amountIn);
        weth.approve(address(router), amountIn);

        address[] memory path;
        path = new address[](2);
        path[0] = WETH;
        path[1] = DAI;

        uint256[] memory amounts = router.swapExactTokensForTokens(amountIn, amountOutMin, path, msg.sender, block.timestamp);

        return amounts[1];
    }

    function swapMultiHopExactAmountIn(uint256 amountIn, uint256 amountOutMin) external returns(uint256 amountOut){
        dai.transferFrom(msg.sender, address(this), amountIn);
        dai.approve(address(router), amountIn);

        address[] memory path;
        path = new address[](3);
        path[0] = DAI;
        path[1] = WETH;
        path[2] = USDC;

        uint256[] memory amounts = router.swapExactTokensForTokens(amountIn, amountOutMin, path, msg.sender, block.timestamp);
        return amounts[2];
    }

    function swapSingleHopExactAmountOut(uint256 amountOutDesired, uint256 amountInMax) external returns(uint256 amountOut){
        weth.transferFrom(msg.sender, address(this), amountInMax);
        weth.approve(address(router), amountInMax);

        address[] memory path;
        path = new address[](2);
        path[0] = WETH;
        path[1] = DAI;

        uint256[] memory amounts = router.swapTokensForExactTokens(amountOutDesired, amountInMax, path, msg.sender, block.timestamp);

        if(amounts[0] < amountInMax){
            weth.transfer(msg.sender, amountInMax - amounts[0]);
        }

        return amounts[1];
    }

    function swapMultiHopExactAmountOut(uint256 amountOutDesired, uint256 amountInMax) external returns(uint256 amountOut){
        dai.transferFrom(msg.sender, address(this), amountInMax);
        dai.approve(address(router), amountInMax);

        address[] memory path;
        path = new address[](3);
        path[0] = DAI;
        path[1] = WETH;
        path[2] = USDC;

        uint256[] memory amounts = router.swapTokensForExactTokens(amountOutDesired, amountInMax, path, msg.sender, block.timestamp);

        if(amounts[0] < amountInMax){
            dai.transfer(msg.sender, amountInMax - amounts[0]);
        }

        return amounts[2];
    }
}

contract TestUniswapToken is ERC20 {
    constructor (string memory name, string memory symbol, uint256 initialSupply) ERC20(name, symbol, 18) {
        _mint(msg.sender, initialSupply);
    }
}

interface IUniswapV2Router {
    function swapExactTokensForTokens(
        uint amountIn,
        uint amountOutMin,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);

    function swapTokensForExactTokens(
        uint amountOut,
        uint amountInMax,
        address[] calldata path,
        address to,
        uint deadline
    ) external returns (uint[] memory amounts);
}

// interface IERC20 {
//     function totalSupply() external view returns (uint256);
//     function balanceOf(address account) external view returns (uint256);
//     function transfer(address recipient, uint256 amount) external  returns (bool);
//     function allowance(address owner, address spender) external view returns (uint256);
//     function approve(address spender, uint256 amount) external returns (bool);
//     function transferFrom(address sender, address recipient, uint256 amount) external returns(bool);
// }

interface IWETH is IERC20 {
    function deposit() external payable;
    function withdraw(uint256 amount) external;
}