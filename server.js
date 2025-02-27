const WebSocket = require('ws');
const server = new WebSocket.Server({ port: 8765 });

// Game state
const gameState = {
  players: [],
  gameInProgress: false,
  nextGameTime: Date.now() + 20000, 
  currentGameId: "4281",
  messages: []
};

// Connected clients
const clients = new Set();

// Debug function to print game state
function printGameState() {
  console.log("\n===== GAME STATE =====");
  console.log(`Total players: ${gameState.players.length}`);
  console.log(`Players: ${gameState.players.map(p => p.name).join(', ')}`);
  console.log(`Game in progress: ${gameState.gameInProgress}`);
  console.log(`Next game time: ${new Date(gameState.nextGameTime).toLocaleTimeString()}`);
  console.log(`Game ID: ${gameState.currentGameId}`);
  console.log("=====================\n");
}

server.on('connection', (ws) => {
  // Add client to set of connected clients
  clients.add(ws);
  const clientId = Math.random().toString(36).substring(2, 10);
  console.log(`Client ${clientId} connected. Total clients: ${clients.size}`);
  
  // Send initial state immediately on connection
  ws.send(JSON.stringify({
    type: "gameState",
    data: gameState
  }));
  
  // Log the initial state that was sent
  console.log(`Sent initial game state to client ${clientId} with ${gameState.players.length} players`);
  
  // Handle messages from this client
  ws.on('message', (message) => {
    try {
      const data = JSON.parse(message.toString());
      console.log(`Received from client ${clientId}: ${data.type}`);
      
      // Handle different message types
      if (data.type === "joinGame" && data.player) {
        console.log(`Player joining: ${data.player.name} (ID: ${data.player.id})`);
        
        // Add player to game state if not already present
        const playerExists = gameState.players.some(p => p.id === data.player.id);
        if (!playerExists) {
          gameState.players.push(data.player);
          console.log(`Added player to game state. Total players: ${gameState.players.length}`);
          console.log(`Current players: ${gameState.players.map(p => p.name).join(', ')}`);
        } else {
          console.log(`Player ${data.player.name} already exists in game state.`);
        }
        
        // Send confirmation back to the player who joined
        ws.send(JSON.stringify({
          type: "joinConfirmed",
          player: data.player
        }));
        
        // Broadcast updated player list to ALL clients
        console.log(`Broadcasting player update to ${clients.size} clients`);
        broadcast({
          type: "playersUpdate",
          players: gameState.players
        });
        
        printGameState();
      }
      
      // Handle player leaving
      else if (data.type === "playerLeft" && data.playerId) {
        console.log(`Player leaving: ${data.playerId}`);
        
        // Remove player from game state
        const playerIndex = gameState.players.findIndex(p => p.id === data.playerId);
        if (playerIndex !== -1) {
          const removedPlayer = gameState.players.splice(playerIndex, 1)[0];
          console.log(`Removed player: ${removedPlayer.name}`);
          
          // Broadcast updated player list
          broadcast({
            type: "playersUpdate",
            players: gameState.players
          });
          
          printGameState();
        } else {
          console.log(`Player ${data.playerId} not found in game state.`);
        }
      }
      
      // Handle chat messages
      else if (data.type === "chatMessage" && data.message) {
        console.log(`Chat message from ${data.message.senderName}: ${data.message.text}`);
        
        // Store message in game state
        gameState.messages.push(data.message);
        
        // Broadcast message to all clients
        broadcast({
          type: "newMessage",
          message: data.message
        });
      }
      
      // Handle ping messages (for testing connectivity)
      else if (data.type === "ping") {
        console.log(`Ping from client ${clientId}`);
        ws.send(JSON.stringify({
          type: "pong",
          timestamp: Date.now()
        }));
      }
      
      // Handle getState messages (request for current state)
      else if (data.type === "getState") {
        console.log(`State request from client ${clientId}`);
        ws.send(JSON.stringify({
          type: "gameState",
          data: gameState
        }));
      }
      
      // Handle reset messages (admin command to reset state)
      else if (data.type === "reset") {
        console.log(`Reset request from client ${clientId}`);
        gameState.players = [];
        gameState.messages = [];
        gameState.nextGameTime = Date.now() + 20000;
        
        broadcast({
          type: "gameState",
          data: gameState
        });
        
        console.log("Game state has been reset");
        printGameState();
      }
    } catch (error) {
      console.error("Error processing message:", error);
    }
  });
  
  // Handle client disconnection
  ws.on('close', () => {
    console.log(`Client ${clientId} disconnected`);
    clients.delete(ws);
    console.log(`Total clients: ${clients.size}`);
    
    // Note: In a real application, you might want to remove the player
    // associated with this client if they disconnect
  });
});

// Broadcast a message to all connected clients
function broadcast(message) {
  const messageStr = JSON.stringify(message);
  const deadClients = [];
  
  console.log(`Broadcasting ${message.type} to ${clients.size} clients`);
  
  if (message.type === "playersUpdate" || message.type === "gameState") {
    console.log(`Message includes ${message.players?.length || message.data?.players?.length || 0} players`);
  }
  
  clients.forEach(client => {
    try {
      if (client.readyState === WebSocket.OPEN) {
        client.send(messageStr);
      } else if (client.readyState === WebSocket.CLOSED || client.readyState === WebSocket.CLOSING) {
        deadClients.push(client);
      }
    } catch (error) {
      console.error("Error sending to client:", error);
      deadClients.push(client);
    }
  });
  
  // Clean up dead clients
  deadClients.forEach(client => {
    clients.delete(client);
  });
  
  if (deadClients.length > 0) {
    console.log(`Removed ${deadClients.length} dead clients. Total clients: ${clients.size}`);
  }
}

// Start periodic game state updates
function startGameUpdates() {
  setInterval(() => {
    const now = Date.now();
    
    // If we've passed the next game time
    if (now > gameState.nextGameTime) {
      if (gameState.gameInProgress) {
        // Game is already in progress, update timer for next game
        gameState.nextGameTime = now + 180000; // 3 minutes from now
      } else {
        // Start a new game
        gameState.gameInProgress = true;
        console.log("Game started!");
        
        // After 60 seconds, end the game
        setTimeout(() => {
          gameState.gameInProgress = false;
          gameState.nextGameTime = Date.now() + 20000;
          console.log("Game ended!");
        }, 60000);
      }
      
      // Broadcast updated game state
      broadcast({
        type: "gameState",
        data: gameState
      });
    }
  }, 1000);
}

// Start the server
console.log('WebSocket server running on port 8765');
startGameUpdates();
printGameState();