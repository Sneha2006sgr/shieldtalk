import { io } from 'socket.io-client';

let socket = null;

// In production the frontend is served from the same origin as the backend
// In dev, Vite proxies /socket.io to localhost:5000
const SERVER_URL = import.meta.env.VITE_API_URL || window.location.origin;

export function getSocket() {
  if (socket) return socket;

  socket = io(SERVER_URL, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: Infinity,
  });

  return socket;
}

export function destroySocket() {
  if (socket) { socket.disconnect(); socket = null; }
}
