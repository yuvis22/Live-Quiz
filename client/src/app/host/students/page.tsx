'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, UserButton } from '@clerk/nextjs';
import axios from 'axios';
import { 
  Users, 
  Search,
  ArrowLeft,
  ChevronRight,
  User
} from 'lucide-react';
import toast from 'react-hot-toast';
import { API_URL } from '@/lib/config';
import { useHostStore } from '@/store/useHostStore';
import HostNavbar from '@/components/HostNavbar';

export default function StudentsPage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  
  const { reports, fetchReports, isLoadingReports } = useHostStore();
  const [students, setStudents] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (user?.id) {
        fetchReports(user.id);
    }
  }, [user, fetchReports]);

  useEffect(() => {
    if (reports.length > 0) {
        const allStudents = new Set<string>();
        reports.forEach((report: any) => {
            report.players.forEach((player: any) => {
            if (player.username) {
                allStudents.add(player.username);
            }
            });
        });
        setStudents(Array.from(allStudents).sort());
    }
  }, [reports]);

  const filteredStudents = students.filter(student => 
    student.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (!isLoaded) return null;

  return (
    <main className="min-h-screen bg-slate-50 font-sans text-slate-900">
        <HostNavbar />

        <div className="max-w-4xl mx-auto p-6">
            <div className="flex flex-col md:flex-row gap-6 justify-between items-start md:items-center mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Student Directory</h1>
                    <p className="text-slate-500 text-sm mt-1">View all participants who have taken your quizzes.</p>
                </div>
                
                <div className="relative w-full md:w-72">
                    <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input 
                        type="text" 
                        placeholder="Search for a student..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all text-sm"
                    />
                </div>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px]">
                {isLoadingReports ? (
                   <div className="flex items-center justify-center h-64 text-slate-400">Loading...</div>
                ) : (
                   <div className="divide-y divide-slate-100">
                        {filteredStudents.length > 0 ? (
                            filteredStudents.map((student) => (
                              <div 
                                key={student} 
                                onClick={() => router.push(`/host/reports?student=${encodeURIComponent(student)}`)}
                                className="p-4 hover:bg-slate-50 transition-colors flex justify-between items-center cursor-pointer group"
                              >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-purple-100 group-hover:text-purple-600 transition-colors">
                                        <User className="w-5 h-5" />
                                    </div>
                                    <span className="font-medium text-slate-700 group-hover:text-slate-900">{student}</span>
                                </div>
                                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-purple-400 transition-colors" />
                              </div>
                            ))
                        ) : (
                            <div className="text-center py-16">
                                <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                                    <Users className="w-8 h-8" />
                                </div>
                                <h3 className="text-slate-900 font-medium mb-1">No students found</h3>
                                <p className="text-slate-500 text-sm">Once users join your quizzes, they'll appear here.</p>
                            </div>
                        )}
                   </div>
                )}
            </div>
        </div>
    </main>
  );
}
