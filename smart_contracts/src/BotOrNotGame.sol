// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/**
 * @title BotOrNotGame
 * @dev A smart contract for a game where players try to identify an AI agent
 */
contract BotOrNotGame is Ownable, ReentrancyGuard {
    // USDC token contract
    IERC20 public usdcToken;
    
    // Entry fee per player
    uint256 public constant ENTRY_FEE = 10 * 10**6; // 10 USDC with 6 decimals

    // Game state
    enum GameState { WAITING, IN_PROGRESS, VOTING, COMPLETED }
    
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
    event VotingStarted(string indexed gameId);
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
    function createGame(string memory gameId) external onlyOwner {
        require(bytes(games[gameId].gameId).length == 0 || games[gameId].state == GameState.COMPLETED, "Game already exists and is not completed");
        
        // Initialize new game
        Game storage game = games[gameId];
        game.gameId = gameId;
        game.state = GameState.WAITING;
        game.prizePool = 0;
        game.prizeClaimed = false;
        
        // Clear any previous game data with this ID
        delete game.players;
        
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
    function joinGame(string memory gameId) external nonReentrant {
        Game storage game = games[gameId];
        
        require(game.state == GameState.WAITING, "Game not in waiting state");
        
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
     * @dev Starts a game and randomly selects an AI player
     * @param gameId The ID of the game to start
     */
    function startGame(string memory gameId) external onlyOwner {
        Game storage game = games[gameId];
        
        require(game.state == GameState.WAITING, "Game not in waiting state");
        require(game.players.length >= 2, "Not enough players");
        
        // Randomly select AI player using a combination of block attributes for randomness
        uint256 randomIndex = uint256(keccak256(abi.encodePacked(block.timestamp, block.prevrandao, msg.sender))) % game.players.length;
        game.aiPlayer = game.players[randomIndex];
        
        // Update game state
        game.state = GameState.IN_PROGRESS;
        game.startTime = block.timestamp;
        
        emit GameStarted(gameId, game.aiPlayer, game.prizePool);
    }
    
    /**
     * @dev Transitions a game from chat phase to voting phase
     * @param gameId The ID of the game
     */
    function startVoting(string memory gameId) external onlyOwner {
        Game storage game = games[gameId];
        
        require(game.state == GameState.IN_PROGRESS, "Game not in progress");
        require(block.timestamp >= game.startTime + 60, "Chat time not elapsed"); // 60 seconds chat time
        
        game.state = GameState.VOTING;
        
        emit VotingStarted(gameId);
    }
    
    /**
     * @dev Allows a player to vote for who they think is the AI
     * @param gameId The ID of the game
     * @param votedFor The address of the player they're voting for
     */
    function vote(string memory gameId, address votedFor) external {
        Game storage game = games[gameId];
        
        require(game.state == GameState.VOTING, "Voting not active");
        require(!game.hasVoted[msg.sender], "Already voted");
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
    function endGame(string memory gameId) external onlyOwner {
        Game storage game = games[gameId];
        
        require(game.state == GameState.VOTING, "Game not in voting phase");
        
        // Count votes to determine most voted player
        address mostVotedPlayer = address(0);
        uint256 highestVotes = 0;
        
        // Create a temporary mapping for vote counts
        mapping(address => uint256) storage voteCounts;
        
        for (uint i = 0; i < game.players.length; i++) {
            address player = game.players[i];
            if (player == game.aiPlayer) continue; // Skip AI player
            
            address votedFor = game.votes[player];
            if (votedFor != address(0)) {
                voteCounts[votedFor]++;
                
                if (voteCounts[votedFor] > highestVotes) {
                    highestVotes = voteCounts[votedFor];
                    mostVotedPlayer = votedFor;
                }
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
    function claimRewards(string memory gameId) external nonReentrant {
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
     * @param gameId The ID of the completed game
     */
    function adminClaimUnclaimedRewards(string memory gameId) external onlyOwner {
        Game storage game = games[gameId];
        
        require(game.state == GameState.COMPLETED, "Game not completed");
        require(!game.prizeClaimed, "Prizes already claimed");
        
        // Calculate total claimed amount
        uint256 claimedAmount = 0;
        
        for (uint i = 0; i < game.players.length; i++) {
            address player = game.players[i];
            if (game.hasClaimedReward[player]) {
                if (player == game.aiPlayer && game.mostVotedPlayer != game.aiPlayer) {
                    // AI player won and claimed
                    claimedAmount = game.prizePool;
                    break;
                } else if (player != game.aiPlayer && game.votes[player] == game.aiPlayer && game.mostVotedPlayer == game.aiPlayer) {
                    // Player voted correctly for AI
                    uint256 correctVoters = 0;
                    for (uint j = 0; j < game.players.length; j++) {
                        address voter = game.players[j];
                        if (voter != game.aiPlayer && game.votes[voter] == game.aiPlayer) {
                            correctVoters++;
                        }
                    }
                    
                    if (correctVoters > 0) {
                        claimedAmount += game.prizePool / correctVoters;
                    }
                }
            }
        }
        
        uint256 unclaimedAmount = game.prizePool - claimedAmount;
        
        if (unclaimedAmount > 0) {
            // Mark prizes as claimed
            game.prizeClaimed = true;
            
            // Transfer unclaimed amount to owner
            bool success = usdcToken.transfer(owner(), unclaimedAmount);
            require(success, "USDC transfer failed");
        }
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