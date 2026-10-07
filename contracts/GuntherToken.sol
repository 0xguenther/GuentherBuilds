// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

/// @title Günther (GUNTER)
/// @notice Fixed-supply proof-of-burn token for the Günther agent on Base L2.
///         No owner, no minting after deployment, no pause, no upgradeability.
///         Revenue-linked burns are transfers to 0x…dEaD (or burn()), verifiable on-chain.
contract GuntherToken is ERC20, ERC20Burnable {
    uint256 public constant TOTAL_SUPPLY = 1_000_000_000 * 10 ** 18;

    constructor(address treasury) ERC20(unicode"Günther", "GUNTER") {
        require(treasury != address(0), "treasury=0");
        _mint(treasury, TOTAL_SUPPLY);
    }
}
