'use client';

import { useEffect, useState } from 'react';

type ToastType = 'info' | 'success' | 'warning' | 'error';

interface ToastProps {
  type: ToastType;
  message: string;
  duration?: number;
  onClose: () => void;
}

export default function Toast({ type, message, duration = 3000, onClose }: ToastProps) {
  const [visible, setVisible] = useState(false);
  
  useEffect(() => {
    // Fade in animation
    const showTimer = setTimeout(() => {
      setVisible(true);
    }, 10);
    
    // Auto close after duration
    const hideTimer = setTimeout(() => {
      setVisible(false);
      
      // Wait for animation to complete before removing
      setTimeout(onClose, 300);
    }, duration);
    
    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [duration, onClose]);
  
  // Toast type styling
  const getTypeStyles = () => {
    switch(type) {
      case 'info':
        return 'border-l-4 border-blue-500';
      case 'success':
        return 'border-l-4 border-green-500';
      case 'warning':
        return 'border-l-4 border-yellow-500';
      case 'error':
        return 'border-l-4 border-red-500';
      default:
        return 'border-l-4 border-blue-500';
    }
  };
  
  return (
    <div 
      className={`
        bg-gray-800 text-white rounded shadow-lg p-4 mb-2 
        transform transition-all duration-300 w-64
        ${visible ? 'translate-x-0 opacity-100' : 'translate-x-full opacity-0'}
        ${getTypeStyles()}
      `}
    >
      <div className="flex items-center justify-between">
        <div>{message}</div>
        <button 
          onClick={() => {
            setVisible(false);
            setTimeout(onClose, 300);
          }}
          className="ml-2 text-white/60 hover:text-white"
        >
          ×
        </button>
      </div>
    </div>
  );
}