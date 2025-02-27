import asyncio
import websockets
import json
import time
import random
import os
from dotenv import load_dotenv
from openai import OpenAI

# Load environment variables from .env file
load_dotenv()

# Initialize OpenAI client - Fixed initialization
api_key = os.getenv("OPENAI_API_KEY")
if not api_key:
    print("Warning: OPENAI_API_KEY environment variable not set")
    
client = OpenAI(api_key=api_key)

# Game state
game_state = {
    "players": [],
    "gameInProgress": False,
    "nextGameTime": time.time() * 1000 + 20000, 
    "currentGameId": "4281",
    "messages": []
}

# Connected clients
clients = set()

# Debug function to print game state
def print_game_state():
    print("\n===== GAME STATE =====")
    print(f"Total players: {len(game_state['players'])}")
    print(f"Players: {', '.join([p['name'] for p in game_state['players']])}")
    print(f"Game in progress: {game_state['gameInProgress']}")
    print(f"Next game time: {time.strftime('%H:%M:%S', time.localtime(game_state['nextGameTime']/1000))}")
    print(f"Game ID: {game_state['currentGameId']}")
    print("=====================\n")

# Generate AI bot response using OpenAI
async def generate_bot_response(bot_player, messages_history):
    try:
        # Create a prompt with conversation history
        prompt = f"You are {bot_player['name']}, an AI trying to pass as human in a chat game. "
        prompt += "Keep your responses casual, conversational, and don't use overly perfect grammar or punctuation. "
        prompt += "Don't act suspiciously nice or helpful. Include occasional typos or slang. Be concise (under 30 words).\n\n"
        
        # Add custom bot instructions if available
        if 'instructions' in bot_player and bot_player['instructions']:
            prompt += f"Additional instructions: {bot_player['instructions']}\n\n"
            
        prompt += "Previous messages:\n"
        
        # Add the last few messages for context
        for msg in messages_history[-5:]:
            sender_name = msg.get('senderName', 'Unknown')
            text = msg.get('text', '')
            prompt += f"{sender_name}: {text}\n"
            
        prompt += f"\nRespond as {bot_player['name']}:"
        
        # Call OpenAI API
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[{"role": "user", "content": prompt}],
            max_tokens=60,
            temperature=0.7,
        )
        
        # Extract and return the response text
        return response.choices[0].message.content.strip()
        
    except Exception as e:
        print(f"Error generating bot response: {e}")
        # Fallback responses if API call fails
        fallbacks = [
            "Interesting point!",
            "I'm not sure about that.",
            "What do others think?",
            "Let me think about that...",
            "Has anyone figured out who the bot might be?",
        ]
        return random.choice(fallbacks)

# Broadcast a message to all connected clients
async def broadcast(message):
    message_str = json.dumps(message)
    dead_clients = []
    
    print(f"Broadcasting {message['type']} to {len(clients)} clients")
    
    if message['type'] == 'playersUpdate' or message['type'] == 'gameState':
        players_count = len(message.get('players', message.get('data', {}).get('players', [])))
        print(f"Message includes {players_count} players")
    
    for client in clients:
        try:
            await client.send(message_str)
        except websockets.exceptions.ConnectionClosed:
            dead_clients.append(client)
        except Exception as e:
            print(f"Error sending to client: {e}")
            dead_clients.append(client)
    
    # Clean up dead clients
    for client in dead_clients:
        clients.discard(client)
    
    if dead_clients:
        print(f"Removed {len(dead_clients)} dead clients. Total clients: {len(clients)}")

# Handle client connection
async def handle_client(websocket, path):
    # Add client to set of connected clients
    clients.add(websocket)
    client_id = ''.join(random.choices('0123456789abcdefghijklmnopqrstuvwxyz', k=8))
    print(f"Client {client_id} connected. Total clients: {len(clients)}")
    
    # Send initial state immediately on connection
    await websocket.send(json.dumps({
        "type": "gameState",
        "data": game_state
    }))
    
    print(f"Sent initial game state to client {client_id} with {len(game_state['players'])} players")
    
    try:
        # Handle messages from this client
        async for message in websocket:
            try:
                data = json.loads(message)
                print(f"Received from client {client_id}: {data['type']}")
                
                # Handle different message types
                if data['type'] == "joinGame" and 'player' in data:
                    print(f"Player joining: {data['player']['name']} (ID: {data['player']['id']})")
                    
                    # Add player to game state if not already present
                    player_exists = any(p['id'] == data['player']['id'] for p in game_state['players'])
                    if not player_exists:
                        game_state['players'].append(data['player'])
                        print(f"Added player to game state. Total players: {len(game_state['players'])}")
                        print(f"Current players: {', '.join([p['name'] for p in game_state['players']])}")
                    else:
                        print(f"Player {data['player']['name']} already exists in game state.")
                    
                    # Send confirmation back to the player who joined
                    await websocket.send(json.dumps({
                        "type": "joinConfirmed",
                        "player": data['player']
                    }))
                    
                    # Broadcast updated player list to ALL clients
                    print(f"Broadcasting player update to {len(clients)} clients")
                    await broadcast({
                        "type": "playersUpdate",
                        "players": game_state['players']
                    })
                    
                    print_game_state()
                
                # Handle player leaving
                elif data['type'] == "playerLeft" and 'playerId' in data:
                    print(f"Player leaving: {data['playerId']}")
                    
                    # Remove player from game state
                    player_index = next((i for i, p in enumerate(game_state['players']) 
                                        if p['id'] == data['playerId']), -1)
                    if player_index != -1:
                        removed_player = game_state['players'].pop(player_index)
                        print(f"Removed player: {removed_player['name']}")
                        
                        # Broadcast updated player list
                        await broadcast({
                            "type": "playersUpdate",
                            "players": game_state['players']
                        })
                        
                        print_game_state()
                    else:
                        print(f"Player {data['playerId']} not found in game state.")
                
                # Handle chat messages
                elif data['type'] == "chatMessage" and 'message' in data:
                    print(f"Chat message from {data['message'].get('senderName', 'unknown')}: {data['message'].get('text', '')}")
                    
                    # Store message in game state
                    game_state['messages'].append(data['message'])
                    
                    # Broadcast message to all clients
                    await broadcast({
                        "type": "newMessage",
                        "message": data['message']
                    })
                    
                    # If there are bot players, generate responses for them
                    bots = [p for p in game_state['players'] if p.get('type') == 'bot']
                    if bots and random.random() < 0.4:  # 40% chance of a bot responding
                        # Choose a random bot to respond
                        bot = random.choice(bots)
                        
                        # Generate bot response using OpenAI
                        bot_response = await generate_bot_response(bot, game_state['messages'])
                        
                        # Create message object for bot response
                        bot_message = {
                            "id": f"bot_msg_{random.randint(10000, 99999)}",
                            "senderId": bot['id'],
                            "senderName": bot['name'],
                            "text": bot_response,
                            "timestamp": int(time.time() * 1000)
                        }
                        
                        # Add slight delay to make it look more natural
                        await asyncio.sleep(random.uniform(2.0, 5.0))
                        
                        # Store bot message in game state
                        game_state['messages'].append(bot_message)
                        
                        # Broadcast bot message to all clients
                        await broadcast({
                            "type": "newMessage",
                            "message": bot_message
                        })
                
                # Handle ping messages (for testing connectivity)
                elif data['type'] == "ping":
                    print(f"Ping from client {client_id}")
                    await websocket.send(json.dumps({
                        "type": "pong",
                        "timestamp": int(time.time() * 1000)
                    }))
                
                # Handle getState messages (request for current state)
                elif data['type'] == "getState":
                    print(f"State request from client {client_id}")
                    await websocket.send(json.dumps({
                        "type": "gameState",
                        "data": game_state
                    }))
                
                # Handle reset messages (admin command to reset state)
                elif data['type'] == "reset":
                    print(f"Reset request from client {client_id}")
                    game_state['players'] = []
                    game_state['messages'] = []
                    game_state['nextGameTime'] = int(time.time() * 1000) + 20000
                    
                    await broadcast({
                        "type": "gameState",
                        "data": game_state
                    })
                    
                    print("Game state has been reset")
                    print_game_state()
            
            except json.JSONDecodeError:
                print(f"Error decoding message from client {client_id}")
            except Exception as e:
                print(f"Error processing message: {e}")
    
    finally:
        # Handle client disconnection
        print(f"Client {client_id} disconnected")
        clients.discard(websocket)
        print(f"Total clients: {len(clients)}")

# Start periodic game state updates
async def game_update_loop():
    while True:
        current_time = time.time() * 1000
        
        # If we've passed the next game time
        if current_time > game_state['nextGameTime']:
            if game_state['gameInProgress']:
                # Game is already in progress, update timer for next game
                game_state['nextGameTime'] = current_time + 180000  # 3 minutes from now
            else:
                # Start a new game
                game_state['gameInProgress'] = True
                print("Game started!")
                
                # After 60 seconds, end the game
                game_state['nextGameTime'] = current_time + 60000  # Game lasts 60 seconds
            
            # Broadcast updated game state
            await broadcast({
                "type": "gameState",
                "data": game_state
            })
        
        # Check if game should end
        elif game_state['gameInProgress'] and current_time > game_state['nextGameTime']:
            game_state['gameInProgress'] = False
            game_state['nextGameTime'] = current_time + 20000  # 20 seconds until next game
            print("Game ended!")
            
            # Broadcast updated game state
            await broadcast({
                "type": "gameState",
                "data": game_state
            })
        
        await asyncio.sleep(1)

# Main server function
async def main():
    print_game_state()
    
    # Start the game update loop
    asyncio.create_task(game_update_loop())
    
    # Start the WebSocket server
    async with websockets.serve(handle_client, "localhost", 8765):
        print("WebSocket server running on ws://localhost:8765")
        await asyncio.Future()  # Run forever

if __name__ == "__main__":
    asyncio.run(main())