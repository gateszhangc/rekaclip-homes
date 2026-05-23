// AI Image Expander Types
export interface AspectRatio {
  id: string;
  label: string;
  ratio: [number, number]; // [width, height]
  icon: React.ReactNode;
  description: string;
}

export interface ErrorState {
  type: 'upload' | 'processing' | 'network' | 'auth';
  message: string;
  suggestion?: string;
  retryAction?: () => void;
}

export interface AIImageExpanderProps {
  className?: string;
  onImageSelected?: (file: File, uploadedImageUrl: string, aspectRatio?: AspectRatio) => void;
  onError?: (error: string) => void;
}

export interface AIImageExpanderState {
  // UI状态
  selectedImage: File | null;
  selectedAspectRatio: AspectRatio | null;
  
  // 上传状态
  isUploading: boolean;
  uploadedImageUrl: string | null;
  
  // 错误状态
  error: ErrorState | null;
}

export interface AIImageExpanderSecondProps {
  className?: string;
  onImageGenerated?: (imageUrl: string) => void;
  onError?: (error: string) => void;
  initialImage?: File | null;
  initialImageUrl?: string;
  initialAspectRatio?: AspectRatio | null;
  onUploadNew?: () => void;
}

export interface AIImageExpanderSecondState {
  // 图像状态
  originalImage: File | null;
  uploadedImageUrl: string | null;
  expandedImageUrl: string | null;
  originalDimensions: { width: number; height: number } | null;
  
  // 操作状态
  isUploading: boolean;
  isGenerating: boolean;
  selectedAspectRatio: AspectRatio | null;
  targetDimensions: { width: number; height: number } | null;
  
  // UI状态
  showComparison: boolean;
  
  // 用户状态
  userCredits: number;
  generationCost: number;
  
  // 错误状态
  error: ErrorState | null;
}

export interface ImageExpansion {
  uuid: string;
  user_uuid: string;
  created_at: string;
  base_image_url: string;
  expanded_image_url: string;
  original_aspect_ratio: string;
  target_aspect_ratio: string;
  original_dimensions: { width: number; height: number };
  target_dimensions: { width: number; height: number };
  description: string;
  status: ExpansionStatus;
}

export enum ExpansionStatus {
  Processing = 'processing',
  Completed = 'completed',
  Failed = 'failed'
}

export interface ExpanderConfig {
  maxFileSize: number; // 10MB
  supportedFormats: string[]; // ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
  generationCost: number; // 5 credits
  maxRetryAttempts: number; // 3
  defaultAspectRatio: string; // '16:9'
  maxImageDimension: number; // 2048px
}

export interface ExpandImageRequest {
  base_image_url: string;
  aspect_ratio: string;
  target_width?: number;
  target_height?: number;
  description: string;
  prompt?: string;
  negative_prompt?: string;
}

export interface ExpandImageResponse {
  code: number;
  message: string;
  data: {
    expanded_image_url: string;
    original_dimensions: { width: number; height: number };
    target_dimensions: { width: number; height: number };
    generation_id?: string;
    credits_used?: number;
  };
}