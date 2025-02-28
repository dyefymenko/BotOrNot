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
        <div className="bg-gray-800/60 rounded-xl p-6 border border-purple-600/30 text-center">
          <h2 className="text-2xl font-bold text-pink-400 mb-6">Voting Phase</h2>
          <p className="text-xl mb-6">
            As the AI-controlled player this round, you cannot vote.
          </p>
          <p className="text-lg">
            Other players are voting on who they think is the AI. 
            Time left: {formatTime(timeLeft)}
          </p>
          
          <div className="w-full bg-gray-700 rounded-full h-2.5 my-6">
            <div 
              className="bg-gradient-to-r from-purple-600 to-blue-400 h-2.5 rounded-full transition-all duration-1000" 
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      </div>
    );
  }
  
  return (
    <div className="w-full">
      <div className="bg-gray-800/60 rounded-xl p-6 border border-purple-600/30">
        <h2 className="text-2xl font-bold text-pink-400 text-center mb-4">Time to Vote!</h2>
        <p className="text-lg text-center mb-6">Select the player you think is an AI bot</p>
        
        <div className="text-xl font-bold text-yellow-400 text-center mb-4">
          Time left: {formatTime(timeLeft)}
        </div>
        
        <div className="w-full bg-gray-700 rounded-full h-2.5 mb-6">
          <div 
            className="bg-gradient-to-r from-purple-600 to-blue-400 h-2.5 rounded-full transition-all duration-1000" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {votingOptions.map((player) => (
            <PlayerCard 
              key={player.id} 
              player={player} 
              showVoteButton={true}
              isSelected={selectedVote === player.id}
            />
          ))}
          
          {votingOptions.length === 0 && (
            <div className="col-span-full text-center py-8 text-gray-400">
              No other players to vote on
            </div>
          )}
        </div>
      </div>
    </div>
  );
}