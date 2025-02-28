'use client';

import { useState, useEffect, useRef } from 'react';
import { useGameState } from '../context/GameStateContext';
import { useConnection } from '../context/ConnectionContext';
import PlayerCard from './PlayerCard';

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

export default function ChatRoom() {
  const { 
    currentGameId, 
    messages, 
    players, 
    currentPlayer,
    aiControlled
  } = useGameState();
  const { sendToServer } = useConnection();
  
  const [messageText, setMessageText] = useState('');
  const [timeLeft, setTimeLeft] = useState(60); // 60 seconds game duration
  const [progress, setProgress] = useState(100); // Countdown progress bar
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) return;
    
    const timer = setTimeout(() => {
      setTimeLeft(prev => prev - 1);
      setProgress((timeLeft - 1) * 100 / 60); // Update progress based on time left
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [timeLeft]);
  
  // Format time as MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };
  
  // Handle sending messages
  const sendMessage = () => {
    if (!messageText.trim() || !currentPlayer) return;
    if (aiControlled) {
      return; // AI-controlled players can't send messages
    }
    
    const messageObj = {
      id: `msg_${Math.random().toString(36).substring(2, 11)}`,
      senderId: currentPlayer.id,
      senderName: currentPlayer.name,
      text: messageText.trim(),
      timestamp: Date.now()
    };
    
    sendToServer('chatMessage', { message: messageObj });
    setMessageText('');
  };
  
  // Get player by ID
  const getPlayer = (id: string) => {
    return players.find(p => p.id === id) || { 
      id, 
      name: 'Unknown', 
      initials: 'UN'
    };
  };
  
  // Render a single message
  const renderMessage = (message: Message) => {
    // Check if it's a system message
    if (message.senderId === 'system') {
      return (
        <div key={message.id} className="flex items-start space-x-2 mb-4">
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-pink-500 to-purple-500 flex items-center justify-center font-bold flex-shrink-0">
            SYS
          </div>
          <div className="bg-gray-800/70 rounded-lg p-3 max-w-[80%]">
            <div className="font-bold">System</div>
            <div>{message.text}</div>
          </div>
        </div>
      );
    }
    
    // Regular user message
    const player = getPlayer(message.senderId);
    const isCurrentUser = currentPlayer?.id === message.senderId;
    
    return (
      <div key={message.id} className="flex items-start space-x-2 mb-4">
        <div className={`
          w-10 h-10 rounded-full flex items-center justify-center font-bold flex-shrink-0
          ${isCurrentUser 
            ? 'bg-gradient-to-r from-pink-500 to-purple-500' 
            : 'bg-gradient-to-r from-purple-600 to-blue-400'
          }
        `}>
          {player.initials || player.name.substring(0, 2).toUpperCase()}
        </div>
        <div className="bg-gray-800/70 rounded-lg p-3 max-w-[80%]">
          <div className="font-bold flex items-center">
            {player.name}
            {isCurrentUser && (
              <span className="ml-2 bg-pink-500 text-white text-xs py-0.5 px-1.5 rounded-full">
                You
              </span>
            )}
          </div>
          <div>{message.text}</div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="w-full">
      <div className="bg-gray-800/60 rounded-xl p-6 border border-purple-600/30 mb-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl">Game #{currentGameId} Chat Room</h3>
          <div className="text-xl font-bold text-yellow-400">Time left: {formatTime(timeLeft)}</div>
        </div>
        
        <div className="w-full bg-gray-700 rounded-full h-2.5 mb-4">
          <div 
            className="bg-gradient-to-r from-purple-600 to-blue-400 h-2.5 rounded-full transition-all duration-1000" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        
        <div className="bg-gray-900/50 rounded-lg h-96 p-4 mb-4 overflow-y-auto">
          {messages.map(renderMessage)}
          <div ref={messagesEndRef} />
        </div>
        
        <div className="flex space-x-2">
          <input
            type="text"
            value={messageText}
            onChange={(e) => setMessageText(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
            placeholder={
              aiControlled 
                ? "You're the AI player this round. The AI is sending messages for you..."
                : "Type your message here..."
            }
            disabled={aiControlled}
            className="flex-1 bg-gray-700/50 border border-white/10 rounded-full px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            onClick={sendMessage}
            disabled={aiControlled}
            className="bg-purple-600 hover:bg-purple-700 text-white font-bold py-2 px-6 rounded-full disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Send
          </button>
        </div>
        
        {aiControlled && (
          <div className="mt-4 text-center text-pink-500">
            You have been selected as the AI-controlled player for this round. You cannot send messages.
          </div>
        )}
      </div>
      
      <div className="text-center mb-6">
        <p className="text-lg">Chat with other players! Can you identify who&apos;s human and who&apos;s a bot?</p>
      </div>
      
      <div className="bg-gray-800/60 rounded-xl p-6 border border-purple-600/30">
        <h3 className="text-xl mb-4">Current Players</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {players.map((player) => (
            <PlayerCard key={player.id} player={player} />
          ))}
        </div>
      </div>
    </div>
  );
}