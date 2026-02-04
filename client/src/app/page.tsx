'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import { useQuizStore } from '@/store/useQuizStore';
import { ArrowRight, Trophy, Users, Zap } from 'lucide-react';

export default function Home() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const { setRoomInfo } = useQuizStore();

  const handleJoin = () => {
    if (!code || !name) return;
    const socket = getSocket();
    socket.connect();
    socket.emit('JOIN_ROOM', { roomId: code, username: name });
    setRoomInfo(code, name, false);
    router.push(`/quiz/${code}`);
  };

  return (
    <main className="min-h-screen bg-[#09090b] text-white selection:bg-indigo-500/30">
      {/* Navbar */}
      <nav className="border-b border-white/5 bg-white/[0.02] backdrop-blur-sm fixed w-full z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <Zap className="w-5 h-5 text-white fill-current" />
            </div>
            <span className="font-bold text-xl tracking-tight">Mentistyle</span>
          </div>
          <button 
            onClick={() => router.push('/auth/signin')}
            className="text-sm font-medium text-zinc-400 hover:text-white transition-colors"
          >
            Log in
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <div className="min-h-screen flex flex-col lg:flex-row items-center justify-center max-w-7xl mx-auto px-6 pt-20 gap-12 lg:gap-24">
        
        {/* Left: Input Form */}
        <div className="w-full max-w-md space-y-8 animate-fade-in-up">
          <div className="space-y-2">
            <h1 className="text-4xl lg:text-5xl font-extrabold tracking-tight">
              Join the <span className="text-indigo-500">conversation</span>
            </h1>
            <p className="text-zinc-400 text-lg">
              Enter the code to participate in live quizzes and polls.
            </p>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300 ml-1">Room Code</label>
              <input
                type="text"
                placeholder="12 34 56"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full h-14 px-4 bg-zinc-900/50 border border-zinc-700/50 hover:border-zinc-600 focus:border-indigo-500 rounded-xl text-2xl font-mono text-center tracking-widest outline-none transition-all placeholder:text-zinc-700"
                maxLength={6}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-zinc-300 ml-1">Nickname</label>
              <input
                type="text"
                placeholder="Enter your name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-14 px-4 bg-zinc-900/50 border border-zinc-700/50 hover:border-zinc-600 focus:border-indigo-500 rounded-xl text-lg text-center outline-none transition-all placeholder:text-zinc-700"
              />
            </div>

            <button
              onClick={handleJoin}
              disabled={!code || !name}
              className="w-full h-14 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:hover:bg-indigo-600 text-white font-semibold rounded-xl text-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-900/20"
            >
              <span>Join Session</span>
              <ArrowRight className="w-5 h-5" />
            </button>
          </div>

          <div className="pt-6 border-t border-white/5 flex items-center justify-center gap-8 text-zinc-500">
            <div className="flex items-center gap-2 text-sm">
              <Users className="w-4 h-4" />
              <span>No signup required</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Trophy className="w-4 h-4" />
              <span>Free to play</span>
            </div>
          </div>
        </div>

        {/* Right: Visual */}
        <div className="hidden lg:block w-full max-w-lg">
          <div className="relative">
            {/* Abstract visuals */}
            <div className="absolute -top-20 -right-20 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl" />
            <div className="absolute -bottom-20 -left-20 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl" />
            
            <div className="relative bg-zinc-900 border border-white/10 rounded-2xl p-6 shadow-2xl rotate-2 hover:rotate-0 transition-transform duration-500">
              <div className="flex items-center gap-4 mb-6 border-b border-white/5 pb-4">
                <div className="w-3 h-3 rounded-full bg-red-500/20 border border-red-500/50" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/20 border border-yellow-500/50" />
                <div className="w-3 h-3 rounded-full bg-green-500/20 border border-green-500/50" />
              </div>
              
              <div className="space-y-4">
                <div className="h-4 bg-zinc-800 rounded w-3/4 animate-pulse" />
                <div className="h-32 bg-zinc-800/50 rounded-xl flex items-end justify-between p-4 gap-2">
                  <div className="w-full bg-indigo-500/20 h-[40%] rounded-t-lg relative group">
                    <div className="absolute bottom-0 w-full bg-indigo-500 h-0 group-hover:h-full transition-all duration-1000 opacity-50" />
                  </div>
                  <div className="w-full bg-indigo-500/40 h-[70%] rounded-t-lg" />
                  <div className="w-full bg-indigo-500/30 h-[50%] rounded-t-lg" />
                  <div className="w-full bg-indigo-500/60 h-[85%] rounded-t-lg" />
                </div>
                <div className="flex gap-2 pt-2">
                  <div className="h-2 bg-zinc-800 rounded w-1/4" />
                  <div className="h-2 bg-zinc-800 rounded w-1/4" />
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
