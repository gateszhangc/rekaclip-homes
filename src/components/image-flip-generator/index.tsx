"use client";

import type { ChangeEvent } from "react";
import { useEffect, useState, useMemo, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { DownloadableImage } from "@/components/downloadable-image";
import { createLogger } from "@/lib/logger";
import { uploadFileToR2 } from "@/lib/r2-upload";

// Types
interface ImageFlipConfig {
  maxFileSize: number;
  supportedFormats: string[];
  processingCost: number;
  enableCreditsSystem: boolean;
  maxRetryAttempts: number;
  errorDisplayDuration: number;
  showPreviewSlider: boolean;
  enableDragDrop: boolean;
  showDownloadButton: boolean;
  defaultHorizontalPreview: string;
  defaultVerticalPreview: string;
  defaultLanguage: string;
  supportedLanguages: string[];
}

interface ErrorState {
  type: 'upload' | 'processing' | 'network' | 'auth';
  message: string;
  suggestion?: string;
  retryAction?: () => void;
}

interface FlipState {
  // Image state
  originalImage: File | null;
  previewImageUrl: string | null;
  uploadedImageUrl: string | null;
  flippedImageUrl: string | null;
  
  // Operation state
  isUploading: boolean;
  isProcessing: boolean;
  flipType: 'horizontal' | 'vertical' | null;
  
  // Error state
  error: ErrorState | null;
  retryCount: number;
  
  // User state
  userCredits: number;
  
  // Config state
  config: ImageFlipConfig;
}

// Image cache for performance optimization
const imageCache = new Map<string, string>();
const DEFAULT_PREVIEW_IMAGE = "https://pub-e1eb76428e24457ebfc067c635cb4fc4.r2.dev/preview.png";

// Configuration hook
const useFlipConfig = (): ImageFlipConfig => {
  return useMemo(() => ({
    maxFileSize: parseInt(process.env.NEXT_PUBLIC_FLIP_MAX_FILE_SIZE || "10485760"),
    supportedFormats: (process.env.NEXT_PUBLIC_FLIP_SUPPORTED_FORMATS || "image/jpeg,image/png,image/gif,image/webp").split(","),
    processingCost: parseInt(process.env.NEXT_PUBLIC_FLIP_PROCESSING_COST || "3"),
    enableCreditsSystem: process.env.NEXT_PUBLIC_FLIP_ENABLE_CREDITS === "true",
    maxRetryAttempts: parseInt(process.env.NEXT_PUBLIC_FLIP_MAX_RETRY_ATTEMPTS || "3"),
    errorDisplayDuration: parseInt(process.env.NEXT_PUBLIC_FLIP_ERROR_DISPLAY_DURATION || "5000"),
    showPreviewSlider: process.env.NEXT_PUBLIC_FLIP_SHOW_PREVIEW_SLIDER !== "false",
    enableDragDrop: process.env.NEXT_PUBLIC_FLIP_ENABLE_DRAG_DROP !== "false",
    showDownloadButton: process.env.NEXT_PUBLIC_FLIP_SHOW_DOWNLOAD_BUTTON !== "false",
    defaultHorizontalPreview: process.env.NEXT_PUBLIC_FLIP_DEFAULT_HORIZONTAL_PREVIEW || "https://pub-e1eb76428e24457ebfc067c635cb4fc4.r2.dev/before.png",
    defaultVerticalPreview: process.env.NEXT_PUBLIC_FLIP_DEFAULT_VERTICAL_PREVIEW || "https://pub-e1eb76428e24457ebfc067c635cb4fc4.r2.dev/before2.png",
    defaultLanguage: process.env.NEXT_PUBLIC_DEFAULT_LOCALE || "en",
    supportedLanguages: (process.env.NEXT_PUBLIC_SUPPORTED_LOCALES || "en,zh").split(","),
  }), []);
};

export default function ImageFlipGenerator() {
  const t = useTranslations("image_flip_generator");
  const log = createLogger("image-flip-generator");
  const config = useFlipConfig();

  const [state, setState] = useState<FlipState>({
    originalImage: null,
    previewImageUrl: DEFAULT_PREVIEW_IMAGE,
    uploadedImageUrl: null,
    flippedImageUrl: null,
    isUploading: false,
    isProcessing: false,
    flipType: null,
    error: null,
    retryCount: 0,
    userCredits: 0,
    config,
  });

  // Fetch user credits on mount
  useEffect(() => {
    const fetchCredits = async () => {
      try {
        const resp = await fetch("/api/get-user-credits", {
          method: "POST",
        });
        const data = await resp.json();
        if (data.code === 0) {
          setState((prev) => ({
            ...prev,
            userCredits: data.data.left_credits || 0,
          }));
        }
      } catch (error) {
        console.error("Failed to fetch credits:", error);
      }
    };

    if (config.enableCreditsSystem) {
      fetchCredits();
    }
  }, [config.enableCreditsSystem]);

  // Cleanup effect for memory management
  useEffect(() => {
    return () => {
      // Clean up object URLs to prevent memory leaks
      if (state.previewImageUrl && state.previewImageUrl.startsWith('blob:')) {
        URL.revokeObjectURL(state.previewImageUrl);
      }
      
      // Limit cache size to prevent memory issues
      if (imageCache.size > 50) {
        const entries = Array.from(imageCache.entries());
        const toDelete = entries.slice(0, 25);
        toDelete.forEach(([key]) => imageCache.delete(key));
      }
    };
  }, [state.previewImageUrl]);

  // Optimized file compression for better performance
  const compressImage = useCallback(async (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new window.Image();
      
      img.onload = () => {
        // Calculate optimal dimensions (max 1920px width/height)
        const maxDimension = 1920;
        let { width, height } = img;
        
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = (height * maxDimension) / width;
            width = maxDimension;
          } else {
            width = (width * maxDimension) / height;
            height = maxDimension;
          }
        }
        
        canvas.width = width;
        canvas.height = height;
        
        // Draw and compress
        ctx?.drawImage(img, 0, 0, width, height);
        canvas.toBlob((blob) => {
          if (blob) {
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          } else {
            resolve(file);
          }
        }, 'image/jpeg', 0.85);
      };
      
      img.onerror = () => resolve(file);
      img.src = URL.createObjectURL(file);
    });
  }, []);

  // Handle file selection and upload to R2
  const handleFileSelect = async (file: File) => {
    log.info(
      { name: file.name, size: file.size, type: file.type },
      "handleFileSelect called"
    );

    // Clear any existing errors
    setState((prev) => ({ ...prev, error: null }));

    // Validate file type
    if (!config.supportedFormats.includes(file.type)) {
      log.warn({ type: file.type }, "handleFileSelect aborted: invalid type");
      setState((prev) => ({
        ...prev,
        error: {
          type: 'upload',
          message: t('errors.invalidFormat'),
          suggestion: t('errors.formatSuggestion', { formats: config.supportedFormats.join(', ') }),
        }
      }));
      return;
    }

    // Validate file size
    if (file.size > config.maxFileSize) {
      log.warn(
        { size: file.size, maxSize: config.maxFileSize },
        "handleFileSelect aborted: file too large"
      );
      setState((prev) => ({
        ...prev,
        error: {
          type: 'upload',
          message: t('errors.fileTooLarge', { size: (file.size / 1024 / 1024).toFixed(1) }),
          suggestion: t('errors.sizeSuggestion', { maxSize: (config.maxFileSize / 1024 / 1024).toFixed(1) }),
        }
      }));
      return;
    }

    setState((prev) => ({ ...prev, isUploading: true }));

    // Check cache first
    const fileKey = `${file.name}-${file.size}-${file.lastModified}`;
    const cachedUrl = imageCache.get(fileKey);
    
    if (cachedUrl) {
      log.info({ fileKey }, "Using cached image URL");
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64Image = e.target?.result as string;
      setState((prev) => ({
        ...prev,
        originalImage: file,
        previewImageUrl: base64Image,
        uploadedImageUrl: cachedUrl,
        flippedImageUrl: null,
        flipType: null,
        isUploading: false,
      }));
    };
    reader.readAsDataURL(file);
    return;
    }

    // Compress image for better performance
    const processedFile = file.size > 1024 * 1024 ? await compressImage(file) : file;

    // Generate preview
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Image = e.target?.result as string;
      log.info({ name: processedFile.name, size: processedFile.size }, "handleFileSelect read complete");

      setState((prev) => ({
        ...prev,
        originalImage: file,
        previewImageUrl: base64Image,
        flippedImageUrl: null,
        flipType: null,
      }));

      // Upload to R2 immediately
      try {
        const { url } = await uploadFileToR2(processedFile);
        
        // Cache the result
        imageCache.set(fileKey, url);
        
        setState((prev) => ({
          ...prev,
          originalImage: file,
          previewImageUrl: base64Image,
          uploadedImageUrl: url,
          flippedImageUrl: null,
          flipType: null,
          isUploading: false,
        }));
        log.info({ url }, "handleFileSelect upload success");
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Failed to upload image";
        const isAuthErr = errorMessage.toLowerCase().includes("authenticated");
        log.error({ err: error, name: file.name }, "Upload error");
        
        setState((prev) => ({
          ...prev,
          originalImage: null,
          previewImageUrl: null,
          uploadedImageUrl: null,
          isUploading: false,
          error: {
            type: isAuthErr ? 'auth' : 'network',
            message: isAuthErr ? t('errors.authRequired') : t('errors.uploadFailed'),
            suggestion: isAuthErr ? t('errors.authSuggestion') : t('errors.uploadSuggestion'),
            retryAction: () => handleFileSelect(file),
          }
        }));
      }
    };
    reader.onerror = () => {
      log.error({ name: file.name }, "File read error");
      setState((prev) => ({
        ...prev,
        originalImage: null,
        previewImageUrl: null,
        uploadedImageUrl: null,
        isUploading: false,
        error: {
          type: 'upload',
          message: t('errors.fileReadError'),
          suggestion: t('errors.fileReadSuggestion'),
        }
      }));
    };
    reader.readAsDataURL(processedFile);
  };

  // Handle file input change
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };



  // Handle flip operation with caching
  const handleFlip = useCallback(async (flipType: 'horizontal' | 'vertical') => {
    const fallbackBaseImageUrl =
      typeof window !== "undefined"
        ? new URL(DEFAULT_PREVIEW_IMAGE, window.location.origin).toString()
        : DEFAULT_PREVIEW_IMAGE;
    const baseImageUrl =
      state.flippedImageUrl || state.uploadedImageUrl || fallbackBaseImageUrl;

    log.info(
      {
        flipType,
        hasImage: !!baseImageUrl,
        uploadedImageUrl: baseImageUrl,
        userCredits: state.userCredits,
        processingCost: config.processingCost,
      },
      "handleFlip called"
    );

    // Clear any existing errors
    setState((prev) => ({ ...prev, error: null }));

    // Validate image (fallback to default preview)
    if (!baseImageUrl) {
      setState((prev) => ({
        ...prev,
        error: {
          type: 'upload',
          message: t('errors.noImage'),
          suggestion: t('errors.noImageSuggestion'),
        }
      }));
      return;
    }

    // Check cache for flip result
    const flipCacheKey = `${baseImageUrl}-${flipType}`;
    const cachedFlipResult = imageCache.get(flipCacheKey);
    
    if (cachedFlipResult) {
      log.info({ flipType, cachedUrl: cachedFlipResult }, "Using cached flip result");
      setState((prev) => ({
        ...prev,
        flippedImageUrl: cachedFlipResult,
        flipType,
      }));
      return;
    }

    // Check credits if enabled
    if (config.enableCreditsSystem && state.userCredits < config.processingCost) {
      setState((prev) => ({
        ...prev,
        error: {
          type: 'auth',
          message: t('credits.insufficient'),
          suggestion: `You need ${config.processingCost} credits but only have ${state.userCredits}.`,
        }
      }));
      return;
    }

    setState((prev) => ({ 
      ...prev, 
      isProcessing: true, 
      flipType,
    }));

    try {
      const resp = await fetch("/api/flip-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base_image_url: baseImageUrl,
          flip_type: flipType,
          description: `${flipType} flipped image`,
        }),
      });

      if (!resp.ok) {
        throw new Error(`HTTP ${resp.status}: ${resp.statusText}`);
      }

      const result = await resp.json();

      if (result.code !== 0) {
        throw new Error(result.message || "Flip operation failed");
      }

      const flippedUrl = result.data?.flipped_image_url;
      if (!flippedUrl) {
        throw new Error("Flip operation succeeded but no image URL returned");
      }

      // Cache the flip result
      imageCache.set(flipCacheKey, flippedUrl);
      
      setState((prev) => ({
        ...prev,
        flippedImageUrl: flippedUrl,
        // Use the newly flipped image as the next base for further flips
        uploadedImageUrl: flippedUrl,
        previewImageUrl: flippedUrl,
        isProcessing: false,
        userCredits: config.enableCreditsSystem ? prev.userCredits - config.processingCost : prev.userCredits,
      }));

      log.info({ flipType, flippedImageUrl: result.data.flipped_image_url }, "handleFlip success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Flip operation failed";
      log.error({ err: error, flipType }, "Flip error");
      
      setState((prev) => ({
      ...prev,
      isProcessing: false,
      flipType: null,
      error: {
        type: 'processing',
          message: t('errors.processingFailed'),
          suggestion: t('errors.processingSuggestion'),
          retryAction: () => handleFlip(flipType),
        }
      }));
    }
  }, [state.originalImage, state.uploadedImageUrl, state.flippedImageUrl, config.enableCreditsSystem, config.processingCost, state.userCredits, t, log]);

  const displayedImage = state.flippedImageUrl || state.previewImageUrl || DEFAULT_PREVIEW_IMAGE;
  const previewAlt = state.flippedImageUrl ? t('preview.flippedAlt') : t('preview.originalAlt');
  const showDownloadOverlay = Boolean(state.flippedImageUrl);
  const downloadSource =
    state.flippedImageUrl || state.uploadedImageUrl || DEFAULT_PREVIEW_IMAGE;
  const resolvedDownloadSource = (() => {
    if (!downloadSource) return DEFAULT_PREVIEW_IMAGE;
    try {
      return new URL(
        downloadSource,
        typeof window !== "undefined" ? window.location.origin : undefined
      ).toString();
    } catch {
      return downloadSource;
    }
  })();
  const downloadName = (() => {
    const getExt = (name: string) => {
      const match = name.match(/\.([^.\/?#]+)(?:[?#]|$)/);
      return match?.[1] || "";
    };

    const originalName = state.originalImage?.name || "";

    const fallbackName = (() => {
      try {
        const pathname = new URL(resolvedDownloadSource).pathname;
        return pathname.split("/").filter(Boolean).pop() || "";
      } catch {
        const parts = resolvedDownloadSource.split("/");
        return parts[parts.length - 1] || "";
      }
    })();

    const baseName = (originalName || fallbackName || "image").replace(
      /\.[^/.]+$/,
      ""
    ) || "image";

    const ext =
      (originalName && getExt(originalName)) ||
      (fallbackName && getExt(fallbackName)) ||
      "png";

    if (state.flippedImageUrl && state.flipType) {
      return `${baseName}_${state.flipType}_flip.${ext}`;
    }
    return `${baseName}.${ext}`;
  })();
  const downloadUrl = `/api/wallpaper/download?src=${encodeURIComponent(
    resolvedDownloadSource
  )}&filename=${encodeURIComponent(downloadName)}`;

  return (
    <section>
      <div className="container">
        <div className="w-full max-w-6xl mx-auto">
          <div className="grid gap-10 lg:grid-cols-2 items-center">
            {/* Left Control Panel */}
            <div className="space-y-6">
              {/* Action Buttons */}
              <div className="space-y-4">
                {/* Horizontal Flip Button */}
                <Button
                  onClick={() => handleFlip('horizontal')}
                  size="lg"
                  className="w-full h-12 text-base font-medium"
                >
                  {state.isProcessing && state.flipType === 'horizontal' ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                      {t('controls.processing')}
                    </div>
                  ) : (
                    <>
                      Flip horizontally
                    </>
                  )}
                </Button>

                {/* Vertical Flip Button */}
                <Button
                  onClick={() => handleFlip('vertical')}
                  size="lg"
                  className="w-full h-12 text-base font-medium"
                >
                  {state.isProcessing && state.flipType === 'vertical' ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                      {t('controls.processing')}
                    </div>
                  ) : (
                    <>
                      Flip vertically
                    </>
                  )}
                </Button>

                {/* Upload Button */}
                <Button
                  onClick={() => document.getElementById("file-input")?.click()}
                  disabled={state.isUploading}
                  size="lg"
                  className="w-full h-12 text-base font-medium"
                >
                  <div className="flex items-center justify-center gap-3">
                    {state.isUploading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                        {t('controls.uploading')}
                      </>
                    ) : (
                      <>
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        Upload image
                      </>
                    )}
                  </div>
                </Button>
              </div>

              {/* Error Display */}
              {state.error && (
                <div className="rounded-lg border border-destructive/20 bg-destructive/10 p-4">
                  <div className="flex items-start gap-3">
                    <div className="text-destructive">
                      <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex-1">
                      <h4 className="text-sm font-medium text-destructive">
                        {state.error.message}
                      </h4>
                      {state.error.suggestion && (
                        <p className="mt-1 text-sm text-destructive/80">
                          {state.error.suggestion}
                        </p>
                      )}
                      {state.error.retryAction && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="mt-2 text-xs h-7"
                          onClick={state.error.retryAction}
                        >
                          {t('errors.retry')}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Right Preview Area */}
            <div className="relative">
              <div className="aspect-[4/4] bg-muted/40 rounded-2xl overflow-hidden border shadow-lg">
                <DownloadableImage
                  src={displayedImage}
                  alt={previewAlt}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  priority
                  className="h-full w-full"
                  imageClassName="object-contain transition-all duration-500"
                  showDownload={showDownloadOverlay}
                  downloadUrl={downloadUrl}
                  downloadFileName={downloadName}
                  downloadLabel={t('preview.download')}
                  buttonVariant="secondary"
                  buttonSize="lg"
                />
              </div>
            </div>
          </div>

          {/* Hidden File Input */}
          <input
            id="file-input"
            type="file"
            accept={config.supportedFormats.join(",")}
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      </div>
    </section>
  );
}
