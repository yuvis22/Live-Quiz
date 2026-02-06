'use client';

import { useState, useEffect } from 'react';
import { getSocket } from '@/lib/socket';
import { useQuizStore } from '@/store/useQuizStore';
import LiveChart from '@/components/LiveChart';
import { useUser, UserButton } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Copy, Plus, Play, SkipForward, Users, Clock, Check, BarChart3, Trophy, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { API_URL } from '@/lib/config';

export default function HostDashboard() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  
  const { roomId, currentQuestion, timeLeft, voteStats, result, players, isHost, setRoomInfo, setQuestion, setTimeLeft, updateVoteStats, setResult, setPlayers } = useQuizStore();
  const [playerCount, setPlayerCount] = useState(0);

  useEffect(() => {
    const socket = getSocket();
    if (!socket.connected) socket.connect();

    socket.on('PLAYER_JOINED', (data) => {
      setPlayerCount(data.playerCount);
      setPlayers(data.players);
    });
    socket.on('NEW_QUESTION', (data) => setQuestion(data));
    socket.on('TICK', (time) => setTimeLeft(time));
    socket.on('LIVE_STATS', (stats) => updateVoteStats(stats));

    return () => {
      socket.off('PLAYER_JOINED');
      socket.off('NEW_QUESTION');
      socket.off('TICK');
      socket.off('LIVE_STATS');
      socket.off('MAX_VOTES_REACHED'); // If you add this later
      socket.off('QUESTION_ENDED');
      socket.off('QUIZ_ENDED');
    };
  }, []);

  useEffect(() => {
    const socket = getSocket();
    socket.on('QUESTION_ENDED', (data) => {
        setResult(data);
    });
    socket.on('QUIZ_ENDED', () => {
         toast.success('Presentation Completed! 🎉');
         // Don't clear state so the final result/leaderboard stays visible
    });
  }, []);

  useEffect(() => {
    if (user) {
      if (roomId && isHost) {
          // Reconnect host logic to ensure socket joins the room
          const socket = getSocket();
          if (!socket.connected) socket.connect();
          socket.emit('RECONNECT_HOST', { roomId, userId: user.id });
      }

      fetch(`${API_URL}/api/quizzes/${user.id}`)
        .then(res => res.json())
        .then(data => setHistory(data))
        .catch(err => console.error(err));
    }
  }, [user, roomId, isHost]);

  const startSession = (quizId: string) => {
    setLoading(true);
    const socket = getSocket();
    socket.emit('CREATE_ROOM', { quizId, userId: user?.id }, (response: any) => {
      if (response.success) {
        setRoomInfo(response.roomId, 'HOST', true);
      } else {
        toast.error('Failed to start session: ' + response.error);
      }
      setLoading(false);
    });
  };

  const createRoom = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Pass Clerk User ID to backend
      const res = await fetch(`${API_URL}/api/seed`, { 
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id })
      });
      const { quizId } = await res.json();
      const socket = getSocket();
      socket.emit('CREATE_ROOM', { quizId, userId: user.id }, (response: any) => {
        if (response.success) {
          setRoomInfo(response.roomId, 'HOST', true);
        } else {
          toast.error('Failed to create room: ' + response.error);
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
      toast.success('Code copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!isLoaded) return null;

  if (!roomId) {
    return (
      <main className="min-h-screen bg-slate-50 font-sans text-slate-900">
        <nav className="bg-white border-b border-slate-200 px-6 h-16 flex items-center justify-between">
           <div className="flex items-center gap-2">
             <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">Q</div>
             <span className="font-bold text-lg">Qorum</span>
           </div>
           <UserButton />
        </nav>

        <div className="flex items-center justify-center p-4 h-[calc(100vh-4rem)]">
          <div className="text-center max-w-md w-full bg-white p-10 rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100">
            <div className="w-16 h-16 bg-blue-50 text-blue-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Plus className="w-8 h-8" />
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-2">New Presentation</h1>
            <p className="text-slate-500 mb-8 text-sm leading-relaxed">
              Create a new interactive session. You'll get a unique access code to share with your audience.
            </p>
            <button
              onClick={() => router.push('/host/create')}
              disabled={loading}
              className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-all shadow-lg shadow-blue-500/20"
            >
              Create Session
            </button>

            {history.length > 0 && (
              <div className="mt-8 pt-8 border-t border-slate-100 text-left">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Recent Presentations</p>
                <div className="space-y-3">
                  {history.slice(0, 3).map((quiz: any) => (
                    <div 
                      key={quiz._id} 
                      onClick={() => startSession(quiz._id)}
                      className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex justify-between items-center group hover:bg-white hover:border-blue-200 transition-all cursor-pointer"
                    >
                      <div>
                         <p className="font-medium text-slate-700">{quiz.title}</p>
                         <p className="text-xs text-slate-400">{new Date(quiz.createdAt).toLocaleDateString()}</p>
                      </div>
                      <Play className="w-4 h-4 text-slate-400 group-hover:text-blue-600" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 px-6 h-16 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
             <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">Q</div>
            <span className="font-bold text-lg hidden md:block">Qorum</span>
          </div>
          <div className="h-6 w-px bg-slate-200 mx-2" />
          <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
             <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Access Code</span>
             <span className="text-sm font-mono font-bold text-slate-900 tracking-wider">{roomId}</span>
             <button onClick={copyCode} className="ml-2 hover:bg-white p-1 rounded transition-colors text-slate-400 hover:text-blue-600">
                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
             </button>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
           <div className="flex items-center gap-2 text-slate-600 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-sm">
             <Users className="w-4 h-4 ml-1" />
             <span className="text-sm font-semibold">{playerCount}</span>
             <span className="text-xs text-slate-400 font-medium">Active</span>
           </div>
           <UserButton />
        </div>
      </header>
      
      <div className="max-w-7xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-4 gap-6 h-[calc(100vh-4rem)]">
        
        {/* Left Column: Slides/Controls */}
        <div className="space-y-6 lg:col-span-1 flex flex-col h-full">
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm flex-1 flex flex-col">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4">Control Panel</p>
            
            <div className="space-y-4 flex-1">
               <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                  <span className="text-xs text-slate-500 font-medium block mb-1">Status</span>
                  <div className="flex items-center gap-2">
                    <div className={`w-2.5 h-2.5 rounded-full ${currentQuestion ? 'bg-green-500 animate-pulse' : 'bg-yellow-400'}`} />
                    <span className="text-sm font-semibold text-slate-700">
                      {currentQuestion ? 'Live Question' : 'Lobby Active'}
                    </span>
                  </div>
               </div>
               
               <button
                onClick={startNextQuestion}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md shadow-blue-500/20"
              >
                {currentQuestion ? <SkipForward className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                <span>{currentQuestion ? 'Next Slide' : 'Start Presentation'}</span>
              </button>
            </div>
            
            <div className="mt-auto pt-6 text-center text-xs text-slate-400">
               Press 'Space' to advance
            </div>
          </div>
        </div>

        {/* Right Column: Main View */}
        <div className="lg:col-span-3 h-full pb-6">
          <div className="bg-white border border-slate-200 rounded-xl shadow-sm h-full flex flex-col relative overflow-hidden">
             {result ? (
               result.isPoll ? (
                 <div className="flex-1 flex flex-col p-8 md:p-12 animate-fade-in-up">
                   <div className="flex justify-between items-center mb-8">
                     <div>
                       <h2 className="text-3xl font-bold text-slate-900 leading-tight flex items-center gap-3">
                         <BarChart3 className="w-8 h-8 text-blue-600" /> 
                         Poll Results
                       </h2>
                       <p className="text-slate-500 mt-1">Final tally for this slide</p>
                     </div>
                   </div>

                   <div className="flex-1 min-h-[400px]">
                      {voteStats ? (
                        <div className="h-full w-full">
                           <LiveChart stats={voteStats} options={currentQuestion?.options || []} />
                        </div>
                      ) : (
                        <div className="flex items-center justify-center h-full text-slate-300">
                           <p>No votes recorded.</p>
                        </div>
                      )}
                   </div>
                 </div>
               ) : (
                <div className="flex-1 flex flex-col p-8 md:p-12 animate-fade-in-up">
                   <div className="flex justify-between items-center mb-8">
                     <div>
                       <h2 className="text-3xl font-bold text-slate-900 leading-tight flex items-center gap-3">
                         <Trophy className="w-8 h-8 text-yellow-500" /> 
                         Leaderboard
                       </h2>
                       <p className="text-slate-500 mt-1">Results for this round</p>
                     </div>
                     <div className="p-4 bg-green-50 rounded-xl border border-green-100 text-green-800 font-medium flex items-center gap-2">
                        <Check className="w-5 h-5" />
                        Answer: <span className="font-bold">{currentQuestion?.options.find((o: any) => o.id === result.correctOption)?.text}</span>
                     </div>
                   </div>

                   <div className="flex-1 bg-slate-50 rounded-2xl border border-slate-100 p-6 overflow-y-auto">
                      <div className="space-y-3">
                       {result.leaderboard.map((p: any, i: number) => (
                         <div key={i} className={`flex justify-between items-center p-4 rounded-xl border ${i < 3 ? 'bg-white border-blue-100 shadow-sm' : 'bg-slate-100/50 border-transparent'}`}>
                           <div className="flex items-center gap-4">
                             <div className={`
                                w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                                ${i === 0 ? 'bg-yellow-100 text-yellow-700' : 
                                  i === 1 ? 'bg-slate-200 text-slate-600' :
                                  i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-white border border-slate-200 text-slate-400'}
                             `}>
                               {i + 1}
                             </div>
                             <span className={`font-semibold ${i < 3 ? 'text-slate-900 text-lg' : 'text-slate-600'}`}>{p.username}</span>
                           </div>
                           <span className="font-mono font-bold text-slate-900 text-lg">{p.score}</span>
                         </div>
                       ))}
                       {result.leaderboard.length === 0 && (
                          <div className="text-center text-slate-400 py-12">
                              No active participants yet.
                          </div>
                       )}
                      </div>
                   </div>
                </div>
               )
             ) : currentQuestion ? (
              <div className="flex-1 flex flex-col p-8 md:p-12">
                <div className="flex justify-between items-start mb-8">
                  <h2 className="text-3xl md:text-4xl font-bold text-slate-900 leading-tight pr-12">{currentQuestion.text}</h2>
                  <div className="flex items-center gap-2 bg-slate-50 px-4 py-2 rounded-lg border border-slate-100">
                    <Clock className="w-5 h-5 text-slate-400" />
                    <span className="text-xl font-mono font-bold text-slate-700">{timeLeft}s</span>
                  </div>
                </div>

                <div className="flex-1 flex flex-col justify-end min-h-[400px]">
                  {voteStats ? (
                    <div className="h-full w-full">
                       <LiveChart stats={voteStats} options={currentQuestion.options} />
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-full text-slate-300">
                      <BarChart3 className="w-24 h-24 opacity-20" />
                    </div>
                  )}
                </div>
              </div>
             ) : (
               <div className="h-full flex flex-col items-center justify-center text-center p-12 bg-slate-50/50">
                 <div className="w-24 h-24 bg-white rounded-2xl shadow-sm border border-slate-200 flex items-center justify-center mb-6">
                   <div className="w-16 h-16 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
                 </div>
                 <h2 className="text-3xl font-bold text-slate-900 mb-2">Ready to Start</h2>
                 <p className="text-slate-500 text-lg max-w-md">
                   Audience can join at <span className="font-bold text-blue-600">livepoll.app</span> using code <span className="font-mono font-bold bg-white px-2 py-0.5 rounded border border-slate-200">{roomId}</span>
                 </p>
                                  <div className="mt-12 bg-white p-6 rounded-xl border border-slate-200 shadow-sm max-w-sm w-full">
                     <div className="flex justify-between items-center border-b border-slate-100 pb-4 mb-4">
                       <span className="text-sm font-medium text-slate-500">Joined Participants</span>
                       <span className="text-2xl font-bold text-slate-900">{playerCount}</span>
                     </div>
                     <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                        {players.map((p, i) => (
                           <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-100">
                             <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-[10px] font-bold text-blue-600">
                               {p.username.charAt(0).toUpperCase()}
                             </div>
                             <span className="text-sm font-medium text-slate-700 truncate">{p.username}</span>
                           </div>
                        ))}
                        {players.length === 0 && (
                          <div className="col-span-2 text-center text-xs text-slate-400 py-4">
                            Waiting for players to join...
                          </div>
                        )}
                     </div>
                  </div>
               </div>
             )}
          </div>
        </div>

      </div>
    </main>
  );
}
