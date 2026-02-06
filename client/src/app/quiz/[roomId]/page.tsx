'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import { useQuizStore } from '@/store/useQuizStore';
import LiveChart from '@/components/LiveChart';
import { Check, Trophy, Clock, Loader2, BarChart3 } from 'lucide-react';

export default function QuizRoom() {
  const params = useParams();
  const roomId = params.roomId as string;
  const router = useRouter();
  
  const { username, currentQuestion, timeLeft, voteStats, setQuestion, setTimeLeft, updateVoteStats } = useQuizStore();
  const [hasVoted, setHasVoted] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [waitingMessage, setWaitingMessage] = useState('Waiting for presenter...');
  const [result, setResult] = useState<{ correctOption: string; leaderboard: any[] } | null>(null);

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

    socket.on('TICK', (time) => setTimeLeft(time));
    socket.on('LIVE_STATS', (stats) => updateVoteStats(stats));
    socket.on('QUESTION_ENDED', (data) => {
      setResult(data);
      setWaitingMessage('Round complete. Waiting for next slide...');
    });
    socket.on('QUIZ_ENDED', () => {
      setWaitingMessage('Presentation ended. Thank you for participating!');
      // Keep the result visible if it exists, or show a specific end screen
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
