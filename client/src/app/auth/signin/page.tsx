'use client';

import { signIn } from 'next-auth/react';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function SignIn() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const result = await signIn('credentials', {
      username,
      password,
      redirect: false,
    });

    if (result?.ok) {
      router.push('/host/dashboard');
    } else {
      alert('Invalid credentials');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-900">
      <form onSubmit={handleSubmit} className="glass-panel p-8 rounded-xl space-y-4 w-full max-w-sm text-white">
        <h1 className="text-2xl font-bold text-center">Host Login</h1>
        <input 
          type="text" 
          placeholder="Username (admin)" 
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full bg-slate-800 p-2 rounded border border-slate-700"
        />
        <input 
          type="password" 
          placeholder="Password (admin)" 
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full bg-slate-800 p-2 rounded border border-slate-700"
        />
        <button type="submit" className="btn-primary w-full">Sign In</button>
      </form>
    </div>
  );
}
