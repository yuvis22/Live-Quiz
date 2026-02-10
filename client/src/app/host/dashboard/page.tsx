'use client';

import { useState, useEffect } from 'react';
import { getSocket } from '@/lib/socket';
import { useQuizStore } from '@/store/useQuizStore';
import LiveChart from '@/components/LiveChart';
import { useUser, UserButton } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { Copy, Plus, Play, SkipForward, Users, Clock, Check, BarChart3, Trophy, Loader2, AlertTriangle, ArrowRight } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { API_URL } from '@/lib/config';
import { useHostStore } from '@/store/useHostStore';
import HostNavbar from '@/components/HostNavbar';

export default function HostDashboard() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const { quizzes, reports, fetchQuizzes, fetchReports, isLoadingQuizzes } = useHostStore();
  
  // Computed Metrics
  const totalParticipants = new Set(reports.flatMap((r: any) => r.players.map((p: any) => p.username))).size;
  const totalSessions = reports.length;
  const avgParticipants = totalSessions > 0 ? Math.round(reports.reduce((acc, r) => acc + r.players.length, 0) / totalSessions) : 0;
  
  const { roomId, currentQuestion, timeLeft, voteStats, result, players, isHost, setRoomInfo, setQuestion, setTimeLeft, updateVoteStats, setResult, setPlayers, addPlayer } = useQuizStore();
  const [playerCount, setPlayerCount] = useState(0);
  const [showTerminateModal, setShowTerminateModal] = useState(false);

  useEffect(() => {
    const socket = getSocket();
    if (!socket.connected) socket.connect();

    socket.on('PLAYER_LIST', (data) => {
      setPlayerCount(data.playerCount);
      setPlayers(data.players);
    });

    socket.on('PLAYER_JOINED', (data) => {
      console.log('[DEBUG] Host received PLAYER_JOINED:', JSON.stringify(data));
      setPlayerCount(data.playerCount);
      if (data.players) {
        setPlayers(data.players);
      } else if (data.player) {
        addPlayer(data.player);
      }
    });
    socket.on('NEW_QUESTION', (data) => setQuestion(data));
    socket.on('TICK', (time) => setTimeLeft(time));
    socket.on('LIVE_STATS', (stats) => updateVoteStats(stats));
    socket.on('ERROR', (data) => {
      console.error('Socket Error:', JSON.stringify(data));
      
      let errorData = data;
      if (typeof data === 'string') {
        try {
            errorData = JSON.parse(data);
        } catch (e) {
            console.error('Failed to parse error data:', e);
            errorData = { message: data };
        }
      }

      if (errorData.message === 'Room not found') {
         toast.error('Session expired. Please start a new one.');
         // Critical: Reset state to force user to create a new room
         const { reset } = useQuizStore.getState();
         reset();
         return;
      }
      
      toast.error(errorData.message || 'Connection error');
    });

    return () => {
      socket.off('PLAYER_LIST');
      socket.off('PLAYER_JOINED');
      socket.off('NEW_QUESTION');
      socket.off('TICK');
      socket.off('LIVE_STATS');
      socket.off('MAX_VOTES_REACHED');
      socket.off('QUESTION_ENDED');
      socket.off('QUIZ_ENDED');
      socket.off('ERROR');
    };
  }, []);

  useEffect(() => {
    const socket = getSocket();
    socket.on('QUESTION_ENDED', (data) => {
        setResult(data);
        if (data.stats) {
           updateVoteStats(data.stats);
        }
    });
    socket.on('QUIZ_ENDED', () => {
         toast.success('Presentation Completed! 🎉');
         // Redirect back to dashboard after a delay
         setTimeout(() => {
            const { reset } = useQuizStore.getState();
            reset();
         }, 3000);
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

      // Fetch Dashboard Data
      fetchQuizzes(user.id);
      fetchReports(user.id);
    }
  }, [user, roomId, isHost, fetchQuizzes, fetchReports]);

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
        <HostNavbar />

        <div className="max-w-7xl mx-auto p-6 space-y-8">
            {/* 1. Welcome & Stats */}
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Welcome back, {user?.firstName} 👋</h1>
                <p className="text-slate-500 text-sm mt-1 mb-6">Here's what's happening with your quizzes.</p>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Stat Card 1 */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                                <Copy className="w-5 h-5" />
                            </div>
                            {/* <span className="text-xs font-bold text-green-600 bg-green-50 px-2 py-1 rounded">+2 new</span> */}
                        </div>
                        <div>
                            <span className="text-3xl font-bold text-slate-900 block">{quizzes.length}</span>
                            <span className="text-sm font-medium text-slate-500">Total Quizzes</span>
                        </div>
                    </div>

                    {/* Stat Card 2 */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-purple-50 text-purple-600 rounded-lg">
                                <Users className="w-5 h-5" />
                            </div>
                        </div>
                        <div>
                            <span className="text-3xl font-bold text-slate-900 block">{totalParticipants}</span>
                            <span className="text-sm font-medium text-slate-500">Unique Participants</span>
                        </div>
                    </div>

                    {/* Stat Card 3 */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-orange-50 text-orange-600 rounded-lg">
                                <Play className="w-5 h-5" />
                            </div>
                        </div>
                        <div>
                            <span className="text-3xl font-bold text-slate-900 block">{totalSessions}</span>
                            <span className="text-sm font-medium text-slate-500">Sessions Run</span>
                        </div>
                    </div>

                    {/* Stat Card 4 */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
                        <div className="flex justify-between items-start mb-4">
                            <div className="p-2 bg-green-50 text-green-600 rounded-lg">
                                <Users className="w-5 h-5" />
                            </div>
                        </div>
                        <div>
                            <span className="text-3xl font-bold text-slate-900 block">{avgParticipants}</span>
                            <span className="text-sm font-medium text-slate-500">Avg. Participants / Session</span>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
                {/* 2. Recent Quizzes & Quick Actions */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-slate-900">Your Quizzes</h2>
                        <button 
                            onClick={() => router.push('/host/quizzes')}
                            className="text-sm font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1"
                        >
                            View All <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Create New Banner */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-6 text-white flex items-center justify-between shadow-lg shadow-blue-500/20">
                        <div>
                            <h3 className="font-bold text-xl mb-1">Create a new quiz</h3>
                            <p className="text-blue-100 text-sm">Engage your audience with live polls and questions.</p>
                        </div>
                        <button 
                            onClick={() => router.push('/host/create')}
                            className="px-5 py-2.5 bg-white text-blue-600 font-bold rounded-xl hover:bg-blue-50 transition-colors flex items-center gap-2 shadow-sm"
                        >
                            <Plus className="w-5 h-5" />
                            Create
                        </button>
                    </div>

                    {/* Recent List */}
                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                        {isLoadingQuizzes ? (
                            <div className="p-8 text-center text-slate-400">Loading quizzes...</div>
                        ) : quizzes.length > 0 ? (
                            <div className="divide-y divide-slate-100">
                                {quizzes.slice(0, 3).map((quiz: any) => (
                                    <div key={quiz._id} className="p-4 hover:bg-slate-50 transition-colors flex items-center justify-between group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center font-bold">
                                                {quiz.title.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-slate-900">{quiz.title}</p>
                                                <p className="text-xs text-slate-500">{new Date(quiz.createdAt).toLocaleDateString()} • {quiz.questions?.length || 0} Questions</p>
                                            </div>
                                        </div>
                                        <button 
                                            onClick={() => startSession(quiz._id)}
                                            className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:border-blue-500 hover:text-blue-600 transition-colors flex items-center gap-2"
                                        >
                                            <Play className="w-3 h-3" />
                                            Start
                                        </button>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-8 text-center text-slate-400">
                                <p>No quizzes yet.</p>
                            </div>
                        )}
                        {quizzes.length > 3 && (
                            <div className="p-3 bg-slate-50 border-t border-slate-100 text-center">
                                <button onClick={() => router.push('/host/quizzes')} className="text-xs font-bold text-slate-500 hover:text-slate-800">Show all {quizzes.length} quizzes</button>
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. Recent Reports */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-bold text-slate-900">Recent Activity</h2>
                        <button 
                            onClick={() => router.push('/host/reports')}
                            className="text-sm font-semibold text-slate-500 hover:text-slate-700 flex items-center gap-1"
                        >
                             All <ArrowRight className="w-4 h-4" />
                        </button>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden flex flex-col">
                        {reports.length > 0 ? (
                            <div className="divide-y divide-slate-100">
                                {reports.slice(0, 3).map((report: any) => (
                                    <div 
                                        key={report._id} 
                                        onClick={() => router.push(`/host/reports?reportId=${report._id}`)} 
                                        className="p-4 hover:bg-slate-50 cursor-pointer transition-colors block"
                                    >
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 text-[10px] font-mono font-bold">{report.roomId}</span>
                                            <span className="text-xs text-slate-400">{new Date(report.createdAt).toLocaleDateString()}</span>
                                        </div>
                                        <p className="font-semibold text-slate-900 text-sm mb-1 truncate">{report.quizId?.title || 'Untitled Session'}</p>
                                        <div className="flex items-center gap-3 text-xs text-slate-500">
                                            <div className="flex items-center gap-1">
                                                <Users className="w-3 h-3" />
                                                {report.players.length}
                                            </div>
                                            {report.players.length > 0 && (
                                                <div className="flex items-center gap-1 text-green-600">
                                                    <Trophy className="w-3 h-3" />
                                                    {report.players.sort((a:any, b:any) => b.score - a.score)[0]?.username}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
                                <BarChart3 className="w-12 h-12 mb-2 opacity-20" />
                                <p className="text-sm">No sessions run yet.</p>
                            </div>
                        )}
                        

                    </div>
                </div>
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
                className={`w-full py-4 text-white font-semibold rounded-xl flex items-center justify-center gap-2 transition-all shadow-md ${
                  currentQuestion 
                  && currentQuestion.currentQuestionIndex === currentQuestion.totalQuestions
                  && result // ONLY if result is shown (Final Answer Reveal)
                    ? 'bg-slate-800 hover:bg-slate-900 shadow-slate-500/20'
                    : 'bg-blue-600 hover:bg-blue-700 shadow-blue-500/20'
                }`}
              >
                {/* 
                    LOGIC:
                    - If Live Question: Show "End Question" (implied by next action, usually handled by timer or early stop if manual)
                    - If Result Shown: Show "Next Slide" or "Finish"
                    - If Last Question Result: Show "Finish Presentation"
                */}
                {currentQuestion && currentQuestion.currentQuestionIndex === currentQuestion.totalQuestions ? (
                   result ? (
                       <div className="flex items-center gap-2">
                         <Check className="w-5 h-5" />
                         <span>Finish Session</span>
                       </div>
                   ) : (
                       <div className="flex items-center gap-2">
                         <Play className="w-5 h-5" />
                         <span>Show Final Results</span>
                       </div>
                   )
                ) : (
                   <>
                    {currentQuestion ? <SkipForward className="w-5 h-5" /> : <Play className="w-5 h-5" />}
                    <span>{currentQuestion ? 'Next Slide' : 'Start Presentation'}</span>
                   </>
                )}
              </button>
            </div>
            <div className="mt-auto pt-6 text-center space-y-4">
               <button
                 onClick={() => setShowTerminateModal(true)}
                 className="w-full py-2 bg-red-50 hover:bg-red-100 text-red-600 font-medium rounded-lg text-sm border border-red-200 transition-colors"
               >
                 Terminate Session
               </button>
               <p className="text-xs text-slate-400">Press 'Space' to advance</p>
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
                  <div className="flex gap-6 h-full">
                      {/* CHART */}
                      <div className="flex-1">
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
                      
                      {/* OPTIONS LEGEND */}
                      <div className="w-1/3 space-y-3 overflow-y-auto max-h-[400px] pr-2">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Options</p>
                        {currentQuestion.options.map((opt: any, idx: number) => (
                            <div key={opt.id} className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-sm flex gap-3">
                                <span className="font-bold text-blue-600">{['A','B','C','D'][idx]}.</span>
                                <span className="text-slate-700">{opt.text}</span>
                            </div>
                        ))}
                      </div>
                  </div>
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

        
        {/* Terminate Session Modal */}
        {showTerminateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-fade-in">
             <div className="bg-white rounded-2xl shadow-xl max-w-md w-full overflow-hidden animate-scale-in">
                <div className="p-6">
                   <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mb-4 mx-auto">
                      <AlertTriangle className="w-6 h-6 text-red-600" />
                   </div>
                   <h3 className="text-xl font-bold text-slate-900 text-center mb-2">End Session?</h3>
                   <p className="text-slate-500 text-center text-sm leading-relaxed mb-6">
                      Are you sure you want to end this session? This will disconnect all players and generate a final report. This action cannot be undone.
                   </p>
                   
                   <div className="flex gap-3">
                      <button 
                        onClick={() => setShowTerminateModal(false)}
                        className="flex-1 py-2.5 bg-white border border-slate-300 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={() => {
                           getSocket().emit('TERMINATE_ROOM', { roomId });
                           toast.success('Session Terminated');
                           const { reset } = useQuizStore.getState();
                           reset();
                           setShowTerminateModal(false);
                        }}
                        className="flex-1 py-2.5 bg-red-600 text-white font-semibold rounded-xl hover:bg-red-700 shadow-lg shadow-red-500/20 transition-all"
                      >
                        End Session
                      </button>
                   </div>
                </div>
             </div>
          </div>
        )}

      </div>
    </main>
  );
}
