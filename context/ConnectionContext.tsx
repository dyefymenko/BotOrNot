'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useGameState } from './GameStateContext';

type ConnectionStatus = 'connecting' | 'online' | 'offline';

interface ConnectionContextType {
  connectionStatus: ConnectionStatus;
  socket: WebSocket | null;
  sendToServer: (messageType: string, messageData: any) => boolean;
}

const ConnectionContext = createContext<ConnectionContextType>({
  connectionStatus: 'connecting',
  socket: null,
  sendToServer: () => false,
});

export const ConnectionProvider = ({ 
  children, 
  serverUrl = process.env.NEXT_PUBLIC_WEBSOCKET_URL || 'ws://localhost:8765' 
}: { 
  children: ReactNode, 
  serverUrl?: string 
}) => {
  const [socket, setSocket] = useState<WebSocket | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('connecting');
  const { updateGameState, addToast } = useGameState();
  const [reconnectAttempts, setReconnectAttempts] = useState(0);
  const [isInitialConnect, setIsInitialConnect] = useState(true);

  // Connect to WebSocket server
  useEffect(() => {
    const connectToServer = () => {
      setConnectionStatus('connecting');
      
      // Close existing connection if any
      if (socket) {
        console.log("Closing existing connection before reconnecting");
        socket.close();
      }
      
      try {
        // Create new WebSocket connection
        const newSocket = new WebSocket(serverUrl);
        
        newSocket.onopen = () => {
          console.log("Connected to WebSocket server");
          setConnectionStatus('online');
          setReconnectAttempts(0);
          setIsInitialConnect(false);
          
          // Send a ping to test connection
          const pingPayload = {
            type: 'ping'
          };
          newSocket.send(JSON.stringify(pingPayload));
          
          // Request current game state
          const statePayload = {
            type: 'getState'
          };
          newSocket.send(JSON.stringify(statePayload));
        };
        
        newSocket.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            console.log("Received from server:", data);
            handleServerMessage(data);
          } catch (error) {
            console.error("Error parsing message from server:", error);
          }
        };
        
        newSocket.onclose = () => {
          console.log("WebSocket connection closed");
          setConnectionStatus('offline');
          
          // Only show disconnect toast if we were previously connected
          if (!isInitialConnect) {
            addToast('error', 'Disconnected from server. Attempting to reconnect...');
          }
          
          // Try to reconnect with exponential backoff
          const attempts = reconnectAttempts + 1;
          setReconnectAttempts(attempts);
          const backoffTime = Math.min(3000 * Math.pow(1.5, attempts - 1), 30000);
          setTimeout(connectToServer, backoffTime);
        };
        
        newSocket.onerror = (error) => {
          console.error("WebSocket error:", error);
          setConnectionStatus('offline');
        };
        
        setSocket(newSocket);
      } catch (error) {
        console.error("Connection error:", error);
        setConnectionStatus('offline');
        
        // Try to reconnect with exponential backoff
        const attempts = reconnectAttempts + 1;
        setReconnectAttempts(attempts);
        const backoffTime = Math.min(3000 * Math.pow(1.5, attempts - 1), 30000);
        setTimeout(connectToServer, backoffTime);
      }
    };
    
    connectToServer();
    
    // Cleanup on unmount
    return () => {
      if (socket) {
        socket.close();
      }
    };
  }, [serverUrl]);

  // Handle messages from the server
  const handleServerMessage = (data: any) => {
    switch(data.type) {
      case "gameState":
        if (data.data) {
          updateGameState(data.data);
        }
        break;
        
      case "playersUpdate":
        if (Array.isArray(data.players)) {
          updateGameState({ players: data.players });
        }
        break;
        
      case "newMessage":
        if (data.message) {
          updateGameState({ 
            messages: (prev: any[]) => {
              // Check if message with this ID already exists
              if (prev.some(msg => msg.id === data.message.id)) {
                return prev; // Don't add duplicate
              }
              return [...prev, data.message];
            } 
          });
        }
        break;
        
      case "joinConfirmed":
        if (data.player) {
          updateGameState({ currentPlayer: data.player });
          addToast('success', 'Joined game successfully!');
        }
        break;
        
      case "voteConfirmed":
        addToast('info', `Your vote has been recorded`);
        break;
        
      case "promptConfirmed":
        updateGameState({ submittedPrompt: data.prompt });
        addToast('success', 'Prompt submitted successfully!');
        break;
        
      case "errorMessage":
        addToast('error', data.message || 'An error occurred');
        break;
        
      case "pong":
        console.log("Server responded to ping");
        break;
    }
  };

  // Send messages to the server
  const sendToServer = (messageType: string, messageData: any = {}) => {
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      // Only show the error toast if it's not during initial page load/connection
      if (!isInitialConnect) {
        // We're only showing one toast instead of multiple different ones
        addToast('error', 'Connection issue. Please try again in a moment.');
      }
      
      // Queue important messages for retry when connection is established
      if (['join', 'submitPrompt', 'submitVote'].includes(messageType)) {
        console.log(`Queuing important message of type ${messageType} for retry`);
        // You could implement a message queue system here if needed
      }
      
      return false;
    }
    
    try {
      const payload = {
        type: messageType,
        ...messageData
      };
      
      socket.send(JSON.stringify(payload));
      return true;
    } catch (error) {
      console.error("Error sending message:", error);
      return false;
    }
  };

  const value = {
    connectionStatus,
    socket,
    sendToServer,
  };

  return (
    <ConnectionContext.Provider value={value}>
      {children}
    </ConnectionContext.Provider>
  );
};

export const useConnection = () => useContext(ConnectionContext);