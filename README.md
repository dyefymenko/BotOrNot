# BOT or NOT? Game

A social deduction game where players try to identify which participant is controlled by an AI.

## Project Overview

In this game:
1. Users submit a prompt for the AI agent.
2. Users join by paying 10 USDC.
3. One random player is selected to have an AI agent chat on their behalf.
4. Players chat for 1 minute, trying to determine who is the AI.
5. A 10-second voting period follows where players vote on who they think is the AI.
6. Players who correctly identify the AI split the prize pool.

## Project Structure

The project consists of two main parts:
1. Next.js frontend with OnchainKit for wallet integration
2. Python WebSocket backend using OpenAI for AI responses

## Setup and Installation

### Backend Setup

1. Navigate to the `server` directory:
```bash
cd server
```

2. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install websockets openai python-dotenv
```

4. Create a `.env` file in the server directory:
```
OPENAI_API_KEY=your_openai_api_key
```

5. Start the WebSocket server:
```bash
python game_server.py
```

### Frontend Setup

1. Create a `.env.local` file in the root directory with your configuration:
```
NEXT_PUBLIC_ONCHAINKIT_API_KEY=your_onchainkit_api_key
NEXT_PUBLIC_ONCHAINKIT_PROJECT_NAME="BOT or NOT?"
NEXT_PUBLIC_WEBSOCKET_URL=ws://localhost:8765
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Game Flow

1. **Join Game View**:
   - Players connect their wallet
   - Submit their name and a prompt for the AI agent
   - Pay 10 USDC to join (currently simulated)

2. **Waiting Room**:
   - Players wait for the game to start (30-second countdown)
   - Display of all players waiting

3. **Chat Room**:
   - One player is randomly selected to be controlled by AI
   - AI-controlled player cannot send messages, but the AI responds automatically
   - Everyone chats for 1 minute

4. **Voting Phase**:
   - Players vote on who they think is the AI
   - 10-second voting period

5. **Results Screen**:
   - Reveals who was the AI
   - Shows vote results and winners
   - Option to play again

## Technologies Used

- **Frontend**: Next.js, React, Tailwind CSS, OnchainKit
- **Backend**: Python, WebSockets, OpenAI API
- **Blockchain Integration**: Base chain via OnchainKit

## Production Deployment

For production deployment:

1. Deploy the WebSocket server to a secure environment:
   - Ensure proper SSL/TLS setup for secure WebSocket connections (wss://)
   - Update environment variables with production URLs

2. Deploy the Next.js frontend using Vercel or similar:
   ```bash
   npm run build
   ```

3. Configure environment variables in your hosting provider.

## License

MIT