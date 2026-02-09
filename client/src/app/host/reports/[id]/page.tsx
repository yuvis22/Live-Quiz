'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useUser, UserButton } from '@clerk/nextjs';
import { ArrowLeft, Calendar, Users, Trophy, BarChart3, Clock, Check, X } from 'lucide-react';
import { API_URL } from '@/lib/config';
import { toast } from 'react-hot-toast';

export default function ReportDetailsPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const params = useParams();
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && params?.id) {
       fetch(`${API_URL}/api/reports/${params.id}`)
         .then(res => {
            if (!res.ok) throw new Error('Failed to fetch report');
            return res.json();
         })
         .then(data => {
            setReport(data);
            setLoading(false);
         })
         .catch(err => {
            console.error(err);
            toast.error('Failed to load report details');
            setLoading(false);
         });
    }
  }, [user, params?.id]);

  if (!isLoaded || loading) {
    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
    );
  }

  if (!report) {
     return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-500">
            <p className="text-lg">Report not found.</p>
            <button onClick={() => router.back()} className="mt-4 text-blue-600 hover:underline">Go Back</button>
        </div>
     );
  }

  const sortedPlayers = [...report.players].sort((a: any, b: any) => b.score - a.score);

  return (
    <main className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-12">
        {/* Header */}
        <header className="bg-white border-b border-slate-200 sticky top-0 z-10 px-6 h-16 flex items-center justify-between shadow-sm">
            <div className="flex items-center gap-4">
                <button 
                  onClick={() => router.back()}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <h1 className="font-bold text-lg text-slate-800">Report Details</h1>
            </div>
            <UserButton />
        </header>

        <div className="max-w-5xl mx-auto p-6 space-y-6">
            
            {/* Overview Card */}
            <div className="bg-white rounded-2xl border border-slate-200 p-8 shadow-sm">
                 <div className="flex flex-col md:flex-row justify-between md:items-start gap-6">
                    <div>
                        <h2 className="text-3xl font-bold text-slate-900 mb-2">{report.quizId?.title || 'Untitled Quiz'}</h2>
                        <div className="flex flex-wrap gap-4 text-sm text-slate-500">
                            <div className="flex items-center gap-1.5">
                                <Calendar className="w-4 h-4" />
                                <span>{new Date(report.createdAt).toLocaleDateString()} at {new Date(report.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <span className="font-mono bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-bold border border-slate-200">
                                    {report.roomId}
                                </span>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex gap-4">
                        <div className="px-5 py-3 bg-blue-50 rounded-xl border border-blue-100 text-center">
                            <div className="text-xs font-bold text-blue-400 uppercase tracking-wider mb-1">Players</div>
                            <div className="text-2xl font-bold text-blue-700 flex items-center justify-center gap-2">
                                <Users className="w-5 h-5" />
                                {report.players.length}
                            </div>
                        </div>
                        {sortedPlayers.length > 0 && (
                            <div className="px-5 py-3 bg-yellow-50 rounded-xl border border-yellow-100 text-center">
                                <div className="text-xs font-bold text-yellow-500 uppercase tracking-wider mb-1">Top Score</div>
                                <div className="text-2xl font-bold text-yellow-700 flex items-center justify-center gap-2">
                                     <Trophy className="w-5 h-5" />
                                     {sortedPlayers[0].score}
                                </div>
                            </div>
                        )}
                    </div>
                 </div>
            </div>

            {/* Leaderboard Section */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                    <h3 className="font-bold text-slate-700 flex items-center gap-2">
                        <Trophy className="w-5 h-5 text-yellow-500" />
                        Leaderboard
                    </h3>
                    <span className="text-sm text-slate-400 font-medium">{report.players.length} Participants</span>
                </div>
                
                <div className="divide-y divide-slate-100">
                    {sortedPlayers.map((player: any, index: number) => (
                        <div key={index} className="px-6 py-4 hover:bg-slate-50 transition-colors flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <div className={`
                                    w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm
                                    ${index === 0 ? 'bg-yellow-100 text-yellow-700' : 
                                      index === 1 ? 'bg-slate-200 text-slate-600' :
                                      index === 2 ? 'bg-orange-100 text-orange-700' : 'bg-white border border-slate-200 text-slate-400'}
                                `}>
                                    {index + 1}
                                </div>
                                <div>
                                    <p className="font-semibold text-slate-900">{player.username}</p>
                                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                                        <span className="flex items-center gap-1">
                                            <Check className="w-3 h-3 text-green-500" />
                                            {player.answers?.filter((a: any) => a.isCorrect).length || 0} Correct
                                        </span>
                                        <span className="flex items-center gap-1">
                                           <X className="w-3 h-3 text-red-500" />
                                           {player.answers?.filter((a: any) => !a.isCorrect).length || 0} Wrong
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <div className="text-right">
                                <span className="block font-mono font-bold text-lg text-slate-900">{player.score}</span>
                                <span className="text-xs text-slate-400">points</span>
                            </div>
                        </div>
                    ))}
                    
                    {sortedPlayers.length === 0 && (
                        <div className="p-12 text-center text-slate-400">
                            No participants joined this session.
                        </div>
                    )}
                </div>
            </div>

        </div>
    </main>
  );
}
