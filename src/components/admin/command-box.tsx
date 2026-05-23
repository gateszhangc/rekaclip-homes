'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';

interface CommandBoxProps {
  command: string;
  label?: string;
}

export function CommandBox({ command, label }: CommandBoxProps) {
  const [copied, setCopied] = useState(false);

  const copyToClipboard = async () => {
    await navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm text-zinc-400">{label}</label>
      )}
      <div className={cn(
        "bg-zinc-950 border border-zinc-800 rounded-lg p-4",
        "flex justify-between items-center gap-4"
      )}>
        <code className="text-zinc-300 font-mono text-sm break-all">
          {command}
        </code>
        <Button
          variant="ghost"
          size="sm"
          onClick={copyToClipboard}
          className="shrink-0 text-zinc-400 hover:text-zinc-100"
        >
          {copied ? (
            <Check className="h-4 w-4 text-green-400" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>
    </div>
  );
}
