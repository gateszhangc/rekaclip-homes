"use client";

/**
 * FontRecognizer - 图片文字识别和字体识别主组件
 * 
 * 功能：
 * 1. 图片上传和预览
 * 2. 使用百度 OCR API 进行文字识别
 * 3. 在图片上可视化标注识别出的文字
 * 4. 交互式文字选择
 * 5. 使用专业算法进行字体识别和推荐
 */

import { useState, useRef } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { toast } from "sonner";
import ImageUpload from "./ImageUpload";
import ImageCanvas, { ImageCanvasRef } from "./ImageCanvas";
import TextList from "./TextList";
import FontRecommendation from "./FontRecommendation";
import { uploadImageFile } from "@/lib/upload";
import { API_ENDPOINTS } from "@/lib/font-recognizer/constants";
import type { 
  FontRecognizerProps, 
  OCRResult, 
  FontRecommendation as FontRecommendationType,
  RecognizeTextResponse
} from "@/types/font-recognizer";

export default function FontRecognizer({ config }: FontRecognizerProps) {
  // 状态管理
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [ocrResults, setOcrResults] = useState<OCRResult[]>([]);
  const [selectedTextIndex, setSelectedTextIndex] = useState<number | null>(null);
  const [fontRecommendations, setFontRecommendations] = useState<FontRecommendationType | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isFontRecognizing, setIsFontRecognizing] = useState(false);
  
  // ImageCanvas ref，用于访问裁剪方法
  const imageCanvasRef = useRef<ImageCanvasRef>(null);

  // 组件禁用检查
  if (config.disabled) {
    return null;
  }

  /**
   * 处理图片上传
   */
  const handleImageUpload = async (file: File, preview: string) => {
    console.log('[FontRecognizer] Image uploaded:', file.name);
    
    setUploadedImage(preview);
    setImageFile(file);
    setOcrResults([]);
    setSelectedTextIndex(null);
    setFontRecommendations(null);
    setIsProcessing(true);

    try {
      // 上传图片到 R2 并获取 URL
      const { url, base64 } = await uploadImageFile(file, { type: "font-recognizer" });
      console.log('[FontRecognizer] Image uploaded to R2:', url);
      
      // 使用 base64 调用 OCR API（百度 OCR 需要 base64）
      const response = await fetch(API_ENDPOINTS.RECOGNIZE_TEXT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: base64 }),
      });

      if (!response.ok) {
        throw new Error('OCR request failed');
      }

      const data: RecognizeTextResponse = await response.json();

      if (data.code !== 0 || !data.data) {
        throw new Error(data.message || 'OCR failed');
      }

      setOcrResults(data.data.results);
      toast.success(config.messages.recognitionSuccess);
      console.log('[FontRecognizer] OCR completed, found', data.data.results.length, 'text blocks');

    } catch (error) {
      console.error('[FontRecognizer] OCR error:', error);
      toast.error(config.messages.recognitionError);
    } finally {
      setIsProcessing(false);
    }
  };

  /**
   * 处理重置
   */
  const handleReset = () => {
    console.log('[FontRecognizer] Resetting');
    setUploadedImage(null);
    setImageFile(null);
    setOcrResults([]);
    setSelectedTextIndex(null);
    setFontRecommendations(null);
  };

  /**
   * 处理文字选择
   */
  const handleTextSelect = async (index: number, croppedImage: string | null) => {
    console.log('[FontRecognizer] Text selected:', index);
    console.log('[FontRecognizer] Cropped image:', croppedImage ? 'exists' : 'null');
    setSelectedTextIndex(index);

    // 如果没有提供裁剪图片，尝试从 ImageCanvas 获取
    let finalCroppedImage = croppedImage;
    if (!finalCroppedImage && imageCanvasRef.current) {
      console.log('[FontRecognizer] No cropped image provided, trying to crop from canvas');
      finalCroppedImage = imageCanvasRef.current.cropSelectedText(index);
      console.log('[FontRecognizer] Canvas crop result:', finalCroppedImage ? 'success' : 'failed');
    }

    // 如果仍然没有裁剪图片，不进行字体识别
    if (!finalCroppedImage) {
      console.log('[FontRecognizer] No cropped image available, skipping font recognition');
      return;
    }

    // 开始字体识别
    setIsFontRecognizing(true);
    setFontRecommendations(null);

    try {
      console.log('[FontRecognizer] Starting font recognition');

      const response = await fetch(API_ENDPOINTS.RECOGNIZE_FONT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: finalCroppedImage }),
      });

      if (!response.ok) {
        throw new Error('Font recognition request failed');
      }

      const data = await response.json();

      if (data.code !== 0 || !data.data) {
        throw new Error(data.message || 'Font recognition failed');
      }

      setFontRecommendations(data.data);
      toast.success(config.messages.fontRecognitionSuccess);
      console.log('[FontRecognizer] Font recognition completed:', data.data.detectedFont);

    } catch (error) {
      console.error('[FontRecognizer] Font recognition error:', error);
      toast.error(config.messages.fontRecognitionError);
    } finally {
      setIsFontRecognizing(false);
    }
  };

  const hasImage = !!uploadedImage;

  return (
    <section >
      <div className="container mx-auto px-4">
        <div className="mx-auto w-full max-w-7xl">
          <Card className="p-4 sm:p-6 lg:p-8 shadow-xl border border-border/60">
            {/* 标题和描述 */}
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-foreground mb-2">
                {config.title}
              </h2>
              <p className="text-sm text-muted-foreground">
                {config.description}
              </p>
            </div>

            {/* 主要内容区域 */}
            {!hasImage ? (
              // 上传区域
              <ImageUpload
                onImageUpload={handleImageUpload}
                onReset={handleReset}
                hasImage={hasImage}
                config={config.upload}
              />
            ) : (
              <>
                {/* 顶部操作栏 */}
                <div className="flex items-center justify-between mb-4 p-3 rounded-lg bg-muted/40">
                  <div className="text-sm text-muted-foreground">
                    {imageFile?.name || 'Uploaded image'}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleReset}
                    >
                      {config.actions.reuploadText}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleReset}
                    >
                      <X className="size-4" />
                    </Button>
                  </div>
                </div>

                {/* 加载状态 */}
                {isProcessing && (
                  <div className="flex items-center justify-center py-8 mb-4">
                    <div className="flex flex-col items-center gap-2">
                      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                      <p className="text-sm text-muted-foreground">
                        {config.messages.processing}
                      </p>
                    </div>
                  </div>
                )}

                {/* 左右分栏布局 */}
                {!isProcessing && ocrResults.length > 0 && (
                  <div className="grid gap-6 lg:grid-cols-2">
                    {/* 左侧：图片显示区域 */}
                    <div className="rounded-2xl border bg-muted/40 p-6 flex flex-col gap-3">
                      <div className="text-sm text-muted-foreground">
                        {config.results.imageTitle}
                      </div>
                      <div className="flex-1 rounded-lg bg-background border overflow-hidden min-h-[420px] max-h-[600px]">
                        <ImageCanvas
                          ref={imageCanvasRef}
                          imageUrl={uploadedImage}
                          ocrResults={ocrResults}
                          selectedIndex={selectedTextIndex}
                          onTextSelect={handleTextSelect}
                        />
                      </div>
                    </div>

                    {/* 右侧：文字列表和字体推荐 */}
                    <div className="rounded-2xl border bg-muted/40 p-6 flex flex-col gap-3">
                      <div className="text-sm text-muted-foreground">
                        {config.results.textListTitle}
                      </div>
                      <div className="flex-1 rounded-lg bg-background border overflow-hidden min-h-[420px] max-h-[600px]">
                        <TextList
                          ocrResults={ocrResults}
                          selectedIndex={selectedTextIndex}
                          onTextSelect={handleTextSelect}
                        />
                      </div>

                      {/* 字体推荐区域 */}
                      <FontRecommendation
                        recommendations={fontRecommendations}
                        isLoading={isFontRecognizing}
                        config={{
                          title: config.results.fontRecommendationTitle,
                          detectedFontLabel: config.results.detectedFontLabel,
                          similarFontsLabel: config.results.similarFontsLabel,
                          selectTextPrompt: config.results.selectTextPrompt,
                        }}
                      />
                    </div>
                  </div>
                )}
              </>
            )}
          </Card>
        </div>
      </div>
    </section>
  );
}
