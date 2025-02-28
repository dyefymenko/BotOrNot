'use client';

import { useState, useEffect } from 'react';
import { useGameState } from '../context/GameStateContext';
import { useConnection } from '../context/ConnectionContext';
import PlayerCard from './PlayerCard';

interface GameLobbyProps {
  onJoinClick: () => void;
}

export default function GameLobby({ onJoinClick }: GameLobbyProps) {
  const { players, currentGameId, nextGameTime } = useGameState();
  const [timeLeft, setTimeLeft] = useState<string>('00:00');
  
  // Calculate prize pool
  const prizePool = players.length * 10;
  
  // Update countdown timer
  useEffect(() => {
    const updateTimer = () => {
      if (!nextGameTime) return;
      
      const now = new Date().getTime();
      const diff = Math.max(0, nextGameTime - now);
      
      const minutes = Math.floor(diff / (60 * 1000));
      const seconds = Math.floor((diff % (60 * 1000)) / 1000);
      
      setTimeLeft(`${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
    };
    
    // Initial update
    updateTimer();
    
    // Update timer every second
    const interval = setInterval(updateTimer, 1000);
    
    return () => clearInterval(interval);
  }, [nextGameTime]);
  
  return (
    <div className="w-full">
      <div className="flex flex-col md:flex-row gap-6 mb-8">
        <div className="md:w-1/2 bg-gray-800 rounded-xl p-6 text-center border border-purple-600">
          <h2 className="text-2xl font-bold text-green-400 mb-4">JOIN GAME</h2>
          <p className="mb-6 text-white opacity-80">
            Enter the game and try to identify which player is controlled by an AI. One random player will have an AI agent chat on their behalf.
          </p>
          <button 
            className="bg-gradient-to-r from-purple-600 to-blue-400 text-white font-bold py-3 px-6 rounded-full hover:shadow-lg transition-all"
            onClick={onJoinClick}
          >
            JOIN GAME
          </button>
        </div>
      </div>
      
      <div className="bg-gray-800/60 rounded-xl p-6 border border-purple-600/30">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/10">
          <div className="text-2xl font-bold text-green-400">Prize Pool: <span>{prizePool}</span> USDC</div>
          <div className="text-2xl font-bold text-yellow-400">Next Game: {timeLeft}</div>
        </div>
        
        <h3 className="text-xl mb-2">Upcoming Game: #{currentGameId || '1'}</h3>
        <p className="mb-6"><span>{players.length}</span> players waiting • Join now to secure your spot</p>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {players.length > 0 ? (
            players.slice(0, 6).map((player) => (
              <PlayerCard key={player.id} player={player} />
            ))
          ) : (
            <div className="col-span-full text-center py-4">
              No players yet. Be the first to join!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}