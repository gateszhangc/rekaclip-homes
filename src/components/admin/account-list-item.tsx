'use client';

import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from './status-badge';
import { UnbindButton } from './unbind-button';
import { cn } from '@/lib/utils';

interface AccountListItemProps {
  id: string;
  accountId: string;
  email?: string;
  isBound: boolean;
  boundUserId?: string;
  isActive: boolean;
  lastUsedAt?: string;
  createdAt: string;
  onDelete?: (id: string) => void;
  onUnbind?: () => void;
}

export function AccountListItem({
  id,
  accountId,
  email,
  isBound,
  boundUserId,
  isActive,
  lastUsedAt,
  createdAt,
  onDelete,
  onUnbind
}: AccountListItemProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className={cn(
      "flex items-center justify-between p-4 rounded-xl",
      "bg-zinc-900/50 border border-zinc-800",
      "hover:bg-zinc-800/50 transition-colors"
    )}>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-zinc-200 truncate">{accountId}</h3>
          {email && (
            <span className="text-sm text-zinc-500 hidden sm:inline">({email})</span>
          )}
        </div>
        
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-sm">
          <StatusBadge isBound={isBound} isActive={isActive} />
          
          {isBound && boundUserId && (
            <>
              <span className="text-zinc-500">|</span>
              <span className="text-zinc-400">
                用户: {boundUserId.slice(0, 8)}...
              </span>
            </>
          )}
          
          <span className="text-zinc-500">|</span>
          <span className="text-zinc-500">
            导入: {formatDate(createdAt)}
          </span>
          
          {lastUsedAt && (
            <>
              <span className="text-zinc-500">|</span>
              <span className="text-zinc-500">
                最后使用: {formatDate(lastUsedAt)}
              </span>
            </>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 ml-4 shrink-0">
        {isBound && (
          <UnbindButton
            accountId={id}
            accountName={accountId}
            boundUserId={boundUserId}
            onSuccess={onUnbind}
          />
        )}
        
        {!isBound && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete?.(id)}
            className="text-zinc-400 hover:text-red-400 hover:bg-red-500/10"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
