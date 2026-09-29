import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { useAuth } from './AuthContext.jsx';
import { createSocketClient } from '../lib/wsClient.js';

const SocketContext = createContext(null);

// Same env var the REST client (api/axios.js) uses, turned into a ws(s)://
// URL pointing at the backend's WebSocket upgrade path.
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
const WS_URL = `${API_BASE.replace(/\/api\/?$/, '').replace(/^http/, 'ws')}/ws`;

export function SocketProvider({ children }) {
  const { isAuthenticated } = useAuth();
  const [socket, setSocket] = useState(null);
  const clientRef = useRef(null);

  useEffect(() => {
    if (!isAuthenticated) {
      clientRef.current?.close();
      clientRef.current = null;
      setSocket(null);
      return undefined;
    }

    const token = localStorage.getItem('kb_access_token');
    if (!token) return undefined;

    // createSocketClient connects immediately and manages its own
    // reconnect-with-backoff loop internally, always re-reading the latest
    // access token from localStorage on each attempt (so a token refresh
    // that happened while disconnected is picked up automatically).
    const client = createSocketClient(
      () => WS_URL,
      () => localStorage.getItem('kb_access_token')
    );
    clientRef.current = client;
    setSocket(client);

    return () => {
      // Closing synchronously (rather than in a microtask) is what keeps
      // React StrictMode's dev mount->cleanup->mount double-invoke from
      // ever having two live connections open at once: the first client's
      // internal reconnect loop is marked "closed by user" before the
      // second client is created.
      client.close();
      clientRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  return <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>;
}

export const useSocket = () => useContext(SocketContext);
