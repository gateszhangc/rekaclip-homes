'use client';

import React, { useState, useRef, useCallback, DragEvent, KeyboardEvent } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useTranslations } from 'next-intl';
import { Upload, Loader2 } from 'lucide-react';
import Image from 'next/image';
import BeforeAfterSlider from '@/components/before-after-slider';
import { uploadFileToR2 } from '@/lib/r2-upload';
import { AI_IMAGE_EXPANDER_CONFIG } from '@/lib/ai-image-expander-config';
import { AIImageExpanderProps, AIImageExpanderState, ErrorState, AspectRatio } from '@/types/ai-image-expander';

// 配置常量
const CONFIG = AI_IMAGE_EXPANDER_CONFIG;

export default function AIImageExpander({ 
  className = '', 
  onImageSelected, 
  onError 
}: AIImageExpanderProps) {
  const t = useTranslations();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 初始化状态
  const [state, setState] = useState<AIImageExpanderState>({
    selectedImage: null,
    selectedAspectRatio: null,
    isUploading: false,
    uploadedImageUrl: null,
    error: null,
  });

  // 清除错误状态
  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  // 文件验证
  const validateFile = useCallback((file: File): string | null => {
    // 检查文件格式
    if (!CONFIG.supportedFormats.includes(file.type)) {
      return `Unsupported file format. Please choose: ${CONFIG.supportedFormats.map(f => f.split('/')[1]).join(', ')}`;
    }

    // 检查文件大小
    if (file.size > CONFIG.maxFileSize) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(1);
      const maxSizeMB = (CONFIG.maxFileSize / 1024 / 1024).toFixed(1);
      return `File too large (${sizeMB}MB). Please choose a file under ${maxSizeMB}MB`;
    }

    return null;
  }, []);

  // 处理文件选择 - 在初始界面上传到R2存储
  const handleFileSelect = useCallback(async (file: File) => {
    // 清除之前的错误
    clearError();

    // 验证文件
    const validationError = validateFile(file);
    if (validationError) {
      setState(prev => ({
        ...prev,
        error: {
          type: 'upload',
          message: validationError,
          suggestion: 'Please select a valid image file',
        }
      }));
      return;
    }

    // 开始上传
    setState(prev => ({
      ...prev,
      selectedImage: file,
      isUploading: true,
      error: null
    }));

    try {
      // 在初始界面立即上传到R2存储
      const uploadResult = await uploadFileToR2(file);
      
      setState(prev => ({
        ...prev,
        uploadedImageUrl: uploadResult.url,
        isUploading: false
      }));

      // 上传成功后切换到编辑界面
      if (onImageSelected) {
        onImageSelected(file, uploadResult.url, state.selectedAspectRatio || undefined);
      }
    } catch (error) {
      console.error('Upload failed:', error);
      const errorMessage = error instanceof Error ? error.message : "Upload failed";
      const isAuthErr = errorMessage.toLowerCase().includes("authenticated");
      
      setState(prev => ({
        ...prev,
        selectedImage: null,
        uploadedImageUrl: null,
        isUploading: false,
        error: {
          type: isAuthErr ? 'auth' : 'network',
          message: isAuthErr ? 'Please sign in first' : 'Upload failed',
          suggestion: isAuthErr ? 'Sign in to upload images' : 'Check your connection and try again',
          retryAction: () => handleFileSelect(file),
        }
      }));
    }
  }, [validateFile, clearError, onImageSelected, state.selectedAspectRatio]);

  // 处理文件输入变化
  const handleFileChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  // 处理拖拽上传
  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  }, [handleFileSelect]);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const handleKeyboardUpload = useCallback((e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  }, []);

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
                重试
              </Button>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className={`w-full flex justify-center ${className}`}>
      <Card className="w-full max-w-6xl p-6 md:p-8 lg:p-10 shadow-xl border border-border/60 min-h-[680px]">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] items-center h-full">
          {/* 左侧示例区域 - BeforeAfterSlider */}
          <BeforeAfterSlider
            beforeSrc="https://pub-e1eb76428e24457ebfc067c635cb4fc4.r2.dev/before.png"
            afterSrc="https://pub-e1eb76428e24457ebfc067c635cb4fc4.r2.dev/after.png"
            beforeAlt="Before expansion preview"
            afterAlt="After expansion preview"
            priority
          />

          {/* 右侧上传区域 */}
          <div className="space-y-6 w-full min-w-0">
            <div
              className="rounded-2xl border-2 border-dashed border-muted-foreground/50 bg-muted/40 p-6 transition-colors hover:border-primary min-h-[180px] w-full flex items-center"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onClick={() => fileInputRef.current?.click()}
              onKeyDown={handleKeyboardUpload}
              role="button"
              tabIndex={0}
            >
              <div className="flex flex-col items-center justify-center gap-4 text-center w-full">
                <Button
                  variant="default"
                  size="lg"
                  className="px-6 bg-primary text-primary-foreground"
                  type="button"
                  disabled={state.isUploading}
                >
                  {state.isUploading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4 mr-2" />
                      Choose Image
                    </>
                  )}
                </Button>
                <p className="text-sm text-muted-foreground">
                  Drag an image here or click to select a file
                </p>
                <p className="text-xs text-muted-foreground">
                  Supports JPEG, PNG, GIF, WebP up to 10MB
                </p>
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              After upload, you’ll jump to the editor to run AI expansion.
            </p>

            {/* 错误显示 */}
            <ErrorDisplay error={state.error} />
          </div>
        </div>
      </Card>

      {/* 隐藏的文件输入 */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        className="hidden"
        onChange={handleFileChange}
      />
    </div>
  );
}
