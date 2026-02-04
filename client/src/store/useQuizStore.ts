import { create } from 'zustand';

interface Question {
  id: string;
  text: string;
  options: { id: string; text: string }[];
  timeLimit: number;
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
  
  setRoomInfo: (roomId: string, username: string, isHost: boolean) => void;
  setQuestion: (question: Question) => void;
  setTimeLeft: (time: number) => void;
  updateVoteStats: (stats: Record<string, number>) => void;
  setLeaderboard: (data: any[]) => void;
  reset: () => void;
}

export const useQuizStore = create<QuizState>((set) => ({
  roomId: null,
  username: null,
  isHost: false,
  currentQuestion: null,
  timeLeft: 0,
  voteStats: null,
  lastScore: 0,
  leaderboard: [],

  setRoomInfo: (roomId, username, isHost) => set({ roomId, username, isHost }),
  setQuestion: (question) => set({ currentQuestion: question, voteStats: null }), // Reset stats on new Q
  setTimeLeft: (time) => set({ timeLeft: time }),
  updateVoteStats: (stats) => set({ voteStats: stats }),
  setLeaderboard: (data) => set({ leaderboard: data }),
  reset: () => set({ 
    roomId: null, 
    username: null, 
    isHost: false, 
    currentQuestion: null, 
    timeLeft: 0, 
    voteStats: null, 
    leaderboard: [] 
  })
}));
