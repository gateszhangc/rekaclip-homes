"use client";

import React, { useRef, useState, useCallback } from 'react';
import { Upload, CheckCircle, MousePointerClick } from 'lucide-react';
import { uploadFileToR2 } from '@/lib/r2-upload';

interface UploadViewProps {
  onUploadSuccess: (url: string) => void;
}

const UploadView: React.FC<UploadViewProps> = ({ onUploadSuccess }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    // Basic validation
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file (JPEG, PNG, WebP).');
      return;
    }
    if (file.size > 40 * 1024 * 1024) { // 40MB
      alert('File size exceeds 40MB limit.');
      return;
    }

    setIsUploading(true);
    try {
      // Upload to R2 using project's existing service
      const result = await uploadFileToR2(file);
      onUploadSuccess(result.url);
    } catch (error) {
      console.error(error);
      alert('Failed to upload image. Please try again.');
    } finally {
      setIsUploading(false);
    }
  }, [onUploadSuccess]);

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFile(e.dataTransfer.files[0]);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      handleFile(e.target.files[0]);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row items-center justify-center min-h-[500px] w-full max-w-4xl mx-auto gap-6 p-4">
      
      {/* Left: Illustration Area */}
      <div className="flex-1 w-full max-w-lg hidden lg:flex flex-col items-center justify-center p-8">
         <div className="relative group cursor-default">
            {/* Abstract representation of the Cropper UI */}
            <div className="w-64 h-64 bg-gray-200 rounded-2xl overflow-hidden relative shadow-2xl border-4 border-white transform -rotate-3 transition-transform duration-500 hover:rotate-0">
               <img 
                 src="https://picsum.photos/600/600" 
                 alt="Sample" 
                 className="w-full h-full object-cover opacity-80"
               />
               <div className="absolute inset-4 border-2 border-white/80 rounded-lg shadow-[0_0_0_9999px_rgba(0,0,0,0.4)] pointer-events-none">
                 {/* Grid lines */}
                 <div className="absolute top-1/3 left-0 right-0 h-px bg-white/50"></div>
                 <div className="absolute top-2/3 left-0 right-0 h-px bg-white/50"></div>
                 <div className="absolute left-1/3 top-0 bottom-0 w-px bg-white/50"></div>
                 <div className="absolute left-2/3 top-0 bottom-0 w-px bg-white/50"></div>
                 {/* Corners */}
                 <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-white rounded-tl-sm"></div>
                 <div className="absolute -top-1 -right-1 w-4 h-4 border-t-4 border-r-4 border-white rounded-tr-sm"></div>
                 <div className="absolute -bottom-1 -left-1 w-4 h-4 border-b-4 border-l-4 border-white rounded-bl-sm"></div>
                 <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-white rounded-br-sm"></div>
               </div>
            </div>
            
            {/* Floating badges */}
            <div className="absolute top-10 -left-12 bg-white p-3 rounded-xl shadow-lg animate-bounce duration-[3000ms]">
                <div className="font-bold text-xs text-gray-500 mb-1">Ratio</div>
                <div className="font-bold text-gray-800">16:9</div>
            </div>
            
             <div className="absolute bottom-10 -right-8 bg-white p-3 rounded-xl shadow-lg">
                <MousePointerClick className="w-6 h-6 text-primary" />
            </div>
         </div>
      </div>

      {/* Right: Upload Area */}
      <div className="flex-1 w-full max-w-xl">
        <div 
          className={`
            bg-white rounded-[2rem] shadow-xl p-8 text-center border-4 border-dashed transition-all duration-300
            ${isDragging ? 'border-primary bg-primary/10 scale-[1.02]' : 'border-gray-300 hover:border-gray-400'}
          `}
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
        >
          <div className="flex flex-col items-center justify-center min-h-[280px]">
            <h1 className="text-3xl font-extrabold text-gray-900 mb-2">
              Drag and drop an image
            </h1>
            <p className="text-2xl font-extrabold text-gray-900 mb-8">
              or <span className="text-primary">browse to upload.</span>
            </p>

            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
              className={`
                bg-primary hover:bg-primary/90 text-primary-foreground text-lg font-semibold 
                py-4 px-10 rounded-full shadow-lg hover:shadow-xl transition-all
                transform hover:-translate-y-0.5 active:translate-y-0
                flex items-center gap-2
                ${isUploading ? 'opacity-70 cursor-wait' : ''}
              `}
            >
              {isUploading ? (
                <span>Uploading...</span>
              ) : (
                <>
                  <Upload className="w-5 h-5" />
                  Upload your photo
                </>
              )}
            </button>
            
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/png, image/jpeg, image/jpg, image/webp" 
              onChange={onFileChange}
            />

            <p className="mt-6 text-sm text-gray-500">
              File must be JPEG, JPG, PNG or WebP and up to 40MB
            </p>

            <div className="flex items-center gap-6 mt-8">
              <div className="flex items-center gap-2 text-gray-700 font-medium">
                <CheckCircle className="w-5 h-5 text-pink-500" />
                Free to use
              </div>
              <div className="flex items-center gap-2 text-gray-700 font-medium">
                <CheckCircle className="w-5 h-5 text-pink-500" />
                No credit card required
              </div>
            </div>
          </div>
        </div>
        
        <p className="text-center text-xs text-gray-500 mt-6">
            By uploading your image or video, you agree to the Terms of Use and Privacy Policy.
        </p>
      </div>
    </div>
  );
};

export default UploadView;