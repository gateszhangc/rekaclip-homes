/**
 * Font Recognizer Constants
 * 字体识别常量定义
 */

/**
 * 支持的图片格式
 */
export const SUPPORTED_IMAGE_FORMATS = [
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
] as const;

/**
 * 支持的图片格式扩展名
 */
export const SUPPORTED_IMAGE_EXTENSIONS = [
  '.png',
  '.jpg',
  '.jpeg',
  '.webp',
] as const;

/**
 * 文件上传限制
 */
export const FILE_UPLOAD_LIMITS = {
  MAX_SIZE_MB: 10,
  MAX_SIZE_BYTES: 10 * 1024 * 1024,
} as const;

/**
 * API 端点
 */
export const API_ENDPOINTS = {
  RECOGNIZE_TEXT: '/api/recognize-text',
  RECOGNIZE_FONT: '/api/recognize-font',
} as const;

/**
 * API 超时设置 (毫秒)
 */
export const API_TIMEOUTS = {
  OCR: 30000,        // 30 秒
  FONT: 60000,       // 60 秒
} as const;

/**
 * 重试配置
 */
export const RETRY_CONFIG = {
  MAX_RETRIES: 3,
  RETRY_DELAY: 1000, // 1 秒
} as const;

/**
 * Canvas 配置
 */
export const CANVAS_CONFIG = {
  BORDER_WIDTH: 2,
  BORDER_WIDTH_SELECTED: 4,
  BORDER_OPACITY: 0.8,
  BORDER_OPACITY_SELECTED: 1,
} as const;

/**
 * 响应式断点 (像素)
 */
export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
} as const;

/**
 * 字体识别提示词
 */
export const FONT_RECOGNITION_PROMPT = 
  "Analyze the font style in this image. Recommend 10 similar Google Fonts. Return as JSON.";

/**
 * 错误消息
 */
export const ERROR_MESSAGES = {
  INVALID_FORMAT: "不支持的文件格式，请选择 PNG、JPG、JPEG 或 WebP 格式的图片",
  FILE_TOO_LARGE: "文件大小超过 10MB 限制，请选择较小的图片",
  UPLOAD_FAILED: "图片上传失败，请重试",
  OCR_FAILED: "文字识别失败，请检查网络连接后重试",
  FONT_RECOGNITION_FAILED: "字体识别失败，请重试",
  NETWORK_ERROR: "网络连接失败，请检查网络",
  CANVAS_NOT_SUPPORTED: "浏览器不支持 Canvas，请使用现代浏览器",
  IMAGE_LOAD_FAILED: "图片加载失败，请重新上传",
} as const;
