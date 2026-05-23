'use client';

import { cn } from '@/lib/utils';

interface StatsCardProps {
  title: string;
  value: number;
  color: 'blue' | 'green' | 'red' | 'gray';
}

const colorMap = {
  blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  green: 'bg-green-500/10 text-green-400 border-green-500/20',
  red: 'bg-red-500/10 text-red-400 border-red-500/20',
  gray: 'bg-zinc-500/10 text-zinc-400 border-zinc-500/20',
};

export function StatsCard({ title, value, color }: StatsCardProps) {
  return (
    <div className={cn(
      "rounded-xl border p-6",
      "bg-zinc-900/50 border-zinc-800",
      "hover:bg-zinc-800/50 transition-colors"
    )}>
      <div className={cn(
        "text-3xl font-bold",
        color === 'blue' && "text-blue-400",
        color === 'green' && "text-green-400",
        color === 'red' && "text-red-400",
        color === 'gray' && "text-zinc-400"
      )}>
        {value}
      </div>
      <div className="text-sm text-zinc-500 mt-1">{title}</div>
    </div>
  );
}
