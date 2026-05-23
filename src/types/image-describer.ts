export enum DescribeOption {
  DETAIL = 'Describe in Detail',
  BRIEF = 'Describe Briefly',
  PERSON = 'Describe Person',
  OBJECTS = 'Recognize Objects',
  ART_STYLE = 'Analyze Art Style',
  EXTRACT_TEXT = 'Extract Text from Image',
  GENERAL_PROMPT = 'General Image Prompt',
  FLUX_PROMPT = 'Flux Prompt',
  MIDJOURNEY = 'Midjourney Prompt',
  STABLE_DIFFUSION = 'Stable Diffusion Prompt',
  CUSTOM = 'Custom Question'
}

export interface HistoryItem {
  id: string;
  timestamp: string;
  imagePreview: string; // Base64 thumbnail or URL
  option: DescribeOption;
  result: string;
}

export interface ErrorState {
  type: 'generation' | 'network' | 'validation' | 'api' | 'upload' | 'auth' | 'credits';
  message: string;
  suggestion?: string;
  retryAction?: () => void;
}

export const LANGUAGES = [
  'English',
  'Chinese (Simplified)',
  'Chinese (Traditional)',
  'Spanish',
  'French',
  'German',
  'Japanese',
  'Korean',
  'Portuguese',
  'Russian'
];