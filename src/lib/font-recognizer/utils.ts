/**
 * Font Recognizer Utility Functions
 * 字体识别工具函数
 */

import type { OCRResult } from "@/types/font-recognizer";

/**
 * 生成区分度高的颜色
 * 为文字块分配唯一且易于区分的颜色
 * 
 * @param count - 需要生成的颜色数量
 * @returns 颜色数组 (HSL 格式)
 */
export function generateDistinctColors(count: number): string[] {
  const colors: string[] = [];
  const hueStep = 360 / count;
  
  for (let i = 0; i < count; i++) {
    const hue = (i * hueStep) % 360;
    // 使用高饱和度和适中的亮度，确保在明暗主题下都可见
    const saturation = 75 + (i % 3) * 5;  // 75-85%
    const lightness = 55 + (i % 2) * 5;   // 55-60%
    colors.push(`hsl(${hue}, ${saturation}%, ${lightness}%)`);
  }
  
  return colors;
}

/**
 * 获取当前主题的颜色值
 * 从 CSS 变量中读取主题颜色
 * 
 * @param cssVariable - CSS 变量名 (如 '--background')
 * @returns 颜色值
 */
export function getThemeColor(cssVariable: string): string {
  if (typeof window === 'undefined') {
    return '';
  }
  
  return getComputedStyle(document.documentElement)
    .getPropertyValue(cssVariable)
    .trim();
}

/**
 * 验证图片文件格式
 * 
 * @param file - 文件对象
 * @returns 是否为有效格式
 */
export function validateImageFormat(file: File): boolean {
  const validFormats = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
  return validFormats.includes(file.type);
}

/**
 * 验证图片文件大小
 * 
 * @param file - 文件对象
 * @param maxSizeMB - 最大文件大小 (MB)
 * @returns 是否在大小限制内
 */
export function validateImageSize(file: File, maxSizeMB: number): boolean {
  const maxSizeBytes = maxSizeMB * 1024 * 1024;
  return file.size <= maxSizeBytes;
}

/**
 * 将文件转换为 base64
 * 
 * @param file - 文件对象
 * @returns Promise<base64 字符串>
 */
export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // 移除 data URL 前缀，只保留 base64 数据
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * 将文件转换为预览 URL
 * 
 * @param file - 文件对象
 * @returns Promise<预览 URL>
 */
export function fileToPreviewUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * 为 OCR 结果分配颜色
 * 
 * @param results - OCR 识别结果数组
 * @returns 带颜色的 OCR 结果数组
 */
export function assignColorsToOCRResults(results: Omit<OCRResult, 'color'>[]): OCRResult[] {
  const colors = generateDistinctColors(results.length);
  return results.map((result, index) => ({
    ...result,
    color: colors[index],
  }));
}

/**
 * 格式化文件大小
 * 
 * @param bytes - 字节数
 * @returns 格式化的文件大小字符串
 */
export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
