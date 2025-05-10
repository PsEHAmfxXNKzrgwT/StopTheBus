// src/socket.js
import { io } from 'socket.io-client';

// Use environment variable or fallback to local backend URL
const socket = io(process.env.REACT_APP_BACKEND_URL || 'http://localhost:6464', {
  transports: ['websocket'],
});

export default socket;