import { io } from 'socket.io-client';

// Derive the server base URL from the API base URL (strip /api suffix)
const SOCKET_URL =
  (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/api$/, '') || window.location.origin;

let socket = null;

/** Get (or lazily create) the singleton socket instance */
export const getSocket = () => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['polling', 'websocket'],
      autoConnect: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
    });
  }
  return socket;
};

/**
 * Subscribe to a socket event and return an unsubscribe function.
 * Usage in useEffect:
 *   return subscribeToEvent('admin_orders_updated', () => fetchOrders());
 */
export const subscribeToEvent = (event, handler) => {
  const s = getSocket();
  s.on(event, handler);
  return () => s.off(event, handler);
};

export default getSocket;
