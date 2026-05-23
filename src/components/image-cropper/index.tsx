"use client";

import React, { useState } from 'react';
import UploadView from './UploadView';
import EditorView from './EditorView';

const ImageCropper = () => {
  const [currentStep, setCurrentStep] = useState<'upload' | 'editor'>('upload');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);

  const handleUploadSuccess = (url: string) => {
    setUploadedImage(url);
    setCurrentStep('editor');
  };

  const handleBack = () => {
    setUploadedImage(null);
    setCurrentStep('upload');
  };

  return (
    <div className="bg-gradient-to-br from-gray-50 to-gray-100 text-gray-900 font-sans selection:bg-primary/20">
      
      {/* Main Content */}
      <main className="py-8 px-4 flex flex-col items-center">
        {currentStep === 'upload' && (
          <UploadView onUploadSuccess={handleUploadSuccess} />
        )}
        
        {currentStep === 'editor' && uploadedImage && (
          <EditorView imageSrc={uploadedImage} onBack={handleBack} />
        )}
      </main>

    </div>
  );
};

export default ImageCropper;