'use client';

import { useState } from 'react';
import { useConnection } from '../context/ConnectionContext';
import { useGameState } from '../context/GameStateContext';
import { useAccount } from 'wagmi';
import { Transaction, LifecycleStatus, TransactionButton, TransactionStatus, TransactionStatusLabel, TransactionStatusAction, TransactionDefault } from "@coinbase/onchainkit/transaction"
import { useCallback } from 'react';
import { encodeFunctionData } from 'viem';
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

    

    console.log(address);

    
    // Submit the prompt first
    sendToServer('submitPrompt', { prompt: promptText });
    
    // Generate a unique player ID
    const playerId = 'id_' + Math.random().toString(36).substring(2, 11);
    
    // Create player object
    const playerData = {
      id: playerId,
      name: username,
      walletAddress: address || '',
      initials: username.substring(0, 2).toUpperCase(),
      type: 'human' as 'human'
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


  const BASE_SEPOLIA_CHAIN_ID = 84532;


  const ContractAddress = '0x67157F48880D92Fdddb18451263F370564f19E1F';

  const ContractAbi = [
    {
      type: 'constructor',
      inputs: [
        { internalType: 'address', name: '_usdcAddress', type: 'address' }
      ],
      stateMutability: 'nonpayable',
    },
    {
      type: 'error',
      name: 'OwnableInvalidOwner',
      inputs: [
        { internalType: 'address', name: 'owner', type: 'address' }
      ],
    },
    {
      type: 'error',
      name: 'OwnableUnauthorizedAccount',
      inputs: [
        { internalType: 'address', name: 'account', type: 'address' }
      ],
    },
    {
      type: 'event',
      name: 'GameCompleted',
      anonymous: false,
      inputs: [
        { indexed: true, internalType: 'string', name: 'gameId', type: 'string' },
        { indexed: false, internalType: 'address', name: 'aiPlayer', type: 'address' },
        { indexed: false, internalType: 'address', name: 'mostVotedPlayer', type: 'address' },
        { indexed: false, internalType: 'bool', name: 'correctlyIdentified', type: 'bool' }
      ],
    },
    {
      type: 'event',
      name: 'GameCreated',
      anonymous: false,
      inputs: [
        { indexed: true, internalType: 'string', name: 'gameId', type: 'string' }
      ],
    },
    {
      type: 'function',
      name: 'ENTRY_FEE',
      inputs: [],
      outputs: [
        { internalType: 'uint256', name: '', type: 'uint256' }
      ],
      stateMutability: 'view',
    },
    {
      type: 'function',
      name: 'adminClaimUnclaimedRewards',
      inputs: [
        { internalType: 'string', name: 'gameId', type: 'string' }
      ],
      outputs: [],
      stateMutability: 'nonpayable',
    },
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
      name: 'endGame',
      inputs: [
        { internalType: 'string', name: 'gameId', type: 'string' }
      ],
      outputs: [],
      stateMutability: 'nonpayable',
    },
    {
      type: 'function',
      name: 'joinGame',
      inputs: [
        { internalType: 'string', name: 'gameId', type: 'string' }
      ],
      outputs: [],
      stateMutability: 'nonpayable',
    },
    {
      type: 'function',
      name: 'vote',
      inputs: [
        { internalType: 'string', name: 'gameId', type: 'string' },
        { internalType: 'address', name: 'votedFor', type: 'address' }
      ],
      outputs: [],
      stateMutability: 'nonpayable',
    },
    {
      type: 'function',
      name: 'withdrawToken',
      inputs: [
        { internalType: 'address', name: 'tokenAddress', type: 'address' }
      ],
      outputs: [],
      stateMutability: 'nonpayable',
    },
  ] as const;
  

  const calls = [
    {
      to: ContractAddress as `0x${string}`,
      data: encodeFunctionData({
        abi: ContractAbi,
        functionName: 'joinGame',
        args: ['1']
      }) as `0x${string}`,
    }
  ];


  
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

        <TransactionDefault calls={calls} chainId={BASE_SEPOLIA_CHAIN_ID} className={"Pay 10 USDC"} />
        

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