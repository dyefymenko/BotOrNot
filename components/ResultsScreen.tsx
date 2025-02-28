'use client';

import { useGameState } from '../context/GameStateContext';
import { useConnection } from '../context/ConnectionContext';
import PlayerCard from './PlayerCard';

export default function ResultsScreen() {
  const { 
    gameResults, 
    players, 
    userStats,
    updateGameState
  } = useGameState();
  
  const { sendToServer } = useConnection();
  
  if (!gameResults) {
    return (
      <div className="text-center py-8">
        Results not available yet...
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
      <div className="bg-gray-800/60 rounded-xl p-6 border border-purple-600/30 text-center mb-8">
        <h2 className="text-2xl font-bold text-blue-400 mb-4">
          {correctIdentification 
            ? "The AI Was Found!" 
            : "The AI Got Away!"
          }
        </h2>
        <p className="text-lg mb-8">
          {correctIdentification 
            ? `${mostVotedPlayerName} received the most votes and was indeed the AI player.` 
            : `${mostVotedPlayerName} was voted as the AI, but the real AI was ${aiPlayerName}.`
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
        
        <div className="grid grid-cols-3 gap-4 max-w-lg mx-auto p-4 bg-gray-900/70 rounded-lg mb-8">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-400">{userStats.totalEarnings}</div>
            <div className="text-sm text-gray-400">USDC Earned</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-400">
              {userStats.gamesPlayed > 0 
                ? Math.round((userStats.gamesWon / userStats.gamesPlayed) * 100) 
                : 0}%
            </div>
            <div className="text-sm text-gray-400">Win Rate</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-400">{userStats.gamesPlayed}</div>
            <div className="text-sm text-gray-400">Games Played</div>
          </div>
        </div>
        
        <button 
          onClick={handlePlayAgain}
          className="bg-gradient-to-r from-purple-600 to-blue-400 text-white font-bold py-3 px-8 rounded-full hover:shadow-lg transition-all"
        >
          Play Again
        </button>
      </div>
    </div>
  );
}