import { ExpanderConfig } from '@/types/ai-image-expander';

export const AI_IMAGE_EXPANDER_CONFIG: ExpanderConfig = {
  maxFileSize: 10 * 1024 * 1024, // 10MB
  supportedFormats: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  generationCost: 5, // 5 credits
  maxRetryAttempts: 3,
  defaultAspectRatio: '16:9',
  maxImageDimension: 2048,
};

export const ASPECT_RATIOS = [
  { 
    id: '1:1', 
    label: '1:1', 
    ratio: [1, 1] as [number, number], 
    icon: null, // Will be set in component
    description: '正方形' 
  },
  { 
    id: '2:3', 
    label: '2:3', 
    ratio: [2, 3] as [number, number], 
    icon: null,
    description: '竖版照片' 
  },
  { 
    id: '3:2', 
    label: '3:2', 
    ratio: [3, 2] as [number, number], 
    icon: null,
    description: '横版照片' 
  },
  { 
    id: '16:9', 
    label: '16:9', 
    ratio: [16, 9] as [number, number], 
    icon: null,
    description: '宽屏显示器' 
  },
  { 
    id: '9:16', 
    label: '9:16', 
    ratio: [9, 16] as [number, number], 
    icon: null,
    description: '手机屏幕' 
  },
  { 
    id: '3:4', 
    label: '3:4', 
    ratio: [3, 4] as [number, number], 
    icon: null,
    description: '传统照片' 
  },
  { 
    id: '4:3', 
    label: '4:3', 
    ratio: [4, 3] as [number, number], 
    icon: null,
    description: '经典显示器' 
  },
];