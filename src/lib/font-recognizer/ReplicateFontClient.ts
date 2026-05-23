/**
 * ReplicateFontClient - Replicate API 字体识别客户端
 * 
 * 使用 Replicate API 调用 Google Gemini 模型进行字体识别
 */

import Replicate from "replicate";

export interface FontRecognitionResult {
  detectedFont: string;
  confidence: number;
  similarFonts: Array<{
    name: string;
    similarity: number;
    category: string;
    googleFontsUrl?: string;
  }>;
}

export class ReplicateFontClient {
  private client: Replicate;
  private model: string;
  private timeout: number;

  constructor(apiToken: string, timeout: number = 60000) {
    this.client = new Replicate({
      auth: apiToken,
    });
    // 使用 Gemini Flash 模型进行视觉分析
    this.model = "google/gemini-3-pro";
    this.timeout = timeout;
  }

  /**
   * 识别字体
   */
  async recognizeFont(imageUrl: string): Promise<FontRecognitionResult> {
    console.log('[ReplicateFontClient] Starting font recognition');
    console.log('[ReplicateFontClient] Image URL:', imageUrl);

    try {
      const prompt = `Analyze the font style in this image. Identify the font and recommend 10 similar Google Fonts that match the style. 

Return your response as a JSON object with this exact structure:
{
  "detectedFont": "Font name or description",
  "confidence": 0.85,
  "similarFonts": [
    {
      "name": "Roboto",
      "similarity": 0.95,
      "category": "sans-serif",
      "googleFontsUrl": "https://fonts.google.com/specimen/Roboto"
    }
  ]
}

Important:
- Provide exactly 10 similar fonts
- Use real Google Fonts names
- Include similarity scores (0-1)
- Include font categories (serif, sans-serif, display, handwriting, monospace)
- Include Google Fonts URLs`;

      const output = await Promise.race([
        this.client.run(this.model as any, {
          input: {
            prompt: prompt,
            image: imageUrl,
          },
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Font recognition timeout')), this.timeout)
        ),
      ]);

      console.log('[ReplicateFontClient] Raw output:', output);

      // 解析响应
      const result = this.parseResponse(output);
      console.log('[ReplicateFontClient] Parsed result:', result);

      return result;
    } catch (error) {
      console.error('[ReplicateFontClient] Font recognition error:', error);
      throw new Error(`Font recognition failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * 解析 API 响应
   */
  private parseResponse(output: any): FontRecognitionResult {
    try {
      // Gemini 模型的输出可能是字符串或对象
      let responseText: string;

      if (typeof output === 'string') {
        responseText = output;
      } else if (Array.isArray(output)) {
        responseText = output.join('');
      } else if (output && typeof output === 'object') {
        responseText = JSON.stringify(output);
      } else {
        throw new Error('Invalid output format');
      }

      // 尝试提取 JSON
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in response');
      }

      const parsed = JSON.parse(jsonMatch[0]);

      // 验证响应格式
      if (!parsed.detectedFont || !parsed.similarFonts || !Array.isArray(parsed.similarFonts)) {
        throw new Error('Invalid response format');
      }

      return {
        detectedFont: parsed.detectedFont,
        confidence: parsed.confidence || 0.8,
        similarFonts: parsed.similarFonts.map((font: any) => ({
          name: font.name,
          similarity: font.similarity || 0.8,
          category: font.category || 'sans-serif',
          googleFontsUrl: font.googleFontsUrl || `https://fonts.google.com/specimen/${encodeURIComponent(font.name)}`,
        })),
      };
    } catch (error) {
      console.error('[ReplicateFontClient] Parse error:', error);
      
      // 返回默认结果
      return {
        detectedFont: 'Unable to identify font',
        confidence: 0.5,
        similarFonts: this.getDefaultFonts(),
      };
    }
  }

  /**
   * 获取默认字体推荐
   */
  private getDefaultFonts() {
    return [
      {
        name: 'Roboto',
        similarity: 0.8,
        category: 'sans-serif',
        googleFontsUrl: 'https://fonts.google.com/specimen/Roboto',
      },
      {
        name: 'Open Sans',
        similarity: 0.75,
        category: 'sans-serif',
        googleFontsUrl: 'https://fonts.google.com/specimen/Open+Sans',
      },
      {
        name: 'Lato',
        similarity: 0.7,
        category: 'sans-serif',
        googleFontsUrl: 'https://fonts.google.com/specimen/Lato',
      },
      {
        name: 'Montserrat',
        similarity: 0.7,
        category: 'sans-serif',
        googleFontsUrl: 'https://fonts.google.com/specimen/Montserrat',
      },
      {
        name: 'Poppins',
        similarity: 0.65,
        category: 'sans-serif',
        googleFontsUrl: 'https://fonts.google.com/specimen/Poppins',
      },
      {
        name: 'Inter',
        similarity: 0.65,
        category: 'sans-serif',
        googleFontsUrl: 'https://fonts.google.com/specimen/Inter',
      },
      {
        name: 'Raleway',
        similarity: 0.6,
        category: 'sans-serif',
        googleFontsUrl: 'https://fonts.google.com/specimen/Raleway',
      },
      {
        name: 'Nunito',
        similarity: 0.6,
        category: 'sans-serif',
        googleFontsUrl: 'https://fonts.google.com/specimen/Nunito',
      },
      {
        name: 'Ubuntu',
        similarity: 0.55,
        category: 'sans-serif',
        googleFontsUrl: 'https://fonts.google.com/specimen/Ubuntu',
      },
      {
        name: 'Work Sans',
        similarity: 0.55,
        category: 'sans-serif',
        googleFontsUrl: 'https://fonts.google.com/specimen/Work+Sans',
      },
    ];
  }
}
