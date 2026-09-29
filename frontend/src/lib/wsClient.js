// A minimal native-WebSocket client that exposes the same on/off/emit
// surface socket.io-client did, so the rest of the app (Messages.jsx,
// useNotifications.js) didn't need to change when the transport switched
// away from Socket.io. Wire protocol matches the backend
// (backend/src/sockets/index.js): JSON `{ event, data }` frames both ways.

const MAX_RECONNECT_DELAY_MS = 30000;
const BASE_RECONNECT_DELAY_MS = 1000;

export function createSocketClient(getUrl, getToken) {
  let ws = null;
  let closedByUser = false;
  let reconnectAttempts = 0;
  let reconnectTimer = null;
  const listeners = new Map(); // event -> Set<fn>

  function emitLocal(event, data) {
    listeners.get(event)?.forEach((fn) => {
      try {
        fn(data);
      } catch (err) {
        // eslint-disable-next-line no-console
        console.error(`Error in socket "${event}" listener:`, err);
      }
    });
  }

  function scheduleReconnect() {
    if (closedByUser || reconnectTimer) return;
    const delay = Math.min(MAX_RECONNECT_DELAY_MS, BASE_RECONNECT_DELAY_MS * 2 ** reconnectAttempts);
    reconnectAttempts += 1;
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null;
      connect();
    }, delay);
  }

  function connect() {
    if (closedByUser) return;
    const token = getToken();
    if (!token) return; // logged out mid-reconnect-loop - stop trying

    const socket = new WebSocket(`${getUrl()}?token=${encodeURIComponent(token)}`);
    ws = socket;

    socket.onopen = () => {
      reconnectAttempts = 0;
      emitLocal('connect');
    };
    socket.onmessage = (e) => {
      try {
        const { event, data } = JSON.parse(e.data);
        emitLocal(event, data);
      } catch {
        // Ignore malformed frames rather than crashing the connection.
      }
    };
    socket.onclose = () => {
      emitLocal('disconnect');
      scheduleReconnect();
    };
    socket.onerror = () => {
      // onclose always follows onerror for a WebSocket, which already
      // schedules the reconnect - nothing extra to do here.
      socket.close();
    };
  }

  connect();

  return {
    on(event, cb) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event).add(cb);
    },
    off(event, cb) {
      listeners.get(event)?.delete(cb);
    },
    emit(event, data) {
      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ event, data }));
      }
      // Silently dropped if not connected yet/currently reconnecting - this
      // matches how the previous socket.io-client usage was always guarded
      // with `socket?.emit(...)` at call sites and never assumed delivery.
    },
    close() {
      closedByUser = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      ws?.close();
    },
  };
}
