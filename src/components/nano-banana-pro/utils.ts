import { GeneratedImage, LocalStorageData, GenerationMode } from './types';
import { STORAGE_KEYS, UPLOAD_CONFIG } from './constants';

/**
 * Convert file to Base64 string
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });
};

/**
 * Validate uploaded file
 */
export const validateFile = (file: File): { valid: boolean; error?: string } => {
  // Check file size
  if (file.size > UPLOAD_CONFIG.maxFileSize) {
    return {
      valid: false,
      error: `File size cannot exceed ${UPLOAD_CONFIG.maxFileSize / (1024 * 1024)}MB`
    };
  }

  // Check file format
  if (!UPLOAD_CONFIG.supportedFormats.includes(file.type)) {
    return {
      valid: false,
      error: `Unsupported file format. Supported formats: ${UPLOAD_CONFIG.supportedFormats.join(', ')}`
    };
  }

  return { valid: true };
};

/**
 * Get my creations from local storage
 */
export const getMyCreations = (): GeneratedImage[] => {
  // Check if we're in the browser
  if (typeof window === 'undefined') {
    return [];
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.MY_CREATIONS);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading my creations:', error);
    return [];
  }
};

/**
 * Save creation to local storage
 */
export const saveCreation = (creation: GeneratedImage): void => {
  // Check if we're in the browser
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    const existing = getMyCreations();
    const updated = [creation, ...existing];
    localStorage.setItem(STORAGE_KEYS.MY_CREATIONS, JSON.stringify(updated));
  } catch (error) {
    console.error('Error saving creation:', error);
  }
};

/**
 * Delete creation from local storage
 */
export const deleteCreation = (id: string): void => {
  // Check if we're in the browser
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    const existing = getMyCreations();
    const updated = existing.filter(creation => creation.id !== id);
    localStorage.setItem(STORAGE_KEYS.MY_CREATIONS, JSON.stringify(updated));
  } catch (error) {
    console.error('Error deleting creation:', error);
  }
};

/**
 * Get user preferences
 */
export const getUserPreferences = () => {
  // Check if we're in the browser
  if (typeof window === 'undefined') {
    return {
      defaultAspectRatio: 'Auto',
      defaultResolution: '1K',
      defaultMode: GenerationMode.IMAGE_TO_IMAGE,
    };
  }
  
  try {
    const stored = localStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
    return stored ? JSON.parse(stored) : {
      defaultAspectRatio: 'Auto',
      defaultResolution: '1K',
      defaultMode: GenerationMode.IMAGE_TO_IMAGE,
    };
  } catch (error) {
    console.error('Error loading user preferences:', error);
    return {
      defaultAspectRatio: 'Auto',
      defaultResolution: '1K',
      defaultMode: GenerationMode.IMAGE_TO_IMAGE,
    };
  }
};

/**
 * Save user preferences
 */
export const saveUserPreferences = (preferences: any): void => {
  // Check if we're in the browser
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    localStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(preferences));
  } catch (error) {
    console.error('Error saving user preferences:', error);
  }
};

/**
 * Download image
 */
export const downloadImage = (url: string, filename?: string): void => {
  // Check if we're in the browser
  if (typeof window === 'undefined') {
    return;
  }
  
  try {
    const defaultFilename = filename || `caricature-maker-${Date.now()}.png`;
    const downloadUrl = `/api/wallpaper/download?src=${encodeURIComponent(url)}&filename=${encodeURIComponent(defaultFilename)}`;
    
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = defaultFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('Download failed:', error);
  }
};

/**
 * Format timestamp
 */
export const formatTimestamp = (timestamp: number): string => {
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};
