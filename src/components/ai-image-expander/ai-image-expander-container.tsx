'use client';

import React, { useState } from 'react';
import AIImageExpander from './index';
import AIImageExpanderSecond from '@/components/ai-image-expander-second';
import { AspectRatio } from '@/types/ai-image-expander';

interface AIImageExpanderContainerProps {
  className?: string;
}

export default function AIImageExpanderContainer({ className }: AIImageExpanderContainerProps) {
  const [currentView, setCurrentView] = useState<'initial' | 'editor'>('initial');
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string>('');
  const [selectedAspectRatio, setSelectedAspectRatio] = useState<AspectRatio | null>(null);
  const sharedClassName = className || '';

  const handleImageSelected = (file: File, imageUrl: string, aspectRatio?: AspectRatio) => {
    setSelectedImage(file);
    setUploadedImageUrl(imageUrl);
    setSelectedAspectRatio(aspectRatio || null);
    setCurrentView('editor');
  };

  const handleBackToInitial = () => {
    setCurrentView('initial');
    setSelectedImage(null);
    setUploadedImageUrl('');
    setSelectedAspectRatio(null);
  };

  return (
    <div className={className}>
      {currentView === 'initial' && (
        <AIImageExpander className={sharedClassName} onImageSelected={handleImageSelected} />
      )}
      {currentView === 'editor' && (
        <AIImageExpanderSecond 
          className={sharedClassName}
          initialImage={selectedImage}
          initialImageUrl={uploadedImageUrl}
          initialAspectRatio={selectedAspectRatio}
          onUploadNew={handleBackToInitial}
        />
      )}
    </div>
  );
}
