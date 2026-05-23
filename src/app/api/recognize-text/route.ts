/**
 * POST /api/recognize-text
 * 文字识别 API 路由
 * 
 * 功能：
 * 1. 接收 base64 编码的图片
 * 2. 调用百度 OCR API 进行文字识别
 * 3. 返回标准化的识别结果
 */

import { NextRequest, NextResponse } from 'next/server';
import { createBaiduOCRClient } from '@/lib/font-recognizer/BaiduOCRClient';
import type { RecognizeTextRequest, RecognizeTextResponse } from '@/types/font-recognizer';
import { getUserUuid } from '@/services/auth_user';
import { getUserCredits, decreaseCredits, CreditsTransType } from '@/services/credit';

export async function POST(request: NextRequest) {
  try {
    // 解析请求体
    const body: RecognizeTextRequest = await request.json();

    if (!body.image) {
      return NextResponse.json<RecognizeTextResponse>(
        {
          code: 400,
          message: 'Missing image data',
        },
        { status: 400 }
      );
    }

    // 获取用户并验证积分
    const user_uuid = await getUserUuid();
    if (!user_uuid) {
      return NextResponse.json<RecognizeTextResponse>(
        {
          code: 401,
          message: 'User not authenticated',
        },
        { status: 401 }
      );
    }

    const cost = parseInt(
      process.env.NEXT_PUBLIC_OUTFIT_GENERATION_COST || "5"
    );

    const { left_credits = 0 } = await getUserCredits(user_uuid);
    if (left_credits < cost) {
      return NextResponse.json<RecognizeTextResponse>(
        {
          code: 403,
          message: 'Not enough credits',
        },
        { status: 403 }
      );
    }

    console.log('[API] Starting text recognition');

    // 创建 OCR 客户端
    const ocrClient = createBaiduOCRClient();

    // 调用 OCR 识别
    const results = await ocrClient.recognizeText(body.image);

    console.log(`[API] Text recognition completed, found ${results.length} text blocks`);

    // 扣减积分
    await decreaseCredits({
      user_uuid,
      trans_type: CreditsTransType.OutfitGeneration,
      credits: cost,
    });

    // 返回成功响应
    return NextResponse.json<RecognizeTextResponse>({
      code: 0,
      message: 'Success',
      data: {
        results,
      },
    });

  } catch (error) {
    console.error('[API] Text recognition error:', error);

    return NextResponse.json<RecognizeTextResponse>(
      {
        code: 500,
        message: error instanceof Error ? error.message : 'Text recognition failed',
      },
      { status: 500 }
    );
  }
}
