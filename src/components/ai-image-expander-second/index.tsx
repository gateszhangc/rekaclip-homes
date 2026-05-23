'use client';

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Upload, Sparkles, Download, Loader2 } from 'lucide-react';
import { uploadFileToR2 } from '@/lib/r2-upload';
import { AI_IMAGE_EXPANDER_CONFIG, ASPECT_RATIOS } from '@/lib/ai-image-expander-config';
import { AIImageExpanderSecondProps, AIImageExpanderSecondState, AspectRatio } from '@/types/ai-image-expander';

type HandlePosition = 'tl' | 'tc' | 'tr' | 'mr' | 'br' | 'bc' | 'bl' | 'ml';

type RatioConfig = {
  id: string;
  label: string;
  width: number;
  height: number;
};

// 配置常量
const CONFIG = AI_IMAGE_EXPANDER_CONFIG;

// 宽高比选项定义
const ASPECT_RATIOS_WITH_ICONS: AspectRatio[] = ASPECT_RATIOS.map((ratio) => ({
  ...ratio,
  icon: null,
}));

const RATIO_CONFIGS: RatioConfig[] = ASPECT_RATIOS_WITH_ICONS.map((ratio) => ({
  id: ratio.id,
  label: ratio.label,
  width: ratio.ratio[0],
  height: ratio.ratio[1],
}));

const checkerboardStyle: React.CSSProperties = {
  backgroundColor: '#ffffff',
  backgroundImage:
    'linear-gradient(45deg, #e6e6e6 25%, transparent 25%),' +
    'linear-gradient(-45deg, #e6e6e6 25%, transparent 25%),' +
    'linear-gradient(45deg, transparent 75%, #e6e6e6 75%),' +
    'linear-gradient(-45deg, transparent 75%, #e6e6e6 75%)',
  backgroundSize: '20px 20px',
  backgroundPosition: '0 0, 0 10px, 10px -10px, -10px 0px',
};

const ResizeHandle = ({ position }: { position: HandlePosition }) => {
  const offset = '-4px';

  let style: React.CSSProperties = {};
  switch (position) {
    case 'tl':
      style = { top: offset, left: offset };
      break;
    case 'tc':
      style = { top: offset, left: '50%', transform: 'translateX(-50%)' };
      break;
    case 'tr':
      style = { top: offset, right: offset };
      break;
    case 'mr':
      style = { top: '50%', right: offset, transform: 'translateY(-50%)' };
      break;
    case 'br':
      style = { bottom: offset, right: offset };
      break;
    case 'bc':
      style = { bottom: offset, left: '50%', transform: 'translateX(-50%)' };
      break;
    case 'bl':
      style = { bottom: offset, left: offset };
      break;
    case 'ml':
      style = { top: '50%', left: offset, transform: 'translateY(-50%)' };
      break;
  }

  const isCorner = ['tl', 'tr', 'br', 'bl'].includes(position);

  if (isCorner) {
    const isTop = position.startsWith('t');
    const isLeft = position.endsWith('l');
    return (
      <div style={style} className="absolute w-6 h-6 z-20 pointer-events-none">
        <div
          className={`absolute h-1.5 w-6 bg-primary rounded-full ${isTop ? 'top-0' : 'bottom-0'} ${isLeft ? 'left-0' : 'right-0'}`}
        />
        <div
          className={`absolute w-1.5 h-6 bg-primary rounded-full ${isTop ? 'top-0' : 'bottom-0'} ${isLeft ? 'left-0' : 'right-0'}`}
        />
      </div>
    );
  }

  const isVerticalMid = ['ml', 'mr'].includes(position);
  return (
    <div
      style={style}
      className={`absolute bg-primary rounded-full z-20 pointer-events-none ${isVerticalMid ? 'w-1.5 h-8' : 'h-1.5 w-8'}`}
    />
  );
};

export default function AIImageExpanderSecond({
  className = '',
  onImageGenerated,
  onError,
  initialImage = null,
  initialImageUrl,
  initialAspectRatio = null,
  onUploadNew,
}: AIImageExpanderSecondProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const defaultRatio = ASPECT_RATIOS_WITH_ICONS[0];

  // 初始化状态
  const [state, setState] = useState<AIImageExpanderSecondState>({
    originalImage: initialImage || null,
    uploadedImageUrl: initialImageUrl || null,
    expandedImageUrl: null,
    originalDimensions: null,
    isUploading: false,
    isGenerating: false,
    selectedAspectRatio: initialAspectRatio || defaultRatio,
    targetDimensions: null,
    showComparison: false,
    userCredits: 0,
    generationCost: CONFIG.generationCost,
    error: null,
  });

  const activeRatio = state.selectedAspectRatio || defaultRatio;

  const ratioConfig = useMemo(
    () => RATIO_CONFIGS.find((r) => r.id === activeRatio.id) || RATIO_CONFIGS[0],
    [activeRatio.id],
  );

  // 计算Target size
  const calculateTargetDimensions = useCallback(
    (
      originalWidth: number,
      originalHeight: number,
      targetRatio: [number, number],
      maxDimension: number = CONFIG.maxImageDimension,
    ): { width: number; height: number } => {
      const [ratioW, ratioH] = targetRatio;
      const originalRatio = originalWidth / originalHeight;
      const targetRatioValue = ratioW / ratioH;

      let targetWidth: number;
      let targetHeight: number;

      if (originalRatio > targetRatioValue) {
        targetWidth = originalWidth;
        targetHeight = Math.round(originalWidth / targetRatioValue);
      } else {
        targetHeight = originalHeight;
        targetWidth = Math.round(originalHeight * targetRatioValue);
      }

      if (targetWidth > maxDimension || targetHeight > maxDimension) {
        const scale = Math.min(maxDimension / targetWidth, maxDimension / targetHeight);
        targetWidth = Math.round(targetWidth * scale);
        targetHeight = Math.round(targetHeight * scale);
      }

      targetWidth = targetWidth % 2 === 0 ? targetWidth : targetWidth + 1;
      targetHeight = targetHeight % 2 === 0 ? targetHeight : targetHeight + 1;

      return { width: targetWidth, height: targetHeight };
    },
    [],
  );

  // 处理初始图像 - 接收已上传的R2存储URL
  const handleInitialImage = useCallback(
    async (file: File, _imageUrl: string) => {
      const previewUrl = URL.createObjectURL(file);

      const img = new Image();
      img.onload = () => {
        const originalDimensions = { width: img.width, height: img.height };

        setState((prev) => {
          const ratioToUse = prev.selectedAspectRatio || defaultRatio;
          return {
            ...prev,
            originalDimensions,
            targetDimensions: ratioToUse
              ? calculateTargetDimensions(img.width, img.height, ratioToUse.ratio)
              : null,
          };
        });

        URL.revokeObjectURL(previewUrl);
      };

      img.src = previewUrl;
    },
    [calculateTargetDimensions, defaultRatio],
  );

  // 获取用户积分
  const fetchUserCredits = useCallback(async () => {
    try {
      const response = await fetch('/api/get-user-credits', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to fetch credits');
      }

      const data = await response.json();
      if (data.code === 0) {
        setState((prev) => ({ ...prev, userCredits: data.data || 0 }));
      }
    } catch (error) {
      console.error('Failed to fetch user credits:', error);
      // 不显示错误，静默失败
    }
  }, []);

  // 组件挂载时获取积分和处理初始图像
  useEffect(() => {
    fetchUserCredits();

    if (initialImage && initialImageUrl) {
      handleInitialImage(initialImage, initialImageUrl);
    }
  }, [fetchUserCredits, handleInitialImage, initialImage, initialImageUrl]);

  // 清除错误状态
  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  // 处理宽高比选择
  const handleAspectRatioSelect = useCallback(
    (aspectRatio: AspectRatio) => {
      setState((prev) => ({
        ...prev,
        selectedAspectRatio: aspectRatio,
        targetDimensions: prev.originalDimensions
          ? calculateTargetDimensions(
              prev.originalDimensions.width,
              prev.originalDimensions.height,
              aspectRatio.ratio,
            )
          : null,
        showComparison: false,
        error: null,
      }));
    },
    [calculateTargetDimensions],
  );

  // 文件验证
  const validateFile = useCallback((file: File): string | null => {
    if (!CONFIG.supportedFormats.includes(file.type)) {
      return `Unsupported file format. Please choose: ${CONFIG.supportedFormats.map((f) => f.split('/')[1]).join(', ')}`;
    }

    if (file.size > CONFIG.maxFileSize) {
      const sizeMB = (file.size / 1024 / 1024).toFixed(1);
      const maxSizeMB = (CONFIG.maxFileSize / 1024 / 1024).toFixed(1);
      return `File too large (${sizeMB}MB). Please choose a file under ${maxSizeMB}MB`;
    }

    return null;
  }, []);

  // 处理文件选择
  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (!file) return;

      clearError();

      const validationError = validateFile(file);
      if (validationError) {
        setState((prev) => ({
          ...prev,
          error: {
            type: 'upload',
            message: validationError,
            suggestion: 'Please select a valid image file',
          },
        }));
        return;
      }

      setState((prev) => ({
        ...prev,
        originalImage: file,
        isUploading: true,
        expandedImageUrl: null,
        showComparison: false,
        error: null,
      }));

      const previewUrl = URL.createObjectURL(file);

      const img = new Image();
      img.onload = async () => {
        const originalDimensions = { width: img.width, height: img.height };

        setState((prev) => ({
          ...prev,
          originalDimensions,
          targetDimensions: prev.selectedAspectRatio
            ? calculateTargetDimensions(img.width, img.height, prev.selectedAspectRatio.ratio)
            : null,
        }));

        try {
          const uploadResult = await uploadFileToR2(file);
          setState((prev) => ({
            ...prev,
            uploadedImageUrl: uploadResult.url,
            isUploading: false,
          }));
        } catch (error) {
          console.error('Upload failed:', error);
          const errorMessage = error instanceof Error ? error.message : 'Upload failed';
          const isAuthErr = errorMessage.toLowerCase().includes('authenticated');

          setState((prev) => ({
            ...prev,
            originalImage: null,
            uploadedImageUrl: null,
            isUploading: false,
            error: {
              type: isAuthErr ? 'auth' : 'network',
              message: isAuthErr ? 'Please sign in first' : 'Upload failed',
              suggestion: isAuthErr ? 'Sign in to upload images' : 'Check your network connection and retry',
              retryAction: () => handleFileSelect({ target: { files: [file] } } as any),
            },
          }));
        }

        URL.revokeObjectURL(previewUrl);
      };

      img.onerror = () => {
        setState((prev) => ({
          ...prev,
          originalImage: null,
          isUploading: false,
          error: {
            type: 'upload',
            message: 'File read failed',
            suggestion: 'Please select a valid image file',
            retryAction: () => fileInputRef.current?.click(),
          },
        }));
        URL.revokeObjectURL(previewUrl);
      };

      img.src = previewUrl;
      event.target.value = '';
    },
    [validateFile, clearError, calculateTargetDimensions],
  );

  // 获取显示的图像
  const getDisplayImage = useCallback(() => {
    if (state.expandedImageUrl) {
      return state.expandedImageUrl;
    }
    if (state.uploadedImageUrl) {
      return state.uploadedImageUrl;
    }
    return '';
  }, [state.expandedImageUrl, state.uploadedImageUrl]);

  // 积分验证
  const validateCredits = useCallback(() => {
    if (state.userCredits < CONFIG.generationCost) {
      setState((prev) => ({
        ...prev,
        error: {
          type: 'auth',
          message: 'Insufficient credits',
          suggestion: `You need ${CONFIG.generationCost} credits but only have ${state.userCredits}.`,
        },
      }));
      return false;
    }
    return true;
  }, [state.userCredits]);

  // 处理图像生成
  const handleGenerate = useCallback(async () => {
    const ratioToUse = state.selectedAspectRatio || defaultRatio;
    if (!state.uploadedImageUrl || !ratioToUse) {
      return;
    }

    if (!validateCredits()) {
      return;
    }

    clearError();

    setState((prev) => ({
      ...prev,
      isGenerating: true,
      error: null,
    }));

    try {
      const description = `图片的内容保持不变，只调整aspect_ratio`;

      const response = await fetch('/api/gen-outfit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          base_image_url: state.uploadedImageUrl,
          description,
          aspect_ratio:ratioToUse.label
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.code !== 0) {
        throw new Error(data.message || 'Generation failed');
      }

      const generatedImageUrl = data.data?.outfits?.[0]?.img_url;
      if (!generatedImageUrl) {
        throw new Error('No generated image URL received');
      }

      setState((prev) => ({
        ...prev,
        expandedImageUrl: generatedImageUrl,
        isGenerating: false,
        showComparison: false,
      }));

      await fetchUserCredits();

      if (onImageGenerated) {
        onImageGenerated(generatedImageUrl);
      }
    } catch (error) {
      console.error('Generation failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Generation failed';
      const isAuthErr =
        errorMessage.toLowerCase().includes('authenticated') ||
        errorMessage.toLowerCase().includes('credits');

      setState((prev) => ({
        ...prev,
        isGenerating: false,
        error: {
          type: isAuthErr ? 'auth' : 'processing',
          message: isAuthErr ? 'Please sign in first or insufficient credits' : 'Image processing failed',
          suggestion: isAuthErr ? 'Sign in and ensure you have enough credits' : 'Please retry later or contact support',
          retryAction: () => handleGenerate(),
        },
      }));

      if (onError) {
        onError(errorMessage);
      }
    }
  }, [state.uploadedImageUrl, state.selectedAspectRatio, validateCredits, clearError, fetchUserCredits, onImageGenerated, onError, defaultRatio]);

  // 处理下载
  const handleDownload = useCallback(async () => {
    const ratioToUse = state.selectedAspectRatio || defaultRatio;
    if (!state.expandedImageUrl) {
      return;
    }

    try {
      const timestamp = new Date().toISOString().slice(0, 10);
      const aspectRatioLabel = ratioToUse?.label || 'expanded';
      const filename = `ai-expanded-${aspectRatioLabel}-${timestamp}.png`;

      const downloadUrl = `/api/wallpaper/download?src=${encodeURIComponent(state.expandedImageUrl)}&filename=${encodeURIComponent(filename)}`;

      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download failed:', error);
      setState((prev) => ({
        ...prev,
        error: {
          type: 'network',
          message: 'Download failed',
          suggestion: 'Check your network connection and retry',
          retryAction: () => handleDownload(),
        },
      }));
    }
  }, [state.expandedImageUrl, state.selectedAspectRatio, defaultRatio]);

  const displayImage = getDisplayImage();

  return (
    <div className={`w-full flex justify-center ${className}`}>
      <Card className="w-full max-w-6xl bg-card text-card-foreground border border-border rounded-2xl shadow-xl overflow-hidden">
        <div className="flex flex-col lg:flex-row min-h-[680px]">
        {/* 左侧画布区域 */}
        <div className="relative flex-1 bg-muted/40">
          <div className="absolute inset-4 rounded-2xl bg-background border border-border shadow-md overflow-hidden">
            <div className="w-full h-full flex items-center justify-center p-8">
              <div
                className="relative max-w-full max-h-full transition-all duration-300 ease-in-out"
                style={{
                  aspectRatio: `${ratioConfig.width} / ${ratioConfig.height}`,
                  height: ratioConfig.height > ratioConfig.width ? '82%' : 'auto',
                  width: ratioConfig.width >= ratioConfig.height ? '82%' : 'auto',
                }}
              >
                <div className="absolute inset-0 rounded-xl" style={checkerboardStyle} />

                <div className="absolute inset-0 flex items-center justify-center z-0 overflow-hidden">
                  {displayImage ? (
                    <img
                      src={displayImage}
                      alt="Preview image"
                      className="w-full h-full object-contain shadow-lg rounded-md bg-background"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center bg-muted text-muted-foreground w-[60%] h-[50%] rounded-xl shadow-inner border border-border">
                      <div className="bg-background p-4 rounded-lg shadow-sm mb-4 w-24 h-16 flex items-center justify-center relative overflow-hidden border border-border">
                        <div className="absolute bottom-0 left-0 right-0 h-1/2 bg-muted rounded-b-lg" />
                        <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-muted-foreground/30 rounded-b-lg translate-y-1 scale-110" />
                      </div>
                    </div>
                  )}
                </div>

                <div className="absolute inset-0 border-[3px] border-primary/80 z-10 pointer-events-none rounded-xl">
                  {(['tl', 'tc', 'tr', 'mr', 'br', 'bc', 'bl', 'ml'] as HandlePosition[]).map((pos) => (
                    <ResizeHandle key={pos} position={pos} />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="absolute top-6 left-6 flex flex-wrap gap-3 z-20">
            <Button
              size="sm"
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
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
                  Upload
                </>
              )}
            </Button>
          </div>
        </div>

        {/* 右侧侧边栏 */}
        <aside className="w-full lg:w-[360px] bg-card p-6 border-t border-border lg:border-t-0 lg:border-l flex flex-col gap-6">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold">Aspect Ratio</h3>
            </div>
            <div className="grid grid-cols-4 gap-3">
              {RATIO_CONFIGS.map((config) => {
                const isActive = activeRatio.id === config.id;
                return (
                  <button
                    key={config.id}
                    onClick={() => {
                      const nextRatio = ASPECT_RATIOS_WITH_ICONS.find((r) => r.id === config.id);
                      if (nextRatio) {
                        handleAspectRatioSelect(nextRatio);
                      }
                    }}
                    className={`flex flex-col items-center justify-center p-2 rounded-lg border text-xs transition-all duration-200 ${
                      isActive
                        ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                        : 'bg-muted/60 border-border text-muted-foreground hover:border-muted-foreground/50 hover:text-foreground'
                    }`}
                  >
                    <div
                      className={`mb-2 rounded-sm ${isActive ? 'border-white/80' : 'border-border'} border`}
                      style={{
                        width: 24,
                        height: 24,
                        aspectRatio: `${config.width}/${config.height}`,
                      }}
                    />
                    <span className="font-medium">{config.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="space-y-3 mt-20">
            <Button
              className="w-full h-12"
              disabled={!state.uploadedImageUrl || state.isGenerating || state.isUploading || state.userCredits < CONFIG.generationCost}
              onClick={handleGenerate}
            >
              {state.isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate
                </>
              )}
            </Button>

            <Button
              variant="outline"
              className="w-full h-12"
              disabled={!state.expandedImageUrl}
              onClick={handleDownload}
            >
              <Download className="w-4 h-4 mr-2" />
              Download image
            </Button>
          </div>

          {state.error && (
            <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
              <div className="font-semibold mb-1">{state.error.message}</div>
              {state.error.suggestion && <div className="text-destructive/80">{state.error.suggestion}</div>}
              {state.error.retryAction && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  onClick={state.error.retryAction}
                >
                  Retry
                </Button>
              )}
            </div>
          )}
        </aside>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/png,image/gif,image/webp"
          className="hidden"
          onChange={handleFileSelect}
        />
      </Card>
    </div>
  );
}

// 导出宽高比类型和选项供其他组件使用
export { ASPECT_RATIOS_WITH_ICONS as ASPECT_RATIOS };
export type { AspectRatio };
