"use client";

import React, { useState, useRef, useEffect, useMemo } from 'react';
import NextImage from 'next/image';
import {
  Upload,
  Trash2,
  Sparkles,
  Download,
  Loader2,
  ChevronDown,
  ImageUp,
  RotateCcw,
  Layers,
  FileDown,
  FileArchive
} from 'lucide-react';
import { MODEL_QWEN_IMAGE_LAYERED } from './constants';
import { GenerationMode, GeneratedImage, QwenImageLayeredProps } from './types';
import { uploadImageFile } from '@/lib/upload';
import {
  validateFile,
  saveCreation,
  getUserPreferences,
  saveUserPreferences,
  downloadImage
} from './utils';
import { toast } from 'sonner';
import { useTranslations } from 'next-intl';
import { useAppContext } from "@/contexts/app";
import { isAuthEnabled } from "@/lib/auth";
import { useRouter } from "@/i18n/navigation";
import InlineError from './inline-error';
import LoadingState from './loading-state';

const MIN_NUM_LAYERS = 2;
const MAX_NUM_LAYERS = 8;
const MAX_SEED = 2147483647;

const QwenImageLayered: React.FC<QwenImageLayeredProps> = ({
  className = '',
  showHeader = true,
  embedded = false
}) => {
  const t = useTranslations('qwen_image_layered');
  const { user } = useAppContext();
  const router = useRouter();
  const authEnabled = isAuthEnabled();

  // Load user preferences
  const preferences = getUserPreferences();

  // State
  const [mode] = useState<GenerationMode>(preferences.defaultMode);
  const [prompt, setPrompt] = useState('');
  const [negativePrompt, setNegativePrompt] = useState('');
  const [seed, setSeed] = useState(0);
  const [randomizeSeed, setRandomizeSeed] = useState(true);
  const [guidanceScale, setGuidanceScale] = useState(4);
  const [inferenceSteps, setInferenceSteps] = useState(50);
  const [enableCfgNormalization, setEnableCfgNormalization] = useState(true);
  const [autoCaptionEn, setAutoCaptionEn] = useState(true);
  const [outputFormat, setOutputFormat] = useState<'WEBP' | 'PNG'>('WEBP');
  const [numLayers, setNumLayers] = useState(4);
  const [refImages, setRefImages] = useState<string[]>([]);
  const [refImageUrls, setRefImageUrls] = useState<string[]>([]); // R2 URLs for API
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResults, setGeneratedResults] = useState<GeneratedImage[]>([]);
  const [uploadingFiles, setUploadingFiles] = useState<Set<number>>(new Set());
  const [uploadErrors, setUploadErrors] = useState<Map<number, string>>(new Map());
  const [generalError, setGeneralError] = useState<string>('');
  const [isPackaging, setIsPackaging] = useState<'pptx' | 'zip' | null>(null);


  // References
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Save preferences when they change
  useEffect(() => {
    saveUserPreferences({
      ...preferences,
      defaultMode: mode,
    });
  }, [mode]);

  const introFeatures = useMemo(() => {
    const features = (t as any).raw?.('intro.features');
    return Array.isArray(features) ? (features as string[]) : [];
  }, [t]);

  const exampleSets = useMemo(() => {
    const images = Array.from({ length: 13 }, (_, index) => {
      const id = index + 1;
      const labelIndex = String(id).padStart(2, '0');
      return {
        src: `/examples/${id}.webp`,
        label: t('examples.labels.sample', { index: labelIndex }),
      };
    });

    return [
      {
        title: t('examples.rows.secondary'),
        images,
      },
    ];
  }, [t]);

  // Handlers
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const files = Array.from(e.target.files);
    const remainingSlots = 1 - refImages.length;
    const filesToProcess = files.slice(0, remainingSlots);

    for (let i = 0; i < filesToProcess.length; i++) {
      const file = filesToProcess[i];
      const fileIndex = refImages.length + i;

      // Validate file
      const validation = validateFile(file);
      if (!validation.valid) {
        setUploadErrors(prev => new Map(prev.set(fileIndex, validation.error!)));
        toast.error(validation.error);
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
          type: 'qwen-image-layered',
          allowedTypes: ['image/jpeg', 'image/png', 'image/webp']
        });

        setRefImages(prev => [...prev, base64]);
        setRefImageUrls(prev => [...prev, url]);
        toast.success(t('errors.upload_success'));
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : t('errors.upload_failed');
        setUploadErrors(prev => new Map(prev.set(fileIndex, errorMessage)));
        toast.error(errorMessage);
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

  const handleExampleSelect = (src: string) => {
    const absoluteUrl = new URL(src, window.location.origin).toString();
    setRefImages([src]);
    setRefImageUrls([absoluteUrl]);
    setUploadingFiles(new Set());
    setUploadErrors(new Map());
    setGeneralError('');
  };

  const clampNumLayers = (value: number) => {
    return Math.min(MAX_NUM_LAYERS, Math.max(MIN_NUM_LAYERS, value));
  };

  const handleNumLayersChange = (value: number) => {
    if (!Number.isNaN(value)) {
      setNumLayers(clampNumLayers(value));
    }
  };

  const handleGenerate = async () => {
    if (authEnabled && !user) {
      router.push('/auth/signin');
      return;
    }

    if (refImageUrls.length === 0) {
      toast.error(t('errors.upload_reference'));
      return;
    }

    setIsGenerating(true);
    setGeneratedResults([]);
    setGeneralError('');

    try {
      const description = prompt.trim() || 'auto';
      const resolvedSeed = randomizeSeed
        ? Math.floor(Math.random() * MAX_SEED)
        : seed;

      if (randomizeSeed) {
        setSeed(resolvedSeed);
      }

      // Prepare API request
      const requestBody: Record<string, unknown> = {
        image: refImageUrls[0],
        description,
        num_layers: numLayers,
        go_fast: true,
        output_format: outputFormat.toLowerCase(),
        output_quality: 95,
        seed: resolvedSeed,
        guidance_scale: guidanceScale,
        num_inference_steps: inferenceSteps,
        cfg_normalization: enableCfgNormalization,
        auto_caption_language: autoCaptionEn ? 'en' : 'zh',
      };

      const trimmedNegativePrompt = negativePrompt.trim();
      if (trimmedNegativePrompt) {
        requestBody.negative_prompt = trimmedNegativePrompt;
      }

      const response = await fetch('/api/gen-outfit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody),
      });

      const data = await response.json();

      if (data.code !== 0) {
        throw new Error(data.message || t('errors.generation_failed'));
      }

      const outfits = data.data?.outfits;
      if (!Array.isArray(outfits) || outfits.length === 0) {
        throw new Error(t('errors.generation_failed'));
      }

      const newImages: GeneratedImage[] = outfits.map((outfit: any) => ({
        id: outfit.uuid,
        url: outfit.img_url,
        prompt: outfit.img_description || description,
        createdAt: new Date(outfit.created_at).getTime(),
        aspectRatio: '1:1',
        model: MODEL_QWEN_IMAGE_LAYERED,
        mode: mode,
      }));

      setGeneratedResults(newImages);
      newImages.forEach(saveCreation);
      toast.success(t('results.success'));

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t('errors.generation_failed');
      setGeneralError(errorMessage);
      toast.error(errorMessage);
      console.error('Generation error:', error);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = (url: string) => {
    downloadImage(url, `caricature-maker-${Date.now()}.${outputFormat.toLowerCase()}`);
  };

  const handleDownloadPptx = async () => {
    if (generatedResults.length === 0 || isPackaging) return;
    setIsPackaging('pptx');
    try {
      const images = generatedResults.map((r) => ({ url: r.url, name: r.prompt }));
      const response = await fetch('/api/gen-outfit/download-pptx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images, baseName: 'caricature-maker' }),
      });
      if (!response.ok) throw new Error('Failed to create PPTX');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `caricature-maker-${Date.now()}.pptx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(t('results.download_ready'));
    } catch (error) {
      console.error('PPTX download error:', error);
      toast.error(t('errors.download_failed'));
    } finally {
      setIsPackaging(null);
    }
  };

  const handleDownloadZip = async () => {
    if (generatedResults.length === 0 || isPackaging) return;
    setIsPackaging('zip');
    try {
      const images = generatedResults.map((r, i) => ({
        url: r.url,
        name: `layer-${i + 1}.${outputFormat.toLowerCase()}`,
      }));
      const response = await fetch('/api/gen-outfit/download-zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images, baseName: 'caricature-maker' }),
      });
      if (!response.ok) throw new Error('Failed to create ZIP');
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `caricature-maker-${Date.now()}.zip`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast.success(t('results.download_ready'));
    } catch (error) {
      console.error('ZIP download error:', error);
      toast.error(t('errors.download_failed'));
    } finally {
      setIsPackaging(null);
    }
  };

  return (
    <div
      className={`relative mx-auto w-full max-w-6xl text-foreground ${className}`}
    >
      <div className="flex flex-col gap-6">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,0.44fr)_minmax(0,0.56fr)]">
          <div className="studio-panel flex flex-col gap-5 rounded-2xl border border-border/70 bg-card/70 p-5">

            <div className="rounded-2xl border border-border/70 bg-background/40 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-sm font-serif font-semibold text-foreground">
                  <ImageUp className="size-4 text-primary" />
                  <span>{t('upload.title')}</span>
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs font-semibold text-primary"
                >
                  {t('upload.action')}
                </button>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                {t('upload.subtitle')}
              </p>
              <div className="mt-4 space-y-2">
                {refImages.length === 0 ? (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed border-border rounded-xl h-28 flex flex-col items-center justify-center cursor-pointer hover:border-primary hover:bg-primary/5 transition-all group"
                  >
                    <Upload className="text-muted-foreground group-hover:text-primary mb-2 transition-colors" size={22} />
                    <p className="text-sm font-medium text-foreground">
                      {t('upload.drop')}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t('upload.or_click')}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-2">
                      {t('upload.supported_formats')}
                    </p>
                  </div>
                ) : (
                  <div className="relative w-full aspect-square rounded-xl overflow-hidden border border-border group bg-muted/30">
                    <NextImage
                      src={refImages[0]}
                      alt="Reference image 1"
                      className="object-cover"
                      fill
                      sizes="(max-width: 768px) 100vw, 500px"
                    />
                    {uploadingFiles.has(0) && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <Loader2 className="animate-spin text-white" size={20} />
                      </div>
                    )}
                    {uploadErrors.has(0) && (
                      <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center p-2">
                        <p className="text-xs text-red-600 text-center">
                          {uploadErrors.get(0)}
                        </p>
                      </div>
                    )}
                    <button
                      onClick={() => removeImage(0)}
                      className="absolute top-2 right-2 bg-black/50 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                )}

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  className="hidden"
                  accept="image/*"
                />
              </div>
            </div>

            {generalError && (
              <InlineError
                error={generalError}
                onRetry={() => setGeneralError('')}
                onDismiss={() => setGeneralError('')}
              />
            )}

            <details className="rounded-2xl border border-border/70 bg-background/40 p-4 group">
              <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-serif font-semibold text-foreground">
                {t('advanced.title')}
                <ChevronDown className="size-4 text-muted-foreground transition-transform group-open:rotate-180" />
              </summary>
              <div className="mt-4 space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground">
                    {t('advanced.prompt_label')}
                  </label>
                  <div className="relative">
                    <textarea
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      placeholder={t('advanced.prompt_placeholder')}
                      className="w-full h-20 p-2.5 border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm leading-relaxed bg-background text-foreground"
                      maxLength={5000}
                    />
                    <div className="absolute bottom-2 right-2 text-[10px] text-muted-foreground">
                      {prompt.length} / 5000
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-semibold text-foreground">
                    {t('advanced.negative_prompt_label')}
                  </label>
                  <textarea
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    placeholder={t('advanced.negative_prompt_placeholder')}
                    className="w-full h-20 p-2.5 border border-border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-sm leading-relaxed bg-background text-foreground"
                    maxLength={5000}
                  />
                </div>

                <div className="rounded-xl border border-border/60 bg-background/70 p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">
                      {t('advanced.seed')}
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={MAX_SEED}
                        value={seed}
                        onChange={(e) => setSeed(Number(e.target.value))}
                        className="w-24 h-8 border border-border rounded-md bg-background text-right text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground"
                      />
                      <button
                        type="button"
                        onClick={() => setSeed(Math.floor(Math.random() * MAX_SEED))}
                        className="rounded-md border border-border/60 bg-background/80 p-1.5 text-muted-foreground transition hover:text-foreground"
                      >
                        <RotateCcw className="size-3" />
                      </button>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={MAX_SEED}
                    step={1}
                    value={seed}
                    onChange={(e) => setSeed(Number(e.target.value))}
                    className="w-full h-2 rounded-full bg-muted accent-primary cursor-pointer"
                  />
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <input
                      type="checkbox"
                      checked={randomizeSeed}
                      onChange={(e) => setRandomizeSeed(e.target.checked)}
                      className="size-3 rounded border-border text-primary accent-primary"
                    />
                    {t('advanced.randomize_seed')}
                  </label>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-foreground">
                        {t('advanced.guidance_scale')}
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={10}
                        step={0.5}
                        value={guidanceScale}
                        onChange={(e) => setGuidanceScale(Number(e.target.value))}
                        className="w-14 h-8 border border-border rounded-md bg-background text-center text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground"
                      />
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      step={0.5}
                      value={guidanceScale}
                      onChange={(e) => setGuidanceScale(Number(e.target.value))}
                      className="w-full h-2 rounded-full bg-muted accent-primary cursor-pointer"
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-foreground">
                        {t('advanced.inference_steps')}
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={50}
                        step={1}
                        value={inferenceSteps}
                        onChange={(e) => setInferenceSteps(Number(e.target.value))}
                        className="w-14 h-8 border border-border rounded-md bg-background text-center text-xs font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground"
                      />
                    </div>
                    <input
                      type="range"
                      min={1}
                      max={50}
                      step={1}
                      value={inferenceSteps}
                      onChange={(e) => setInferenceSteps(Number(e.target.value))}
                      className="w-full h-2 rounded-full bg-muted accent-primary cursor-pointer"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-foreground">
                      {t('advanced.layer_count')}
                    </label>
                    <span className="text-xs text-muted-foreground">
                      {t('advanced.layer_range', { min: MIN_NUM_LAYERS, max: MAX_NUM_LAYERS })}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min={MIN_NUM_LAYERS}
                      max={MAX_NUM_LAYERS}
                      value={numLayers}
                      onChange={(e) => handleNumLayersChange(Number(e.target.value))}
                      onBlur={(e) => handleNumLayersChange(Number(e.target.value))}
                      className="w-16 h-9 border border-border rounded-lg bg-background text-center text-sm font-medium focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent text-foreground"
                    />
                    <input
                      type="range"
                      min={MIN_NUM_LAYERS}
                      max={MAX_NUM_LAYERS}
                      step={1}
                      value={numLayers}
                      onChange={(e) => handleNumLayersChange(Number(e.target.value))}
                      className="flex-1 h-2 rounded-full bg-muted accent-primary cursor-pointer"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={enableCfgNormalization}
                    onChange={(e) => setEnableCfgNormalization(e.target.checked)}
                    className="size-3 rounded border-border text-primary accent-primary"
                  />
                  {t('advanced.cfg_normalization')}
                </label>

                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={autoCaptionEn}
                    onChange={(e) => setAutoCaptionEn(e.target.checked)}
                    className="size-3 rounded border-border text-primary accent-primary"
                  />
                  {t('advanced.auto_caption_language')}
                </label>

              </div>
            </details>

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className={`w-full py-3 rounded-xl flex items-center justify-center font-semibold text-sm transition-all shadow-sm ${isGenerating
                ? 'bg-muted text-muted-foreground cursor-not-allowed'
                : 'bg-primary text-primary-foreground hover:bg-primary/90 hover:shadow-md'
                }`}
            >
              {isGenerating ? (
                <>
                  <Loader2 className="animate-spin mr-2" size={16} />
                  {t('actions.generating')}
                </>
              ) : (
                <>
                  <Sparkles size={16} className="mr-2" />
                  {authEnabled && !user ? t('actions.sign_in_to_decompose') : t('actions.decompose')}
                </>
              )}
            </button>
          </div>

          <div className="flex h-full flex-col rounded-2xl border border-border/70 bg-card/60 p-5">
            {showHeader && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-4">
                <div className="flex items-center gap-2">
                  <span className="inline-flex size-9 items-center justify-center rounded-full border border-border/60 bg-background/60 text-primary">
                    <Layers className="size-4" />
                  </span>
                  <div>
                    <h2 className="text-lg font-serif font-semibold text-foreground">
                      {t('results.title')}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      {t('results.subtitle')}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadPptx}
                    disabled={generatedResults.length === 0 || isPackaging !== null}
                    className={`inline-flex items-center gap-2 rounded-full border border-border/60 px-3 py-1.5 text-xs font-semibold transition ${generatedResults.length === 0 || isPackaging !== null
                      ? 'cursor-not-allowed bg-muted/60 text-muted-foreground'
                      : 'bg-background/70 text-foreground hover:border-primary/60 hover:text-primary'
                      }`}
                  >
                    {isPackaging === 'pptx' ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <FileDown className="size-3" />
                    )}
                    {t('results.download_pptx')}
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadZip}
                    disabled={generatedResults.length === 0 || isPackaging !== null}
                    className={`inline-flex items-center gap-2 rounded-full border border-border/60 px-3 py-1.5 text-xs font-semibold transition ${generatedResults.length === 0 || isPackaging !== null
                      ? 'cursor-not-allowed bg-muted/60 text-muted-foreground'
                      : 'bg-background/70 text-foreground hover:border-primary/60 hover:text-primary'
                      }`}
                  >
                    {isPackaging === 'zip' ? (
                      <Loader2 className="size-3 animate-spin" />
                    ) : (
                      <FileArchive className="size-3" />
                    )}
                    {t('results.download_zip')}
                  </button>
                </div>
              </div>
            )}

            <div className="mt-4 flex-1">
              {isGenerating ? (
                <LoadingState
                  variant="generation"
                  message={t('results.generating_title')}
                  submessage={t('results.generating_subtitle')}
                />
              ) : generatedResults.length > 0 ? (
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {generatedResults.map((result, index) => (
                    <div
                      key={result.id}
                      className="group rounded-xl border border-border/60 bg-background/40 p-2"
                    >
                      <div className="relative aspect-square overflow-hidden rounded-lg border border-border/60 bg-muted/40">
                        <NextImage
                          src={result.url || ''}
                          alt={result.prompt || ''}
                          className="object-cover"
                          fill
                          sizes="(max-width: 768px) 50vw, 33vw"
                        />
                        <button
                          onClick={() => handleDownload(result.url)}
                          className="absolute top-2 right-2 rounded-full border border-border/60 bg-background/80 p-1.5 text-foreground opacity-100 transition-opacity lg:opacity-0 lg:group-hover:opacity-100"
                        >
                          <Download size={14} />
                        </button>
                      </div>
                      <div className="mt-2 flex items-center justify-between text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                        <span className="text-foreground">
                          {t('results.layer_label', { index: index + 1 })}
                        </span>
                        <span>{outputFormat}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex h-full flex-col items-center justify-center rounded-2xl border border-dashed border-border/60 bg-background/30 p-10 text-center">
                  <p className="text-sm font-semibold text-foreground">
                    {t('results.empty_title')}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {t('results.empty_subtitle')}
                  </p>
                </div>
              )}
            </div>


          </div>
        </div>

        {!embedded && (
          <div className="rounded-2xl border border-border/70 bg-card/60 p-5">
            <div className="flex items-center gap-3">
              <span className="inline-flex size-9 items-center justify-center rounded-full border border-border/60 bg-background/60 text-primary">
                <ImageUp className="size-4" />
              </span>
              <div>
                <h2 className="text-lg font-serif font-semibold text-foreground">
                  {t('examples.title')}
                </h2>
              </div>
            </div>
            <div className="mt-4 space-y-4">
              {exampleSets.map((set) => (
                <div key={set.title}>

                  <div className="flex gap-3 overflow-x-auto pb-2">
                    {set.images.map((image, index) => (
                      <button
                        key={`${image.src}-${index}`}
                        type="button"
                        onClick={() => handleExampleSelect(image.src)}
                        className="relative min-w-[120px] h-20 overflow-hidden rounded-xl border border-border/60 bg-background/40 text-left transition hover:border-primary/60 hover:bg-background/60"
                      >
                        <NextImage
                          src={image.src}
                          alt={image.label}
                          className="rounded-xl object-cover"
                          fill
                          sizes="120px"
                          quality={60}
                          loading="lazy"
                        />
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default QwenImageLayered;
