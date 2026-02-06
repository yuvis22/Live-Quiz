import { Server, Socket } from 'socket.io';
import { Quiz, IQuiz } from '../models/Quiz';
import { Leaderboard } from '../models/Leaderboard';

interface Player {
  socketId: string;
  username: string;
  score: number;
}

interface Room {
  id: string;
  hostSocketId: string;
  hostUserId: string; // To allow reconnects
  quiz: IQuiz;
  players: Map<string, Player>; // socketId -> Player
  currentQuestionIndex: number;
  isLive: boolean;
  timer: NodeJS.Timeout | null;
  timeLeft: number;
  votes: Map<string, string>; // socketId -> optionId
}

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private io: Server;

  constructor(io: Server) {
    this.io = io;
  }

  async createRoom(hostSocketId: string, quizId: string, hostUserId: string): Promise<string> {
    const quiz = await Quiz.findById(quizId);
    if (!quiz) throw new Error('Quiz not found');

    let roomId = '';
    do {
       roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    } while (this.rooms.has(roomId));
    
    this.rooms.set(roomId, {
      id: roomId,
      hostSocketId,
      hostUserId,
      quiz,
      players: new Map(),
      currentQuestionIndex: -1,
      isLive: false,
      timer: null,
      timeLeft: 0,
      votes: new Map()
    });

    console.log(`Room ${roomId} created by ${hostSocketId}`);
    return roomId;
  }

  joinRoom(socket: Socket, roomId: string, username: string) {
    const room = this.rooms.get(roomId);
    if (!room) {
      socket.emit('ERROR', { message: 'Room not found' });
      return;
    }

    if (room.players.has(socket.id)) return; // Already joined

    const player: Player = { socketId: socket.id, username, score: 0 };
    room.players.set(socket.id, player);
    socket.join(roomId);

    // Notify everyone (especially host)
    // Send updated list
    this.broadcastPlayerList(roomId);
    
    console.log(`${username} joined room ${roomId}`);
  }

  reconnectHost(socket: Socket, roomId: string, userId: string) {
     const room = this.rooms.get(roomId);
     if (!room) {
        socket.emit('ERROR', { message: 'Room not found' });
        return;
     }

     if (room.hostUserId !== userId) {
        socket.emit('ERROR', { message: 'Unauthorized: You are not the host' });
        return;
     }

     // Update host socket
     room.hostSocketId = socket.id;
     socket.join(roomId);

     // Send current state
     socket.emit('PLAYER_JOINED', {
        username: 'HOST',
        playerCount: room.players.size,
        players: Array.from(room.players.values()).map(p => ({
            socketId: p.socketId,
            username: p.username,
            score: p.score
        }))
     });
     
     // Also send current question if any
     if (room.currentQuestionIndex >= 0) {
        const question = room.quiz.questions[room.currentQuestionIndex];
        socket.emit('NEW_QUESTION', {
            id: question.id,
            type: question.type || 'MCQ',
            text: question.text,
            options: question.options,
            timeLimit: 15,
            currentQuestionIndex: room.currentQuestionIndex + 1,
            totalQuestions: room.quiz.questions.length
        });
        if (room.isLive) {
            socket.emit('TICK', room.timeLeft);
            // Send stats
            const voteCounts: Record<string, number> = {};
            question.options.forEach(opt => voteCounts[opt.id] = 0);
            room.votes.forEach((vote) => {
               if (voteCounts[vote]) voteCounts[vote]++;
            });
            socket.emit('LIVE_STATS', voteCounts);
        }
     }

     console.log(`Host reconnected to room ${roomId}`);
  }

  private broadcastPlayerList(roomId: string) {
     const room = this.rooms.get(roomId);
     if (!room) return;

     const playerList = Array.from(room.players.values()).map(p => ({
        socketId: p.socketId,
        username: p.username,
        score: p.score
    }));
    console.log(`[DEBUG] Broadcasting PLAYER_JOINED to room ${roomId}. Players:`, playerList.length);
    this.io.to(roomId).emit('PLAYER_JOINED', { 
        username: '', // Not needed for update
        playerCount: room.players.size,
        players: playerList 
    });
  }

  startQuestion(socketId: string, roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    if (room.hostSocketId !== socketId) return; // Only host can start

    if (room.currentQuestionIndex + 1 >= room.quiz.questions.length) {
      this.io.to(roomId).emit('QUIZ_ENDED'); // TODO: Final leaderboard
      return;
    }

    room.currentQuestionIndex++;
    room.votes.clear();
    room.timeLeft = 15; // Specs say 15s

    const question = room.quiz.questions[room.currentQuestionIndex];
    
    // Broadcast question (HIDE CORRECT ANSWER)
    this.io.to(roomId).emit('NEW_QUESTION', {
      id: question.id,
      type: question.type || 'MCQ',
      text: question.text,
      options: question.options,
      timeLimit: 15,
      currentQuestionIndex: room.currentQuestionIndex + 1, // 1-based for UI
      totalQuestions: room.quiz.questions.length
    });

    // Start Timer
    if (room.timer) clearInterval(room.timer);
    
    room.timer = setInterval(() => {
      room.timeLeft--;
      this.io.to(roomId).emit('TICK', room.timeLeft);

      if (room.timeLeft <= 0) {
        this.endQuestion(roomId);
      }
    }, 1000);
  }

  submitVote(socket: Socket, roomId: string, optionId: string) {
    const room = this.rooms.get(roomId);
    if (!room || room.timeLeft <= 0) return;
    
    if (!room.players.has(socket.id)) return; // Must be a player

    room.votes.set(socket.id, optionId);

    // Calculate live stats for chart
    const voteCounts: Record<string, number> = {};
    room.quiz.questions[room.currentQuestionIndex].options.forEach(opt => voteCounts[opt.id] = 0);
    
    room.votes.forEach((vote) => {
      if (voteCounts[vote]) voteCounts[vote]++;
    });

    this.io.to(roomId).emit('LIVE_STATS', voteCounts);
  }

  endQuestion(roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;

    if (room.timer) {
      clearInterval(room.timer);
      room.timer = null;
    }

    const currentQ = room.quiz.questions[room.currentQuestionIndex];
    const correctOption = currentQ.correctOptionId;
    const isPoll = currentQ.type === 'POLL';

    if (!isPoll && correctOption) {
      // Calculate Scores only for MCQ
      room.votes.forEach((vote, socketId) => {
        const player = room.players.get(socketId);
        if (player && vote === correctOption) {
            player.score += 10;
        }
      });
    }

    // Calculate final stats for the chart
    const voteCounts: Record<string, number> = {};
    if (currentQ.options) {
        currentQ.options.forEach(opt => voteCounts[opt.id] = 0);
        room.votes.forEach((vote) => {
           if (voteCounts[vote] !== undefined) voteCounts[vote]++;
        });
    }

    // Send results
    this.io.to(roomId).emit('QUESTION_ENDED', {
      correctOption: isPoll ? null : correctOption,
      leaderboard: Array.from(room.players.values()).sort((a,b) => b.score - a.score),
      isPoll,
      stats: voteCounts // Send final stats
    });
  }
}
