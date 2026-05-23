"use client";

import React, { useState, useRef, useEffect } from 'react';
import ReactCrop, { Crop, PixelCrop, centerCrop, makeAspectCrop } from 'react-image-crop';
import { Download, ChevronLeft } from 'lucide-react';
import { AspectOption } from './types';
import { getCroppedImg } from './utils/canvasUtils';
import 'react-image-crop/dist/ReactCrop.css';

interface EditorViewProps {
  imageSrc: string;
  onBack: () => void;
}

const ASPECT_OPTIONS: AspectOption[] = [
  { label: 'Landscape', value: 16 / 9 },
  { label: 'Portrait', value: 9 / 16 },
  { label: 'Square', value: 1 },
  { label: 'Freeform', value: undefined },
];

// Helper to center the crop when the image loads or aspect changes
function centerAspectCrop(
  mediaWidth: number,
  mediaHeight: number,
  aspect: number
) {
  return centerCrop(
    makeAspectCrop(
      {
        unit: '%',
        width: 90,
      },
      aspect,
      mediaWidth,
      mediaHeight
    ),
    mediaWidth,
    mediaHeight
  );
}

const EditorView: React.FC<EditorViewProps> = ({ imageSrc, onBack }) => {
  const imgRef = useRef<HTMLImageElement>(null);
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop>();
  const [aspect, setAspect] = useState<number | undefined>(1); // Default to Square
  const [isProcessing, setIsProcessing] = useState(false);
  const [localImageUrl, setLocalImageUrl] = useState<string | null>(null);
  const [isLoadingImage, setIsLoadingImage] = useState(true);

  // 下载图片到本地，避免跨域问题
  useEffect(() => {
    const downloadImageToLocal = async () => {
      try {
        setIsLoadingImage(true);
        
        // 下载图片
        const response = await fetch(imageSrc);
        if (!response.ok) {
          throw new Error('Failed to fetch image');
        }
        
        const blob = await response.blob();
        const localUrl = URL.createObjectURL(blob);
        setLocalImageUrl(localUrl);
      } catch (error) {
        console.error('Failed to download image:', error);
        // 如果下载失败，回退到原始URL
        setLocalImageUrl(imageSrc);
      } finally {
        setIsLoadingImage(false);
      }
    };

    downloadImageToLocal();

    // 清理函数
    return () => {
      if (localImageUrl && localImageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(localImageUrl);
      }
    };
  }, [imageSrc, localImageUrl]);

  // When image loads, set initial centered crop
  function onImageLoad(e: React.SyntheticEvent<HTMLImageElement>) {
    if (aspect) {
      const { width, height } = e.currentTarget;
      setCrop(centerAspectCrop(width, height, aspect));
    } else {
        // Default freeform crop
        const { width, height } = e.currentTarget;
        setCrop(centerCrop({
            unit: '%',
            width: 80,
            height: 80,
            x: 10,
            y: 10
        }, width, height));
    }
  }

  // Handle aspect ratio change
  const handleAspectChange = (value: number | undefined) => {
    setAspect(value);
    if (imgRef.current && value) {
        const { width, height } = imgRef.current;
        const newCrop = centerAspectCrop(width, height, value);
        setCrop(newCrop);
    }
  };

  const handleDownload = async () => {
    if (!completedCrop || !imgRef.current || !localImageUrl) {
        alert("Please crop the image first");
        return;
    }

    setIsProcessing(true);
    try {
      // 使用本地图片进行Canvas裁剪 - 无跨域问题
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Cannot get canvas context');
      }

      // 创建图片对象，使用本地Blob URL
      const image = new Image();
      
      await new Promise<void>((resolve, reject) => {
        image.onload = () => resolve();
        image.onerror = () => reject(new Error('Failed to load local image'));
        
        // 使用本地Blob URL，无需设置crossOrigin
        image.src = localImageUrl;
      });

      // 计算裁剪区域
      const scaleX = image.naturalWidth / imgRef.current.width;
      const scaleY = image.naturalHeight / imgRef.current.height;
      
      canvas.width = completedCrop.width * scaleX;
      canvas.height = completedCrop.height * scaleY;

      // 绘制裁剪后的图片
      ctx.drawImage(
        image,
        completedCrop.x * scaleX,
        completedCrop.y * scaleY,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY,
        0,
        0,
        completedCrop.width * scaleX,
        completedCrop.height * scaleY
      );

      // 使用toBlob进行下载 - 本地图片无跨域问题
      canvas.toBlob((blob) => {
        if (blob) {
          const fileUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = fileUrl;
          link.download = `cropped-image-${Date.now()}.jpg`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(fileUrl);
        } else {
          throw new Error('Failed to create blob');
        }
      }, 'image/jpeg', 0.95);

    } catch (e) {
      console.error('Canvas download failed:', e);
      alert('裁剪失败，请稍后重试。');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex flex-col h-[600px] lg:flex-row bg-white rounded-3xl overflow-hidden shadow-2xl max-w-5xl w-full mx-auto my-4 border border-gray-100">
      
      {/* Left Area: Canvas / Editor - Light gray background */}
      <div className="flex-1 bg-[#E5E5E5] relative min-h-[400px] lg:min-h-full flex items-center justify-center p-4 overflow-auto">
        
        {/* Back Button */}
        <div className="absolute top-4 left-4 z-20">
             <button 
                onClick={onBack}
                className="bg-black/10 hover:bg-black/20 text-gray-700 p-2 rounded-full transition-colors backdrop-blur-sm"
             >
                <ChevronLeft className="w-6 h-6" />
             </button>
        </div>

        {/* Image Container */}
        <div className="relative shadow-xl">
            {isLoadingImage && (
              <div className="absolute inset-0 flex items-center justify-center bg-gray-100 rounded-lg">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                  <p className="text-sm text-gray-600">正在加载图片...</p>
                </div>
              </div>
            )}
            
            {localImageUrl && (
              <ReactCrop
                  crop={crop}
                  onChange={(_, percentCrop) => setCrop(percentCrop)}
                  onComplete={(c) => setCompletedCrop(c)}
                  aspect={aspect}
                  ruleOfThirds
                  className="max-h-[500px]"
              >
                  <img
                      ref={imgRef}
                      alt="Crop me"
                      src={localImageUrl}
                      onLoad={onImageLoad}
                      className="max-w-full max-h-[70vh] object-contain block"
                      style={{ maxWidth: '100%', maxHeight: '500px' }} 
                  />
              </ReactCrop>
            )}
        </div>
      </div>

      {/* Right Sidebar: Controls */}
      <div className="w-full lg:w-[280px] bg-white flex flex-col p-4 lg:p-6 overflow-y-auto border-l border-gray-100">
        
        {/* Top spacer */}
        <div className="flex-1"></div>
        
        {/* Centered content */}
        <div className="flex flex-col items-center justify-center space-y-8">
            <div className="w-full">
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4 text-center">Aspect ratio</h2>
                <div className="grid grid-cols-4 gap-3">
                {ASPECT_OPTIONS.map((option) => (
                    <button
                    key={option.label}
                    onClick={() => handleAspectChange(option.value)}
                    className={`
                        flex flex-col items-center gap-2 p-2 rounded-lg transition-all
                        ${aspect === option.value ? 'bg-primary/10 ring-2 ring-primary text-primary' : 'hover:bg-gray-100 text-gray-600'}
                    `}
                    >
                    <div className={`
                        bg-current opacity-20 rounded-sm border-2 border-current
                        ${option.label === 'Landscape' ? 'w-10 h-6' : ''}
                        ${option.label === 'Portrait' ? 'w-6 h-10' : ''}
                        ${option.label === 'Square' ? 'w-8 h-8' : ''}
                        ${option.label === 'Freeform' ? 'w-8 h-8 border-dashed' : ''}
                    `} />
                    <span className="text-xs font-medium">{option.label}</span>
                    </button>
                ))}
                </div>
            </div>

            <div className="w-full">
                <button
                    onClick={handleDownload}
                    disabled={isProcessing}
                    className="w-full py-3.5 px-4 bg-primary hover:bg-primary/90 text-primary-foreground rounded-full font-semibold shadow-md transition-all flex items-center justify-center gap-2"
                >
                    {isProcessing ? 'Processing...' : 'Download'}
                    {!isProcessing && <Download className="w-4 h-4" />}
                </button>
            </div>
        </div>
        
        {/* Bottom spacer */}
        <div className="flex-1"></div>

      </div>
    </div>
  );
};

export default EditorView;