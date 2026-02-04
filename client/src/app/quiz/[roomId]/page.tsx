'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import { useQuizStore } from '@/store/useQuizStore';
import LiveChart from '@/components/LiveChart';
import { Check, Trophy, Clock, Loader2 } from 'lucide-react';

const OPTION_THEMES = [
  { bg: 'bg-red-500', text: 'text-white', border: 'border-red-600', hover: 'hover:bg-red-600' },
  { bg: 'bg-blue-500', text: 'text-white', border: 'border-blue-600', hover: 'hover:bg-blue-600' },
  { bg: 'bg-amber-400', text: 'text-black', border: 'border-amber-500', hover: 'hover:bg-amber-500' },
  { bg: 'bg-emerald-500', text: 'text-white', border: 'border-emerald-600', hover: 'hover:bg-emerald-600' },
];

export default function QuizRoom() {
  const params = useParams();
  const roomId = params.roomId as string;
  const router = useRouter();
  
  const { username, currentQuestion, timeLeft, voteStats, setQuestion, setTimeLeft, updateVoteStats } = useQuizStore();
  const [hasVoted, setHasVoted] = useState(false);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [waitingMessage, setWaitingMessage] = useState('Waiting for host to start...');
  const [result, setResult] = useState<{ correctOption: string; leaderboard: any[] } | null>(null);

  useEffect(() => {
    if (!username) {
      router.push('/');
      return;
    }

    const socket = getSocket();
    if (!socket.connected) socket.connect();

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
      setWaitingMessage('Round over. Waiting for next question...');
    });
    socket.on('QUIZ_ENDED', () => {
      setWaitingMessage('Quiz Finished! Thanks for playing.');
      setResult(null);
      setQuestion(null as any);
    });

    return () => {
      socket.off('NEW_QUESTION');
      socket.off('TICK');
      socket.off('LIVE_STATS');
      socket.off('QUESTION_ENDED');
      socket.off('QUIZ_ENDED');
    };
  }, [roomId, username, router]);

  const handleVote = (optionId: string) => {
    if (hasVoted || timeLeft <= 0) return;
    getSocket().emit('SUBMIT_VOTE', { roomId, optionId });
    setSelectedOption(optionId);
    setHasVoted(true);
  };

  if (!username) return null;

  return (
    <main className="min-h-screen bg-[#f0f2f5] text-slate-900 font-sans">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-10 px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold text-sm">
             {username.charAt(0).toUpperCase()}
          </div>
          <span className="font-semibold text-slate-700">{username}</span>
        </div>
        <div className="px-3 py-1 bg-slate-100 rounded-md text-xs font-mono font-medium text-slate-500">
          CODE: {roomId}
        </div>
      </header>
      
      <div className="max-w-4xl mx-auto px-4 py-8 md:py-12">
        {currentQuestion && !result ? (
          <div className="space-y-8 animate-fade-in-up">
            {/* Timer Bar */}
            <div className="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
               <div 
                 className="h-full bg-indigo-500 transition-all duration-1000 ease-linear"
                 style={{ width: `${(timeLeft / currentQuestion.timeLimit) * 100}%` }}
               />
            </div>

            {/* Question */}
            <div className="text-center space-y-4 py-4">
              <h2 className="text-2xl md:text-3xl font-bold text-slate-900 leading-tight">
                {currentQuestion.text}
              </h2>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white border border-slate-200 rounded-full text-sm font-medium text-slate-500 shadow-sm">
                <Clock className="w-4 h-4" />
                <span>{timeLeft}s remaining</span>
              </div>
            </div>

            {/* Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentQuestion.options.map((opt, index) => {
                const theme = OPTION_THEMES[index] || OPTION_THEMES[0];
                const isSelected = selectedOption === opt.id;
                
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleVote(opt.id)}
                    disabled={hasVoted}
                    className={`
                      relative group h-24 rounded-xl shadow-sm border-b-4 transition-all
                      flex items-center px-6 gap-4 text-left
                      ${theme.bg} ${theme.text} ${theme.border}
                      ${hasVoted && !isSelected ? 'opacity-40 grayscale-[0.5]' : theme.hover}
                      ${hasVoted && !isSelected ? 'cursor-not-allowed' : 'active:scale-[0.99] active:border-b-0 active:translate-y-1'}
                      ${isSelected ? 'ring-4 ring-offset-2 ring-indigo-500 opacity-100 z-10' : ''}
                    `}
                  >
                    <div className="w-10 h-10 rounded-lg bg-black/10 flex items-center justify-center font-bold text-lg">
                      {['▲', '◆', '●', '■'][index]}
                    </div>
                    <span className="text-lg font-bold line-clamp-2 leading-tight flex-1">
                      {opt.text}
                    </span>
                    {isSelected && <Check className="w-6 h-6" />}
                  </button>
                );
              })}
            </div>

            {/* Live Chart Placeholder (only viewable on host usually, but user requested consistent feel) */}
            {hasVoted && (
               <div className="text-center py-8">
                 <p className="text-slate-500 animate-pulse">Answer submitted! Waiting for results...</p>
               </div>
            )}
          </div>
        ) : result ? (
          <div className="max-w-lg mx-auto bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden animate-fade-in-up">
            <div className="bg-indigo-600 p-8 text-center text-white">
               <Trophy className="w-12 h-12 mx-auto mb-4 text-yellow-300" />
               <h2 className="text-3xl font-bold mb-2">Round Complete</h2>
               <p className="opacity-80">Here's how you did</p>
            </div>
            
            <div className="p-8 space-y-8">
               <div className="text-center">
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Correct Answer</p>
                 <div className="p-4 bg-green-50 rounded-xl border border-green-100 text-green-800 font-bold text-lg">
                    {currentQuestion?.options.find(o => o.id === result.correctOption)?.text}
                 </div>
               </div>

               <div>
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 text-center">Top 3 Players</p>
                 <div className="space-y-3">
                   {result.leaderboard.slice(0, 3).map((p: any, i: number) => (
                     <div key={i} className="flex justify-between items-center p-3 rounded-lg bg-slate-50 border border-slate-100">
                       <div className="flex items-center gap-3">
                         <div className={`
                            w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold
                            ${i === 0 ? 'bg-yellow-400 text-yellow-900' : 'bg-slate-300 text-slate-600'}
                         `}>
                           {i + 1}
                         </div>
                         <span className="font-semibold text-slate-700">{p.username}</span>
                       </div>
                       <span className="font-mono font-bold text-indigo-600">{p.score}</span>
                     </div>
                   ))}
                 </div>
               </div>
               
                <div className="text-center pt-4">
                  <div className="inline-flex items-center gap-2 text-slate-400 text-sm">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Waiting for next question...</span>
                  </div>
                </div>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[50vh] text-center space-y-6">
             <div className="w-24 h-24 bg-white rounded-3xl shadow-xl flex items-center justify-center animate-bounce-subtle">
               <span className="text-4xl">🎮</span>
             </div>
             <div>
               <h2 className="text-2xl font-bold text-slate-900">You're In!</h2>
               <p className="text-slate-500 mt-2 text-lg">{waitingMessage}</p>
             </div>
          </div>
        )}
      </div>
    </main>
  );
}
