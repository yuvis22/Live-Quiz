'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, UserButton } from '@clerk/nextjs';
import axios from 'axios';
import { 
  Play, 
  Calendar, 
  Search,
  ArrowLeft,
  LayoutGrid,
  Plus,
  ArrowRight
} from 'lucide-react';
import { getSocket } from '@/lib/socket';
import toast from 'react-hot-toast';
import { API_URL } from '@/lib/config';
import { useHostStore } from '@/store/useHostStore';
import HostNavbar from '@/components/HostNavbar';

export default function QuizzesPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  
  const { quizzes, fetchQuizzes, isLoadingQuizzes } = useHostStore();
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user?.id) {
        fetchQuizzes(user.id);
    }
  }, [user, fetchQuizzes]);

  const startSession = (quizId: string) => {
    if (!user) return;
    const socket = getSocket();
    socket.emit('CREATE_ROOM', { quizId, userId: user.id }, (response: any) => {
      if (response.success) {
        toast.success('Session started!');
        router.push('/host/dashboard');
      } else {
        toast.error('Failed to start session');
      }
    });
  };

  const filteredQuizzes = quizzes.filter((q: any) => 
    q.title?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isLoaded) return null;

  return (
    <main className="min-h-screen bg-slate-50 font-sans text-slate-900">
        <HostNavbar />

        <div className="max-w-5xl mx-auto p-6">
            <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Manage Quizzes</h1>
                    <p className="text-slate-500 text-sm mt-1">Create, edit, and start your quizzes.</p>
                </div>
                
                <div className="flex items-center gap-4 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input 
                            type="text" 
                            placeholder="Search by title..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                        />
                    </div>
                    <button 
                        onClick={() => router.push('/host/create')}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg flex items-center gap-2 transition-all shadow-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Create New
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 min-h-[400px]">
                {isLoadingQuizzes ? (
                   <div className="flex items-center justify-center h-48 text-slate-400">Loading...</div>
                ) : (
                   <div className="space-y-4">
                        {filteredQuizzes.length > 0 ? (
                            filteredQuizzes.map((quiz: any) => (
                              <div 
                                key={quiz._id} 
                                className="p-5 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center group hover:bg-white hover:border-blue-200 hover:shadow-md transition-all"
                              >
                                <div className="flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xl">
                                        {quiz.title?.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-800 text-lg mb-1">{quiz.title}</p>
                                        <div className="flex items-center gap-3 text-xs text-slate-500 font-medium uppercase tracking-wide">
                                            <span className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(quiz.createdAt).toLocaleDateString()}
                                            </span>
                                            <span>•</span>
                                            <span>{quiz.questions?.length || 0} Questions</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button 
                                        onClick={() => startSession(quiz._id)}
                                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-lg flex items-center gap-2 transition-all shadow-lg shadow-blue-500/20"
                                    >
                                        <Play className="w-4 h-4" />
                                        Start
                                    </button>
                                </div>
                              </div>
                            ))
                        ) : (
                            <div className="text-center py-12">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                                    <LayoutGrid className="w-8 h-8" />
                                </div>
                                <h3 className="text-slate-900 font-medium mb-1">No quizzes found</h3>
                                <p className="text-slate-500 text-sm mb-6">Create your first quiz to get started!</p>
                                <button 
                                     onClick={() => router.push('/host/create')}
                                     className="px-6 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors"
                                >
                                    Create Quiz
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    </main>
  );
}
