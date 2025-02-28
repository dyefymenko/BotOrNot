// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Test, console2} from "forge-std/Test.sol";
import {BotOrNotGame} from "../src/BotOrNotGame.sol";
import {MockERC20} from "./mocks/MockERC20.sol";

contract BotOrNotGameTest is Test {
    BotOrNotGame public game;
    MockERC20 public usdc;
    
    address public owner = address(1);
    address public player1 = address(2);
    address public player2 = address(3);
    address public player3 = address(4);
    
    string public gameId = "game1";
    uint256 public constant ENTRY_FEE = 10 * 10**6; // 10 USDC
    
    function setUp() public {
        // Deploy mock USDC token
        usdc = new MockERC20("USD Coin", "USDC", 6);
        
        // Deploy game contract
        vm.prank(owner);
        game = new BotOrNotGame(address(usdc));
        
        // Mint USDC to players
        usdc.mint(player1, 100 * 10**6); // 100 USDC
        usdc.mint(player2, 100 * 10**6);
        usdc.mint(player3, 100 * 10**6);
        
        // Approve game contract to spend USDC
        vm.prank(player1);
        usdc.approve(address(game), type(uint256).max);
        
        vm.prank(player2);
        usdc.approve(address(game), type(uint256).max);
        
        vm.prank(player3);
        usdc.approve(address(game), type(uint256).max);
    }
    
    function testCreateGame() public {
        vm.prank(owner);
        game.createGame(gameId);
        
        assertEq(game.getGameCount(), 1);
    }
    
    function testJoinGame() public {
        // Create a game
        vm.prank(owner);
        game.createGame(gameId);
        
        // Player 1 joins
        vm.prank(player1);
        game.joinGame(gameId);
        
        // Player 2 joins
        vm.prank(player2);
        game.joinGame(gameId);
        
        // Verify players joined
        address[] memory players = game.getPlayers(gameId);
        assertEq(players.length, 2);
        assertEq(players[0], player1);
        assertEq(players[1], player2);
        
        // Verify USDC was transferred
        assertEq(usdc.balanceOf(address(game)), 2 * ENTRY_FEE);
    }
    
    function testGameFlow() public {
        // Create a game
        vm.prank(owner);
        game.createGame(gameId);
        
        // Players join
        vm.prank(player1);
        game.joinGame(gameId);
        
        vm.prank(player2);
        game.joinGame(gameId);
        
        vm.prank(player3);
        game.joinGame(gameId);
        
        // Start the game
        vm.prank(owner);
        game.startGame(gameId);
        
        // Verify game is in progress
        assertEq(uint(game.getGameState(gameId)), uint(1)); // IN_PROGRESS
        
        // Start voting phase
        vm.warp(block.timestamp + 61); // Fast forward 61 seconds
        vm.prank(owner);
        game.startVoting(gameId);
        
        // Verify game is in voting phase
        assertEq(uint(game.getGameState(gameId)), uint(2)); // VOTING
        
        // Players vote
        address[] memory players = game.getPlayers(gameId);
        address aiPlayer = players[0]; // For testing, we'll assume player1 is the AI
        
        vm.prank(player2);
        game.vote(gameId, aiPlayer);
        
        vm.prank(player3);
        game.vote(gameId, aiPlayer);
        
        // Verify players voted
        assertTrue(game.hasVoted(gameId, player2));
        assertTrue(game.hasVoted(gameId, player3));
        
        // End the game
        vm.prank(owner);
        game.endGame(gameId);
        
        // Verify game is completed
        assertEq(uint(game.getGameState(gameId)), uint(3)); // COMPLETED
    }
    
    function testWinnerPrizeDistribution() public {
        // Create a game
        vm.prank(owner);
        game.createGame(gameId);
        
        // Three players join
        vm.prank(player1);
        game.joinGame(gameId);
        
        vm.prank(player2);
        game.joinGame(gameId);
        
        vm.prank(player3);
        game.joinGame(gameId);
        
        // Calculate expected prize pool: 3 players * 10 USDC
        uint256 expectedPrizePool = 3 * ENTRY_FEE;
        
        // Start the game
        vm.startPrank(owner);
        game.startGame(gameId);
        
        // For this test, we'll manipulate to know who the AI player is
        // Get the players array and find which index is the AI
        address[] memory players = game.getPlayers(gameId);
        address aiPlayer;
        
        // We need to determine which player was randomly chosen as AI
        // This isn't directly accessible, so we'll use a workaround
        // We know the AI player can't vote, so we'll try to vote with each 
        // player and catch the failure for the AI player
        
        vm.stopPrank();
        
        address firstVoter;
        address secondVoter;
        
        // Try player1 as voter
        try vm.prank(player1) {
            game.vote(gameId, player2); // Try voting
            firstVoter = player1; // If successful, this player is not AI
        } catch {
            aiPlayer = player1; // If it fails, this player is the AI
        }
        
        // Try player2 as voter if we haven't found AI yet
        if (aiPlayer == address(0)) {
            try vm.prank(player2) {
                game.vote(gameId, player1);
                if (firstVoter == address(0)) {
                    firstVoter = player2;
                } else {
                    secondVoter = player2;
                }
            } catch {
                aiPlayer = player2;
            }
        }
        
        // Try player3 as voter if we haven't found AI yet
        if (aiPlayer == address(0)) {
            try vm.prank(player3) {
                game.vote(gameId, player1);
                if (firstVoter == address(0)) {
                    firstVoter = player3;
                } else {
                    secondVoter = player3;
                }
            } catch {
                aiPlayer = player3;
            }
        }
        
        // At this point we should know who's the AI
        require(aiPlayer != address(0), "Could not determine AI player");
        
        // Start voting phase
        vm.warp(block.timestamp + 61); // Fast forward 61 seconds
        vm.prank(owner);
        game.startVoting(gameId);
        
        // SCENARIO 1: Players correctly identify the AI
        // Both remaining players vote for the AI player
        vm.prank(firstVoter);
        game.vote(gameId, aiPlayer);
        
        vm.prank(secondVoter);
        game.vote(gameId, aiPlayer);
        
        // End the game
        vm.prank(owner);
        game.endGame(gameId);
        
        // Check USDC balances before claiming
        uint256 firstVoterBalanceBefore = usdc.balanceOf(firstVoter);
        uint256 secondVoterBalanceBefore = usdc.balanceOf(secondVoter);
        
        // First voter claims rewards
        vm.prank(firstVoter);
        game.claimRewards(gameId);
        
        // Second voter claims rewards
        vm.prank(secondVoter);
        game.claimRewards(gameId);
        
        // Check if they received equal shares of the prize pool
        uint256 expectedReward = expectedPrizePool / 2; // Two correct voters split equally
        assertEq(usdc.balanceOf(firstVoter) - firstVoterBalanceBefore, expectedReward);
        assertEq(usdc.balanceOf(secondVoter) - secondVoterBalanceBefore, expectedReward);
        
        // Create a new game for the second scenario
        string memory gameId2 = "game2";
        vm.prank(owner);
        game.createGame(gameId2);
        
        // Mint more USDC to players
        usdc.mint(player1, 100 * 10**6);
        usdc.mint(player2, 100 * 10**6);
        usdc.mint(player3, 100 * 10**6);
        
        // Players join the second game
        vm.prank(player1);
        game.joinGame(gameId2);
        
        vm.prank(player2);
        game.joinGame(gameId2);
        
        vm.prank(player3);
        game.joinGame(gameId2);
        
        // Start the game
        vm.prank(owner);
        game.startGame(gameId2);
        
        // For this scenario, we'll force player1 to be the AI for simplicity
        aiPlayer = player1;
        
        // Start voting phase
        vm.warp(block.timestamp + 120); // Fast forward 
        vm.prank(owner);
        game.startVoting(gameId2);
        
        // SCENARIO 2: Players incorrectly identify the AI
        // Let's say they vote for player2 instead of player1
        vm.prank(player3);
        game.vote(gameId2, player2);
        
        // End the game
        vm.prank(owner);
        game.endGame(gameId2);
        
        // Check AI player balance before claiming
        uint256 aiPlayerBalanceBefore = usdc.balanceOf(aiPlayer);
        
        // AI player claims rewards
        vm.prank(aiPlayer);
        game.claimRewards(gameId2);
        
        // AI player should get the entire prize pool
        assertEq(usdc.balanceOf(aiPlayer) - aiPlayerBalanceBefore, expectedPrizePool);
    }
}
