import { io, type Socket } from 'socket.io-client';

const rawApiUrl = import.meta.env.VITE_API_URL?.trim();
const normalizedApiUrl = rawApiUrl
  ? (/^https?:\/\//i.test(rawApiUrl) ? rawApiUrl : `https://${rawApiUrl}`)
  : undefined;
const SOCKET_BASE_URL = normalizedApiUrl?.replace(/\/$/, '');

if (!SOCKET_BASE_URL) {
  throw new Error('Missing VITE_API_URL. Set it in the frontend .env file.');
}

let socket: Socket | null = null;

export const getRealtimeSocket = () => {
  if (!socket) {
    socket = io(SOCKET_BASE_URL, {
      withCredentials: true,
      transports: ['websocket', 'polling'],
    });
  }

  return socket;
};
