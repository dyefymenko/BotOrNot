// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script, console2} from "forge-std/Script.sol";
import {BotOrNotGame} from "../src/BotOrNotGame.sol";

contract DeployBotOrNotGame is Script {
    function run() external {
        // Get deployments config from environment variables
        address usdcAddress = vm.envAddress("USDC_ADDRESS"); 
        uint256 deployerPrivateKey = vm.envUint("PRIVATE_KEY");
        
        console2.log("Deploying BotOrNotGame with USDC address:", usdcAddress);
        
        // Start broadcasting transactions
        vm.startBroadcast(deployerPrivateKey);
        
        // Deploy the contract
        BotOrNotGame botOrNotGame = new BotOrNotGame(usdcAddress);
        
        // End broadcasting transactions
        vm.stopBroadcast();
        
        console2.log("BotOrNotGame deployed at:", address(botOrNotGame));
    }
}