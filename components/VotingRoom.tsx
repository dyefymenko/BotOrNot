'use client';

import { useState, useEffect } from 'react';
import { useGameState } from '../context/GameStateContext';
import PlayerCard from './PlayerCard';

export default function VotingRoom() {
  const { 
    players, 
    currentPlayer, 
    selectedVote, 
    aiControlled,
    updateGameState
  } = useGameState();
  
  const [timeLeft, setTimeLeft] = useState(10); // 10 seconds voting period
  const [progress, setProgress] = useState(100); // Countdown progress bar
  
  // Filter out current player from voting options
  const votingOptions = aiControlled 
    ? [] // AI-controlled player can't vote
    : players.filter(p => p.id !== currentPlayer?.id);
  
  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) return;
    
    const timer = setTimeout(() => {
      setTimeLeft(prev => prev - 1);
      setProgress((timeLeft - 1) * 100 / 10); // Update progress based on time left
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [timeLeft]);
  
  // Format time as SS
  const formatTime = (seconds: number) => {
    return `00:${String(seconds).padStart(2, '0')}`;
  };
  
  if (aiControlled) {
    return (
      <div className="w-full">
        <div className="bg-gray-900 rounded-2xl p-8 shadow-lg border border-indigo-500/30 text-center">
          <h2 className="text-2xl font-bold text-indigo-400 mb-6">Voting Phase</h2>
          <p className="text-xl mb-6 text-white">
            As the AI-controlled player this round, you cannot vote.
          </p>
          <div className="bg-gradient-to-r from-violet-900 to-indigo-900 rounded-xl px-4 py-3 text-white shadow-md border border-violet-400/30 inline-block">
            <div className="text-sm uppercase tracking-wider text-white">Time left</div>
            <div className="text-xl font-bold text-white">{formatTime(timeLeft)}</div>
          </div>
          
          <div className="w-full bg-gray-800 rounded-full h-3 my-6 border border-indigo-900/50">
            <div 
              className="bg-gradient-to-r from-indigo-600 to-cyan-500 h-3 rounded-full transition-all duration-1000" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          
          <p className="text-indigo-300 mt-6">
            Other players are voting on who they think is the AI.
          </p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="w-full">
      <div className="bg-gray-900 rounded-2xl p-8 shadow-lg border border-indigo-500/30">
        <h2 className="text-2xl font-bold text-white text-center mb-4">Time to <span className="text-indigo-400">Vote!</span></h2>
        <p className="text-lg text-white text-center mb-6">Select the player you think is an AI bot</p>
        
        <div className="flex justify-center mb-6">
          <div className="bg-gradient-to-r from-violet-900 to-indigo-900 rounded-xl px-4 py-3 text-white shadow-md border border-violet-400/30">
            <div className="text-sm uppercase tracking-wider text-white">Time left</div>
            <div className="text-xl font-bold text-white">{formatTime(timeLeft)}</div>
          </div>
        </div>
        
        <div className="w-full bg-gray-800 rounded-full h-3 mb-8 border border-indigo-900/50">
          <div 
            className="bg-gradient-to-r from-indigo-600 to-cyan-500 h-3 rounded-full transition-all duration-1000" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
          {votingOptions.map((player) => (
            <PlayerCard 
              key={player.id} 
              player={player} 
              showVoteButton={true}
              isSelected={selectedVote === player.id}
            />
          ))}
          
          {votingOptions.length === 0 && (
            <div className="col-span-full bg-gray-800/50 rounded-xl text-center py-12 text-gray-400 border border-indigo-800/30">
              <div className="text-xl font-medium mb-2 text-indigo-300">No other players</div>
              <p className="text-indigo-200/70">Waiting for more players to join...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}