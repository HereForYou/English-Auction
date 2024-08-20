//SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;



import "./ERC20.sol";

contract MockERC20 is ERC20 {
    constructor(uint256 initialSupply) ERC20("Mock Token", "MTK", 18) {
        _mint(msg.sender, initialSupply);
    }
}

// interface IERC20 {
//     function transfer(address, uint256) external returns (bool);
//     function transferFrom(address, address, uint256) external returns (bool);
// }


contract CrowdFund {
    // State variables

    struct Campaign {
        address creator;
        uint256 goal;
        uint256 pledged;
        uint256 startAt;
        uint256 endAt;
        bool claimed;
    }

    IERC20 public immutable token;
    mapping (uint256=>Campaign) public campaigns;
    uint256 public count;
    mapping (uint256=>mapping (address=>uint256)) public pledgedAmount;

    constructor(address _token) {
        token = IERC20(_token);
    }

    function launch(uint256 _goal, uint256 _startAt, uint256 _endAt) external {
        require(_startAt >= block.timestamp, "start at must be greater than current time");
        require(_endAt > _startAt, "end at must be greater than start at");
        require(_goal > 0, "Goal must be greater than 0");
        require(_endAt <= block.timestamp + 30 days, "End at must be less than 30 days from now");
        count += 1;
        campaigns[count] = Campaign({
            creator: msg.sender,
            goal: _goal,
            pledged: 0,
            startAt: _startAt,
            endAt: _endAt,
            claimed: false
        });
    }

    function cancel(uint256 _id) external {
        require(campaigns[_id].creator == msg.sender, "Only creator can cancel campaign");
        require(block.timestamp < campaigns[_id].startAt, "Campaign has already started");
        delete campaigns[_id];
    }

    function pledge(uint256 _id, uint256 _amount) external {
        Campaign storage campaign = campaigns[_id];
        require(block.timestamp >= campaign.startAt, "Campaign has not started yet");
        require(block.timestamp <= campaign.endAt, "Campaign has ended");
        campaign.pledged += _amount;
        pledgedAmount[_id][msg.sender] += _amount;
        token.transferFrom(msg.sender, address(this), _amount);
    }

    function upPledge(uint256 _id, uint256 _amount) external {
        Campaign memory campaign = campaigns[_id];
        require(block.timestamp >= campaign.startAt, "Campaign has not started yet");
        require(block.timestamp <= campaign.endAt, "Campaign has ended");
        require(pledgedAmount[_id][msg.sender] < _amount, "You have not pledged yet");
        campaign.pledged -= _amount;
        pledgedAmount[_id][msg.sender] -= _amount;
        token.transfer(msg.sender, _amount);
    }

    function claim(uint256 _id) external {
        require(campaigns[_id].creator == msg.sender, "Only creator can claim");
        require(block.timestamp > campaigns[_id].endAt, "Campaign has not ended yet");
        require(campaigns[_id].pledged >= campaigns[_id].goal, "Campaign has not reached the goal");
        require(!campaigns[_id].claimed, "Campaign has already been claimed");
        campaigns[_id].claimed = true;
        token.transfer(msg.sender, campaigns[_id].pledged);
    }

    function refund(uint256 _id) external {
        require(block.timestamp > campaigns[_id].endAt, "Campaign has not ended yet");
        require(campaigns[_id].pledged < campaigns[_id].goal, "Campaign has reached the goal");
        uint256 amount = pledgedAmount[_id][msg.sender];
        pledgedAmount[_id][msg.sender] = 0;
        token.transfer(msg.sender, amount);
    }
}
