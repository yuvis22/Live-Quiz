'use client';

import { useUser, UserButton } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';

interface HostNavbarProps {
  actions?: React.ReactNode;
}

export default function HostNavbar({ actions }: HostNavbarProps) {
  const { user } = useUser();
  const router = useRouter();

  return (
    <nav className="bg-white border-b border-slate-200 px-6 h-16 flex items-center justify-between sticky top-0 z-10 w-full">
       <div className="flex items-center gap-8">
           <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push('/host/dashboard')}>
             <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">Q</div>
             <span className="font-bold text-lg hidden md:block">Qorum</span>
           </div>
           
           <div className="hidden md:flex items-center gap-6">
               <button 
                  onClick={() => router.push('/host/dashboard')} 
                  className="text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors"
                >
                  Dashboard
               </button>
               <button 
                  onClick={() => router.push('/host/quizzes')} 
                  className="text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors"
                >
                  Quizzes
               </button>
               <button 
                  onClick={() => router.push('/host/reports')} 
                  className="text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors"
                >
                  Reports
               </button>
               <button 
                  onClick={() => router.push('/host/students')} 
                  className="text-sm font-medium text-slate-500 hover:text-blue-600 transition-colors"
                >
                  Students
               </button>
           </div>
       </div>
       
       <div className="flex items-center gap-4">
           {/* Mobile Menu Button could go here */}
           {actions}
           <UserButton />
       </div>
    </nav>
  );
}
