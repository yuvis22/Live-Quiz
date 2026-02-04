'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import { useQuizStore } from '@/store/useQuizStore';
import LiveChart from '@/components/LiveChart';

export default function QuizRoom() {
  const params = useParams();
  const roomId = params.roomId as string;
  const router = useRouter();
  
  const { 
    username, 
    currentQuestion, 
    timeLeft, 
    voteStats, 
    setQuestion, 
    setTimeLeft, 
    updateVoteStats,
    reset
  } = useQuizStore();

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

    socket.on('TICK', (time) => {
      setTimeLeft(time);
    });

    socket.on('LIVE_STATS', (stats) => {
      updateVoteStats(stats);
    });

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
    const socket = getSocket();
    socket.emit('SUBMIT_VOTE', { roomId, optionId });
    setSelectedOption(optionId);
    setHasVoted(true);
  };

  if (!username) return null;

  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-4 bg-slate-900 text-white">
      <div className="w-full max-w-2xl space-y-6">
        
        {/* Header */}
        <div className="flex justify-between items-center glass-panel p-4 rounded-xl">
          <div>
            <p className="text-slate-400 text-sm">Player</p>
            <p className="font-bold text-lg">{username}</p>
          </div>
          <div>
            <p className="text-slate-400 text-sm text-right">Room</p>
            <p className="font-mono text-xl text-indigo-400">{roomId}</p>
          </div>
        </div>

        {/* Content Area */}
        {currentQuestion && !result ? (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Timer Bar */}
            <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
              <div 
                className="h-full bg-indigo-500 transition-all duration-1000 ease-linear"
                style={{ width: `${(timeLeft / currentQuestion.timeLimit) * 100}%` }}
              />
            </div>
            
            <div className="text-center space-y-4">
              <span className="inline-block px-3 py-1 bg-indigo-500/10 text-indigo-400 rounded-full text-sm font-medium">
                {timeLeft}s remaining
              </span>
              <h2 className="text-2xl md:text-3xl font-bold text-balance">
                {currentQuestion.text}
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentQuestion.options.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => handleVote(opt.id)}
                  disabled={hasVoted}
                  className={`
                    p-6 rounded-xl text-left transition-all relative overflow-hidden group
                    ${selectedOption === opt.id 
                      ? 'bg-indigo-600 ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-900' 
                      : 'bg-slate-800 hover:bg-slate-700 active:scale-98'}
                    ${hasVoted && selectedOption !== opt.id ? 'opacity-50' : 'opacity-100'}
                  `}
                >
                  <span className="font-bold text-lg">{opt.text}</span>
                </button>
              ))}
            </div>

            {/* Live Chart if Voted */}
            {hasVoted && voteStats && (
               <div className="glass-panel p-4 rounded-xl">
                 <h3 className="text-center text-slate-400 text-sm mb-2">Live Results</h3>
                 <LiveChart stats={voteStats} options={currentQuestion.options} />
               </div>
            )}
          </div>
        ) : result ? (
          <div className="glass-panel p-8 rounded-2xl text-center space-y-6">
            <h2 className="text-2xl font-bold">Round Results</h2>
            <div className="p-4 bg-slate-800 rounded-lg">
              <p className="text-slate-400">Correct Answer</p>
              <p className="text-xl font-bold text-green-400">
                {currentQuestion?.options.find(o => o.id === result.correctOption)?.text}
              </p>
            </div>
            {/* Simple Leaderboard */}
            <div className="text-left space-y-2">
               <h3 className="font-bold text-indigo-400">Leaderboard</h3>
               {result.leaderboard.slice(0, 5).map((p: any, i: number) => (
                 <div key={i} className="flex justify-between border-b border-slate-700 pb-2">
                   <span>{i+1}. {p.username}</span>
                   <span className="font-mono">{p.score}</span>
                 </div>
               ))}
            </div>
            <p className="animate-pulse text-slate-500">Waiting for next question...</p>
          </div>
        ) : (
          <div className="glass-panel p-12 rounded-2xl text-center">
            <div className="text-indigo-500 text-4xl mb-4 animate-bounce">🎮</div>
            <h2 className="text-xl font-bold">You are in!</h2>
            <p className="text-slate-400 mt-2">{waitingMessage}</p>
          </div>
        )}
      </div>
    </main>
  );
}
