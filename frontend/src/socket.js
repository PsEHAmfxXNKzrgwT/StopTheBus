import { io } from 'socket.io-client';

const socket = io('http://localhost:6464', {
  transports: ['websocket'],
});

export default socket;
