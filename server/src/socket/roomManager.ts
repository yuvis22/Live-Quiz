import { Server, Socket } from 'socket.io';
import { Quiz, IQuiz } from '../models/Quiz';
import { Leaderboard } from '../models/Leaderboard';

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
 
    const player: Player = { 
        socketId: socket.id, 
        username, 
        score: 0,
        answers: [] 
    };
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
        if (player) {
            const isCorrect = vote === correctOption;
            if (isCorrect) player.score += 10;
            
            player.answers.push({
                questionId: currentQ.id,
                optionId: vote,
                isCorrect,
                timeTaken: 0 // TODO: Implement exact timing if needed later
            });
        }
      });
      
      // Also record incorrect/missed answers for players who didn't vote or voted wrong (if logic assumes missing = wrong)
      // For now, we only push "votes". If they didn't vote, no answer recorded.
    } else if (isPoll) {
        // Record poll votes too
        room.votes.forEach((vote, socketId) => {
            const player = room.players.get(socketId);
            if (player) {
                player.answers.push({
                    questionId: currentQ.id,
                    optionId: vote,
                    isCorrect: true, // Poll answers are always "valid"
                    timeTaken: 0
                });
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

  terminateRoom(socketId: string, roomId: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    if (room.hostSocketId !== socketId) return; // Only host can terminate

    console.log(`Room ${roomId} terminated by host`);
    // Notify all clients with their final stats
    const allPlayers = Array.from(room.players.values()).sort((a,b) => b.score - a.score);
    
    // We need to send personalized info to each socket, OR broadcast the full leaderboard and let client find themselves.
    // Broadcasting full leaderboard is easier and supports "See who won".
    
    this.io.to(roomId).emit('QUIZ_ENDED', {
        leaderboard: allPlayers.map(p => ({
            username: p.username,
            score: p.score,
            socketId: p.socketId
        }))
    }); 
    this.io.to(roomId).emit('ROOM_TERMINATED');

    // Cleanup
    if (room.timer) clearInterval(room.timer);
    this.rooms.delete(roomId);
  }
}
