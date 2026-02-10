'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useUser, UserButton } from '@clerk/nextjs';
import axios from 'axios';
import { 
  Trophy, 
  Clock, 
  Calendar, 
  Search,
  ArrowLeft,
  Filter,
  Users,
  Check,
  X,
  ChevronDown
} from 'lucide-react';
import toast from 'react-hot-toast';
import { API_URL } from '@/lib/config';
import { useHostStore } from '@/store/useHostStore';

export default function ReportsPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const { reports, fetchReports, isLoadingReports } = useHostStore();
  
  // Filters
  const [quizFilter, setQuizFilter] = useState('');
  const [studentFilter, setStudentFilter] = useState('');

  // unique students for dropdown
  const uniqueStudents = Array.from(new Set(reports.flatMap((r: any) => r.players.map((p: any) => p.username)))).sort() as string[];

  useEffect(() => {
    if (user?.id) {
        fetchReports(user.id);
    }
  }, [user, fetchReports]);

  useEffect(() => {
    const studentParam = searchParams.get('student');
    if (studentParam) {
        setStudentFilter(studentParam);
    }
  }, [searchParams]);



  const filteredReports = reports.filter((r: any) => {
    const matchesQuiz = r.quizId?.title?.toLowerCase().includes(quizFilter.toLowerCase()) || 
                        r.roomId?.toLowerCase().includes(quizFilter.toLowerCase());
    
    const matchesStudent = studentFilter === '' || r.players.some((p: any) => 
        p.username === studentFilter
    );

    return matchesQuiz && matchesStudent;
  });

  if (!isLoaded) return null;

  return (
    <main className="min-h-screen bg-slate-50 font-sans text-slate-900">
        <nav className="bg-white border-b border-slate-200 px-6 h-16 flex items-center justify-between sticky top-0 z-10">
           <div className="flex items-center gap-4">
             <button 
                onClick={() => router.push('/host/dashboard')}
                className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
             >
                <ArrowLeft className="w-5 h-5" />
             </button>
             <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">Q</div>
                <span className="font-bold text-lg">Past Reports</span>
             </div>
           </div>
           <UserButton />
        </nav>

        <div className="max-w-5xl mx-auto p-6">
            <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Session Reports</h1>
                    <p className="text-slate-500 text-sm mt-1">View detailed results from your past quizzes.</p>
                </div>
            </div>

            {/* Filters Section */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-col md:flex-row gap-4">
                <div className="flex-1 relative">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Filter by Quiz Title or Room Code..." 
                        value={quizFilter}
                        onChange={(e) => setQuizFilter(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm"
                    />
                </div>
                <div className="flex-1 relative">
                    <Users className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none z-10" />
                    <select
                        value={studentFilter}
                        onChange={(e) => setStudentFilter(e.target.value)}
                        className="w-full pl-10 pr-10 py-2 bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all text-sm appearance-none cursor-pointer"
                    >
                        <option value="">All Students</option>
                        {uniqueStudents.map(student => (
                            <option key={student} value={student}>{student}</option>
                        ))}
                    </select>
                    <ChevronDown className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden p-6 min-h-[400px]">
                {isLoadingReports ? (
                   <div className="flex items-center justify-center h-48 text-slate-400">Loading...</div>
                ) : (
                   <div className="space-y-4">
                        {filteredReports.length > 0 ? (
                            filteredReports.map((report: any) => {
                              // Find specific student if filtering
                              let studentStat = null;
                              if (studentFilter) {
                                const sortedPlayers = [...report.players].sort((a: any, b: any) => b.score - a.score);
                                const playerIndex = sortedPlayers.findIndex((p: any) => p.username === studentFilter);
                                if (playerIndex !== -1) {
                                    studentStat = {
                                        ...sortedPlayers[playerIndex],
                                        rank: playerIndex + 1
                                    };
                                }
                              }

                              return (
                              <div 
                                key={report._id} 
                                onClick={() => router.push(`/host/reports/${report._id}`)}
                                className="p-5 bg-slate-50 rounded-xl border border-slate-100 flex justify-between items-center group hover:bg-white hover:border-blue-200 hover:shadow-md transition-all cursor-pointer"
                              >
                                <div>
                                   <div className="flex items-center gap-2 mb-1">
                                        <p className="font-bold text-slate-800 text-lg">{report.quizId?.title || 'Untitled Session'}</p>
                                        <span className="px-2 py-0.5 rounded text-xs font-mono bg-slate-200 text-slate-600 border border-slate-300">
                                            {report.roomId}
                                        </span>
                                   </div>
                                   <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs font-medium text-slate-500 uppercase tracking-wide">
                                       <span className="flex items-center gap-1">
                                           <Calendar className="w-3 h-3" />
                                           {new Date(report.createdAt).toLocaleDateString()}
                                       </span>
                                       <span className="flex items-center gap-1">
                                           <Clock className="w-3 h-3" />
                                           {new Date(report.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                       </span>
                                       <span>•</span>
                                       <span>{report.players.length} Players</span>
                                   </div>
                                </div>
                                
                                <div className="text-right pl-6 border-l border-slate-200 ml-6">
                                    {studentStat ? (
                                        <div className="flex flex-col items-end">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                                                {studentStat.username} • Rank #{studentStat.rank}
                                            </span>
                                            <div className="flex items-center gap-3">
                                                <div className="text-sm font-bold text-blue-700 flex items-center gap-1.5 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                                                    <Trophy className="w-3.5 h-3.5" />
                                                    {studentStat.score} pts
                                                </div>
                                                <div className="hidden md:flex flex-col text-[10px] font-medium text-slate-400 leading-tight">
                                                    <span className="text-green-600 flex items-center gap-1"><Check className="w-2.5 h-2.5"/> {studentStat.answers?.filter((a:any)=>a.isCorrect).length || 0}</span>
                                                    <span className="text-red-500 flex items-center gap-1"><X className="w-2.5 h-2.5"/> {studentStat.answers?.filter((a:any)=>!a.isCorrect).length || 0}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        report.players.length > 0 ? (
                                            <div className="flex flex-col items-end">
                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Winner</span>
                                                <div className="text-sm font-bold text-green-700 flex items-center gap-1.5 bg-green-50 px-3 py-1.5 rounded-lg border border-green-100">
                                                    <Trophy className="w-3.5 h-3.5" />
                                                    {report.players.sort((a:any, b:any) => b.score - a.score)[0]?.username}
                                                </div>
                                            </div>
                                        ) : (
                                            <span className="text-xs font-medium text-slate-400 bg-slate-100 px-3 py-1.5 rounded">No Play</span>
                                        )
                                    )}
                                </div>
                              </div>
                            );
                            })
                        ) : (
                            <div className="text-center py-12">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                                    <Clock className="w-8 h-8" />
                                </div>
                                <h3 className="text-slate-900 font-medium mb-1">No matching reports</h3>
                                <p className="text-slate-500 text-sm">Try adjusting your search filters.</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    </main>
  );
}
