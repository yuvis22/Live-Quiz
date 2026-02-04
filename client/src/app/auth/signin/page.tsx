'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { KeyRound, Lock, User } from 'lucide-react';

export default function SignIn() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    const result = await signIn('credentials', {
      username,
      password,
      redirect: false,
    });

    if (result?.ok) {
      router.push('/host/dashboard');
    } else {
      alert('Invalid credentials');
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-[#09090b] text-white flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center mx-auto mb-4 border border-white/10">
            <KeyRound className="w-6 h-6 text-indigo-400" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Welcome back</h1>
          <p className="text-zinc-400 text-sm mt-2">Sign in to your dashboard to manage quizzes</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400 ml-1">Username</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full h-11 pl-10 pr-4 bg-zinc-900 border border-zinc-800 focus:border-indigo-500 rounded-lg text-sm outline-none transition-all placeholder:text-zinc-600"
                placeholder="Enter username"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium text-zinc-400 ml-1">Password</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full h-11 pl-10 pr-4 bg-zinc-900 border border-zinc-800 focus:border-indigo-500 rounded-lg text-sm outline-none transition-all placeholder:text-zinc-600"
                placeholder="Enter password"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !username || !password}
            className="w-full h-11 bg-white text-black hover:bg-zinc-200 disabled:opacity-50 disabled:hover:bg-white font-medium rounded-lg text-sm transition-all mt-6"
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/5 text-center">
          <p className="text-xs text-zinc-500">
            Demo credentials: <span className="font-mono text-zinc-400">admin / admin</span>
          </p>
        </div>
      </div>
    </main>
  );
}
