import { io, type Socket } from 'socket.io-client';

const resolveSocketBaseUrl = () => {
  const rawApiUrl = import.meta.env.VITE_API_URL?.trim();

  if (!rawApiUrl) {
    return 'http://localhost:3000';
  }

  if (/^https?:\/\//i.test(rawApiUrl)) {
    return rawApiUrl.replace(/\/$/, '');
  }

  // Keep localhost development on HTTP unless explicitly set otherwise.
  if (/^(localhost|127\.0\.0\.1)(:\d+)?$/i.test(rawApiUrl)) {
    return `http://${rawApiUrl}`;
  }

  const protocol = window.location.protocol === 'https:' ? 'https' : 'http';
  return `${protocol}://${rawApiUrl}`.replace(/\/$/, '');
};

const SOCKET_BASE_URL = resolveSocketBaseUrl();

if (!SOCKET_BASE_URL) {
  throw new Error('Missing VITE_API_URL. Set it in the frontend .env file.');
}

let socket: Socket | null = null;

export const getRealtimeSocket = () => {
  if (!socket) {
    socket = io(SOCKET_BASE_URL, {
      withCredentials: true,
      transports: ['polling', 'websocket'],
    });
  }

  return socket;
};
