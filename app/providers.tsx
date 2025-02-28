'use client';

import { base } from 'wagmi/chains';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import type { ReactNode } from 'react';
import { ConnectionProvider } from '../context/ConnectionContext';
import { GameStateProvider } from '../context/GameStateContext';

export function Providers(props: { children: ReactNode }) {
  return (
    <OnchainKitProvider
      apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
      chain={base}
      config={{ 
        appearance: { 
          mode: 'auto',
        },
        wallet: { 
          display: 'modal', 
          termsUrl: 'https://...', 
          privacyUrl: 'https://...', 
        },
      }}
    >
      <GameStateProvider>
        <ConnectionProvider>
          {props.children}
        </ConnectionProvider>
      </GameStateProvider>
    </OnchainKitProvider>
  );
}