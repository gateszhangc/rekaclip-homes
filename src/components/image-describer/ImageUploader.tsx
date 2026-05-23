'use client';

import React, { useState, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UploadIcon } from './Icons';
import { ErrorState } from '../../types/image-describer';
import {
  uploadImageFile,
  validateImageFile,
  VALID_IMAGE_TYPES,
} from '@/lib/upload';

interface ImageUploaderProps {
  onImageSelected: (base64: string, url: string) => void;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({ onImageSelected }) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'url'>('upload');
  const [urlInput, setUrlInput] = useState('');
  const [error, setError] = useState<ErrorState | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const handleUpload = useCallback(
    async (file: File) => {
      const validationError = validateImageFile(file);
      if (validationError) {
        setError({
          type: 'validation',
          message: validationError,
          suggestion: 'Please select a valid image file'
        });
        return;
      }

      setIsUploading(true);
      try {
        const { url, base64 } = await uploadImageFile(file, { type: 'base' });
        onImageSelected(base64, url);
        setError(null);
      } catch (e) {
        const message =
          e instanceof Error ? e.message : 'Failed to upload image.';
        const isAuthError = message.toLowerCase().includes('authenticated');
        
        setError({
          type: isAuthError ? 'auth' : 'upload',
          message: isAuthError ? 'Please sign in first' : message,
          suggestion: isAuthError ? 'Sign in to upload images' : 'Check your connection and try again',
          retryAction: () => handleUpload(file)
        });
      } finally {
        setIsUploading(false);
      }
    },
    [onImageSelected]
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      void handleUpload(e.target.files[0]);
      e.target.value = '';
    }
  };

  const handleUrlSubmit = async () => {
    if (!urlInput) return;
    try {
      new URL(urlInput);
      const response = await fetch(urlInput);
      if (!response.ok) {
        throw new Error('Failed to load image from URL.');
      }
      const blob = await response.blob();
      const inferredName =
        urlInput.split('/').filter(Boolean).pop() || 'image-from-url';
      const file = new File([blob], inferredName, {
        type: blob.type || 'image/jpeg',
      });
      await handleUpload(file);
      setUrlInput('');
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : 'Failed to load image from URL. Ensure the URL is direct and allows CORS, or use Upload.';
      
      setError({
        type: 'network',
        message: 'Failed to load image from URL',
        suggestion: 'Ensure the URL is direct and allows CORS, or use Upload instead',
        retryAction: () => handleUrlSubmit()
      });
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      void handleUpload(e.dataTransfer.files[0]);
    }
  };

  // 错误显示组件
  const ErrorDisplay = ({ error }: { error: ErrorState | null }) => {
    if (!error) return null;

    return (
      <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4 mt-4">
        <div className="flex items-start gap-3">
          <div className="text-destructive">
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="flex-1">
            <h4 className="text-sm font-medium text-destructive">
              {error.message}
            </h4>
            {error.suggestion && (
              <p className="mt-1 text-sm text-destructive/80">
                {error.suggestion}
              </p>
            )}
            {error.retryAction && (
              <Button
                variant="outline"
                size="sm"
                className="mt-2 text-xs h-7"
                onClick={error.retryAction}
              >
                Retry
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <Card className="overflow-hidden">
      <div className="flex border-b border-border">
        <Button
          variant={activeTab === 'upload' ? 'default' : 'ghost'}
          className="flex-1 rounded-none"
          onClick={() => setActiveTab('upload')}
        >
          Upload Image
        </Button>
        <Button
          variant={activeTab === 'url' ? 'default' : 'ghost'}
          className="flex-1 rounded-none"
          onClick={() => setActiveTab('url')}
        >
          Input Image URL
        </Button>
      </div>

      <div className="p-6 h-64 flex flex-col justify-center">
        {activeTab === 'upload' ? (
          <div 
            className="border-2 border-dashed border-muted-foreground/50 bg-muted/40 rounded-xl h-full flex flex-col items-center justify-center p-4 transition-colors hover:border-primary cursor-pointer relative"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <input 
              type="file" 
              accept={VALID_IMAGE_TYPES.join(',')} 
              onChange={handleFileChange}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={isUploading}
            />
            <div className="bg-primary/10 p-3 rounded-full mb-3">
              <UploadIcon />
            </div>
            <p className="font-medium mb-1">
              {isUploading ? 'Uploading...' : 'Drop image here or click to upload'}
            </p>
            <p className="text-muted-foreground text-xs text-center">
              Supported formats: JPG, PNG, GIF, WEBP
            </p>
          </div>
        ) : (
          <div className="flex flex-col h-full justify-center">
            <input
              type="url"
              placeholder="https://example.com/image.jpg"
              className="w-full border border-input bg-background rounded-lg p-3 mb-4 focus:ring-2 focus:ring-ring outline-none transition-all"
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
            />
            <Button 
              onClick={handleUrlSubmit}
              className="self-end"
              disabled={isUploading}
            >
              Load Image
            </Button>
          </div>
        )}
        <ErrorDisplay error={error} />
      </div>
    </Card>
  );
};

export default ImageUploader;
