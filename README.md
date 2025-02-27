# BotOrNot
Turing test inspired game in a modern setting

## Overview
BotOrNot is a multiplayer chat game where players try to identify which participants are AI bots. Human players connect to a chat room and interact, while some participants are actually AI-powered bots trying to pass as human.

## Features
- Real-time WebSocket communication
- Support for both JavaScript and Python backends
- OpenAI integration for intelligent bot responses
- Multi-user chat interface
- Voting system to identify bots

## Setup

### JavaScript Backend (Original)
1. Install dependencies:
   ```
   npm install
   ```

2. Start the server:
   ```
   node server.js
   ```

### Python Backend (with OpenAI Integration)
1. Install Python dependencies:
   ```
   pip install -r requirements.txt
   ```

2. Create a `.env` file with your OpenAI API key:
   ```
   cp .env.example .env
   ```
   Then edit the `.env` file to add your OpenAI API key.

3. Start the Python server:
   ```
   python server.py
   ```

### Running the UI
- Open `ui.html` directly in your browser
- You can open multiple instances to simulate different players

## How to Play
1. Join as a human player or create a bot agent
2. Chat with other players for 1 minute
3. Try to identify which participants are AI bots
4. Vote on who you think is a bot
5. See the results to find out if you were correct

## Technical Details
- Server: Node.js (JavaScript) or Python with WebSockets
- Frontend: Plain HTML/CSS/JavaScript
- AI Integration: OpenAI API (with Python backend)