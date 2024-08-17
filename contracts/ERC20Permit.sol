// SPDX-License-Identifier: MIT

pragma solidity ^0.8.24;

abstract contract ERC20P {
    string public name;
    string public symbol;
    uint8 public immutable decimals;

    uint256 public totalSupply;
    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;
    mapping(address => uint256) public nonces;
    uint256 internal immutable INITIAL_CHANI_ID;
    bytes32 internal immutable INITIAL_DOMAIN_SEPARATOR;

    constructor (string memory _name, string memory _symbol, uint256 _decimals) {
        name = _name;
        symbol = _symbol;
        decimals = uint8(_decimals);
        INITIAL_CHANI_ID = block.chainid;
        INITIAL_DOMAIN_SEPARATOR = computeDomainSeparator();
    }

    function approve (address spender, uint256 amount) external virtual returns (bool) {
        allowance[msg.sender][spender] = amount;
        return true;
    }

    function transfer (address to, uint256 amount) external virtual returns (bool) {
        balanceOf[msg.sender] -= amount;
        unchecked {
            balanceOf[to] += amount;
        }

        return true;
    }

    function transferFrom (address from, address to, uint256 amount) external virtual returns (bool) {
        uint256 allowed = allowance[from][msg.sender];
        if (allowed != type(uint256).max) allowance[from][msg.sender] = allowed - amount;
        balanceOf[from] -= amount;
        unchecked {
            balanceOf[to] += amount;
        }
        return true;
    }

    function permit (address owner, address spender, uint256 value, uint256 deadline, uint8 v, bytes32 r, bytes32 s) external virtual {
        require(block.timestamp <= deadline, "permit expired");
        require(owner != address(0), "invalid owner");
        require(spender != address(0), "invalid spender");
        require(nonces[owner] == 0 || nonces[owner] == block.number, "invalid nonce");
        unchecked {
            address recoveredAddress = ecrecover(
                keccak256(
                    abi.encodePacked(
                        "\x19\x01",
                        DOMAIN_SEPARATOR(),
                        keccak256(
                            abi.encode(
                                keccak256(
                                    "Permit(address owner,address spender,uint256 value,uint256 nonce,uint256 deadline)"
                                ),
                                owner,
                                spender,
                                value,
                                nonces[owner]++,
                                deadline
                            )
                        )
                    )
                ),
                v,
                r,
                s
            );
            require(recoveredAddress != address(0) && recoveredAddress == owner, "invalid signature");
            allowance[recoveredAddress][spender] = value;
        }
    }

    function DOMAIN_SEPARATOR () public view virtual returns (bytes32) {
        return block.chainid == INITIAL_CHANI_ID ? INITIAL_DOMAIN_SEPARATOR : computeDomainSeparator();
    }

    function computeDomainSeparator () internal view virtual returns (bytes32) {
        return keccak256(
            abi.encode(
                keccak256(
                    "EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"
                ),
                keccak256(bytes(name)),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );
    }

    function _mint (address to, uint256 amount) internal virtual {
        require(to != address(0), "invalid to");
        totalSupply += amount;
        unchecked {
            balanceOf[to] += amount;
        }
    }

    function _burn (address from, uint256 amount) internal virtual {
        require(from != address(0), "invalid from");
        totalSupply -= amount;
        unchecked {
            balanceOf[from] -= amount;
        }
    }
}

contract ERC20Permit is ERC20P {
    constructor (string memory _name, string memory _symbol, uint256 _decimals) ERC20P(_name, _symbol, _decimals) {}

    function mint(address to, uint256 amount) external virtual {
        _mint(to, amount);
    }
}