"use client";

/**
 * ImageUpload - 图片上传组件
 * 
 * 功能：
 * 1. 支持拖拽上传
 * 2. 支持点击选择文件
 * 3. 图片格式验证 (PNG, JPG, JPEG, WebP)
 * 4. 文件大小限制 (10MB)
 * 5. 图片预览
 * 6. 重新上传按钮
 */

import { useRef } from "react";
import { Button } from "@/components/ui/button";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import type { ImageUploadProps } from "@/types/font-recognizer";
import { 
  validateImageFormat, 
  validateImageSize,
  fileToPreviewUrl 
} from "@/lib/font-recognizer/utils";
import { 
  SUPPORTED_IMAGE_FORMATS,
  FILE_UPLOAD_LIMITS,
  ERROR_MESSAGES 
} from "@/lib/font-recognizer/constants";

export default function ImageUpload({
  onImageUpload,
  onReset,
  hasImage,
  config,
}: ImageUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * 处理文件上传
   */
  const handleFile = async (file: File) => {
    // 验证文件格式
    if (!validateImageFormat(file)) {
      toast.error(ERROR_MESSAGES.INVALID_FORMAT);
      return;
    }

    // 验证文件大小
    if (!validateImageSize(file, config.maxSize)) {
      toast.error(ERROR_MESSAGES.FILE_TOO_LARGE);
      return;
    }

    try {
      // 生成预览 URL
      const preview = await fileToPreviewUrl(file);
      
      // 调用父组件回调
      onImageUpload(file, preview);
      
      toast.success("图片上传成功");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(ERROR_MESSAGES.UPLOAD_FAILED);
    }
  };

  /**
   * 处理文件输入变化
   */
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void handleFile(file);
    }
  };

  /**
   * 处理拖拽放置
   */
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void handleFile(file);
    }
  };

  /**
   * 处理拖拽悬停
   */
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  /**
   * 触发文件选择
   */
  const triggerFileInput = () => {
    inputRef.current?.click();
  };

  /**
   * 处理键盘事件
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      triggerFileInput();
    }
  };

  // 如果已有图片，不显示上传区域
  if (hasImage) {
    return null;
  }

  return (
    <div
      className="w-full min-h-[420px] border-2 border-dashed border-muted-foreground/40 bg-muted/30 rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-4 cursor-pointer hover:border-primary/50 transition-colors"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onClick={triggerFileInput}
      role="button"
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {/* 上传图标 */}
      <div className="p-4 rounded-full bg-primary/10 text-primary">
        <Upload className="size-6" />
      </div>

      {/* 标题和描述 */}
      <div>
        <p className="text-lg font-semibold text-foreground">
          {config.title}
        </p>
        <p className="text-sm text-muted-foreground mt-1">
          {config.description}
        </p>
      </div>

      {/* 上传按钮 */}
      <Button type="button" size="lg">
        {config.buttonText}
      </Button>

      {/* 隐藏的文件输入 */}
      <input
        ref={inputRef}
        type="file"
        accept={SUPPORTED_IMAGE_FORMATS.join(",")}
        className="hidden"
        onChange={handleInputChange}
      />
    </div>
  );
}
