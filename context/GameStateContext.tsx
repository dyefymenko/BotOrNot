'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Toast type definition
type ToastType = 'info' | 'success' | 'warning' | 'error';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

// Game state type definitions
interface Player {
  id: string;
  name: string;
  walletAddress: string;
  initials: string;
  type: 'human' | 'bot';
  isAI?: boolean;
}

interface Message {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
}

interface GameResults {
  aiPlayerId: string;
  aiPlayerName: string;
  mostVotedPlayerId: string;
  mostVotedPlayerName: string;
  voteCounts: Record<string, number>;
  correctIdentification: boolean;
}

type GameView = 'join' | 'waiting' | 'chat' | 'voting' | 'results';

interface GameState {
  currentView: GameView;
  currentPlayer: Player | null;
  players: Player[];
  messages: Message[];
  gameInProgress: boolean;
  nextGameTime: number | null;
  currentGameId: string;
  selectedVote: string | null;
  submittedPrompt: string | null;
  votingOpen: boolean;
  gameResults: GameResults | null;
  aiControlled: boolean;
  userStats: {
    gamesPlayed: number;
    gamesWon: number;
    totalEarnings: number;
  };
  toasts: Toast[];
}

interface GameStateContextType extends GameState {
  updateGameState: (updates: Partial<GameState> | ((prevState: GameState) => Partial<GameState>)) => void;
  resetGame: () => void;
  addToast: (type: ToastType, message: string) => void;
  removeToast: (id: string) => void;
}

const defaultGameState: GameState = {
  currentView: 'join',
  currentPlayer: null,
  players: [],
  messages: [],
  gameInProgress: false,
  nextGameTime: null,
  currentGameId: '1',
  selectedVote: null,
  submittedPrompt: null,
  votingOpen: false,
  gameResults: null,
  aiControlled: false,
  userStats: {
    gamesPlayed: 0,
    gamesWon: 0,
    totalEarnings: 0,
  },
  toasts: [],
};

const GameStateContext = createContext<GameStateContextType>({
  ...defaultGameState,
  updateGameState: () => {},
  resetGame: () => {},
  addToast: () => {},
  removeToast: () => {},
});

export const GameStateProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<GameState>(defaultGameState);

  // Function to generate unique IDs
  const generateId = () => `id_${Math.random().toString(36).substring(2, 11)}`;

  // Update game state function
  const updateGameState = (updates: Partial<GameState> | ((prevState: GameState) => Partial<GameState>)) => {
    setState(prevState => {
      // If updates is a function, call it with the previous state
      const newUpdates = typeof updates === 'function' ? updates(prevState) : updates;
      
      // Special handling for messages array updates
      if (newUpdates.messages && typeof newUpdates.messages === 'function') {
        return {
          ...prevState,
          ...newUpdates,
          messages: (newUpdates.messages as (prev: Message[]) => Message[])(prevState.messages),
        };
      }
      
      // Check if the AI controlled flag should be updated
      let aiControlled = prevState.aiControlled;
      if (newUpdates.players && prevState.currentPlayer) {
        const currentPlayerData = newUpdates.players.find(p => p.id === prevState.currentPlayer?.id);
        if (currentPlayerData) {
          aiControlled = currentPlayerData.isAI === true;
        }
      }
      
      // Handle view transitions based on game state
      let currentView = newUpdates.currentView || prevState.currentView;
      
      // Auto-transition to waiting room when a player joins
      if (newUpdates.currentPlayer && prevState.currentPlayer === null && currentView === 'join') {
        currentView = 'waiting';
      }
      
      // Auto-transition to chat room when game starts
      if (newUpdates.gameInProgress === true && !prevState.gameInProgress && currentView !== 'chat') {
        currentView = 'chat';
      }
      
      // Auto-transition to voting when voting opens
      if (newUpdates.votingOpen === true && !prevState.votingOpen && currentView !== 'voting') {
        currentView = 'voting';
      }
      
      // Auto-transition to results when game ends and results are available
      if (newUpdates.gameResults && !prevState.gameResults && currentView !== 'results') {
        currentView = 'results';
      }
      
      return {
        ...prevState,
        ...newUpdates,
        aiControlled,
        currentView,
      };
    });
  };

  // Reset game state
  const resetGame = () => {
    setState({
      ...defaultGameState,
      currentPlayer: state.currentPlayer,
      submittedPrompt: state.submittedPrompt,
      userStats: state.userStats,
    });
  };

  // Toast management functions
  const addToast = (type: ToastType, message: string) => {
    const newToast: Toast = { id: generateId(), type, message };
    setState(prev => ({
      ...prev,
      toasts: [...prev.toasts, newToast],
    }));
    
    // Auto-remove toast after 3 seconds
    setTimeout(() => removeToast(newToast.id), 3000);
  };

  const removeToast = (id: string) => {
    setState(prev => ({
      ...prev,
      toasts: prev.toasts.filter(toast => toast.id !== id),
    }));
  };

  // Effects for game state transitions
  useEffect(() => {
    // Update game stats when results are available
    if (state.gameResults && state.currentPlayer) {
      const { aiPlayerId, mostVotedPlayerId, correctIdentification } = state.gameResults;
      
      // Update games played
      setState(prev => ({
        ...prev,
        userStats: {
          ...prev.userStats,
          gamesPlayed: prev.userStats.gamesPlayed + 1,
        }
      }));
      
      // Update games won if player voted correctly
      if (state.selectedVote === aiPlayerId && correctIdentification) {
        setState(prev => ({
          ...prev,
          userStats: {
            ...prev.userStats,
            gamesWon: prev.userStats.gamesWon + 1,
            totalEarnings: prev.userStats.totalEarnings + 10, // Example earnings
          }
        }));
      }
    }
  }, [state.gameResults]);

  const value = {
    ...state,
    updateGameState,
    resetGame,
    addToast,
    removeToast,
  };

  return (
    <GameStateContext.Provider value={value}>
      {children}
    </GameStateContext.Provider>
  );
};

export const useGameState = () => useContext(GameStateContext);