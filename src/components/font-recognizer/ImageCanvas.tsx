"use client";

/**
 * ImageCanvas - Canvas 图片显示和标注组件
 * 
 * 功能：
 * 1. Canvas 图片绘制
 * 2. 颜色生成算法
 * 3. 文字块矩形边框绘制
 * 4. 选中状态高亮显示
 * 5. 点击选择功能
 * 6. 主题切换监听和重绘
 */

import { useRef, useEffect, forwardRef, useImperativeHandle } from "react";
import type { ImageCanvasProps } from "@/types/font-recognizer";
import { getThemeColor } from "@/lib/font-recognizer/utils";
import { CANVAS_CONFIG } from "@/lib/font-recognizer/constants";

export interface ImageCanvasRef {
  cropSelectedText: (index: number) => string | null;
}

const ImageCanvas = forwardRef<ImageCanvasRef, ImageCanvasProps>(({
  imageUrl,
  ocrResults,
  selectedIndex,
  onTextSelect,
}, ref) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);

  /**
   * 暴露裁剪方法给父组件
   */
  useImperativeHandle(ref, () => ({
    cropSelectedText,
  }));

  /**
   * 绘制 Canvas
   */
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    
    if (!canvas || !image || !image.complete) {
      return;
    }

    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('[ImageCanvas] Failed to get canvas context');
      return;
    }

    // 设置 canvas 尺寸为图片尺寸
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;

    // 获取当前主题颜色
    const backgroundColor = getThemeColor('--background');
    
    // 清空画布并填充背景色
    ctx.fillStyle = backgroundColor || '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 绘制图片
    ctx.drawImage(image, 0, 0);

    // 绘制所有文字块的矩形边框
    ocrResults.forEach((result, index) => {
      const isSelected = index === selectedIndex;
      
      ctx.strokeStyle = result.color;
      ctx.lineWidth = isSelected 
        ? CANVAS_CONFIG.BORDER_WIDTH_SELECTED 
        : CANVAS_CONFIG.BORDER_WIDTH;
      ctx.globalAlpha = isSelected 
        ? CANVAS_CONFIG.BORDER_OPACITY_SELECTED 
        : CANVAS_CONFIG.BORDER_OPACITY;

      ctx.strokeRect(
        result.location.left,
        result.location.top,
        result.location.width,
        result.location.height
      );

      // 如果选中，添加填充效果
      if (isSelected) {
        ctx.fillStyle = result.color;
        ctx.globalAlpha = 0.1;
        ctx.fillRect(
          result.location.left,
          result.location.top,
          result.location.width,
          result.location.height
        );
      }
    });

    // 重置透明度
    ctx.globalAlpha = 1;

    console.log('[ImageCanvas] Canvas drawn with', ocrResults.length, 'text blocks');
  };

  /**
   * 裁剪选中的文字区域
   */
  const cropSelectedText = (index: number): string | null => {
    console.log('[ImageCanvas] cropSelectedText called with index:', index);
    const canvas = canvasRef.current;
    const image = imageRef.current;

    console.log('[ImageCanvas] Canvas:', canvas ? 'exists' : 'null');
    console.log('[ImageCanvas] Image:', image ? 'exists' : 'null');
    console.log('[ImageCanvas] OCR results length:', ocrResults.length);

    if (!canvas || !image || index < 0 || index >= ocrResults.length) {
      console.error('[ImageCanvas] Cannot crop: invalid state or index');
      return null;
    }

    try {
      const result = ocrResults[index];
      const loc = result.location;
      console.log('[ImageCanvas] Crop location:', loc);

      // 添加一些边距
      const padding = 10;
      const cropX = Math.max(0, loc.left - padding);
      const cropY = Math.max(0, loc.top - padding);
      const cropWidth = Math.min(image.naturalWidth - cropX, loc.width + padding * 2);
      const cropHeight = Math.min(image.naturalHeight - cropY, loc.height + padding * 2);

      console.log('[ImageCanvas] Crop dimensions:', { cropX, cropY, cropWidth, cropHeight });

      // 创建临时 canvas 用于裁剪
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = cropWidth;
      tempCanvas.height = cropHeight;
      const tempCtx = tempCanvas.getContext('2d');

      if (!tempCtx) {
        console.error('[ImageCanvas] Failed to get temp canvas context');
        return null;
      }

      // 绘制裁剪区域
      tempCtx.drawImage(
        image,
        cropX,
        cropY,
        cropWidth,
        cropHeight,
        0,
        0,
        cropWidth,
        cropHeight
      );

      // 转换为 base64
      const base64 = tempCanvas.toDataURL('image/png');
      console.log('[ImageCanvas] Text region cropped successfully, base64 length:', base64.length);

      return base64;
    } catch (error) {
      console.error('[ImageCanvas] Crop error:', error);
      return null;
    }
  };

  /**
   * 处理 Canvas 点击事件
   */
  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    
    const x = (event.clientX - rect.left) * scaleX;
    const y = (event.clientY - rect.top) * scaleY;

    // 查找点击位置对应的文字块
    for (let i = ocrResults.length - 1; i >= 0; i--) {
      const loc = ocrResults[i].location;
      if (
        x >= loc.left &&
        x <= loc.left + loc.width &&
        y >= loc.top &&
        y <= loc.top + loc.height
      ) {
        console.log('[ImageCanvas] Text block clicked:', i);
        const cropped = cropSelectedText(i);
        console.log('[ImageCanvas] Cropped result:', cropped ? 'success' : 'failed');
        onTextSelect(i, cropped);
        return;
      }
    }
  };

  /**
   * 加载图片
   */
  useEffect(() => {
    console.log('[ImageCanvas] Loading image:', imageUrl);
    
    const image = new Image();
    image.crossOrigin = 'anonymous';
    
    image.onload = () => {
      console.log('[ImageCanvas] Image loaded successfully');
      imageRef.current = image;
      drawCanvas();
    };

    image.onerror = (error) => {
      console.error('[ImageCanvas] Image load error:', error);
    };

    image.src = imageUrl;

    return () => {
      imageRef.current = null;
    };
  }, [imageUrl]);

  /**
   * 重绘 Canvas（当 OCR 结果或选中状态变化时）
   */
  useEffect(() => {
    drawCanvas();
  }, [ocrResults, selectedIndex]);

  /**
   * 监听主题变化
   */
  useEffect(() => {
    const observer = new MutationObserver(() => {
      console.log('[ImageCanvas] Theme changed, redrawing canvas');
      drawCanvas();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class', 'data-theme'],
    });

    return () => observer.disconnect();
  }, []);

  return (
    <div className="w-full h-full flex items-center justify-center bg-background">
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className="max-w-full max-h-full cursor-pointer"
        style={{ imageRendering: 'auto' }}
      />
    </div>
  );
});

ImageCanvas.displayName = 'ImageCanvas';

export default ImageCanvas;
