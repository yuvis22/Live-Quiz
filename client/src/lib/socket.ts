import { io, Socket } from 'socket.io-client';
import { SOCKET_URL } from './config';

let socket: Socket;

export const getSocket = (): Socket => {
  if (!socket) {
    socket = io(SOCKET_URL, {
      transports: ['websocket'],
      autoConnect: false,
    });
    
    socket.on('connect', () => {
      console.log('Connected to socket server:', socket.id);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from socket server');
    });
  }
  return socket;
};
