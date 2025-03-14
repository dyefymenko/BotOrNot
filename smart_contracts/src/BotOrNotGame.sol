// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title BotOrNotGame
 * @dev A smart contract for a game where players try to identify an AI agent
 */
contract BotOrNotGame is Ownable {
    // USDC token contract
    IERC20 public usdcToken;
    
    // Entry fee per player
    uint256 public constant ENTRY_FEE = 10 * 10**6; // 10 USDC with 6 decimals

    // Game state
    enum GameState { WAITING, IN_PROGRESS, COMPLETED }
    
    struct Game {
        string gameId;
        GameState state;
        address[] players;
        address aiPlayer;
        mapping(address => bool) hasVoted;
        mapping(address => address) votes;
        mapping(address => bool) hasClaimedReward;
        address mostVotedPlayer;
        uint256 startTime;
        uint256 prizePool;
        bool prizeClaimed;
    }
    
    // Mapping from game ID to Game struct
    mapping(string => Game) public games;
    
    // Keep track of all game IDs
    string[] public allGameIds;
    
    // Events
    event GameCreated(string indexed gameId);
    event PlayerJoined(string indexed gameId, address player);
    event GameStarted(string indexed gameId, address aiPlayer, uint256 prizePool);
    event PlayerVoted(string indexed gameId, address voter, address votedFor);
    event GameCompleted(string indexed gameId, address aiPlayer, address mostVotedPlayer, bool correctlyIdentified);
    event RewardClaimed(string indexed gameId, address player, uint256 amount);
    
    /**
     * @dev Constructor sets the USDC token address
     * @param _usdcAddress Address of the USDC token contract
     */
    constructor(address _usdcAddress) Ownable(msg.sender) {
        usdcToken = IERC20(_usdcAddress);
    }
    
    /**
     * @dev Creates a new game
     * @param gameId Unique identifier for the game
     */
    function createGame(string memory gameId) external {
        // require(bytes(games[gameId].gameId).length == 0 || games[gameId].state == GameState.COMPLETED, "Game already exists and is not completed");
        
        // Initialize new game
        Game storage game = games[gameId];
        game.gameId = gameId;
        game.state = GameState.IN_PROGRESS;
        game.prizePool = 0;
        game.prizeClaimed = false;
        
        // Clear any previous game data with this ID
        delete game.players;
        delete game.aiPlayer;
        delete game.mostVotedPlayer;
        delete game.startTime;
        delete game.prizeClaimed;
        
        // Add to game IDs if it's a new game
        bool exists = false;
        for (uint i = 0; i < allGameIds.length; i++) {
            if (keccak256(bytes(allGameIds[i])) == keccak256(bytes(gameId))) {
                exists = true;
                break;
            }
        }
        
        if (!exists) {
            allGameIds.push(gameId);
        }
        
        emit GameCreated(gameId);
    }
    
    /**
     * @dev Allows a player to join a game by paying the entry fee
     * @param gameId The ID of the game to join
     */
    function joinGame(string memory gameId) external {
        Game storage game = games[gameId];
        
        require(game.state == GameState.IN_PROGRESS, "Game not in progress");
        
        // Check if player has already joined
        for (uint i = 0; i < game.players.length; i++) {
            require(game.players[i] != msg.sender, "Player already joined");
        }
        
        // Transfer USDC from player to contract
        bool success = usdcToken.transferFrom(msg.sender, address(this), ENTRY_FEE);
        require(success, "USDC transfer failed");
        
        // Add player to the game
        game.players.push(msg.sender);
        game.prizePool += ENTRY_FEE;
        
        emit PlayerJoined(gameId, msg.sender);
    }
    
    
    /**
     * @dev Allows a player to vote for who they think is the AI
     * @param gameId The ID of the game
     * @param votedFor The address of the player they're voting for
     */
    function vote(string memory gameId, address votedFor) external {
        Game storage game = games[gameId];
        
        // require(!game.hasVoted[msg.sender], "Already voted");
        require(msg.sender != game.aiPlayer, "AI player cannot vote");
        
        // Check if votedFor is a player in the game
        bool isPlayer = false;
        for (uint i = 0; i < game.players.length; i++) {
            if (game.players[i] == votedFor) {
                isPlayer = true;
                break;
            }
        }
        require(isPlayer, "Voted address is not a player");
        
        // Record vote
        game.hasVoted[msg.sender] = true;
        game.votes[msg.sender] = votedFor;
        
        emit PlayerVoted(gameId, msg.sender, votedFor);
    }
    
    /**
     * @dev Ends a game and determines winners
     * @param gameId The ID of the game to end
     */
    function endGame(string memory gameId, address aiPlayer) external {
        Game storage game = games[gameId];
        game.aiPlayer = aiPlayer;
        
        // Count votes to determine most voted player
        address mostVotedPlayer = address(0);
        uint256 highestVotes = 0;
        
        // Use a memory mapping instead by tracking votes in an array
        for (uint i = 0; i < game.players.length; i++) {
            address playerToVoteFor = game.players[i];
            uint256 voteCount = 0;
            
            // Count votes for this player
            for (uint j = 0; j < game.players.length; j++) {
                address voter = game.players[j];
                if (voter == game.aiPlayer) continue; // Skip AI player
                
                if (game.votes[voter] == playerToVoteFor) {
                    voteCount++;
                }
            }
            
            // Check if this player has the most votes so far
            if (voteCount > highestVotes) {
                highestVotes = voteCount;
                mostVotedPlayer = playerToVoteFor;
            }
        }
        
        game.mostVotedPlayer = mostVotedPlayer;
        game.state = GameState.COMPLETED;
        
        // Determine if AI was correctly identified
        bool correctlyIdentified = (mostVotedPlayer == game.aiPlayer);
        
        emit GameCompleted(gameId, game.aiPlayer, mostVotedPlayer, correctlyIdentified);
    }
    
    /**
     * @dev Distributes rewards to winners
     * @param gameId The ID of the completed game
     */
    function claimRewards(string memory gameId) external {
        Game storage game = games[gameId];
        
        require(game.state == GameState.COMPLETED, "Game not completed");
        require(!game.hasClaimedReward[msg.sender], "Already claimed reward");
        
        bool isWinner = false;
        uint256 reward = 0;
        
        // Check if AI was correctly identified
        bool correctlyIdentified = (game.mostVotedPlayer == game.aiPlayer);
        
        if (!correctlyIdentified) {
            // If AI wasn't identified, the AI player wins
            if (msg.sender == game.aiPlayer) {
                isWinner = true;
                reward = game.prizePool;
            }
        } else {
            // If AI was identified, players who voted correctly split the prize
            if (msg.sender != game.aiPlayer && game.votes[msg.sender] == game.aiPlayer) {
                isWinner = true;
                
                // Count correct voters to split prize
                uint256 correctVoters = 0;
                for (uint i = 0; i < game.players.length; i++) {
                    address player = game.players[i];
                    if (player != game.aiPlayer && game.votes[player] == game.aiPlayer) {
                        correctVoters++;
                    }
                }
                
                if (correctVoters > 0) {
                    reward = game.prizePool / correctVoters;
                }
            }
        }
        
        require(isWinner, "Not a winner");
        require(reward > 0, "No reward to claim");
        
        // Mark as claimed
        game.hasClaimedReward[msg.sender] = true;
        
        // Transfer reward
        bool success = usdcToken.transfer(msg.sender, reward);
        require(success, "USDC transfer failed");
        
        emit RewardClaimed(gameId, msg.sender, reward);
    }
    
    /**
     * @dev Allows the owner to withdraw any unclaimed tokens after a game is complete
     */
    function adminClaimUnclaimedRewards() external onlyOwner {
        // Transfer unclaimed amount to owner
        bool success = usdcToken.transfer(owner(), 20 * 10**6);
        require(success, "USDC transfer failed");
    }
    
    /**
     * @dev Gets all player addresses for a game
     * @param gameId The ID of the game
     * @return Array of player addresses
     */
    function getPlayers(string memory gameId) external view returns (address[] memory) {
        return games[gameId].players;
    }
    
    /**
     * @dev Gets the number of games
     * @return Number of games
     */
    function getGameCount() external view returns (uint256) {
        return allGameIds.length;
    }
    
    /**
     * @dev Gets the game state
     * @param gameId The ID of the game
     * @return Current game state as uint8
     */
    function getGameState(string memory gameId) external view returns (uint8) {
        return uint8(games[gameId].state);
    }
    
    /**
     * @dev Checks if a player has voted in a game
     * @param gameId The ID of the game
     * @param player The address of the player
     * @return True if the player has voted
     */
    function hasVoted(string memory gameId, address player) external view returns (bool) {
        return games[gameId].hasVoted[player];
    }
    
    /**
     * @dev Updates the USDC token address
     * @param _newUsdcAddress New USDC token address
     */
    function updateUsdcAddress(address _newUsdcAddress) external onlyOwner {
        usdcToken = IERC20(_newUsdcAddress);
    }
    
    /**
     * @dev Emergency function to recover tokens
     * @param tokenAddress Address of the token to withdraw
     */
    function withdrawToken(address tokenAddress) external onlyOwner {
        IERC20 token = IERC20(tokenAddress);
        uint256 balance = token.balanceOf(address(this));
        require(balance > 0, "No balance to withdraw");
        bool success = token.transfer(owner(), balance);
        require(success, "Token transfer failed");
    }
}