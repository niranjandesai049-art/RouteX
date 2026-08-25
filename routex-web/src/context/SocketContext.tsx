'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';

export interface LocationUpdatePayload {
  driverId: string;
  bookingId: string;
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
  timestamp: string;
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinBooking: (bookingId: string) => void;
  leaveBooking: (bookingId: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export const SocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);

  useEffect(() => {
    if (!user) {
      if (socket) {
        socket.disconnect();
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const rawUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
    // Strip trailing /api path so Socket.IO connects to root namespace '/' instead of '/api'
    const socketUrl = rawUrl.replace(/\/api\/?$/, '');

    // Create new socket connection
    const newSocket = io(socketUrl, {
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    });

    newSocket.on('connect', () => {
      setIsConnected(true);
      console.log('Socket.IO connected:', newSocket.id);

      // Auto-join room based on role
      if (user.role === 'driver') {
        newSocket.emit('driver:join', { driverId: user.id });
        console.log(`Driver ${user.id} requested to join socket room`);
      } else if (user.role === 'super_admin') {
        newSocket.emit('admin:join');
        console.log('Admin requested to join socket room');
      } else if (user.role === 'fleet_owner') {
        newSocket.emit('fleet:join');
        console.log('Fleet Owner requested to join socket room');
      }
    });

    newSocket.on('disconnect', (reason) => {
      setIsConnected(false);
      console.log('Socket.IO disconnected:', reason);
    });

    newSocket.on('connect_error', (error) => {
      console.warn('Socket.IO connection status:', error.message);
    });

    setSocket(newSocket);

    return () => {
      newSocket.off('connect');
      newSocket.off('disconnect');
      newSocket.off('connect_error');
      newSocket.disconnect();
    };
  }, [user?.id, user?.role]);

  const joinBooking = (bookingId: string) => {
    if (socket && isConnected) {
      socket.emit('shipper:join', { bookingId });
      console.log(`Requested to join booking room: ${bookingId}`);
    }
  };

  const leaveBooking = (bookingId: string) => {
    // Socket.IO rooms are automatically cleaned up on disconnect
    if (socket && isConnected) {
      console.log(`Leaving booking room implicitly`);
    }
  };

  return (
    <SocketContext.Provider value={{ socket, isConnected, joinBooking, leaveBooking }}>
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (context === undefined) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};
