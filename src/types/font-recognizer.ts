/**
 * Font Recognizer Types
 * 图片文字识别和字体识别功能的类型定义
 */

/**
 * OCR 识别结果数据结构
 */
export interface OCRResult {
  text: string;              // 识别出的文字内容
  location: {
    left: number;            // 左上角 x 坐标
    top: number;             // 左上角 y 坐标
    width: number;           // 宽度
    height: number;          // 高度
  };
  color: string;             // 分配的颜色 (用于标注)
  confidence?: number;       // 识别置信度 (可选)
}

/**
 * 字体推荐数据结构
 */
export interface FontRecommendation {
  detectedFont: string;      // 识别出的字体名称
  confidence: number;        // 识别置信度
  similarFonts: Array<{
    name: string;            // 字体名称
    similarity: number;      // 相似度 (0-1)
    category: string;        // 字体类别
    googleFontsUrl?: string; // Google Fonts URL
  }>;
}

/**
 * 百度 OCR API 原始响应格式
 */
export interface BaiduOCRResponse {
  words_result: Array<{
    words: string;
    location: {
      left: number;
      top: number;
      width: number;
      height: number;
    };
    probability?: {
      average: number;
    };
  }>;
  words_result_num: number;
}

/**
 * 组件配置接口
 */
export interface FontRecognizerConfig {
  name: string;                          // 组件名称
  title: string;                         // 页面标题
  description: string;                   // 页面描述
  disabled?: boolean;                    // 是否禁用组件
  upload: {
    title: string;                       // 上传区域标题
    description: string;                 // 上传区域描述
    buttonText: string;                  // 上传按钮文字
    maxSize: number;                     // 最大文件大小 (MB)
    acceptedFormats: string[];           // 支持的格式
  };
  results: {
    imageTitle: string;                  // 图片区域标题
    textListTitle: string;               // 文字列表标题
    fontRecommendationTitle: string;     // 字体推荐标题
    detectedFontLabel: string;           // 识别字体标签
    similarFontsLabel: string;           // 相似字体标签
    selectTextPrompt: string;            // 选择文字提示
  };
  actions: {
    reuploadText: string;                // 重新上传按钮文字
  };
  messages: {
    uploadSuccess: string;               // 上传成功提示
    uploadError: string;                 // 上传失败提示
    recognitionSuccess: string;          // 识别成功提示
    recognitionError: string;            // 识别失败提示
    fontRecognitionSuccess: string;      // 字体识别成功提示
    fontRecognitionError: string;        // 字体识别失败提示
    processing: string;                  // 处理中提示
  };
}

/**
 * 主组件 Props
 */
export interface FontRecognizerProps {
  config: FontRecognizerConfig;          // 组件配置
}

/**
 * 主组件状态
 */
export interface FontRecognizerState {
  uploadedImage: string | null;          // 上传的图片 URL
  imageFile: File | null;                // 图片文件对象
  ocrResults: OCRResult[];               // OCR 识别结果
  selectedTextIndex: number | null;      // 当前选中的文字索引
  fontRecommendations: FontRecommendation | null; // 字体推荐结果
  isProcessing: boolean;                 // 是否正在处理
  error: string | null;                  // 错误信息
}

/**
 * ImageUpload 组件 Props
 */
export interface ImageUploadProps {
  onImageUpload: (file: File, preview: string) => void;
  onReset: () => void;
  hasImage: boolean;
  config: FontRecognizerConfig['upload'];
}

/**
 * ImageCanvas 组件 Props
 */
export interface ImageCanvasProps {
  imageUrl: string;
  ocrResults: OCRResult[];
  selectedIndex: number | null;
  onTextSelect: (index: number, croppedImage: string | null) => void;
}

/**
 * TextList 组件 Props
 */
export interface TextListProps {
  ocrResults: OCRResult[];
  selectedIndex: number | null;
  onTextSelect: (index: number, croppedImage: string | null) => void;
}

/**
 * FontRecommendation 组件 Props
 */
export interface FontRecommendationProps {
  recommendations: FontRecommendation | null;
  isLoading: boolean;
  config: {
    title: string;
    detectedFontLabel: string;
    similarFontsLabel: string;
    selectTextPrompt: string;
  };
}

/**
 * API 请求/响应类型
 */

// 文字识别请求
export interface RecognizeTextRequest {
  image: string; // base64 编码的图片
}

// 文字识别响应
export interface RecognizeTextResponse {
  code: number;
  message: string;
  data?: {
    results: OCRResult[];
  };
}

// 字体识别请求
export interface RecognizeFontRequest {
  image: string; // base64 编码的文字小图
}

// 字体识别响应
export interface RecognizeFontResponse {
  code: number;
  message: string;
  data?: FontRecommendation;
}

/**
 * 错误日志格式
 */
export interface ErrorLog {
  timestamp: string;
  errorType: 'upload' | 'ocr' | 'font' | 'canvas' | 'validation';
  errorMessage: string;
  errorStack?: string;
  context: {
    userId?: string;
    imageUrl?: string;
    apiEndpoint?: string;
    requestData?: any;
  };
}
