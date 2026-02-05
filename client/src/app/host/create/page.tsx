'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useUser, UserButton } from '@clerk/nextjs';
import { Plus, Trash2, Save, ArrowLeft, Check, Clock, GripVertical } from 'lucide-react';

interface Option {
  id: string;
  text: string;
}

interface Question {
  id: string; // temp id for UI
  text: string;
  options: Option[];
  correctOptionId: string;
  timeLimit: number;
}

export default function CreateQuiz() {
  const { user } = useUser();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [questions, setQuestions] = useState<Question[]>([
    {
      id: '1',
      text: '',
      options: [
        { id: 'A', text: '' },
        { id: 'B', text: '' },
        { id: 'C', text: '' },
        { id: 'D', text: '' }
      ],
      correctOptionId: 'A',
      timeLimit: 20
    }
  ]);

  const addQuestion = () => {
    setQuestions([
      ...questions,
      {
        id: Date.now().toString(),
        text: '',
        options: [
          { id: 'A', text: '' },
          { id: 'B', text: '' },
          { id: 'C', text: '' },
          { id: 'D', text: '' }
        ],
        correctOptionId: 'A',
        timeLimit: 20
      }
    ]);
  };

  const removeQuestion = (index: number) => {
    if (questions.length === 1) return;
    const newQ = [...questions];
    newQ.splice(index, 1);
    setQuestions(newQ);
  };

  const updateQuestion = (index: number, field: keyof Question, value: any) => {
    const newQ = [...questions];
    newQ[index] = { ...newQ[index], [field]: value };
    setQuestions(newQ);
  };

  const updateOption = (qIndex: number, oIndex: number, text: string) => {
    const newQ = [...questions];
    newQ[qIndex].options[oIndex].text = text;
    setQuestions(newQ);
  };

  const handleSave = async () => {
    if (!title || questions.some(q => !q.text || q.options.some(o => !o.text))) {
      alert('Please fill in all fields');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('http://localhost:3001/api/quizzes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          userId: user?.id,
          questions: questions.map(q => ({
            text: q.text,
            options: q.options,
            correctOptionId: q.correctOptionId,
            timeLimit: q.timeLimit
          }))
        })
      });
      
      const data = await res.json();
      if (data.success) {
        router.push('/host/dashboard');
      } else {
        alert('Failed to save');
      }
    } catch (err) {
      console.error(err);
      alert('Error saving quiz');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900 pb-20">
      <nav className="bg-white border-b border-slate-200 px-6 h-16 flex items-center justify-between sticky top-0 z-50">
         <div className="flex items-center gap-4">
           <button onClick={() => router.back()} className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors">
              <ArrowLeft className="w-5 h-5" />
           </button>
           <span className="font-bold text-lg">Create Presentation</span>
         </div>
         <div className="flex items-center gap-4">
            <button
              onClick={handleSave}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg flex items-center gap-2 transition-all shadow-sm"
            >
              {loading ? 'Saving...' : <><Save className="w-4 h-4" /> Save</>}
            </button>
           <UserButton />
         </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-8 space-y-8">
        
        {/* Title Section */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Presentation Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Monthly Team Trivia"
            className="w-full text-2xl font-bold placeholder:text-slate-300 border-none outline-none focus:ring-0 p-0 text-slate-900"
          />
        </div>

        {/* Questions List */}
        <div className="space-y-6">
          {questions.map((q, qIndex) => (
            <div key={q.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden group">
              <div className="bg-slate-50 px-6 py-3 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="bg-slate-200 text-slate-600 text-xs font-bold w-6 h-6 rounded flex items-center justify-center">
                    {qIndex + 1}
                  </span>
                  <span className="text-sm font-semibold text-slate-500">Question Slide</span>
                </div>
                <button 
                  onClick={() => removeQuestion(qIndex)}
                  className="text-slate-400 hover:text-red-500 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              
              <div className="p-6 space-y-6">
                <input
                  type="text"
                  value={q.text}
                  onChange={(e) => updateQuestion(qIndex, 'text', e.target.value)}
                  placeholder="Type your question here..."
                  className="w-full text-lg font-medium placeholder:text-slate-300 border-b border-slate-100 pb-2 outline-none focus:border-blue-500 transition-all"
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {q.options.map((opt, oIndex) => (
                    <div key={opt.id} className="relative">
                      <div className={`absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded flex items-center justify-center text-xs font-bold border ${q.correctOptionId === opt.id ? 'bg-green-500 border-green-500 text-white' : 'bg-slate-100 border-slate-200 text-slate-500'}`}>
                        {opt.id}
                      </div>
                      <input
                        type="text"
                        value={opt.text}
                        onChange={(e) => updateOption(qIndex, oIndex, e.target.value)}
                        placeholder={`Option ${opt.id}`}
                        className={`w-full pl-12 pr-10 py-3 bg-slate-50 border rounded-lg outline-none transition-all ${q.correctOptionId === opt.id ? 'border-green-500 ring-1 ring-green-500/20 bg-green-50/10' : 'border-slate-200 focus:border-blue-400'}`}
                      />
                      <button
                        onClick={() => updateQuestion(qIndex, 'correctOptionId', opt.id)}
                        className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors ${q.correctOptionId === opt.id ? 'text-green-500' : 'text-slate-300 hover:text-slate-400'}`}
                      >
                        <Check className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-4 pt-4 border-t border-slate-50">
                  <div className="flex items-center gap-2 text-sm font-medium text-slate-500">
                    <Clock className="w-4 h-4" />
                    <span>Time Limit:</span>
                  </div>
                  <div className="flex gap-2">
                    {[10, 15, 20, 30, 45, 60].map(t => (
                      <button
                        key={t}
                        onClick={() => updateQuestion(qIndex, 'timeLimit', t)}
                        className={`px-3 py-1 text-xs font-bold rounded-full border transition-all ${q.timeLimit === t ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-slate-200 text-slate-500 hover:border-blue-300'}`}
                      >
                        {t}s
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={addQuestion}
          className="w-full py-4 border-2 border-dashed border-slate-300 rounded-xl flex items-center justify-center gap-2 text-slate-500 font-semibold hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/50 transition-all group"
        >
          <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
          <span>Add Another Slide</span>
        </button>

      </div>
    </div>
  );
}
