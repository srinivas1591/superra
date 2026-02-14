import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const API_URL = import.meta.env.VITE_API_URL || (typeof window !== 'undefined' && `${window.location.protocol}//${window.location.hostname}:3001`) || 'http://localhost:3001';

export function useSocket() {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const s = io(API_URL, { autoConnect: true });
    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));
    setSocket(s);
    return () => s.disconnect();
  }, []);

  return { socket, connected, apiUrl: API_URL };
}
