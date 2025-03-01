'use client';

import { useGameState } from '../context/GameStateContext';
import { useConnection } from '../context/ConnectionContext';
import { TransactionDefault } from "@coinbase/onchainkit/transaction";
import { encodeFunctionData } from 'viem';

interface Player {
  id: string;
  name: string;
  initials?: string;
  isAI?: boolean;
  walletAddress?: string; // Added to support wallet address
}

interface PlayerCardProps {
  player: Player;
  showVoteButton?: boolean;
  isSelected?: boolean;
  resultCard?: boolean;
  isAIPlayer?: boolean;
  isMostVoted?: boolean;
  voteCount?: number;
}

export default function PlayerCard({
  player,
  showVoteButton = false,
  isSelected = false,
  resultCard = false,
  isAIPlayer = false,
  isMostVoted = false,
  voteCount = 0
}: PlayerCardProps) {
  const { currentPlayer, votingOpen, currentGameId } = useGameState();
  const { sendToServer } = useConnection();
  
  const isCurrentUser = currentPlayer?.id === player.id;
  const initials = player.initials || player.name.substring(0, 2).toUpperCase();
  
  // Contract configuration
  const BASE_SEPOLIA_CHAIN_ID = 84532;
  const ContractAddress = '0x67157F48880D92Fdddb18451263F370564f19E1F';
  const ContractAbi = [
    {
      type: 'function',
      name: 'vote',
      inputs: [
        { internalType: 'string', name: 'gameId', type: 'string' },
        { internalType: 'address', name: 'votedFor', type: 'address' }
      ],
      outputs: [],
      stateMutability: 'nonpayable',
    }
  ] as const;
  
  // Vote transaction call data
  const getVoteCalls = () => {
    if (!player.walletAddress) return [];
    
    return [
      {
        to: ContractAddress as `0x${string}`,
        data: encodeFunctionData({
          abi: ContractAbi,
          functionName: 'vote',
          args: [currentGameId, player.walletAddress as `0x${string}`]
        }) as `0x${string}`,
      }
    ];
  };
  
  // Original handleVote for websocket communication
  const handleVote = () => {
    if (!votingOpen) return;
    if (isCurrentUser) return;
    if (currentPlayer?.isAI) return;
    
    sendToServer('vote', {
      voterId: currentPlayer?.id,
      votedForId: player.id
    });
  };
  
  return (
    <div className={`
      bg-gray-900/40 rounded-lg p-4 text-center transition-all 
      ${isCurrentUser ? 'border-2 border-pink-500' : 'border border-white/5'} 
      ${isSelected ? 'ring-2 ring-pink-500' : ''}
      ${resultCard && isAIPlayer ? 'border-2 border-pink-500' : ''}
      ${resultCard && !isAIPlayer ? 'border-2 border-green-500' : ''}
      relative
    `}>
      {/* Most voted badge (for results) */}
      {isMostVoted && (
        <div className="absolute top-2 left-2 bg-yellow-500 text-black text-xs font-bold py-1 px-2 rounded-full">
          Most Voted
        </div>
      )}
      
      {/* AI/Human label (for results) */}
      {resultCard && (
        <div className={`
          absolute top-2 right-2 text-xs font-bold py-1 px-2 rounded-full
          ${isAIPlayer ? 'bg-pink-500 text-white' : 'bg-green-500 text-black'}
        `}>
          {isAIPlayer ? 'AI' : 'HUMAN'}
        </div>
      )}
      
      <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3 bg-gradient-to-r from-purple-600 to-blue-400 text-lg font-bold">
        {initials}
      </div>
      
      <div className="font-bold mb-1 text-white">
        {player.name}
        {isCurrentUser && <span className="ml-1 text-xs text-pink-500">(You)</span>}
      </div>
      
      {resultCard && (
        <div className="mt-4 text-lg font-semibold">
          {voteCount} vote{voteCount !== 1 ? 's' : ''}
        </div>
      )}
      
      {showVoteButton && !isCurrentUser && (
        <div>
          {/* Use TransactionDefault for blockchain interaction */}
          <TransactionDefault 
            calls={getVoteCalls()} 
            chainId={BASE_SEPOLIA_CHAIN_ID}
            className={`
              mt-3 w-full py-1 px-2 rounded text-sm font-medium transition-colors
              ${isSelected 
                ? 'bg-pink-500 text-white' 
                : 'bg-transparent text-pink-500 border border-pink-500 hover:bg-pink-500 hover:text-white'
              }
            `}
            onSuccess={() => handleVote()} // Still handle the UI update on success
          >
            VOTE AS AI
          </TransactionDefault>
        </div>
      )}
    </div>
  );
}