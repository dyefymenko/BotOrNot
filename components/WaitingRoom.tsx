'use client';

import { useState, useEffect } from 'react';
import { useGameState } from '../context/GameStateContext';
import PlayerCard from './PlayerCard';
import { TransactionButton, TransactionDefault } from "@coinbase/onchainkit/transaction";
import { encodeFunctionData } from 'viem';

export default function WaitingRoom() {
  const { players, currentGameId, nextGameTime, gameInProgress } = useGameState();
  const [timeLeft, setTimeLeft] = useState<string>('00:00');
  const [progress, setProgress] = useState(0);
  const [showStartButton, setShowStartButton] = useState(false);
  
  // Calculate prize pool
  const prizePool = players.length * 10;
  
  // Contract configuration
  const BASE_SEPOLIA_CHAIN_ID = 84532;
  const ContractAddress = '0x67157F48880D92Fdddb18451263F370564f19E1F';
  const ContractAbi = [
    {
      type: 'function',
      name: 'createGame',
      inputs: [
        { internalType: 'string', name: 'gameId', type: 'string' }
      ],
      outputs: [],
      stateMutability: 'nonpayable',
    },
    {
      type: 'function',
      name: 'startGame',
      inputs: [
        { internalType: 'string', name: 'gameId', type: 'string' }
      ],
      outputs: [],
      stateMutability: 'nonpayable',
    }
  ] as const;
  
  // Create game call data
  const createGameCalls = [
    {
      to: ContractAddress as `0x${string}`,
      data: encodeFunctionData({
        abi: ContractAbi,
        functionName: 'createGame',
        args: [currentGameId]
      }) as `0x${string}`,
    }
  ];
  
  // Start game call data
  const startGameCalls = [
    {
      to: ContractAddress as `0x${string}`,
      data: encodeFunctionData({
        abi: ContractAbi,
        functionName: 'startGame',
        args: [currentGameId]
      }) as `0x${string}`,
    }
  ];
  
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
      
      // Show start button when timer is close to expiration
      if (diff <= 2000 && players.length >= 2) {
        setShowStartButton(true);
      }
    };
    
    // Initial update
    updateTimer();
    
    // Update timer every second
    const interval = setInterval(updateTimer, 1000);
    
    return () => clearInterval(interval);
  }, [nextGameTime, players.length]);
  
  return (
    <div className="w-full">
      {gameInProgress && (
        <div className="bg-indigo-900/30 border border-indigo-500/50 rounded-lg p-4 mb-6 text-center animate-pulse">
          <p className="text-indigo-300">A game is already in progress! You&apos;ll be added to the next game starting in <span className="font-bold text-cyan-300">{timeLeft}</span>.</p>
        </div>
      )}
      
      <div className="bg-gray-900 rounded-2xl p-8 shadow-lg border border-indigo-500/30">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6 pb-4 border-b border-indigo-800/30">
          <div className="bg-gradient-to-r from-indigo-900 to-violet-900 rounded-xl px-6 py-4 text-white shadow-md border border-indigo-400/30">
            <div className="text-sm uppercase tracking-wider mb-1 text-indigo-300">Prize Pool</div>
            <div className="text-3xl font-bold flex items-center gap-2">
              <span className="text-indigo-300">{prizePool}</span>
              <span className="text-lg text-indigo-400">USDC</span>
            </div>
          </div>
          
          <div className="bg-gradient-to-r from-violet-900 to-indigo-900 rounded-xl px-6 py-4 text-white shadow-md border border-violet-400/30">
            <div className="text-sm uppercase tracking-wider mb-1 text-violet-300">Starting in</div>
            <div className="text-3xl font-bold text-violet-200">{timeLeft}</div>
          </div>
        </div>
        
        <h3 className="text-xl text-cyan-100 mb-2">Game <span className="text-indigo-400">#{currentGameId}</span> Waiting Room</h3>
        
        {!gameInProgress && !showStartButton && players.length >= 2 && (
          <div className="text-center mb-4">
            <TransactionDefault 
              calls={createGameCalls} 
              chainId={BASE_SEPOLIA_CHAIN_ID} 
              className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold py-3 px-8 rounded-full transition-all duration-200 shadow-md"
            >
              Create Game
            </TransactionDefault>
          </div>
        )}
        
        {showStartButton && !gameInProgress && (
          <div className="text-center mb-4">
            <TransactionDefault 
              calls={startGameCalls} 
              chainId={BASE_SEPOLIA_CHAIN_ID} 
              className="bg-gradient-to-r from-green-500 to-cyan-500 hover:from-green-600 hover:to-cyan-600 text-white font-bold py-3 px-8 rounded-full transition-all duration-200 shadow-md"
            >
              Start Game
            </TransactionDefault>
          </div>
        )}
        
        <p className="text-xl text-center my-4 text-indigo-400 font-medium">
          {gameInProgress ? 'Waiting for next game...' : 'Waiting for game to start...'}
        </p>
        
        <div className="w-full bg-gray-800 rounded-full h-3 mb-6 border border-indigo-900/50">
          <div 
            className="bg-gradient-to-r from-indigo-600 to-cyan-500 h-3 rounded-full" 
            style={{ width: `${progress}%` }}
          ></div>
        </div>
        
        <div className="flex justify-between items-center mb-6">
          <p className="text-indigo-300"><span className="text-cyan-300 font-bold">{players.length}</span> players in lobby</p>
          
          <div className="bg-indigo-900/50 text-indigo-300 px-4 py-2 rounded-full text-sm font-medium border border-indigo-700">
            {gameInProgress ? 'Next game queued' : 'Waiting for players'}
          </div>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-6">
          {players.length > 0 ? (
            players.map((player) => (
              <PlayerCard key={player.id} player={player} />
            ))
          ) : (
            <div className="col-span-full bg-gray-800/50 rounded-xl text-center py-12 text-gray-400 border border-indigo-800/30">
              <div className="text-xl font-medium mb-2 text-indigo-300">No players yet</div>
              <p className="text-indigo-200/70">Waiting for others to join...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}