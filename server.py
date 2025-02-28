import asyncio
import websockets
import json
import random
import time
import os
from typing import Dict, List, Any, Set

# Add OpenAI imports and setup
from openai import AsyncOpenAI
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Initialize OpenAI client
client = AsyncOpenAI(api_key=os.getenv('OPENAI_API_KEY'))

# Game state
game_state = {
    'players': [],
    'gameInProgress': False,
    'nextGameTime': int(time.time() * 1000) + 30000,  # 30 seconds countdown
    'currentGameId': "1",
    'messages': [],
    'promptLibrary': [],  # Store submitted prompts
    'aiPlayer': None,     # Store the ID of the player controlled by AI
    'votingOpen': False,  # Track if voting is currently open
    'votes': {},          # Track votes: {voter_id: voted_for_id}
    'gameResults': None   # Results of the last game
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
    print(f"AI Player: {game_state['aiPlayer']}")
    print(f"Voting Open: {game_state['votingOpen']}")
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

async def generate_ai_response(prompt, messages, ai_player_name):
    """Generate a message for the AI player using OpenAI API"""
    try:
        # Create a context for the AI
        recent_messages = messages[-10:] if len(messages) > 10 else messages
        message_history = []
        
        # System prompt to set up the context
        system_prompt = {
            "role": "system", 
            "content": f"""You are playing a game called 'Find the AI' where humans try to identify which player is an AI.
            You are playing as {ai_player_name}, an AI pretending to be a human based on this prompt: "{prompt}".
            Write a single message that seems natural and human-like according to the character described in the prompt.
            Keep your response short (1-2 sentences).
            Don't be too formal or perfect in your response.
            Occasionally use casual language, slang, or make small typos to seem more human.
            Don't introduce yourself or say hello if the conversation is already ongoing.
            Don't reveal that you're an AI. Act like the human described in the prompt."""
        }
        message_history.append(system_prompt)
        
        # Add recent chat history for context
        for msg in recent_messages:
            message_history.append({
                "role": "user" if msg.get('senderId') != game_state['aiPlayer'] else "assistant",
                "content": f"{msg.get('senderName')}: {msg.get('text')}"
            })
        
        # Add a prompt for what to say next
        message_history.append({
            "role": "user",
            "content": "What would you say next in this conversation as this character? Respond with just your message text."
        })
        
        # Make API call using the OpenAI client
        response = await client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=[
                {"role": msg["role"], "content": msg["content"]} 
                for msg in message_history
            ],
            max_tokens=100,
            temperature=0.8
        )
        
        # Extract and return the message
        message = response.choices[0].message.content.strip()
        return message
    
    except Exception as e:
        print(f"Error generating AI message: {e}")
        return get_fallback_ai_message()

def get_fallback_ai_message():
    """Return a fallback message if OpenAI API fails"""
    fallback_messages = [
        "What do you all think about this game so far?",
        "Anyone else having trouble figuring out who's who?",
        "I've played similar games before but this one is pretty unique.",
        "I think we should share something about ourselves. I'll go first: I love hiking on weekends.",
        "Has anyone else played this game before? It's my first time.",
        "I wonder who the AI might be in this round.",
        "The timer goes by so quickly!",
        "What strategies are you all using to identify the AI?",
        "I'm not very good at these kinds of games, but I'm enjoying it!",
        "Anyone have any good weekend plans? I'm thinking of checking out that new movie."
    ]
    return random.choice(fallback_messages)

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
            'data': get_client_game_state()
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
                        'players': [scrub_player_data(p) for p in game_state['players']]
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
                            'players': [scrub_player_data(p) for p in game_state['players']]
                        })
                        
                        print_game_state()
                    else:
                        print(f"Player {data['playerId']} not found in game state.")
                
                # Handle chat messages
                elif data.get('type') == 'chatMessage' and data.get('message'):
                    print(f"Chat message from {data['message']['senderName']}: {data['message']['text']}")
                    
                    # Check if sender is the AI-controlled player
                    if game_state['gameInProgress'] and data['message']['senderId'] == game_state['aiPlayer']:
                        # Reject message from AI-controlled player
                        await websocket.send(json.dumps({
                            'type': 'errorMessage',
                            'message': 'You are the AI-controlled player for this game and cannot send messages.'
                        }))
                        continue
                    
                    # Store message in game state
                    game_state['messages'].append(data['message'])
                    
                    # Broadcast message to all clients
                    await broadcast({
                        'type': 'newMessage',
                        'message': data['message']
                    })
                    
                    # If game is in progress and we have an AI player, maybe generate a response
                    if (game_state['gameInProgress'] and 
                        game_state['aiPlayer'] and 
                        len(game_state['promptLibrary']) > 0 and
                        random.random() < 0.3):  # 30% chance of responding
                        
                        ai_player = next((p for p in game_state['players'] if p['id'] == game_state['aiPlayer']), None)
                        if ai_player:
                            # Slight delay to make it seem like typing
                            await asyncio.sleep(random.uniform(1.0, 2.5))
                            await generate_and_send_ai_message()
                
                # Handle prompt submission
                elif data.get('type') == 'submitPrompt' and data.get('prompt'):
                    print(f"Prompt submitted: {data['prompt']}")
                    
                    if not any(p == data['prompt'] for p in game_state['promptLibrary']):
                        game_state['promptLibrary'].append(data['prompt'])
                    
                    await websocket.send(json.dumps({
                        'type': 'promptConfirmed',
                        'prompt': data['prompt']
                    }))
                    
                    print(f"Prompt library now has {len(game_state['promptLibrary'])} prompts")
                
                # Handle create game
                elif data.get('type') == 'createGame':
                    print(f"Create game request from client {client_id}")
                    
                    if game_state['gameInProgress']:
                        await websocket.send(json.dumps({
                            'type': 'errorMessage',
                            'message': 'A game is already in progress.'
                        }))
                    else:
                        # Reset game state
                        game_state['messages'] = []
                        game_state['votes'] = {}
                        game_state['gameResults'] = None
                        
                        # Start 30 second countdown
                        game_state['nextGameTime'] = int(time.time() * 1000) + 30000
                        game_state['currentGameId'] = str(int(game_state['currentGameId']) + 1)
                        
                        # Broadcast game creation
                        await broadcast({
                            'type': 'gameState',
                            'data': get_client_game_state()
                        })
                        
                        print("New game created")
                        print_game_state()
                
                # Handle voting
                elif data.get('type') == 'vote' and data.get('voterId') and data.get('votedForId'):
                    if not game_state['votingOpen']:
                        await websocket.send(json.dumps({
                            'type': 'errorMessage',
                            'message': 'Voting is not currently open.'
                        }))
                        continue
                    
                    # Check if voter is the AI player
                    if data['voterId'] == game_state['aiPlayer']:
                        await websocket.send(json.dumps({
                            'type': 'errorMessage',
                            'message': 'As the AI-controlled player, you cannot vote.'
                        }))
                        continue
                    
                    # Record vote
                    game_state['votes'][data['voterId']] = data['votedForId']
                    
                    await websocket.send(json.dumps({
                        'type': 'voteConfirmed',
                        'votedForId': data['votedForId']
                    }))
                    
                    # Check if all eligible players have voted
                    eligible_voters = [p['id'] for p in game_state['players'] if p['id'] != game_state['aiPlayer']]
                    if all(voter in game_state['votes'] for voter in eligible_voters):
                        # End voting early if everyone has voted
                        asyncio.create_task(end_voting())
                
                # Handle ping messages
                elif data.get('type') == 'ping':
                    await websocket.send(json.dumps({
                        'type': 'pong',
                        'timestamp': int(time.time() * 1000)
                    }))
                
                # Handle get state messages
                elif data.get('type') == 'getState':
                    await websocket.send(json.dumps({
                        'type': 'gameState',
                        'data': get_client_game_state()
                    }))
                
                # Handle reset messages
                elif data.get('type') == 'reset':
                    game_state['players'] = []
                    game_state['messages'] = []
                    game_state['nextGameTime'] = int(time.time() * 1000) + 30000
                    game_state['gameInProgress'] = False
                    game_state['votingOpen'] = False
                    game_state['aiPlayer'] = None
                    game_state['votes'] = {}
                    game_state['gameResults'] = None
                    
                    await broadcast({
                        'type': 'gameState',
                        'data': get_client_game_state()
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

def scrub_player_data(player):
    """Remove sensitive data from player objects before sending to clients"""
    # Create a copy to avoid modifying the original
    player_copy = player.copy()
    
    # Add an isAI field that's only true for the client if they are the AI player
    player_copy['isAI'] = player['id'] == game_state['aiPlayer']
    
    # Return the scrubbed player data
    return player_copy

def get_client_game_state():
    """Get game state data that's safe to send to clients"""
    client_state = {
        'players': [scrub_player_data(p) for p in game_state['players']],
        'gameInProgress': game_state['gameInProgress'],
        'nextGameTime': game_state['nextGameTime'],
        'currentGameId': game_state['currentGameId'],
        'messages': game_state['messages'],
        'votingOpen': game_state['votingOpen'],
        'gameResults': game_state['gameResults']
    }
    return client_state

async def generate_and_send_ai_message():
    """Generate and send a message from the AI-controlled player"""
    if not game_state['gameInProgress'] or not game_state['aiPlayer']:
        return
        
    # Find AI player
    ai_player = next((p for p in game_state['players'] if p['id'] == game_state['aiPlayer']), None)
    if not ai_player:
        return
        
    # Choose a random prompt from the library
    if not game_state['promptLibrary']:
        prompt = "Be a normal, friendly person chatting with others."
    else:
        prompt = random.choice(game_state['promptLibrary'])
        
    # Generate AI message
    ai_message = await generate_ai_response(prompt, game_state['messages'], ai_player['name'])
    
    # Create message object
    message_obj = {
        'id': ''.join(random.choices('abcdefghijklmnopqrstuvwxyz0123456789', k=8)),
        'senderId': ai_player['id'],
        'senderName': ai_player['name'],
        'text': ai_message,
        'timestamp': int(time.time() * 1000)
    }
    
    # Store message in game state
    game_state['messages'].append(message_obj)
    
    # Broadcast message to all clients
    await broadcast({
        'type': 'newMessage',
        'message': message_obj
    })
    
    print(f"AI ({ai_player['name']}) said: {ai_message}")

async def start_game_loop():
    """Main game loop for managing game state transitions"""
    while True:
        await asyncio.sleep(1)
        now = int(time.time() * 1000)
        
        # If countdown completed and game not started yet
        if not game_state['gameInProgress'] and now >= game_state['nextGameTime'] and len(game_state['players']) >= 2:
            # Start new game
            await start_game()
        
        # Periodic AI messages during game
        if game_state['gameInProgress'] and game_state['aiPlayer'] and random.random() < 0.05:  # 5% chance per second
            await generate_and_send_ai_message()

async def start_game():
    """Start a new game with the current players"""
    print("Starting new game!")
    game_state['gameInProgress'] = True
    game_state['votingOpen'] = False
    game_state['messages'] = []
    game_state['votes'] = {}
    
    # Choose a random player to be controlled by AI
    if game_state['players']:
        game_state['aiPlayer'] = random.choice(game_state['players'])['id']
    else:
        game_state['aiPlayer'] = None
    
    print(f"Selected AI player: {game_state['aiPlayer']}")
    
    # Broadcast game start
    await broadcast({
        'type': 'gameState',
        'data': get_client_game_state()
    })
    
    # Add system message
    system_message = {
        'id': ''.join(random.choices('abcdefghijklmnopqrstuvwxyz0123456789', k=8)),
        'senderId': 'system',
        'senderName': 'System',
        'text': f'Game #{game_state["currentGameId"]} has started! One player is being controlled by AI. Chat for 1 minute and try to identify who it is.',
        'timestamp': int(time.time() * 1000)
    }
    game_state['messages'].append(system_message)
    
    await broadcast({
        'type': 'newMessage',
        'message': system_message
    })
    
    # Have AI player send a first message
    await asyncio.sleep(random.uniform(3.0, 8.0))  # Wait a bit before first message
    await generate_and_send_ai_message()
    
    # Schedule game end after 60 seconds
    await asyncio.sleep(60)
    
    # Start voting phase
    await start_voting()

async def start_voting():
    """Start the voting phase"""
    print("Starting voting phase")
    game_state['votingOpen'] = True
    
    # Add system message
    system_message = {
        'id': ''.join(random.choices('abcdefghijklmnopqrstuvwxyz0123456789', k=8)),
        'senderId': 'system',
        'senderName': 'System',
        'text': 'Time to vote! Select the player you think is being controlled by AI. You have 10 seconds to vote.',
        'timestamp': int(time.time() * 1000)
    }
    game_state['messages'].append(system_message)
    
    await broadcast({
        'type': 'gameState',
        'data': get_client_game_state()
    })
    
    await broadcast({
        'type': 'newMessage',
        'message': system_message
    })
    
    # Schedule end of voting
    await asyncio.sleep(15)
    await end_voting()

async def end_voting():
    """End the voting phase and determine results"""
    # Skip if voting is already closed
    if not game_state['votingOpen']:
        return
        
    print("Ending voting phase")
    game_state['votingOpen'] = False
    
    # Count votes
    vote_counts = {}
    for voted_for_id in game_state['votes'].values():
        vote_counts[voted_for_id] = vote_counts.get(voted_for_id, 0) + 1
    
    # Find player with most votes
    most_voted_player_id = None
    most_votes = 0
    
    for player_id, count in vote_counts.items():
        if count > most_votes:
            most_votes = count
            most_voted_player_id = player_id
    
    # Determine if players correctly identified AI
    correct_identification = most_voted_player_id == game_state['aiPlayer']
    
    # Get AI player name
    ai_player_name = next((p['name'] for p in game_state['players'] if p['id'] == game_state['aiPlayer']), "Unknown")
    
    # Get most voted player name
    most_voted_player_name = "No one" if most_voted_player_id is None else next(
        (p['name'] for p in game_state['players'] if p['id'] == most_voted_player_id), "Unknown"
    )
    
    # Create results object
    game_state['gameResults'] = {
        'aiPlayerId': game_state['aiPlayer'],
        'aiPlayerName': ai_player_name,
        'mostVotedPlayerId': most_voted_player_id,
        'mostVotedPlayerName': most_voted_player_name,
        'voteCounts': vote_counts,
        'correctIdentification': correct_identification
    }
    
    # Add system message with results
    result_message = {
        'id': ''.join(random.choices('abcdefghijklmnopqrstuvwxyz0123456789', k=8)),
        'senderId': 'system',
        'senderName': 'System',
        'text': f'Voting has ended! The AI-controlled player was {ai_player_name}. Most votes: {most_voted_player_name}. '
                f'{"Players correctly identified the AI!" if correct_identification else "The AI fooled the players!"}',
        'timestamp': int(time.time() * 1000)
    }
    game_state['messages'].append(result_message)
    
    await broadcast({
        'type': 'gameState',
        'data': get_client_game_state()
    })
    
    await broadcast({
        'type': 'newMessage',
        'message': result_message
    })
    
    # End game and prepare for next round
    game_state['gameInProgress'] = False
    game_state['nextGameTime'] = int(time.time() * 1000) + 30000  # 30 second countdown to next game
    game_state['aiPlayer'] = None
    
    print("Game ended, showing results")
    print_game_state()
    
    # Broadcast updated game state
    await broadcast({
        'type': 'gameState',
        'data': get_client_game_state()
    })

async def main():
    # Start WebSocket server
    server = await websockets.serve(handle_connection, "localhost", 8765)
    
    # Start game loop
    game_loop_task = asyncio.create_task(start_game_loop())
    
    print('WebSocket server running on port 8765')
    print_game_state()
    
    # Wait for the server to close
    await server.wait_closed()

if __name__ == "__main__":
    asyncio.run(main())