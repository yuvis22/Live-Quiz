'use client';

import { useState, useEffect } from 'react';
import { getSocket } from '@/lib/socket';
import { useQuizStore } from '@/store/useQuizStore';
import LiveChart from '@/components/LiveChart';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';

export default function HostDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/signin');
    }
  }, [status, router]);

  const { roomId, currentQuestion, timeLeft, voteStats, setRoomInfo, setQuestion, setTimeLeft, updateVoteStats } = useQuizStore();
  const [playerCount, setPlayerCount] = useState(0);
  const [gameStatus, setGameStatus] = useState<'LOBBY' | 'PLAYING' | 'ENDED'>('LOBBY');

  useEffect(() => {
    const socket = getSocket();
    if (!socket.connected) socket.connect();

    socket.on('PLAYER_JOINED', (data) => {
      setPlayerCount(data.playerCount);
    });

    socket.on('NEW_QUESTION', (data) => {
      setQuestion(data);
      setGameStatus('PLAYING');
    });

    socket.on('TICK', (time) => {
      setTimeLeft(time);
    });
    
    socket.on('LIVE_STATS', (stats) => {
      updateVoteStats(stats);
    });

    return () => {
      socket.off('PLAYER_JOINED');
      socket.off('NEW_QUESTION');
      socket.off('TICK');
      socket.off('LIVE_STATS');
    };
  }, []);

  const createRoom = async () => {
    setLoading(true);
    try {
      // 1. Create Demo Quiz via API
      const res = await fetch('http://localhost:3001/api/seed', { method: 'POST' });
      const { quizId } = await res.json();

      // 2. Create Socket Room
      const socket = getSocket();
      socket.emit('CREATE_ROOM', { quizId }, (response: any) => {
        if (response.success) {
          setRoomInfo(response.roomId, 'HOST', true);
        } else {
          alert('Failed to create room: ' + response.error);
        }
        setLoading(false);
      });
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const startNextQuestion = () => {
    if (!roomId) return;
    const socket = getSocket();
    socket.emit('START_QUESTION', { roomId });
  };

  if (!roomId) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-slate-900 p-4">
        <div className="glass-panel p-8 rounded-2xl text-center space-y-6 max-w-md w-full">
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
            Host Dashboard
          </h1>
          <p className="text-slate-400">Create a room to start a new quiz session.</p>
          <button 
            onClick={createRoom}
            disabled={loading}
            className="w-full btn-primary py-3 text-lg"
          >
            {loading ? 'Creating...' : 'Create New Room'}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-900 text-white p-6">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center glass-panel p-6 rounded-xl">
          <div>
            <h2 className="text-xl font-bold">Room Code</h2>
            <p className="text-4xl font-mono text-indigo-400 tracking-widest">{roomId}</p>
          </div>
          <div className="text-right">
            <p className="text-slate-400">Players Joined</p>
            <p className="text-3xl font-bold">{playerCount}</p>
          </div>
        </div>

        {/* Controls Area */}
        <div className="glass-panel p-8 rounded-2xl space-y-6">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">
              {currentQuestion ? 'Question Active' : 'Lobby / Intermission'}
            </h2>
            <button 
              onClick={startNextQuestion}
              className="btn-primary"
            >
              {currentQuestion ? 'Skip Question' : 'Start Next Question'}
            </button>
          </div>

          {currentQuestion && (
            <div className="space-y-6">
              <div className="flex justify-between items-center bg-slate-800 p-4 rounded-lg">
                <span className="text-xl">{currentQuestion.text}</span>
                <span className="text-2xl font-mono font-bold text-indigo-400">{timeLeft}s</span>
              </div>

               {/* Live Chart */}
               {voteStats && (
                 <div>
                   <h3 className="text-slate-400 mb-2">Live Vote Distribution</h3>
                   <LiveChart stats={voteStats} options={currentQuestion.options} />
                 </div>
               )}
            </div>
          )}

          {!currentQuestion && (
            <div className="text-center py-12 text-slate-500 border border-dashed border-slate-700 rounded-xl">
              <p>Waiting to start next question...</p>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
