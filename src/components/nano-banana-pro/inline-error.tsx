"use client";

import React from 'react';
import { AlertCircle, RefreshCw, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface InlineErrorProps {
  error: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  variant?: 'error' | 'warning' | 'info';
  className?: string;
}

const InlineError: React.FC<InlineErrorProps> = ({
  error,
  onRetry,
  onDismiss,
  variant = 'error',
  className = '',
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'warning':
        return 'bg-yellow-50 border-yellow-200 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-800 dark:text-yellow-200';
      case 'info':
        return 'bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200';
      default:
        return 'bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200';
    }
  };

  const getIconColor = () => {
    switch (variant) {
      case 'warning':
        return 'text-yellow-500';
      case 'info':
        return 'text-blue-500';
      default:
        return 'text-red-500';
    }
  };

  return (
    <div className={`flex items-start gap-3 p-4 border rounded-lg ${getVariantStyles()} ${className}`}>
      <AlertCircle className={`flex-shrink-0 mt-0.5 ${getIconColor()}`} size={16} />
      
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium">{error}</p>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        {onRetry && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onRetry}
            className="h-6 px-2 text-xs hover:bg-black/5 dark:hover:bg-white/5"
          >
            <RefreshCw size={12} className="mr-1" />
            Retry
          </Button>
        )}
        
        {onDismiss && (
          <Button
            size="sm"
            variant="ghost"
            onClick={onDismiss}
            className="h-6 w-6 p-0 hover:bg-black/5 dark:hover:bg-white/5"
          >
            <X size={12} />
          </Button>
        )}
      </div>
    </div>
  );
};

export default InlineError;