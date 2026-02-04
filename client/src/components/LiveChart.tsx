'use client';

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface LiveChartProps {
  stats: Record<string, number>;
  options: { id: string; text: string }[];
}

const COLORS = ['#ef4444', '#3b82f6', '#fbbf24', '#10b981'];

export default function LiveChart({ stats, options }: LiveChartProps) {
  const data = options.map((opt, index) => ({
    name: opt.text,
    votes: stats[opt.id] || 0,
    shortName: ['▲', '◆', '●', '■'][index]
  }));

  const maxVotes = Math.max(...data.map(d => d.votes), 1);

  return (
    <div className="w-full h-full min-h-[300px]">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <XAxis type="number" hide domain={[0, maxVotes]} />
          <YAxis 
            dataKey="name" 
            type="category" 
            width={100} 
            tick={{ fill: '#9ca3af', fontSize: 13 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip 
            cursor={{ fill: 'rgba(255,255,255,0.05)' }}
            contentStyle={{ 
              backgroundColor: '#18181b', 
              border: '1px solid rgba(255,255,255,0.1)', 
              borderRadius: '8px', 
              color: '#fff',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
          />
          <Bar dataKey="votes" radius={[0, 4, 4, 0]} barSize={40}>
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
