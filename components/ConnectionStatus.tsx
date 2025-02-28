'use client';

import { useConnection } from '../context/ConnectionContext';

export default function ConnectionStatus() {
  const { connectionStatus } = useConnection();
  
  let statusText = 'Connecting...';
  let bgColor = 'bg-yellow-500';
  let textColor = 'text-black';
  
  if (connectionStatus === 'online') {
    statusText = 'Connected';
    bgColor = 'bg-green-500';
    textColor = 'text-black';
  } else if (connectionStatus === 'offline') {
    statusText = 'Disconnected';
    bgColor = 'bg-red-500';
    textColor = 'text-white';
  }
  
  return (
    <div className={`fixed top-2 right-2 ${bgColor} ${textColor} rounded-full text-xs font-bold py-1 px-3 z-50`}>
      {statusText}
    </div>
  );
}