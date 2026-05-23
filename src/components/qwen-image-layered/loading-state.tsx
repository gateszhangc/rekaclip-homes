"use client";

import React from 'react';
import { Loader2, Sparkles } from 'lucide-react';

interface LoadingStateProps {
  message?: string;
  submessage?: string;
  variant?: 'default' | 'generation' | 'upload';
  className?: string;
}

const LoadingState: React.FC<LoadingStateProps> = ({
  message,
  submessage,
  variant = 'default',
  className = '',
}) => {
  const getContent = () => {
    switch (variant) {
      case 'generation':
        return {
          icon: <Sparkles className="text-primary animate-pulse" size={32} />,
          defaultMessage: 'Creating your masterpiece...',
          defaultSubmessage: 'Our OpenClaw model is working its magic. This usually takes a few seconds.',
        };
      case 'upload':
        return {
          icon: <Loader2 className="animate-spin text-primary" size={32} />,
          defaultMessage: 'Uploading image...',
          defaultSubmessage: 'Please wait while we upload your image to the cloud.',
        };
      default:
        return {
          icon: <Loader2 className="animate-spin text-primary" size={32} />,
          defaultMessage: 'Loading...',
          defaultSubmessage: 'Please wait a moment.',
        };
    }
  };

  const content = getContent();

  return (
    <div className={`flex flex-col items-center justify-center p-8 text-center ${className}`}>
      {variant === 'generation' ? (
        <div className="relative mb-8">
          {/* Outer pulsating ring */}
          <div className="absolute inset-0 rounded-full border-4 border-primary/20 opacity-20 animate-ping"></div>
          
          {/* Spinning loader */}
          <div className="relative w-24 h-24 rounded-full border-4 border-muted shadow-sm">
            <div className="absolute top-0 left-0 w-full h-full rounded-full border-4 border-primary border-t-transparent animate-spin"></div>
            
            {/* Center Icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              {content.icon}
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-6">
          {content.icon}
        </div>
      )}
      
      <h3 className="text-xl font-serif font-medium text-foreground animate-pulse mb-2">
        {message || content.defaultMessage}
      </h3>
      
      <p className="text-sm text-muted-foreground max-w-xs">
        {submessage || content.defaultSubmessage}
      </p>
    </div>
  );
};

export default LoadingState;
