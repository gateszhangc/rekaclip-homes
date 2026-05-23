"use client";

import React, { useState, useRef, useEffect } from 'react';
import {
  Upload,
  Trash2,
  Image as ImageIcon,
  Type as TypeIcon,
  Sparkles,
  ChevronRight,
  ChevronLeft,
  Crown,
  History,
  Download,
  Plus,
  Loader2
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ASPECT_RATIOS, RESOLUTIONS, MODEL_NANO_BANANA_PRO, CAROUSEL_IMAGES } from './constants';
import { GenerationMode, GeneratedImage, NanoBananaProProps } from './types';
import { uploadImageFile } from '@/lib/upload';
import {
  validateFile,
  saveCreation,
  getUserPreferences,
  saveUserPreferences,
  downloadImage
} from './utils';
import { useTranslations } from 'next-intl';
import LoadingState from './loading-state';
import { getImageModelApiPath } from '@/lib/image-model';
import SensitiveContentNotice from './sensitive-content-notice';
import InlineNotice, { InlineNoticeVariant } from './inline-notice';

const NanoBananaPro: React.FC<NanoBananaProProps> = ({
  className = '',
  showHeader = true,
  embedded = false
}) => {
  const router = useRouter();
  const t = useTranslations('nano_banana_pro');
  const imageModelApiPath = getImageModelApiPath();

  // Load user preferences
  const preferences = getUserPreferences();

  // State
  const [mode, setMode] = useState<GenerationMode>(preferences.defaultMode);
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState(preferences.defaultAspectRatio);
  const [resolution, setResolution] = useState(preferences.defaultResolution);
  const [refImages, setRefImages] = useState<string[]>([]);
  const [refImageUrls, setRefImageUrls] = useState<string[]>([]); // R2 URLs for API
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<GeneratedImage | null>(null);
  const [uploadingFiles, setUploadingFiles] = useState<Set<number>>(new Set());
  const [uploadErrors, setUploadErrors] = useState<Map<number, string>>(new Map());
  const [safetyNotice, setSafetyNotice] = useState<{
    message: string;
    requestId?: string;
  } | null>(null);
  const [notice, setNotice] = useState<{
    variant: InlineNoticeVariant;
    title: string;
    description?: string;
    requestId?: string;
    actionLabel?: string;
    onAction?: () => void;
  } | null>(null);

  // Carousel State
  const [currentSlide, setCurrentSlide] = useState(0);

  // References
  const fileInputRef = useRef<HTMLInputElement>(null);
  const promptInputRef = useRef<HTMLTextAreaElement>(null);

  // Carousel Logic
  const nextSlide = () => {
    setCurrentSlide((prev) => (prev + 1) % CAROUSEL_IMAGES.length);
  };

  const prevSlide = () => {
    setCurrentSlide((prev) => (prev - 1 + CAROUSEL_IMAGES.length) % CAROUSEL_IMAGES.length);
  };

  useEffect(() => {
    // Auto-advance carousel if no result generated
    if (!generatedResult && !isGenerating && !embedded) {
      const timer = setInterval(nextSlide, 5000);
      return () => clearInterval(timer);
    }
  }, [generatedResult, isGenerating, embedded]);

  // Save preferences when they change
  useEffect(() => {
    saveUserPreferences({
      defaultAspectRatio: aspectRatio,
      defaultResolution: resolution,
      defaultMode: mode,
    });
  }, [aspectRatio, resolution, mode]);

  // Handlers
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const files = Array.from(e.target.files);
    const remainingSlots = 8 - refImages.length;
    const filesToProcess = files.slice(0, remainingSlots);

    for (let i = 0; i < filesToProcess.length; i++) {
      const file = filesToProcess[i];
      const fileIndex = refImages.length + i;

      // Validate file
      const validation = validateFile(file);
      if (!validation.valid) {
        setUploadErrors(prev => new Map(prev.set(fileIndex, validation.error!)));
        setNotice({
          variant: 'warning',
          title: 'Invalid file',
          description: validation.error!,
        });
        continue;
      }

      setUploadingFiles(prev => new Set(prev.add(fileIndex)));
      setUploadErrors(prev => {
        const newMap = new Map(prev);
        newMap.delete(fileIndex);
        return newMap;
      });

      try {
        // Upload to R2 using existing uploadImageFile function
        const { url, base64 } = await uploadImageFile(file, {
          type: 'nano-banana-pro',
          allowedTypes: ['image/jpeg', 'image/png', 'image/webp']
        });

        setRefImages(prev => [...prev, base64]);
        setRefImageUrls(prev => [...prev, url]);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : t('errors.upload_failed');
        setUploadErrors(prev => new Map(prev.set(fileIndex, errorMessage)));
        setNotice({
          variant: 'error',
          title: 'Upload failed',
          description: errorMessage,
        });
      } finally {
        setUploadingFiles(prev => {
          const newSet = new Set(prev);
          newSet.delete(fileIndex);
          return newSet;
        });
      }
    }

    // Clear the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setRefImages(prev => prev.filter((_, i) => i !== index));
    setRefImageUrls(prev => prev.filter((_, i) => i !== index));
    setUploadErrors(prev => {
      const newMap = new Map(prev);
      newMap.delete(index);
      return newMap;
    });
  };

  const clearImages = () => {
    setRefImages([]);
    setRefImageUrls([]);
    setUploadErrors(new Map());
  };

  const handlePickReferenceImage = () => {
    fileInputRef.current?.click();
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setNotice({
        variant: 'warning',
        title: 'Prompt is required',
        description: 'Add a prompt so we can generate your image.',
        actionLabel: 'Edit prompt',
        onAction: handleEditPrompt,
      });
      return;
    }

    if (mode === GenerationMode.IMAGE_TO_IMAGE && refImageUrls.length === 0) {
      setNotice({
        variant: 'warning',
        title: 'Reference image required',
        description: 'Upload a reference image to guide the generation.',
        actionLabel: 'Add image',
        onAction: handlePickReferenceImage,
      });
      return;
    }

    setIsGenerating(true);
    setGeneratedResult(null);
    setNotice(null);
    setSafetyNotice(null);

    try {
      // Map the selected label to the API value
      const selectedOption = ASPECT_RATIOS.find(r => r.label === aspectRatio);
      const apiAspectRatio = selectedOption ? selectedOption.value : '1:1';

      const resoSelectedOption = RESOLUTIONS.find(r => r.label === resolution);
      const apiResolution = resoSelectedOption ? resoSelectedOption.value : '2K';

      // Prepare API request
      const requestBody: any = {
        description: prompt,
        aspect_ratio: apiAspectRatio,
        resolution: apiResolution,
      };

      // For image-to-image mode, use the first uploaded image as base_image_url
      if (mode === GenerationMode.IMAGE_TO_IMAGE && refImageUrls.length > 0) {
        requestBody.base_image_url = refImageUrls[0];
      }

      const response = await fetch(imageModelApiPath, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      let data: any = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      if (!response.ok) {
        if (response.status === 422) {
          setSafetyNotice({
            message:
              typeof data?.message === 'string'
                ? data.message
                : 'Content flagged by safety system. Please revise your prompt and try again.',
            requestId: data?.requestId,
          });
          setNotice(null);
          return;
        }
        const error = new Error(data?.message || t('errors.generation_failed'));
        (error as any).requestId = data?.requestId;
        throw error;
      }

      if (data.code !== 0) {
        const error = new Error(data.message || t('errors.generation_failed'));
        (error as any).requestId = data.requestId;
        throw error;
      }

      const outfit = data.data.outfits[0];
      const newImage: GeneratedImage = {
        id: outfit.uuid,
        url: outfit.img_url,
        prompt: outfit.img_description,
        createdAt: new Date(outfit.created_at).getTime(),
        aspectRatio: apiAspectRatio,
        model: MODEL_NANO_BANANA_PRO,
        mode: mode,
      };

      setGeneratedResult(newImage);
      saveCreation(newImage);
      setNotice({
        variant: 'success',
        title: 'Image generated successfully',
        description: 'Your new creation is ready in the gallery.',
      });

    } catch (error: any) {
      const errorMessage = error instanceof Error ? error.message : t('errors.generation_failed');
      const requestId = error.requestId;
      setNotice({
        variant: 'error',
        title: 'Generation failed',
        description: errorMessage,
        requestId,
      });
      console.error('Generation error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = (url: string) => {
    downloadImage(url, `caricature-maker-${Date.now()}.png`);
  };

  const handleEditPrompt = () => {
    if (promptInputRef.current) {
      promptInputRef.current.focus();
      promptInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };


  return (
    <div className={`flex flex-col md:flex-row w-[60%] bg-background text-foreground overflow-hidden font-sans ${className}`}>

      {/* Left Sidebar - Controls */}
      <div className={`w-full md:w-[320px] p-4 flex-shrink-0 flex flex-col ${embedded ? 'h-auto' : 'h-full'} border-r border-border bg-card overflow-y-auto`}>
        <div >

          {/* Mode Switcher */}
          <div className="bg-muted p-1 rounded-lg flex">
            <button
              onClick={() => setMode(GenerationMode.IMAGE_TO_IMAGE)}
              className={`flex-1 flex items-center justify-center py-2.5 px-4 rounded-md text-sm font-medium transition-all ${mode === GenerationMode.IMAGE_TO_IMAGE
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              <ImageIcon size={16} className="mr-2" />
              {t('generator.modes.image_to_image')}
            </button>
            <button
              onClick={() => setMode(GenerationMode.TEXT_TO_IMAGE)}
              className={`flex-1 flex items-center justify-center py-2.5 px-4 rounded-md text-sm font-medium transition-all ${mode === GenerationMode.TEXT_TO_IMAGE
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
                }`}
            >
              <TypeIcon size={16} className="mr-2" />
              {t('generator.modes.text_to_image')}
            </button>
          </div>

          {/* Reference Images (Conditional) */}
          {mode === GenerationMode.IMAGE_TO_IMAGE && (
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-base font-serif font-medium text-foreground">{t('generator.reference_images')}</label>
                <span className="text-xs text-muted-foreground">{t('generator.reference_images_count', { count: refImages.length })}</span>
              </div>

              {refImages.length === 0 ? (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-border rounded-xl h-28 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all group"
                >
                  <Upload className="text-muted-foreground group-hover:text-primary mb-2 transition-colors" size={24} />
                  <p className="text-sm font-medium text-foreground">{t('generator.upload_area.drag_drop')}</p>
                  <p className="text-xs text-muted-foreground mt-1">{t('generator.upload_area.or_click')}</p>
                  <p className="text-[10px] text-muted-foreground mt-2">{t('generator.upload_area.supported_formats')}</p>
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {refImages.map((img, idx) => (
                    <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-border group h-24">
                      <img src={img} alt={`Reference image ${idx + 1}`} className="w-full h-full object-cover" />
                      {uploadingFiles.has(idx) && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          <Loader2 className="animate-spin text-white" size={20} />
                        </div>
                      )}
                      {uploadErrors.has(idx) && (
                        <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center p-2">
                          <p className="text-xs text-red-600 text-center">{uploadErrors.get(idx)}</p>
                        </div>
                      )}
                      <button
                        onClick={() => removeImage(idx)}
                        className="absolute top-1 right-1 bg-black/50 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  ))}
                  {refImages.length < 8 && (
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-square h-24 rounded-lg border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary transition-colors"
                    >
                      <Plus className="text-muted-foreground" size={20} />
                      <span className="text-[10px] text-muted-foreground mt-1">{t('generator.upload_area.add_more')}</span>
                    </div>
                  )}
                </div>
              )}

              {refImages.length > 0 && (
                <button
                  onClick={clearImages}
                  className="w-full py-2 flex items-center justify-center text-sm text-muted-foreground bg-muted rounded-lg hover:bg-muted/80 transition-colors border border-border"
                >
                  <Trash2 size={14} className="mr-2" />
                  {t('generator.clear_images')}
                </button>
              )}

              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
                multiple
                accept="image/*"
              />
            </div>
          )}

          {/* Sensitive Content Notice */}
          {safetyNotice && (
            <SensitiveContentNotice
              message={safetyNotice.message}
              requestId={safetyNotice.requestId}
              onEditPrompt={handleEditPrompt}
            />
          )}

          {!safetyNotice && notice && (
            <InlineNotice
              title={notice.title}
              description={notice.description}
              variant={notice.variant}
              requestId={notice.requestId}
              actionLabel={notice.actionLabel}
              onAction={notice.onAction}
              onDismiss={() => setNotice(null)}
            />
          )}

          {/* Prompt */}
          <div className="space-y-2">
            <label className="text-base font-serif font-medium text-foreground">{t('generator.prompt')}</label>
            <div className="relative">
              <textarea
                ref={promptInputRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={mode === GenerationMode.IMAGE_TO_IMAGE ? t('generator.prompt_placeholder_image') : t('generator.prompt_placeholder_text')}
                className="w-full h-24 p-2.5 border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm leading-relaxed bg-background"
                maxLength={5000}
              />
              <div className="absolute bottom-2 right-2 text-xs text-muted-foreground">
                {prompt.length} / 5000
              </div>
            </div>
          </div>

          {/* Aspect Ratio */}
          <div className="space-y-2">
            <label className="text-base font-serif font-medium text-foreground">{t('generator.aspect_ratio')}</label>
            <div className="grid grid-cols-5 gap-2">
              {ASPECT_RATIOS.map((ratio) => (
                <button
                  key={ratio.label}
                  onClick={() => setAspectRatio(ratio.label)}
                  className={`flex flex-col items-center justify-center p-2 rounded-lg border transition-all ${aspectRatio === ratio.label
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-muted text-muted-foreground hover:border-border/80'
                    }`}
                >
                  <div className={`border-2 rounded-sm mb-1 ${aspectRatio === ratio.label ? 'border-primary' : 'border-muted-foreground'
                    } ${ratio.widthClass} ${ratio.heightClass}`}></div>
                  <span className="text-[10px] font-medium">{ratio.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Resolution */}
          <div className="space-y-2">
            <label className="text-base font-serif font-medium text-foreground">{t('generator.resolution')}</label>
            <div className="flex gap-3">
              {RESOLUTIONS.map((res) => (
                <button
                  key={res.label}
                  onClick={() => setResolution(res.value)}
                  className={`flex-1 py-2 px-3 rounded-lg border text-sm font-medium flex items-center justify-center transition-all ${resolution === res.value
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border bg-muted text-muted-foreground hover:bg-muted/80'
                    }`}
                >
                  {res.label}
                  {res.isPro && <Crown size={12} className="ml-1 text-primary" />}
                </button>
              ))}
            </div>
          </div>

          {/* Sticky Generate Button */}
          {!embedded && (
            <div className=" border-t border-border">
              <button
                onClick={handleGenerate}
                disabled={isGenerating}
                className={`w-full py-3 rounded-lg flex items-center justify-center font-semibold text-sm transition-all shadow-sm ${isGenerating
                    ? 'bg-muted text-muted-foreground cursor-not-allowed'
                    : 'bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-md'
                  }`}
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="animate-spin mr-2" size={16} />
                    {t('generator.generating')}
                  </>
                ) : (
                  <>
                    <Sparkles size={16} className="mr-2" />
                    {t('generator.generate_button')}
                    <span className="ml-2 text-[10px] bg-black/10 px-1.5 py-0.5 rounded-full flex items-center">
                      ⚡ 5
                    </span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>


      </div>

      {/* Right Panel - Display */}
      {!embedded && (
        <div className="flex-1 bg-card relative flex flex-col h-full overflow-hidden">

          {/* Header */}
          {showHeader && (
            <div className="absolute top-0 right-0 p-4 w-full flex justify-between items-center z-10 pointer-events-none">
              {generatedResult && (
                <h2 className="text-xl font-serif text-foreground pointer-events-auto">{t('generator.output_gallery')}</h2>
              )}
            </div>
          )}

          <div className="flex-1 flex items-center justify-center p-6 bg-muted/30 h-full">

            {/* Case 1: Is Generating */}
            {isGenerating ? (
              <LoadingState variant="generation" />
            ) : generatedResult ? (
              /* Case 2: Result Generated */
              <div className="w-full h-full flex flex-col items-center justify-center animate-in fade-in zoom-in duration-300">
                <div className="relative max-h-[85vh] max-w-full rounded-xl overflow-hidden shadow-2xl group">
                  <img
                    src={generatedResult?.url || ''}
                    alt={generatedResult?.prompt || ''}
                    className="max-h-[85vh] object-contain"
                  />
                  <div className="absolute bottom-0 left-0 right-0 p-4  transition-opacity flex justify-end items-end">
                    <button
                      onClick={() => generatedResult && handleDownload(generatedResult.url)}
                      className="bg-white text-black p-2 rounded-lg hover:bg-gray-100 transition-colors"
                    >
                      <Download size={18} />
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* Case 3: Pre-generation Carousel */
              <div className="relative w-full h-full flex items-center justify-center overflow-hidden">
                {/* Carousel Container */}
                <div className="relative w-full max-w-2xl aspect-[3/4] md:aspect-auto md:h-[80vh] flex items-center justify-center">
                  <img
                    src={CAROUSEL_IMAGES[currentSlide]}
                    alt={t('generator.example')}
                    className="max-h-full max-w-full object-contain rounded-xl shadow-xl transition-all duration-500 ease-in-out"
                  />

                  {/* Controls */}
                  <button
                    onClick={prevSlide}
                    className="absolute left-4 p-2 rounded-full bg-background/80 backdrop-blur-sm text-foreground hover:bg-background shadow-lg transition-all"
                  >
                    <ChevronLeft size={24} />
                  </button>
                  <button
                    onClick={nextSlide}
                    className="absolute right-4 p-2 rounded-full bg-background/80 backdrop-blur-sm text-foreground hover:bg-background shadow-lg transition-all"
                  >
                    <ChevronRight size={24} />
                  </button>

                  {/* Dots */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex space-x-2">
                    {CAROUSEL_IMAGES.map((_, idx) => (
                      <button
                        key={idx}
                        onClick={() => setCurrentSlide(idx)}
                        className={`w-2 h-2 rounded-full transition-all ${currentSlide === idx ? 'bg-primary w-6' : 'bg-background/60 hover:bg-background'
                          }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Embedded Generate Button */}
      {embedded && (
        <div className="p-3 bg-card border-t border-border">
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className={`w-full py-3 rounded-lg flex items-center justify-center font-semibold text-sm transition-all shadow-sm ${isGenerating
                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                : 'bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-md'
              }`}
          >
            {isGenerating ? (
              <>
                <Loader2 className="animate-spin mr-2" size={16} />
                {t('generator.generating')}
              </>
            ) : (
              <>
                <Sparkles size={16} className="mr-2" />
                {t('generator.generate_button')}
                <span className="ml-2 text-[10px] bg-black/10 px-1.5 py-0.5 rounded-full flex items-center">
                  ⚡ 5
                </span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default NanoBananaPro;
