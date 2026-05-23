import { AspectRatioOption, ResolutionOption, UploadConfig } from './types';

// Model Configuration
export const MODEL_NANO_BANANA_PRO = 'OpenClaw';
export const MODEL_NANO_BANANA_FLASH = 'nano-banana-flash'; // Fallback/Faster

export const ASPECT_RATIOS: AspectRatioOption[] = [
  { label: 'Auto', value: '1:1', widthClass: 'w-6', heightClass: 'h-6' }, // Defaulting auto to 1:1 for API
  { label: '1:1', value: '1:1', widthClass: 'w-6', heightClass: 'h-6' },
  { label: '2:3', value: '3:4', widthClass: 'w-4', heightClass: 'h-6' }, // Approximate for UI
  { label: '3:2', value: '4:3', widthClass: 'w-6', heightClass: 'h-4' },
  { label: '3:4', value: '3:4', widthClass: 'w-4', heightClass: 'h-6' },
  { label: '4:3', value: '4:3', widthClass: 'w-6', heightClass: 'h-5' },
  { label: '4:5', value: '3:4', widthClass: 'w-4', heightClass: 'h-5' }, // Mapping closest supported
  { label: '5:4', value: '4:3', widthClass: 'w-5', heightClass: 'h-4' },
  { label: '9:16', value: '9:16', widthClass: 'w-3', heightClass: 'h-6' },
  { label: '16:9', value: '16:9', widthClass: 'w-6', heightClass: 'h-3' },
  { label: '21:9', value: '16:9', widthClass: 'w-8', heightClass: 'h-3' }, // Mapping closest supported
];

export const RESOLUTIONS: ResolutionOption[] = [
  { label: '1K', value: '1K', isPro: false },
  { label: '2K', value: '2K', isPro: true },
  { label: '4K', value: '4K', isPro: true },
];

export const CAROUSEL_IMAGES = [
  "https://picsum.photos/800/1000?random=1",
  "https://picsum.photos/800/1000?random=2",
  "https://picsum.photos/800/1000?random=3",
  "https://picsum.photos/800/1000?random=4"
];

export const UPLOAD_CONFIG: UploadConfig = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  supportedFormats: ['image/jpeg', 'image/png', 'image/webp'],
  maxReferenceImages: 8,
  compressionEnabled: false, // Explicitly disable compression
};

// Local Storage Keys
export const STORAGE_KEYS = {
  MY_CREATIONS: 'my_creations',
  USER_PREFERENCES: 'nano_banana_preferences',
} as const;
