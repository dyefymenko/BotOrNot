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
      <div className="flex flex-col md:flex-row justify-center gap-6 mb-8">
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
      
      <div className="bg-white rounded-2xl p-8 shadow-lg">
      <div className="bg-gray-900 rounded-2xl p-8 shadow-lg border border-indigo-500/30">
  <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-8">
    <div className="bg-gradient-to-r from-indigo-900 to-purple-800 rounded-xl px-6 py-4 text-white shadow-md border border-indigo-400/30 backdrop-blur-sm">
      <div className="text-sm uppercase tracking-wider mb-1 text-indigo-300">Prize Pool</div>
      <div className="text-3xl font-bold flex items-center gap-2">
        <span className="text-indigo-300">{prizePool}</span>
        <span className="text-lg text-indigo-400">USDC</span>
      </div>
    </div>
    
    <div className="bg-gradient-to-r from-violet-900 to-indigo-800 rounded-xl px-6 py-4 text-white shadow-md border border-violet-400/30 backdrop-blur-sm">
      <div className="text-sm uppercase tracking-wider mb-1 text-violet-300">Next Game</div>
      <div className="text-3xl font-bold text-violet-200">{timeLeft}</div>
    </div>
  </div>
  
  <div className="mb-8">
    <div className="flex flex-col md:flex-row justify-between items-center">
      <h3 className="text-2xl font-bold text-white">Upcoming Game: <span className="text-indigo-400">#{currentGameId || '1'}</span></h3>
      
      <div className="bg-indigo-900/50 text-indigo-300 px-4 py-2 rounded-full text-sm font-medium border border-indigo-700">
        <span className="font-bold text-cyan-300">{players.length}</span> players waiting • Join now
      </div>
    </div>
  </div>
  
  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
    {players.length > 0 ? (
      players.slice(0, 6).map((player) => (
        <PlayerCard key={player.id} player={player} />
      ))
    ) : (
      <div className="col-span-full bg-gray-800/50 rounded-xl text-center py-12 text-gray-400 border border-indigo-800/30">
        <div className="text-xl font-medium mb-2 text-indigo-300">No players yet</div>
        <p className="text-indigo-200/70">Be the first to join!</p>
      </div>
    )}
  </div>
</div>
</div>
    </div>
  );
}