'use client';

import { useState, useEffect } from 'react';
import { getSocket } from '@/lib/socket';
import { useQuizStore } from '@/store/useQuizStore';
import LiveChart from '@/components/LiveChart';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Copy, Plus, Play, SkipForward, Users, Clock, Check } from 'lucide-react';

export default function HostDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  
  useEffect(() => {
    if (status === 'unauthenticated') router.push('/auth/signin');
  }, [status, router]);

  const { roomId, currentQuestion, timeLeft, voteStats, setRoomInfo, setQuestion, setTimeLeft, updateVoteStats } = useQuizStore();
  const [playerCount, setPlayerCount] = useState(0);

  useEffect(() => {
    const socket = getSocket();
    if (!socket.connected) socket.connect();

    socket.on('PLAYER_JOINED', (data) => setPlayerCount(data.playerCount));
    socket.on('NEW_QUESTION', (data) => setQuestion(data));
    socket.on('TICK', (time) => setTimeLeft(time));
    socket.on('LIVE_STATS', (stats) => updateVoteStats(stats));

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
      const res = await fetch('http://localhost:3001/api/seed', { method: 'POST' });
      const { quizId } = await res.json();
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
    getSocket().emit('START_QUESTION', { roomId });
  };

  const copyCode = () => {
    if (roomId) {
      navigator.clipboard.writeText(roomId);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!roomId) {
    return (
      <main className="min-h-screen bg-[#09090b] text-white flex items-center justify-center p-4">
        <div className="text-center max-w-md w-full">
          <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-6 border border-white/10">
            <Plus className="w-8 h-8 text-indigo-400" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight mb-3">Create a Room</h1>
          <p className="text-zinc-400 mb-8 max-w-xs mx-auto text-sm">Start a new quiz session. Players will be able to join using the room code.</p>
          <button
            onClick={createRoom}
            disabled={loading}
            className="w-full h-12 bg-white hover:bg-zinc-200 text-black font-semibold rounded-xl transition-all shadow-lg shadow-white/5"
          >
            {loading ? 'Creating...' : 'Create New Session'}
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#09090b] text-white p-6 md:p-12">
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Stats & Info */}
        <div className="space-y-6">
          <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-4">Session Info</p>
            
            <div className="flex items-center justify-between mb-6">
              <div>
                <p className="text-zinc-400 text-sm mb-1">Room Code</p>
                <div className="flex items-center gap-2">
                  <span className="text-3xl font-mono font-bold tracking-widest">{roomId}</span>
                  <button onClick={copyCode} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                    {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4 text-zinc-400" />}
                  </button>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl border border-white/5">
              <Users className="w-5 h-5 text-indigo-400" />
              <div>
                <p className="text-sm font-medium">Players Active</p>
                <p className="text-2xl font-bold">{playerCount}</p>
              </div>
            </div>
          </div>

          <div className="bg-zinc-900/50 border border-white/10 rounded-2xl p-6">
            <p className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-4">Controls</p>
            <button
              onClick={startNextQuestion}
              className="w-full h-14 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg shadow-indigo-900/20"
            >
              {currentQuestion ? <SkipForward className="w-5 h-5" /> : <Play className="w-5 h-5" />}
              <span>{currentQuestion ? 'Skip Question' : 'Start Next Question'}</span>
            </button>
          </div>
        </div>

        {/* Right Column: Active Question */}
        <div className="lg:col-span-2">
          <div className="bg-zinc-900 border border-white/10 rounded-2xl p-6 h-full min-h-[500px] flex flex-col">
             {currentQuestion ? (
              <>
                <div className="flex justify-between items-start mb-8">
                  <h2 className="text-2xl md:text-3xl font-semibold leading-tight pr-8">{currentQuestion.text}</h2>
                  <div className="flex items-center gap-2 bg-indigo-500/10 px-4 py-2 rounded-lg border border-indigo-500/20">
                    <Clock className="w-5 h-5 text-indigo-400" />
                    <span className="text-xl font-mono font-bold text-indigo-400">{timeLeft}s</span>
                  </div>
                </div>

                <div className="flex-1 flex flex-col justify-end">
                  {voteStats && (
                    <div className="h-64 md:h-80 w-full">
                       <LiveChart stats={voteStats} options={currentQuestion.options} />
                    </div>
                  )}
                </div>
              </>
             ) : (
               <div className="h-full flex flex-col items-center justify-center text-center text-zinc-500 space-y-4">
                 <div className="w-20 h-20 bg-zinc-800/50 rounded-full flex items-center justify-center mb-2">
                   <Play className="w-8 h-8 opacity-50" />
                 </div>
                 <p className="text-lg font-medium text-zinc-400">Waiting to start</p>
                 <p className="text-sm max-w-sm">Use the control panel to launch the next question. Players are waiting in the lobby.</p>
               </div>
             )}
          </div>
        </div>

      </div>
    </main>
  );
}
