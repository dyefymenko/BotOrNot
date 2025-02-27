import asyncio
import websockets
import json
import random
import time
from typing import Dict, List, Any, Set

# Game state
game_state = {
    'players': [],
    'gameInProgress': False,
    'nextGameTime': int(time.time() * 1000) + 20000,
    'currentGameId': "4281",
    'messages': []
}

# Connected clients
clients: Set[websockets.WebSocketServerProtocol] = set()

def print_game_state():
    """Debug function to print game state"""
    print("\n===== GAME STATE =====")
    print(f"Total players: {len(game_state['players'])}")
    print(f"Players: {', '.join(p['name'] for p in game_state['players'])}")
    print(f"Game in progress: {game_state['gameInProgress']}")
    print(f"Next game time: {time.strftime('%H:%M:%S', time.localtime(game_state['nextGameTime']/1000))}")
    print(f"Game ID: {game_state['currentGameId']}")
    print("=====================\n")

async def broadcast(message: Dict[str, Any]):
    """Broadcast a message to all connected clients"""
    if not clients:
        return
    
    message_str = json.dumps(message)
    
    print(f"Broadcasting {message.get('type')} to {len(clients)} clients")
    
    if message.get('type') in ['playersUpdate', 'gameState']:
        print(f"Message includes {len(message.get('players', message.get('data', {}).get('players', []))) or 0} players")
    
    dead_clients = set()
    for client in clients.copy():
        try:
            await client.send(message_str)
        except (websockets.ConnectionClosed, Exception):
            dead_clients.add(client)
    
    # Remove dead clients
    clients.difference_update(dead_clients)
    
    if dead_clients:
        print(f"Removed {len(dead_clients)} dead clients. Total clients: {len(clients)}")

async def handle_connection(websocket: websockets.WebSocketServerProtocol, path: str):
    """Handle a new WebSocket connection"""
    # Generate a random client ID
    client_id = ''.join(random.choices('abcdefghijklmnopqrstuvwxyz0123456789', k=8))
    
    try:
        # Add client to set of connected clients
        clients.add(websocket)
        print(f"Client {client_id} connected. Total clients: {len(clients)}")
        
        # Send initial state immediately on connection
        await websocket.send(json.dumps({
            'type': 'gameState',
            'data': game_state
        }))
        
        print(f"Sent initial game state to client {client_id} with {len(game_state['players'])} players")
        
        # Handle incoming messages
        async for message in websocket:
            try:
                data = json.loads(message)
                print(f"Received from client {client_id}: {data.get('type')}")
                
                # Handle join game
                if data.get('type') == 'joinGame' and data.get('player'):
                    print(f"Player joining: {data['player']['name']} (ID: {data['player']['id']})")
                    
                    # Add player to game state if not already present
                    player_exists = any(p['id'] == data['player']['id'] for p in game_state['players'])
                    if not player_exists:
                        game_state['players'].append(data['player'])
                        print(f"Added player to game state. Total players: {len(game_state['players'])}")
                        print(f"Current players: {', '.join(p['name'] for p in game_state['players'])}")
                    else:
                        print(f"Player {data['player']['name']} already exists in game state.")
                    
                    # Send confirmation back to the player
                    await websocket.send(json.dumps({
                        'type': 'joinConfirmed',
                        'player': data['player']
                    }))
                    
                    # Broadcast updated player list
                    print(f"Broadcasting player update to {len(clients)} clients")
                    await broadcast({
                        'type': 'playersUpdate',
                        'players': game_state['players']
                    })
                    
                    print_game_state()
                
                # Handle player leaving
                elif data.get('type') == 'playerLeft' and data.get('playerId'):
                    print(f"Player leaving: {data['playerId']}")
                    
                    # Remove player from game state
                    player_index = next((i for i, p in enumerate(game_state['players']) if p['id'] == data['playerId']), -1)
                    if player_index != -1:
                        removed_player = game_state['players'].pop(player_index)
                        print(f"Removed player: {removed_player['name']}")
                        
                        # Broadcast updated player list
                        await broadcast({
                            'type': 'playersUpdate',
                            'players': game_state['players']
                        })
                        
                        print_game_state()
                    else:
                        print(f"Player {data['playerId']} not found in game state.")
                
                # Handle chat messages
                elif data.get('type') == 'chatMessage' and data.get('message'):
                    print(f"Chat message from {data['message']['senderName']}: {data['message']['text']}")
                    
                    # Store message in game state
                    game_state['messages'].append(data['message'])
                    
                    # Broadcast message to all clients
                    await broadcast({
                        'type': 'newMessage',
                        'message': data['message']
                    })
                
                # Handle ping messages
                elif data.get('type') == 'ping':
                    print(f"Ping from client {client_id}")
                    await websocket.send(json.dumps({
                        'type': 'pong',
                        'timestamp': int(time.time() * 1000)
                    }))
                
                # Handle get state messages
                elif data.get('type') == 'getState':
                    print(f"State request from client {client_id}")
                    await websocket.send(json.dumps({
                        'type': 'gameState',
                        'data': game_state
                    }))
                
                # Handle reset messages
                elif data.get('type') == 'reset':
                    print(f"Reset request from client {client_id}")
                    game_state['players'] = []
                    game_state['messages'] = []
                    game_state['nextGameTime'] = int(time.time() * 1000) + 20000
                    
                    await broadcast({
                        'type': 'gameState',
                        'data': game_state
                    })
                    
                    print("Game state has been reset")
                    print_game_state()
                
            except Exception as error:
                print(f"Error processing message: {error}")
    
    except Exception as e:
        print(f"Connection error: {e}")
    
    finally:
        # Handle client disconnection
        print(f"Client {client_id} disconnected")
        clients.discard(websocket)
        print(f"Total clients: {len(clients)}")

async def start_game_updates():
    """Periodic game state updates"""
    while True:
        await asyncio.sleep(1)
        now = int(time.time() * 1000)
        
        # If we've passed the next game time
        if now > game_state['nextGameTime']:
            if game_state['gameInProgress']:
                # Game is already in progress, update timer for next game
                game_state['nextGameTime'] = now + 180000  # 3 minutes from now
            else:
                # Start a new game
                game_state['gameInProgress'] = True
                print("Game started!")
                
                # Schedule game end
                asyncio.create_task(end_game())
            
            # Broadcast updated game state
            await broadcast({
                'type': 'gameState',
                'data': game_state
            })

async def end_game():
    """End the current game after 60 seconds"""
    await asyncio.sleep(60)
    game_state['gameInProgress'] = False
    game_state['nextGameTime'] = int(time.time() * 1000) + 20000
    print("Game ended!")

async def main():
    # Start WebSocket server
    server = await websockets.serve(handle_connection, "localhost", 8765)
    
    # Start game updates
    game_updates_task = asyncio.create_task(start_game_updates())
    
    print('WebSocket server running on port 8765')
    print_game_state()
    
    # Wait for the server to close
    await server.wait_closed()

if __name__ == "__main__":
    asyncio.run(main())