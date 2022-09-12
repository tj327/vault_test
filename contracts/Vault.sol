//SPDX-License-Identifier: MIT
pragma solidity 0.8.16;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract Vault is Ownable {
    event Deposited(address, address, uint256);
    event Withdrawn(address, uint256);

    struct UserInfo {
        address wallet;
        uint256 amount;
    }

    mapping(address => uint256) public userIndex;

    UserInfo[] public userInfo;

    address public immutable token;

    constructor(address _token) {
        token = _token;
    }

    function deposit(uint256 _amount) external {
        IERC20(token).transferFrom(msg.sender, address(this), _amount);

        uint256 index = userIndex[msg.sender];
        if (index == 0) {
            userInfo.push(UserInfo({wallet: msg.sender, amount: _amount}));
            userIndex[msg.sender] = userInfo.length;
        } else {
            userInfo[index - 1].amount += _amount;
        }

        emit Deposited(msg.sender, address(this), _amount);
    }

    function withdraw(uint256 _amount) external {
        uint256 index = userIndex[msg.sender];

        require(index != 0, "withdraw: not deposited yet");

        UserInfo storage user = userInfo[index - 1];

        require(
            user.amount >= _amount,
            "Withdraw: not enough tokens to withdraw"
        );

        user.amount -= _amount;
        IERC20(token).transfer(msg.sender, _amount);

        emit Withdrawn(msg.sender, _amount);
    }

    function max() external view returns (address, address) {
        UserInfo memory user1;
        UserInfo memory user2;
        for (uint256 i = 0; i < userInfo.length; i++) {
            UserInfo memory user = userInfo[i];

            if (user.amount > user1.amount) {
                user2 = user1;
                user1 = user;
            } else if (user.amount > user2.amount) {
                user2 = user;
            }
        }
        return (user1.wallet, user2.wallet);
    }
}
