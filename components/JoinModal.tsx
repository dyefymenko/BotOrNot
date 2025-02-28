'use client';

import { useState } from 'react';
import { useConnection } from '../context/ConnectionContext';
import { useGameState } from '../context/GameStateContext';
import { useAccount } from 'wagmi';

interface JoinModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function JoinModal({ isOpen, onClose }: JoinModalProps) {
  const [username, setUsername] = useState('');
  const [promptText, setPromptText] = useState('');
  
  const { sendToServer } = useConnection();
  const { addToast, updateGameState } = useGameState();

  const { address } = useAccount();
  
  if (!isOpen) return null;
  
  const handleJoin = () => {
    if (!username || !promptText) {
      addToast('error', 'Please fill in all required fields');
      return;
    }

    
    // Submit the prompt first
    sendToServer('submitPrompt', { prompt: promptText });
    
    // Generate a unique player ID
    const playerId = 'id_' + Math.random().toString(36).substring(2, 11);
    
    // Create player object
    const playerData = {
      id: playerId,
      name: username,
      walletAddress: address,
      initials: username.substring(0, 2).toUpperCase(),
      type: 'human'
    };
    
    // Join the game
    if (sendToServer('joinGame', { player: playerData })) {
      // If successful, update local state
      updateGameState({
        currentPlayer: playerData,
        submittedPrompt: promptText
      });
      
      // Create a new game if needed
      if (sendToServer('createGame', {})) {
        console.log('Creating new game');
      }
      
      // Close the modal
      onClose();
    } else {
      addToast('error', 'Failed to join game. Please try again.');
    }
  };
  
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-xl p-8 w-full max-w-md border-2 border-purple-600 relative">
        <button 
          className="absolute top-4 right-4 text-white/60 hover:text-white text-xl"
          onClick={onClose}
        >
          ×
        </button>
        
        <h2 className="text-2xl font-bold text-blue-400 mb-6 text-center">Join Game</h2>
        
        <div className="mb-4">
          <label className="block text-white/80 mb-2">Choose a Username</label>
          <input 
            type="text" 
            className="w-full p-3 rounded-lg bg-gray-700/50 border border-white/20 text-white"
            placeholder="Your display name"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
          />
        </div>
        
        <div className="mb-6">
          <label className="block text-white/80 mb-2">Your AI Agent Prompt (In case you're selected)</label>
          <input 
            type="text" 
            className="w-full p-3 rounded-lg bg-gray-700/50 border border-white/20 text-white"
            placeholder="e.g., A witty 60-year-old history professor who loves puns"
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
          />
        </div>
        
        <button 
          className="w-full bg-gradient-to-r from-purple-600 to-blue-400 text-white font-bold py-3 px-6 rounded-full hover:shadow-lg transition-all"
          onClick={handleJoin}
        >
          JOIN GAME
        </button>
      </div>
    </div>
  );
}