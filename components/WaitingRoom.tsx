'use client';

import { useState, useEffect } from 'react';
import { useGameState } from '../context/GameStateContext';
import PlayerCard from './PlayerCard';

export default function WaitingRoom() {
  const { players, currentGameId, nextGameTime, gameInProgress } = useGameState();
  const [timeLeft, setTimeLeft] = useState<string>('00:00');
  const [progress, setProgress] = useState(0);
  
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
      
      // Update progress bar (assuming ~30 second wait time)
      const totalWaitTime = 30 * 1000; // 30 seconds
      const elapsed = totalWaitTime - diff;
      const progressPercent = Math.min(100, Math.max(0, (elapsed / totalWaitTime) * 100));
      setProgress(progressPercent);
    };
    
    // Initial update
    updateTimer();
    
    // Update timer every second
    const interval = setInterval(updateTimer, 1000);
    
    return () => clearInterval(interval);
  }, [nextGameTime]);
  
  return (
    <div className="w-full">
      {gameInProgress && (
        <div className="bg-pink-500/10 border border-pink-500 rounded-lg p-4 mb-6 text-center animate-pulse">
          <p>A game is already in progress! You&apos;ll be added to the next game starting in <span className="font-bold">{timeLeft}</span>.</p>
        </div>
      )}
      
      <div className="bg-gray-800/60 rounded-xl p-6 border border-purple-600/30">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-white/10">
          <div className="text-2xl font-bold text-green-400">Prize Pool: <span>{prizePool}</span> USDC</div>
          <div className="text-2xl font-bold text-yellow-400">Starting in: {timeLeft}</div>
        </div>
        
        <h3 className="text-xl mb-2">Game #{currentGameId} Waiting Room</h3>
        <p className="text-xl text-center my-4 text-blue-400">
          {gameInProgress ? 'Waiting for next game...' : 'Waiting for game to start...'}
        </p>
        
        <div className="w-full bg-gray-700 rounded-full h-2.5 mb-6">
          <div 
            className="bg-gradient-to-r from-purple-600 to-blue-400 h-2.5 rounded-full" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        
        <p className="mb-4"><span>{players.length}</span> players in lobby</p>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {players.length > 0 ? (
            players.map((player) => (
              <PlayerCard key={player.id} player={player} />
            ))
          ) : (
            <div className="col-span-full text-center py-4">
              No players yet. Waiting for others to join...
            </div>
          )}
        </div>
      </div>
    </div>
  );
}