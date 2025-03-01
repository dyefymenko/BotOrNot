'use client';

import { useState } from 'react';
import { ConnectWallet, Wallet, WalletDropdown, WalletDropdownDisconnect } from '@coinbase/onchainkit/wallet';
import { Address, Avatar, Name, Identity, EthBalance } from '@coinbase/onchainkit/identity';
import GameLobby from '../components/GameLobby';
import WaitingRoom from '../components/WaitingRoom';
import ChatRoom from '../components/ChatRoom';
import VotingRoom from '../components/VotingRoom';
import ResultsScreen from '../components/ResultsScreen';
import JoinModal from '../components/JoinModal';
import { useGameState } from '../context/GameStateContext';
import ConnectionStatus from '../components/ConnectionStatus';
import Toast from '../components/Toast';

export default function Home() {
  const [showJoinModal, setShowJoinModal] = useState(false);
  const { currentView, toasts, removeToast } = useGameState();

  return (
    <div className="flex flex-col min-h-screen font-sans dark:bg-background dark:text-white bg-white text-black">
      <ConnectionStatus />
      
      {/* Toast notifications */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2">
        {toasts.map((toast) => (
          <Toast 
            key={toast.id} 
            type={toast.type} 
            message={toast.message} 
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>
      
      <header className="pt-4 pr-4">
        <div className="flex justify-end">
          <div className="wallet-container">
            <Wallet>
              <ConnectWallet>
                <Avatar className="h-6 w-6" />
                <Name />
              </ConnectWallet>
              <WalletDropdown>
                <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
                  <Avatar />
                  <Name />
                  <Address />
                  <EthBalance />
                </Identity>
                <WalletDropdownDisconnect />
              </WalletDropdown>
            </Wallet>
          </div>
        </div>
      </header>

      <main className="flex-grow flex flex-col items-center">
        <div className="max-w-4xl w-full p-4">
          <header className="text-center mb-10">
            <h1 className="text-5xl font-extrabold mb-2 bg-gradient-to-r from-purple-600 to-blue-400 bg-clip-text text-transparent">
              BOT or NOT?
            </h1>
            <p className="text-lg text-blue-400 opacity-80">
              A social deduction game of trust and deception
            </p>
          </header>
          
          {/* Game Views */}
          {currentView === 'join' && (
            <GameLobby onJoinClick={() => setShowJoinModal(true)} />
          )}
          
          {currentView === 'waiting' && <WaitingRoom />}
          {currentView === 'chat' && <ChatRoom />}
          {currentView === 'voting' && <VotingRoom />}
          {currentView === 'results' && <ResultsScreen />}
          
          {/* Join Modal */}
          <JoinModal isOpen={showJoinModal} onClose={() => setShowJoinModal(false)} />
        </div>
      </main>
      
      <footer className="text-center py-4 text-sm opacity-70">
        <p>© 2025 BOT or NOT? — Play to win, trust no one.</p>
      </footer>
    </div>
  );
}