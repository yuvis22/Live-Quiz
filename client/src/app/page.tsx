'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getSocket } from '@/lib/socket';
import { useQuizStore } from '@/store/useQuizStore';
import { ArrowRight, BarChart3, Users, Presentation, MessageCircle, PieChart, Zap, CheckCircle2 } from 'lucide-react';
import { SignInButton, SignedIn, SignedOut, UserButton } from '@clerk/nextjs';
import HostNavbar from '@/components/HostNavbar';

export default function Home() {
  const router = useRouter();
  const [code, setCode] = useState('');
  const [name, setName] = useState('');
  const { setRoomInfo } = useQuizStore();

  const handleJoin = () => {
    if (!code || !name) return;
    // Just set state and redirect. The Room page will handle the socket connection.
    setRoomInfo(code, name, false);
    router.push(`/quiz/${code}`);
  };

  return (
    <main className="min-h-screen bg-white text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Navbar */}
      <SignedIn>
        <HostNavbar />
      </SignedIn>
      <SignedOut>
        <nav className="sticky top-0 w-full bg-white/80 backdrop-blur-md border-b border-slate-200 z-50">
          <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center shadow-sm">
                <BarChart3 className="w-6 h-6 text-white" />
              </div>
              <span className="font-extrabold text-2xl tracking-tight text-slate-900">Qorum</span>
            </div>
            
            <div className="hidden md:flex items-center gap-8 text-sm font-medium text-slate-600">
              <a href="#features" className="hover:text-blue-600 transition-colors">Features</a>
              <a href="#solutions" className="hover:text-blue-600 transition-colors">Solutions</a>
              <a href="#pricing" className="hover:text-blue-600 transition-colors">Pricing</a>
            </div>

            <div className="flex items-center gap-4">
              <SignInButton mode="modal">
                <button className="px-5 py-2.5 font-medium text-slate-600 hover:text-blue-600 transition-colors">
                  Log in
                </button>
              </SignInButton>
              <SignInButton mode="modal">
                <button className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-full shadow-sm shadow-blue-200 transition-all hover:shadow-md">
                  Sign up
                </button>
              </SignInButton>
            </div>
          </div>
        </nav>
      </SignedOut>

      {/* Hero Section */}
      <div className="relative overflow-hidden bg-slate-50 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-6 pt-20 pb-32 flex flex-col md:flex-row items-center gap-16">
          
          {/* Hero Content */}
          <div className="w-full md:w-1/2 space-y-8 animate-fade-in-up z-10">
            <div className="space-y-6">
              <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
                Listen to your <br/>
                <span className="text-blue-600">audience</span>
              </h1>
              <p className="text-slate-600 text-xl max-w-lg leading-relaxed">
                Create interactive presentations, workshops, and meetings. Engage your audience with real-time polls, quizzes, and Q&A.
              </p>
            </div>

            {/* Join Box */}
            <div className="bg-white p-2 rounded-2xl shadow-xl shadow-slate-200/60 border border-slate-200 max-w-md flex flex-col gap-2">
              <div className="bg-slate-50 p-6 rounded-xl border border-slate-100 space-y-4">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Join a presentation</span>
                <div className="grid grid-cols-3 gap-3">
                  <input
                    type="text"
                    placeholder="123456"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    className="col-span-2 h-14 px-4 bg-white border border-slate-200 hover:border-blue-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-xl font-mono tracking-widest outline-none transition-all placeholder:text-slate-300 text-slate-800"
                    maxLength={6}
                  />
                  <input
                    type="text"
                    placeholder="Name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="col-span-1 h-14 px-4 bg-white border border-slate-200 hover:border-blue-400 focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10 rounded-xl text-lg text-center outline-none transition-all placeholder:text-slate-300 text-slate-800"
                  />
                </div>
                <button
                  onClick={handleJoin}
                  disabled={!code || !name}
                  className="w-full h-14 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-lg transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20"
                >
                  Join Session
                </button>
              </div>
              
              <div className="text-center py-2">
                <span className="text-slate-500 text-sm">Want to host your own? </span>
                <SignedOut>
                  <SignInButton mode="modal">
                    <button className="text-blue-600 font-bold hover:underline">Create Presentation</button>
                  </SignInButton>
                </SignedOut>
                <SignedIn>
                   <button onClick={() => router.push('/host/create')} className="text-blue-600 font-bold hover:underline">
                     Create Presentation
                   </button>
                </SignedIn>
              </div>
            </div>
          </div>

          {/* Hero Visual */}
          <div className="w-full md:w-1/2 relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-blue-100 to-purple-100 rounded-full blur-3xl opacity-60 transform translate-x-1/4 translate-y-1/4" />
            <div className="relative bg-white border border-slate-200 rounded-3xl shadow-2xl p-8 rotate-3 hover:rotate-1 transition-transform duration-500">
              <div className="flex items-center justify-between mb-8 border-b border-slate-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-3 h-3 rounded-full bg-red-400" />
                  <div className="w-3 h-3 rounded-full bg-yellow-400" />
                  <div className="w-3 h-3 rounded-full bg-green-400" />
                </div>
                <div className="text-xs font-bold text-slate-400 uppercase">Live Results</div>
              </div>
              
              <div className="space-y-6">
                <h3 className="text-2xl font-bold text-slate-900 leading-tight">What format should our next team building event take?</h3>
                
                <div className="space-y-3">
                  {[
                    { label: "Outdoor Activity", val: 45, color: "bg-blue-500" },
                    { label: "Virtual Workshop", val: 25, color: "bg-blue-400" },
                    { label: "Dinner Party", val: 30, color: "bg-blue-300" }
                  ].map((item, i) => (
                    <div key={i} className="group relative">
                      <div className="flex justify-between text-sm font-medium mb-1 text-slate-700">
                        <span>{item.label}</span>
                        <span>{item.val}%</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden">
                        <div className={`h-full ${item.color} rounded-full transition-all duration-1000`} style={{ width: `${item.val}%` }} />
                      </div>
                    </div>
                  ))}
                </div>

                <div className="flex -space-x-2 pt-4">
                  {[1,2,3,4].map(i => (
                    <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-slate-200 ring-1 ring-slate-100" />
                  ))}
                  <div className="w-8 h-8 rounded-full border-2 border-white bg-slate-100 ring-1 ring-slate-100 flex items-center justify-center text-xs text-slate-500 font-bold">+42</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trusted By - Simplified */}
      <div className="border-b border-slate-200 bg-white py-12">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <p className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-8">Trusted by leading companies</p>
          <div className="flex flex-wrap justify-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
            <span className="text-xl font-bold text-slate-800">ACME Corp</span>
            <span className="text-xl font-bold text-slate-800">GlobalTech</span>
            <span className="text-xl font-bold text-slate-800">Nebula</span>
            <span className="text-xl font-bold text-slate-800">Circle</span>
            <span className="text-xl font-bold text-slate-800">FoxRun</span>
          </div>
        </div>
      </div>

      {/* Features Grid */}
      <div id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-6 text-center mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-6">Designed for every interaction</h2>
          <p className="text-xl text-slate-600 max-w-2xl mx-auto">
            From small meetings to large conferences, Qorum gives you the tools to engage your audience.
          </p>
        </div>

        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-8">
          {[
            { 
              icon: <PieChart className="w-8 h-8 text-blue-600" />, 
              title: "Live Polling", 
              desc: "Get real-time insights with live polls. Visualize data in dynamic charts instantly." 
            },
            { 
              icon: <Zap className="w-8 h-8 text-amber-500" />, 
              title: "Quizzes", 
              desc: "Gamify your presentations with competitive quizzes. Leaderboards included." 
            },
            { 
              icon: <MessageCircle className="w-8 h-8 text-green-500" />, 
              title: "Q&A", 
              desc: "Let your audience ask questions anonymously. Upvote the best ones." 
            },
            { 
              icon: <Presentation className="w-8 h-8 text-purple-500" />, 
              title: "Slide Decks", 
              desc: "Build full presentations with interactive slides embedded directly." 
            },
            { 
              icon: <Users className="w-8 h-8 text-pink-500" />, 
              title: "Word Clouds", 
              desc: "Create beautiful word clouds from audience responses in seconds." 
            },
            { 
              icon: <CheckCircle2 className="w-8 h-8 text-indigo-500" />, 
              title: "Surveys", 
              desc: "Collect feedback after your meetings or events to improve over time." 
            }
          ].map((feature, i) => (
            <div key={i} className="group p-8 rounded-2xl border border-slate-200 hover:border-blue-200 hover:shadow-xl hover:shadow-blue-500/5 transition-all bg-white hover:-translate-y-1">
              <div className="mb-6 bg-slate-50 w-16 h-16 rounded-xl flex items-center justify-center group-hover:bg-white border border-slate-100 group-hover:border-blue-100 transition-colors">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
              <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-slate-900 py-24 text-white">
        <div className="max-w-4xl mx-auto px-6 text-center space-y-8">
          <h2 className="text-3xl md:text-5xl font-bold tracking-tight">Ready to transform your presentations?</h2>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto">
            Join thousands of presenters who use Qorum to engage their audience.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
             <SignInButton mode="modal">
                <button className="w-full sm:w-auto px-8 py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-full transition-all flex items-center justify-center gap-2">
                   Get Started Free <ArrowRight className="w-5 h-5" />
                </button>
             </SignInButton>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-slate-50 border-t border-slate-200 pt-16 pb-8">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-white" />
              </div>
              <span className="font-extrabold text-xl text-slate-900">Qorum</span>
            </div>
            <p className="text-slate-500 text-sm leading-relaxed mb-6">
              Making presentations interactive, engaging, and fun for everyone.
            </p>
          </div>
          
          <div>
            <h4 className="font-bold text-slate-900 mb-6">Product</h4>
            <ul className="space-y-4 text-sm text-slate-600">
              <li><a href="#" className="hover:text-blue-600">Features</a></li>
              <li><a href="#" className="hover:text-blue-600">Pricing</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-bold text-slate-900 mb-6">Resources</h4>
            <ul className="space-y-4 text-sm text-slate-600">
              <li><a href="#" className="hover:text-blue-600">Blog</a></li>
              <li><a href="#" className="hover:text-blue-600">Help Center</a></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 mb-6">Company</h4>
            <ul className="space-y-4 text-sm text-slate-600">
              <li><a href="#" className="hover:text-blue-600">About Us</a></li>
              <li><a href="#" className="hover:text-blue-600">Contact</a></li>
            </ul>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto px-6 pt-8 border-t border-slate-200 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-slate-500">© 2026 Qorum Inc. All rights reserved.</p>
        </div>
      </footer>
    </main>
  );
}
