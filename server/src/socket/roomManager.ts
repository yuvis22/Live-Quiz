import { Server, Socket } from 'socket.io';
import { Quiz, IQuiz } from '../models/Quiz';
import { Leaderboard } from '../models/Leaderboard';
import { Redis } from 'ioredis';

interface Player {
  socketId: string;
  username: string;
  score: number;
  answers: {
    questionId: string;
    optionId: string;
    isCorrect: boolean;
    timeTaken: number;
  }[];
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
  private io: Server;
  private redis: Redis;
  private timers: Map<string, NodeJS.Timeout>;

  constructor(io: Server, redis: Redis) {
    this.io = io;
    this.redis = redis;
    this.timers = new Map();
  }

  private async getRoom(roomId: string): Promise<Room | null> {
      const data = await this.redis.get(`room:${roomId}`);
      if (!data) return null;
      
      const parsed = JSON.parse(data);
      // Revive Maps
      parsed.players = new Map(parsed.players);
      parsed.votes = new Map(parsed.votes);
      parsed.timer = null; 
      
      return parsed;
  }

  private async saveRoom(roomId: string, room: Room) {
      const toSave = {
          ...room,
          players: Array.from(room.players.entries()),
          votes: Array.from(room.votes.entries()),
          timer: null 
      };
      await this.redis.set(`room:${roomId}`, JSON.stringify(toSave), 'EX', 86400); 
  }

  async createRoom(hostSocketId: string, quizId: string, hostUserId: string): Promise<string> {
    const quiz = await Quiz.findById(quizId);
    if (!quiz) throw new Error('Quiz not found');

    let roomId = '';
    let exists = 0;
    do {
       roomId = Math.random().toString(36).substring(2, 8).toUpperCase();
       exists = await this.redis.exists(`room:${roomId}`);
    } while (exists === 1);
    
    const room: Room = {
      id: roomId,
      hostSocketId,
      hostUserId,
      quiz,
      players: new Map(), // We will optimize this later if needed, but for now we serialize Map as Array/Object
      currentQuestionIndex: -1,
      isLive: false,
      timer: null,
      timeLeft: 0,
      votes: new Map()
    };
    
    await this.saveRoom(roomId, room);

    console.log(`Room ${roomId} created by ${hostSocketId}`);
    return roomId;
  }

  async joinRoom(socket: Socket, roomId: string, username: string) {
    const room = await this.getRoom(roomId);
    if (!room) {
      socket.emit('ERROR', { message: 'Room not found' });
      return;
    }

    if (room.players.has(socket.id)) return; // Already joined
 
    const player: Player = { 
        socketId: socket.id, 
        username, 
        score: 0,
        answers: [] 
    };
    room.players.set(socket.id, player);
    
    await this.saveRoom(roomId, room); // Save state
    
    socket.join(roomId);

    // 1. Send full list to NEW player
    const playerList = Array.from(room.players.values()).map(p => ({
        socketId: p.socketId,
        username: p.username,
        score: p.score
    }));
    socket.emit('PLAYER_LIST', { players: playerList, playerCount: room.players.size });

    // 2. Send delta update to existing players (O(N) -> O(1) bandwidth per client)
    socket.to(roomId).emit('PLAYER_JOINED', { 
        player: { socketId: player.socketId, username: player.username, score: player.score },
        playerCount: room.players.size 
    });
    
    console.log(`${username} joined room ${roomId}`);
  }

  async reconnectHost(socket: Socket, roomId: string, userId: string) {
     const room = await this.getRoom(roomId);
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
     await this.saveRoom(roomId, room);
     
     socket.join(roomId);

     // Send current state
     socket.emit('PLAYER_LIST', {
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


  async startQuestion(socketId: string, roomId: string) {
    const room = await this.getRoom(roomId);
    if (!room) return;
    if (room.hostSocketId !== socketId) return; // Only host can start

    if (room.currentQuestionIndex + 1 >= room.quiz.questions.length) {
      // Logic for quiz end
      const leaderboard = new Leaderboard({
          quizId: room.quiz._id,
          roomId: room.id,
          isActive: false,
          players: Array.from(room.players.values()).map(p => ({
              userId: p.socketId, // For guests, we use socketId. If auth assumed, we need userId
              username: p.username,
              score: p.score,
              answers: p.answers
          })),
          currentQuestionIndex: room.currentQuestionIndex,
          createdAt: new Date()
      });
      leaderboard.save().then(() => {
          console.log(`Leaderboard saved for room ${roomId}`);
      }).catch(err => console.error('Failed to save leaderboard:', err));

      const allPlayers = Array.from(room.players.values()).sort((a,b) => b.score - a.score);
      this.io.to(roomId).emit('QUIZ_ENDED', {
        leaderboard: allPlayers.map(p => ({
            username: p.username,
            score: p.score,
            socketId: p.socketId
        }))
      });
      return;
    }

    room.currentQuestionIndex++;
    room.votes.clear();
    room.timeLeft = 15; // Specs say 15s
    await this.saveRoom(roomId, room);

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
    if (this.timers.has(roomId)) {
        clearTimeout(this.timers.get(roomId)!);
        this.timers.delete(roomId);
    }

    const startTick = async () => {
      // Fetch latest state to update time
      const r = await this.getRoom(roomId);
      if (!r) { 
          this.timers.delete(roomId);
          return; 
      }
      
      console.log(`[Timer Debug] Room ${roomId} Tick Start: ${r.timeLeft}`);
      r.timeLeft--;
      console.log(`[Timer Debug] Room ${roomId} Updated to: ${r.timeLeft}`);

      // Save every ticking for accuracy (or less often if performance needed)
      // Since race condition was the issue, let's verify every tick saves correctly
      await this.saveRoom(roomId, r); 
      console.log(`[Timer Debug] Room ${roomId} Saved.`);

      this.io.to(roomId).emit('TICK', r.timeLeft);

      if (r.timeLeft <= 0) {
        this.timers.delete(roomId);
        this.endQuestion(roomId);
      } else {
        // Schedule next tick
        const timeout = setTimeout(startTick, 1000);
        this.timers.set(roomId, timeout);
      }
    };

    // Initial delay + start
    const initialTimeout = setTimeout(startTick, 1000);
    this.timers.set(roomId, initialTimeout);
  }

  async submitVote(socket: Socket, roomId: string, optionId: string) {
    const room = await this.getRoom(roomId);
    if (!room || room.timeLeft <= 0) return;
    
    if (!room.players.has(socket.id)) return; // Must be a player

    room.votes.set(socket.id, optionId);
    await this.saveRoom(roomId, room);

    // Calculate live stats for chart
    const voteCounts: Record<string, number> = {};
    room.quiz.questions[room.currentQuestionIndex].options.forEach(opt => voteCounts[opt.id] = 0);
    
    room.votes.forEach((vote) => {
      if (voteCounts[vote] !== undefined) voteCounts[vote]++;
    });

    this.io.to(roomId).emit('LIVE_STATS', voteCounts);
  }

  async endQuestion(roomId: string) {
    const room = await this.getRoom(roomId);
    if (!room) return;

    if (this.timers.has(roomId)) {
      clearInterval(this.timers.get(roomId)!);
      this.timers.delete(roomId);
    }

    const currentQ = room.quiz.questions[room.currentQuestionIndex];
    if (!currentQ) return;

    const correctOption = currentQ.correctOptionId;
    const isPoll = currentQ.type === 'POLL';

    if (!isPoll && correctOption) {
      // Calculate Scores only for MCQ
      room.votes.forEach((vote, socketId) => {
        const player = room.players.get(socketId);
        if (player) {
            const isCorrect = vote === correctOption;
            if (isCorrect) player.score += 10;
            
            player.answers.push({
                questionId: currentQ.id,
                optionId: vote,
                isCorrect,
                timeTaken: 0 
            });
        }
      });
    } else if (isPoll) {
        // Record poll votes too
        room.votes.forEach((vote, socketId) => {
            const player = room.players.get(socketId);
            if (player) {
                player.answers.push({
                    questionId: currentQ.id,
                    optionId: vote,
                    isCorrect: true, 
                    timeTaken: 0
                });
            }
        });
    }

    await this.saveRoom(roomId, room);

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

  async terminateRoom(socketId: string, roomId: string) {
    const room = await this.getRoom(roomId);
    if (!room) return;
    if (room.hostSocketId !== socketId) return; // Only host can terminate

    console.log(`Room ${roomId} terminated by host`);
    // Notify all clients with their final stats
    const allPlayers = Array.from(room.players.values()).sort((a,b) => b.score - a.score);
    
    this.io.to(roomId).emit('QUIZ_ENDED', {
        leaderboard: allPlayers.map(p => ({
            username: p.username,
            score: p.score,
            socketId: p.socketId
        }))
    }); 
    this.io.to(roomId).emit('ROOM_TERMINATED');

    // Cleanup
    if (this.timers.has(roomId)) {
        clearInterval(this.timers.get(roomId)!);
        this.timers.delete(roomId);
    }
    await this.redis.del(`room:${roomId}`);
  }
}
