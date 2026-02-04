'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import { useQuizStore } from '@/store/useQuizStore';

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
    <main className="flex min-h-screen flex-col items-center justify-center p-4 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900">
      <div className="glass-panel w-full max-w-md p-8 rounded-2xl space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-cyan-400">
            Live Quiz
          </h1>
          <p className="text-slate-400">Enter a code to join the action</p>
        </div>

        <div className="space-y-4">
          <input
            type="text"
            placeholder="Room Code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-lg focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-500 transition-all text-center tracking-widest uppercase font-mono"
            maxLength={6}
          />
          <input
            type="text"
            placeholder="Your Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full bg-slate-900/50 border border-slate-700 rounded-lg px-4 py-3 text-lg focus:ring-2 focus:ring-indigo-500 outline-none placeholder:text-slate-500 transition-all text-center"
          />
          
          <button 
            onClick={handleJoin}
            disabled={!code || !name}
            className="w-full btn-primary py-4 text-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Join Game
          </button>
        </div>

        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-slate-700" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-slate-800 px-2 text-slate-400">Or</span>
          </div>
        </div>

        <button 
          onClick={() => router.push('/host/dashboard')}
          className="w-full btn-secondary"
        >
          Host a Quiz
        </button>
      </div>
    </main>
  );
}
