import { Server, Socket } from 'socket.io';
import { RoomManager } from './roomManager';

import { Redis } from 'ioredis';

export const setupSocket = (io: Server, redis: Redis) => {
  const roomManager = new RoomManager(io, redis);

  io.on('connection', (socket: Socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on('disconnect', () => {
      console.log(`User disconnected: ${socket.id}`);
      // TODO: Handle player disconnect from roomManager if needed
    });

    socket.on('CREATE_ROOM', async ({ quizId, userId }: { quizId: string; userId: string }, callback: (res: any) => void) => {
      try {
        const roomId = await roomManager.createRoom(socket.id, quizId, userId);
        socket.join(roomId); 
        callback({ success: true, roomId });
      } catch (err: any) {
        callback({ success: false, error: err.message });
      }
    });

    socket.on('RECONNECT_HOST', ({ roomId, userId }: { roomId: string; userId: string }) => {
        roomManager.reconnectHost(socket, roomId, userId);
    });

    socket.on('JOIN_ROOM', ({ roomId, username }: { roomId: string; username: string }) => {
        roomManager.joinRoom(socket, roomId, username);
    });

    socket.on('START_QUESTION', ({ roomId }: { roomId: string }) => {
        roomManager.startQuestion(socket.id, roomId);
    });

    socket.on('SUBMIT_VOTE', ({ roomId, optionId }: { roomId: string; optionId: string }) => {
        roomManager.submitVote(socket, roomId, optionId);
    });

    socket.on('TERMINATE_ROOM', ({ roomId }: { roomId: string }) => {
        roomManager.terminateRoom(socket.id, roomId);
    });
  });
};


