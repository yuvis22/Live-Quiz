'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import { useQuizStore } from '@/store/useQuizStore';
import LiveChart from '@/components/LiveChart';
import { Check, Trophy, Clock, Loader2, BarChart3 } from 'lucide-react';

export default function QuizRoom() {
  const params = useParams();
  const roomId = (params.roomId as string).toUpperCase();
  const router = useRouter();
  
  const { username, currentQuestion, timeLeft, voteStats, setQuestion, setTimeLeft, updateVoteStats } = useQuizStore();
  const [hasVoted, setHasVoted] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [waitingMessage, setWaitingMessage] = useState('Waiting for presenter...');
  const [error, setError] = useState<string | null>(null);

  interface Result {
      correctOption: string;
      leaderboard: any[];
      final?: boolean;
      myRank?: number;
      myScore?: number;
  }

  const [result, setResult] = useState<Result | null>(null);

  useEffect(() => {
    if (!username) {
      router.push('/');
      return;
    }

    const socket = getSocket();
    if (!socket.connected) socket.connect();

    // Ensure we join the room (idempotent on server)
    socket.emit('JOIN_ROOM', { roomId, username });

    socket.on('NEW_QUESTION', (data) => {
      setQuestion(data);
      setHasVoted(false);
      setSelectedOption(null);
      setResult(null);
      setWaitingMessage('');
    });
    
    socket.on('ERROR', (data) => {
        let msg = typeof data === 'string' ? data : data.message;
        if (msg === 'Room not found') {
            setError('Room not found or session expired.');
        } else {
            // Toast or minor error
        }
    });

    socket.on('TICK', (time) => setTimeLeft(time));
    socket.on('LIVE_STATS', (stats) => updateVoteStats(stats));
    socket.on('QUESTION_ENDED', (data) => {
      setResult(data);
      setWaitingMessage('Round complete. Waiting for next slide...');
    });
    socket.on('QUIZ_ENDED', (data) => {
      setWaitingMessage('Presentation ended. Thank you for participating!');
      if (data && data.leaderboard) {
          // Find my stats
          const myStatsIndex = data.leaderboard.findIndex((p: any) => p.username === username);
          if (myStatsIndex !== -1) {
              setResult({
                  correctOption: '', 
                  leaderboard: [],
                  final: true,
                  myRank: myStatsIndex + 1,
                  myScore: data.leaderboard[myStatsIndex].score
              });
          }
      }
    });

    return () => {
      socket.off('NEW_QUESTION');
      socket.off('TICK');
      socket.off('LIVE_STATS');
      socket.off('QUESTION_ENDED');
      socket.off('QUIZ_ENDED');
    };
  }, [roomId, username, router, setQuestion, setTimeLeft, updateVoteStats]);

  const handleVote = (optionId: string) => {
    if (hasVoted || timeLeft <= 0) return;
    getSocket().emit('SUBMIT_VOTE', { roomId, optionId });
    setSelectedOption(optionId);
    setHasVoted(true);
  };

  if (!username) return null;

  if (error) {
      return (
        <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
            <div className="text-center max-w-sm w-full bg-white p-8 rounded-2xl shadow-xl border border-slate-100">
                <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
                    <span className="text-2xl font-bold">!</span>
                </div>
                <h2 className="text-xl font-bold text-slate-900 mb-2">Oops!</h2>
                <p className="text-slate-500 mb-6">{error}</p>
                <button 
                    onClick={() => router.push('/')}
                    className="w-full py-3 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 transition-colors"
                >
                    Go Home
                </button>
            </div>
        </div>
      );
  }

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 px-6 h-16 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-sm">
             {username.charAt(0).toUpperCase()}
          </div>
          <span className="font-semibold text-slate-700 hidden md:block">{username}</span>
        </div>
        <div className="flex items-center gap-2">
           <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Session</span>
           <span className="px-3 py-1 bg-slate-100 rounded-md text-sm font-mono font-bold text-slate-700">
             {roomId}
           </span>
        </div>
      </header>
      
      <div className="max-w-3xl mx-auto px-4 py-8 md:py-12">
        {currentQuestion && !result ? (
          <div className="space-y-8 animate-fade-in-up">
            {/* Question */}
            <div className="text-center space-y-6 py-4">
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight">
                {currentQuestion.text}
              </h2>
              
              {/* Timer */}
              <div className="flex justify-center">
                 <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-white border border-slate-200 rounded-full text-sm font-medium text-slate-500 shadow-sm">
                   <Clock className="w-4 h-4" />
                   <span>{timeLeft}s remaining</span>
                 </div>
              </div>
            </div>

            {/* Options */}
            <div className="space-y-3">
              {currentQuestion.options.map((opt, index) => {
                const isSelected = selectedOption === opt.id;
                
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleVote(opt.id)}
                    disabled={hasVoted}
                    className={`
                      w-full relative group p-6 rounded-xl shadow-sm border transition-all text-left flex items-center gap-4
                      ${isSelected 
                        ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500 z-10' 
                        : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-md'
                      }
                      ${hasVoted && !isSelected ? 'opacity-50 grayscale-[0.5] cursor-not-allowed' : ''}
                      ${!hasVoted ? 'active:scale-[0.99] active:translate-y-0.5' : ''}
                    `}
                  >
                    <div className={`
                       w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border
                       ${isSelected ? 'bg-blue-600 border-blue-600 text-white' : 'bg-slate-50 border-slate-200 text-slate-500 group-hover:bg-white'}
                    `}>
                      {['A', 'B', 'C', 'D'][index]}
                    </div>
                    <span className={`text-lg font-medium flex-1 ${isSelected ? 'text-blue-900' : 'text-slate-700'}`}>
                      {opt.text}
                    </span>
                    {isSelected && <Check className="w-5 h-5 text-blue-600" />}
                  </button>
                );
              })}
            </div>

            <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden mt-8">
               <div 
                 className="h-full bg-blue-500 transition-all duration-1000 ease-linear"
                 style={{ width: `${(timeLeft / currentQuestion.timeLimit) * 100}%` }}
               />
            </div>

            {hasVoted && (
               <div className="text-center py-4 text-slate-500 text-sm animate-pulse flex items-center justify-center gap-2">
                 <Check className="w-4 h-4 text-green-500" />
                 <span>Answer submitted</span>
               </div>
            )}
          </div>
        ) : result && result.final ? (
           <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden animate-fade-in-up">
             <div className="bg-slate-900 p-8 text-center text-white relative overflow-hidden">
                <div className="absolute top-0 left-0 w-full h-full bg-blue-600/10" />
                <Trophy className="w-16 h-16 mx-auto mb-4 text-yellow-400 relative z-10 animate-bounce" />
                <h2 className="text-3xl font-bold mb-2 relative z-10">Presentation Over</h2>
                <p className="opacity-70 text-sm relative z-10">Here is how you did!</p>
             </div>
             
             <div className="p-8 space-y-8">
                 <div className="flex justify-center gap-8 text-center">
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Rank</p>
                        <p className="text-4xl font-bold text-slate-900">#{result.myRank ?? '-'}</p>
                    </div>
                    <div className="w-px bg-slate-100" />
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Score</p>
                        <p className="text-4xl font-bold text-blue-600">{result.myScore ?? 0}</p>
                    </div>
                 </div>

                 <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 text-center">
                    <p className="text-slate-600 font-medium">
                        {(result.myRank ?? 999) === 1 ? '🥇 Champion! Amazing work!' : 
                         (result.myRank ?? 999) <= 3 ? '🥈 Podium Finish! Great job!' : 
                         'Thanks for participating!'}
                    </p>
                 </div>
                 
                 <button 
                    onClick={() => router.push('/')}
                    className="w-full py-3 bg-slate-900 text-white font-semibold rounded-xl hover:bg-slate-800 transition-colors"
                 >
                    Back to Home
                 </button>
             </div>
           </div>
        ) : result ? (
          <div className="max-w-md mx-auto bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden animate-fade-in-up">
            <div className="bg-slate-900 p-8 text-center text-white relative overflow-hidden">
               <div className="absolute top-0 left-0 w-full h-full bg-blue-600/10" />
               <Trophy className="w-12 h-12 mx-auto mb-4 text-yellow-400 relative z-10" />
               <h2 className="text-2xl font-bold mb-1 relative z-10">Results</h2>
               <p className="opacity-70 text-sm relative z-10">Question Complete</p>
            </div>
            
            <div className="p-8 space-y-8">
               <div className="text-center">
                 {result.correctOption ? (
                   <>
                    {/* FEEDBACK BANNER */}
                    <div className={`mb-6 p-4 rounded-xl border flex items-center justify-center gap-3 animate-bounce-in ${
                        selectedOption === result.correctOption 
                        ? 'bg-green-100 border-green-200 text-green-800' 
                        : 'bg-red-100 border-red-200 text-red-800'
                    }`}>
                        {selectedOption === result.correctOption ? (
                            <>
                                <Check className="w-6 h-6" />
                                <span className="text-lg font-bold">You got it right!</span>
                            </>
                        ) : (
                            <>
                                <div className="w-6 h-6 rounded-full bg-red-200 flex items-center justify-center font-bold">✕</div>
                                <span className="text-lg font-bold">Wrong Answer</span>
                            </>
                        )}
                    </div>

                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Correct Answer</p>
                    <div className="p-4 bg-green-50 rounded-xl border border-green-100 text-green-800 font-medium text-lg flex items-center justify-center gap-2">
                        <Check className="w-5 h-5" />
                        {currentQuestion?.options.find(o => o.id === result.correctOption)?.text}
                    </div>
                   </>
                 ) : (
                   <div className="py-6">
                      <p className="text-xl font-bold text-slate-700">Thanks for voting!</p>
                      <p className="text-slate-500">Wait for the results on screen.</p>
                   </div>
                 )}
               </div>

               <div>
                 {result.correctOption && (
                   <>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 text-center">Top Participants</p>
                    <div className="space-y-3">
                      {result.leaderboard.slice(0, 3).map((p: any, i: number) => (
                        <div key={i} className="flex justify-between items-center p-3 rounded-lg bg-slate-50 border border-slate-100">
                          <div className="flex items-center gap-3">
                            <div className={`
                                w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                                ${i === 0 ? 'bg-yellow-100 text-yellow-700' : 'bg-slate-200 text-slate-600'}
                            `}>
                              {i + 1}
                            </div>
                            <span className="font-semibold text-slate-700">{p.username}</span>
                          </div>
                          <span className="font-mono font-bold text-slate-900">{p.score}</span>
                        </div>
                      ))}
                    </div>
                   </>
                 )}
               </div>
               
                <div className="text-center pt-4 border-t border-slate-50">
                  <div className="inline-flex items-center gap-2 text-slate-400 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Presenter is navigating...</span>
                  </div>
                </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-8 animate-fade-in-up">
             <div className="relative">
               <div className="absolute inset-0 bg-blue-100 rounded-full blur-xl opacity-50 animate-pulse" />
               <div className="w-24 h-24 bg-white rounded-3xl shadow-xl border border-slate-100 flex items-center justify-center relative z-10">
                 <BarChart3 className="w-10 h-10 text-blue-600" />
               </div>
             </div>
             
             <div className="space-y-3 max-w-sm">
               <h2 className="text-2xl font-bold text-slate-900">You're connected</h2>
               <p className="text-slate-500 text-lg leading-relaxed">{waitingMessage}</p>
             </div>
             
             <div className="flex gap-1">
               <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce" />
               <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce delay-100" />
               <div className="w-2 h-2 rounded-full bg-blue-400 animate-bounce delay-200" />
             </div>
          </div>
        )}
      </div>
    </main>
  );
}
