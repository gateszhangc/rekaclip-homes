/**
 * BaiduOCRClient - 百度 OCR API 客户端
 * 
 * 功能：
 * 1. Access Token 获取和缓存
 * 2. 文字识别 API 调用
 * 3. OCR 响应解析
 * 4. 坐标格式转换
 * 5. 错误处理和重试机制
 * 6. 日志记录
 */

import type { BaiduOCRResponse, OCRResult } from "@/types/font-recognizer";
import { assignColorsToOCRResults } from "./utils";
import { API_TIMEOUTS, RETRY_CONFIG } from "./constants";

export class BaiduOCRClient {
  private accessToken: string | null = null;
  private tokenExpiry: number = 0;
  private apiKey: string;
  private secretKey: string;

  constructor(apiKey: string, secretKey: string) {
    this.apiKey = apiKey;
    this.secretKey = secretKey;
  }

  /**
   * 获取 Access Token
   * 实现缓存机制，避免频繁请求
   */
  async getAccessToken(): Promise<string> {
    // 检查缓存的 token 是否还有效
    const now = Date.now();
    if (this.accessToken && this.tokenExpiry > now) {
      console.log('[BaiduOCR] Using cached access token');
      return this.accessToken;
    }

    console.log('[BaiduOCR] Fetching new access token');

    try {
      const response = await fetch(
        `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${this.apiKey}&client_secret=${this.secretKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to get access token: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.access_token) {
        throw new Error('No access token in response');
      }

      // 缓存 token，设置过期时间（提前 5 分钟过期以确保安全）
      this.accessToken = data.access_token;
      this.tokenExpiry = now + (data.expires_in - 300) * 1000;

      console.log('[BaiduOCR] Access token obtained successfully');
      return this.accessToken as string;
    } catch (error) {
      console.error('[BaiduOCR] Error getting access token:', error);
      throw error;
    }
  }

  /**
   * 识别图片中的文字
   * @param imageBase64 - base64 编码的图片（不包含 data URL 前缀）
   * @returns OCR 识别结果数组
   */
  async recognizeText(imageBase64: string): Promise<OCRResult[]> {
    console.log('[BaiduOCR] Starting text recognition');

    let lastError: Error | null = null;
    
    // 实现重试机制
    for (let attempt = 0; attempt < RETRY_CONFIG.MAX_RETRIES; attempt++) {
      try {
        if (attempt > 0) {
          console.log(`[BaiduOCR] Retry attempt ${attempt + 1}/${RETRY_CONFIG.MAX_RETRIES}`);
          // 等待一段时间后重试
          await new Promise(resolve => setTimeout(resolve, RETRY_CONFIG.RETRY_DELAY * attempt));
        }

        const accessToken = await this.getAccessToken();
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUTS.OCR);

        const response = await fetch(
          `https://aip.baidubce.com/rest/2.0/ocr/v1/accurate?access_token=${accessToken}`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded',
              'Accept': 'application/json',
            },
            body: `image=${encodeURIComponent(imageBase64)}`,
            signal: controller.signal,
          }
        );

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`OCR API request failed: ${response.statusText}`);
        }

        const data: BaiduOCRResponse = await response.json();
        
        // 解析响应并转换格式
        const results = this.parseOCRResponse(data);
        
        console.log(`[BaiduOCR] Text recognition completed, found ${results.length} text blocks`);
        return results;

      } catch (error) {
        lastError = error as Error;
        console.error(`[BaiduOCR] Error on attempt ${attempt + 1}:`, error);
        
        // 如果是最后一次尝试，抛出错误
        if (attempt === RETRY_CONFIG.MAX_RETRIES - 1) {
          throw lastError;
        }
      }
    }

    throw lastError || new Error('OCR recognition failed');
  }

  /**
   * 解析百度 OCR API 响应
   * @param response - 百度 OCR API 原始响应
   * @returns 标准化的 OCR 结果数组
   */
  private parseOCRResponse(response: BaiduOCRResponse): OCRResult[] {
    if (!response.words_result || !Array.isArray(response.words_result)) {
      console.warn('[BaiduOCR] Invalid response format, no words_result');
      return [];
    }

    console.log(`[BaiduOCR] Parsing ${response.words_result.length} text blocks`);

    // 转换为标准格式（不包含颜色）
    const resultsWithoutColor = response.words_result.map((item) => ({
      text: item.words,
      location: {
        left: item.location.left,
        top: item.location.top,
        width: item.location.width,
        height: item.location.height,
      },
      confidence: item.probability?.average,
    }));

    // 为每个结果分配唯一颜色
    const results = assignColorsToOCRResults(resultsWithoutColor);

    return results;
  }
}

/**
 * 创建 BaiduOCRClient 实例的工厂函数
 */
export function createBaiduOCRClient(): BaiduOCRClient {
  const apiKey = process.env.BAIDU_OCR_API_KEY || '';
  const secretKey = process.env.BAIDU_OCR_SECRET_KEY || '';

  if (!apiKey || !secretKey) {
    throw new Error('Baidu OCR API credentials not configured');
  }

  return new BaiduOCRClient(apiKey, secretKey);
}
