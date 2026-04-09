import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext();

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const socketRef = useRef(null);
  
  const getUser = () => {
    try {
      return JSON.parse(localStorage.getItem('user') || 'null');
    } catch {
      return null;
    }
  };

  useEffect(() => {
    // Prevent multiple initializations
    if (socketRef.current) return;

    const user = getUser();
    const apiBase = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5001/api';
    const serverUrl = apiBase.startsWith('http') ? apiBase.replace('/api', '') : window.location.origin;
    
    console.log('Connecting to real-time server at:', serverUrl);

    const newSocket = io(serverUrl, {
      withCredentials: true,
      transports: ['polling', 'websocket'], // Polling first is often more stable for handshakes
      reconnectionAttempts: 5,
      timeout: 10000
    });

    newSocket.on('connect', () => {
      console.log('Real-time connection established:', newSocket.id);
      if (user && user.email) {
        newSocket.emit('join', user.email.toLowerCase());
      }
    });

    newSocket.on('connect_error', (error) => {
      console.warn('Real-time connection error:', error.message);
    });

    socketRef.current = newSocket;
    setSocket(newSocket);

    const handleStorageChange = () => {
      const updatedUser = getUser();
      if (socketRef.current && updatedUser && updatedUser.email) {
        socketRef.current.emit('join', updatedUser.email.toLowerCase());
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      // We don't necessarily want to close the shared socket on every minor re-render
      // only if the provider is truly being destroyed.
    };
  }, []);

  return (
    <SocketContext.Provider value={socket}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
