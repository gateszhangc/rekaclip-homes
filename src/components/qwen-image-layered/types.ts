export interface GeneratedImage {
  id: string;
  url: string; // Data URL or remote URL
  prompt: string;
  createdAt: number;
  aspectRatio: string;
  model: string;
  mode: GenerationMode;
}

export enum GenerationMode {
  TEXT_TO_IMAGE = 'TEXT_TO_IMAGE',
  IMAGE_TO_IMAGE = 'IMAGE_TO_IMAGE'
}

export interface AspectRatioOption {
  label: string;
  value: string; // API format (e.g., "16:9")
  widthClass: string; // Tailwind class for visual representation
  heightClass: string;
}

export interface ResolutionOption {
  label: string;
  value: string; // "1K", "2K", "4K"
  isPro: boolean;
}

export interface QwenImageLayeredProps {
  className?: string;
  showHeader?: boolean;
  embedded?: boolean; // For homepage embedded mode
}

export interface MyCreationsProps {
  title?: string;
  description?: string;
  maxItems?: number; // For homepage preview mode
  showViewAll?: boolean;
  creations: GeneratedImage[]; // Replaces wallpaper's wallpapers property
}

export interface GenerateImageRequest {
  image: string;
  description?: string;
  num_layers?: number;
  go_fast?: boolean;
  output_format?: string;
  output_quality?: number;
}

export interface LocalStorageData {
  my_creations: GeneratedImage[];
  user_preferences: {
    defaultAspectRatio: string;
    defaultResolution: string;
    defaultMode: GenerationMode;
  };
}

export interface UploadConfig {
  maxFileSize: number;      // 10MB
  supportedFormats: string[]; // ['image/jpeg', 'image/png', 'image/webp']
  maxReferenceImages: number; // 8
  compressionEnabled: false;  // Explicitly disable compression
}
