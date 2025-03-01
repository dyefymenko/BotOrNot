'use client';

import { useState } from 'react';
import { useConnection } from '../context/ConnectionContext';
import { useGameState } from '../context/GameStateContext';
import { useAccount } from 'wagmi';
import { TransactionDefault } from "@coinbase/onchainkit/transaction"
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
      type: 'human' as const
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

  // Game contract address
  const ContractAddress = '0x8c6922Ee7ffDB60fE1B0ff54cEC92B29DbCF72b2';
  
  // USDC token contract address on Base Sepolia
  const USDCAddress = '0x036CbD53842c5426634e7929541eC2318f3dCF7e'; // Replace with actual USDC address
  
  // Entry fee amount (10 USDC with 6 decimals)
  const ENTRY_FEE = 10 * 10**6;

  // ERC20 standard approval ABI
  const ERC20Abi = [
    {
      type: 'function',
      name: 'approve',
      inputs: [
        { internalType: 'address', name: 'spender', type: 'address' },
        { internalType: 'uint256', name: 'amount', type: 'uint256' }
      ],
      outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
      stateMutability: 'nonpayable',
    }
  ] as const;

  // Game contract ABI
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
  
  // Create USDC approval call
  const approveCalls = [
    {
      to: USDCAddress as `0x${string}`,
      data: encodeFunctionData({
        abi: ERC20Abi,
        functionName: 'approve',
        args: [ContractAddress as `0x${string}`, BigInt(ENTRY_FEE)]
      }) as `0x${string}`,
    }
  ];

  // Create game call data
  const createGameCalls = [
    {
      to: ContractAddress as `0x${string}`,
      data: encodeFunctionData({
        abi: ContractAbi,
        functionName: 'createGame',
        args: ['1']
      }) as `0x${string}`,
    }
  ];

  // Join game call data
  const joinGameCalls = [
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
          <label className="block text-white/80 mb-2">Your AI Agent Prompt (In case selected)</label>
          <input 
            type="text" 
            className="w-full p-3 rounded-lg bg-gray-700/50 border border-white/20 text-white"
            placeholder="e.g., A witty 60-year-old history professor who loves puns"
            value={promptText}
            onChange={(e) => setPromptText(e.target.value)}
          />
        </div>

        {/* First approve USDC spending */}
        <div className="mb-4">
          <TransactionDefault 
            calls={approveCalls} 
            chainId={BASE_SEPOLIA_CHAIN_ID}
            className="w-full bg-green-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-green-700 transition-all mb-3"
          >
            {/* Step 1: Approve USDC */}
          </TransactionDefault>

          {/* Then create game (if needed) */}
          <TransactionDefault 
            calls={createGameCalls} 
            chainId={BASE_SEPOLIA_CHAIN_ID}
            className="w-full bg-blue-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-blue-700 transition-all mb-3"
          >
            {/* Step 2: Create Game */}
          </TransactionDefault>

          {/* Finally join the game */}
          <TransactionDefault 
            calls={joinGameCalls} 
            chainId={BASE_SEPOLIA_CHAIN_ID} 
            className="w-full bg-purple-600 text-white font-bold py-2 px-6 rounded-lg hover:bg-purple-700 transition-all"
          >
            {/* Step 3: Join Game */}
          </TransactionDefault>
        </div>

        <button 
          className="w-full bg-gradient-to-r from-purple-600 to-blue-400 text-white font-bold py-3 px-6 rounded-full hover:shadow-lg transition-all"
          onClick={handleJoin}
        >
          COMPLETE REGISTRATION
        </button>
      </div>
    </div>
  );
}