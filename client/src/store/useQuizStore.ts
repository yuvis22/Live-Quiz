import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Question {
  id: string;
  type: 'MCQ' | 'POLL';
  text: string;
  options: { id: string; text: string }[];
  timeLimit: number;
  currentQuestionIndex?: number;
  totalQuestions?: number;
}

interface QuizState {
  roomId: string | null;
  username: string | null;
  isHost: boolean;
  currentQuestion: Question | null;
  timeLeft: number;
  voteStats: Record<string, number> | null;
  lastScore: number;
  leaderboard: any[];
  result: { correctOption: string | null; leaderboard: any[]; isPoll?: boolean } | null;
  players: any[];

  setRoomInfo: (roomId: string, username: string, isHost: boolean) => void;
  setQuestion: (question: Question) => void;
  setTimeLeft: (time: number) => void;
  updateVoteStats: (stats: Record<string, number>) => void;
  setLeaderboard: (data: any[]) => void;
  setPlayers: (players: any[]) => void;
  addPlayer: (player: any) => void;
  setResult: (result: { correctOption: string | null; leaderboard: any[]; isPoll?: boolean } | null) => void;
  reset: () => void;
}

export const useQuizStore = create<QuizState>()(
  persist(
    (set) => ({
      roomId: null,
      username: null,
      isHost: false,
      currentQuestion: null,
      timeLeft: 0,
      voteStats: null,
      lastScore: 0,
      leaderboard: [],
      result: null,
      players: [],

      setRoomInfo: (roomId, username, isHost) => set({ roomId, username, isHost }),
      setQuestion: (question) => set({ currentQuestion: question, voteStats: null, result: null }), // Reset stats and result on new Q
      setTimeLeft: (time) => set({ timeLeft: time }),
      updateVoteStats: (stats) => set({ voteStats: stats }),
      setLeaderboard: (data) => set({ leaderboard: data }),
      setPlayers: (players) => set({ players }),
      addPlayer: (player) => set((state) => {
        // Avoid duplicates
        if (state.players.find(p => p.socketId === player.socketId)) return state;
        return { players: [...state.players, player] };
      }),
      setResult: (result) => set({ result }),
      reset: () => set({ 
        roomId: null, 
        username: null, 
        isHost: false, 
        currentQuestion: null, 
        timeLeft: 0, 
        voteStats: null, 
        leaderboard: [],
        result: null,
        players: []
      })
    }),
    {
      name: 'quiz-storage', // unique name
      partialize: (state) => ({ 
        roomId: state.roomId, 
        username: state.username, 
        isHost: state.isHost 
      }), // Only persist session info, not ephemeral game state
    }
  )
);
