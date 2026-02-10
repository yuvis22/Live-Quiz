import { create } from 'zustand';
import axios from 'axios';
import { API_URL } from '@/lib/config';

interface HostState {
  quizzes: any[];
  reports: any[];
  lastFetchedQuizzes: number;
  lastFetchedReports: number;
  isLoadingQuizzes: boolean;
  isLoadingReports: boolean;
  error: string | null;

  fetchQuizzes: (userId: string, force?: boolean) => Promise<void>;
  fetchReports: (userId: string, force?: boolean) => Promise<void>;
  invalidateQuizzes: () => void;
  invalidateReports: () => void;
}

const CACHE_DURATION = 60 * 1000; // 1 minute

export const useHostStore = create<HostState>((set, get) => ({
  quizzes: [],
  reports: [],
  lastFetchedQuizzes: 0,
  lastFetchedReports: 0,
  isLoadingQuizzes: false,
  isLoadingReports: false,
  error: null,

  fetchQuizzes: async (userId: string, force = false) => {
    const { lastFetchedQuizzes, isLoadingQuizzes } = get();
    const now = Date.now();

    if (!force && !isLoadingQuizzes && (now - lastFetchedQuizzes < CACHE_DURATION)) {
      return; // Data is fresh
    }

    set({ isLoadingQuizzes: true, error: null });
    try {
      const res = await axios.get(`${API_URL}/api/quizzes/${userId}`);
      set({ 
        quizzes: res.data, 
        lastFetchedQuizzes: now, 
        isLoadingQuizzes: false 
      });
    } catch (err) {
      console.error('Failed to fetch quizzes:', err);
      set({ error: 'Failed to fetch quizzes', isLoadingQuizzes: false });
    }
  },

  fetchReports: async (userId: string, force = false) => {
    const { lastFetchedReports, isLoadingReports } = get();
    const now = Date.now();

    if (!force && !isLoadingReports && (now - lastFetchedReports < CACHE_DURATION)) {
      return; // Data is fresh
    }

    set({ isLoadingReports: true, error: null });
    try {
      const res = await axios.get(`${API_URL}/api/results/${userId}`);
      set({ 
        reports: res.data, 
        lastFetchedReports: now, 
        isLoadingReports: false 
      });
    } catch (err) {
      console.error('Failed to fetch reports:', err);
      set({ error: 'Failed to fetch reports', isLoadingReports: false });
    }
  },

  invalidateQuizzes: () => set({ lastFetchedQuizzes: 0 }),
  invalidateReports: () => set({ lastFetchedReports: 0 })
}));
