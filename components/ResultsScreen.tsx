'use client';

import { useGameState } from '../context/GameStateContext';
import PlayerCard from './PlayerCard';
import { TransactionDefault } from "@coinbase/onchainkit/transaction";
import { encodeFunctionData } from 'viem';

export default function ResultsScreen() {
  const { 
    gameResults, 
    players, 
    userStats,
    updateGameState,
    currentGameId
  } = useGameState();
  
  
  // Contract configuration
  const BASE_SEPOLIA_CHAIN_ID = 84532;
  const ContractAddress = '0x67157F48880D92Fdddb18451263F370564f19E1F';
  const ContractAbi = [
    {
      type: 'function',
      name: 'endGame',
      inputs: [
        { internalType: 'string', name: 'gameId', type: 'string' }
      ],
      outputs: [],
      stateMutability: 'nonpayable',
    }
  ] as const;
  
  // End game call data
  const endGameCalls = [
    {
      to: ContractAddress as `0x${string}`,
      data: encodeFunctionData({
        abi: ContractAbi,
        functionName: 'endGame',
        args: [currentGameId]
      }) as `0x${string}`,
    }
  ];
  
  if (!gameResults) {
    return (
      <div className="text-center py-8">
        <p className="text-xl text-white mb-6">Voting has ended! Calculating results...</p>
        
        <TransactionDefault 
          calls={endGameCalls} 
          chainId={BASE_SEPOLIA_CHAIN_ID} 
          className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold py-3 px-8 rounded-full transition-all duration-200 shadow-md"
        >
          {/* Show Results */}
        </TransactionDefault>
      </div>
    );
  }
  
  const { 
    aiPlayerId, 
    aiPlayerName, 
    mostVotedPlayerId, 
    mostVotedPlayerName, 
    correctIdentification, 
    voteCounts 
  } = gameResults;
  
  const handlePlayAgain = () => {
    // Go back to waiting room
    updateGameState({ currentView: 'waiting' });
  };
  
  return (
    <div className="w-full">
      <div className="bg-gray-900 rounded-2xl p-8 shadow-lg border border-indigo-500/30 text-center mb-8">
        <h2 className="text-2xl font-bold text-white mb-6">
          {correctIdentification 
            ? <span>The AI Was <span className="text-indigo-400">Found!</span></span> 
            : <span>The AI Got <span className="text-cyan-400">Away!</span></span>
          }
        </h2>
        <p className="text-lg mb-8 text-white">
          {correctIdentification 
            ? <><span className="text-indigo-400 font-medium">{mostVotedPlayerName}</span> received the most votes and was indeed the AI player.</> 
            : <><span className="text-indigo-400 font-medium">{mostVotedPlayerName}</span> was voted as the AI, but the real AI was <span className="text-cyan-400 font-medium">{aiPlayerName}</span>.</>
          }
        </p>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6 mb-8">
          {players.map((player) => (
            <PlayerCard 
              key={player.id}
              player={player}
              resultCard={true}
              isAIPlayer={player.id === aiPlayerId}
              isMostVoted={player.id === mostVotedPlayerId}
              voteCount={voteCounts[player.id] || 0}
            />
          ))}
        </div>
        
        <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto p-6 bg-gray-800 border border-indigo-800/30 rounded-xl mb-8 shadow-md">
          <div className="text-center">
            <div className="text-sm uppercase tracking-wider text-indigo-300 mb-1">USDC Earned</div>
            <div className="text-2xl font-bold text-white">{userStats.totalEarnings}</div>
          </div>
          <div className="text-center">
            <div className="text-sm uppercase tracking-wider text-indigo-300 mb-1">Win Rate</div>
            <div className="text-2xl font-bold text-white">
              {userStats.gamesPlayed > 0 
                ? Math.round((userStats.gamesWon / userStats.gamesPlayed) * 100) 
                : 0}%
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm uppercase tracking-wider text-indigo-300 mb-1">Games Played</div>
            <div className="text-2xl font-bold text-white">{userStats.gamesPlayed}</div>
          </div>
        </div>
        
        <button 
          onClick={handlePlayAgain}
          className="bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-bold py-3 px-8 rounded-full transition-all duration-200 shadow-md"
        >
          Play Again
        </button>
      </div>
    </div>
  );
}