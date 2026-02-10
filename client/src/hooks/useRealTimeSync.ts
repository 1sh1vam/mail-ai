import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore, useMailStore } from '@/store';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function useRealTimeSync() {
  const socketRef = useRef<Socket | null>(null);
  const { token, isAuthenticated } = useAuthStore();
  const { addNewEmail, updateEmail } = useMailStore();

  const connect = useCallback(() => {
    if (!token || socketRef.current?.connected) return;

    socketRef.current = io(API_URL, {
      auth: { token },
      transports: ['websocket'],
    });

    socketRef.current.on('connect', () => {
      console.log('🔌 WebSocket connected');
    });

    socketRef.current.on('newEmail', (email) => {
      console.log('📧 New email received:', email.subject);
      addNewEmail(email);
    });

    socketRef.current.on('emailUpdate', ({ emailId, update }) => {
      console.log('📝 Email updated:', emailId);
      updateEmail(emailId, update);
    });

    socketRef.current.on('disconnect', () => {
      console.log('WebSocket disconnected');
    });

    socketRef.current.on('error', (error) => {
      console.error('WebSocket error:', error);
    });
  }, [token, addNewEmail, updateEmail]);

  const disconnect = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.disconnect();
      socketRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated && token) {
      connect();
    } else {
      disconnect();
    }

    return () => {
      disconnect();
    };
  }, [isAuthenticated, token, connect, disconnect]);

  return {
    isConnected: socketRef.current?.connected ?? false,
    connect,
    disconnect,
  };
}
