/**
 * Font Recognition API Route
 * 
 * 使用 Replicate API 识别图片中的字体
 */

import { ReplicateFontClient } from "@/lib/font-recognizer/ReplicateFontClient";
import { respErr, respData } from "@/lib/resp";
import { getUserUuid } from "@/services/auth_user";
import { getUserCredits, decreaseCredits, CreditsTransType } from "@/services/credit";

export async function POST(req: Request) {
  try {
    console.log('[API] Font recognition request received');

    // 解析请求
    const { image } = await req.json();

    if (!image) {
      return respErr('Image is required');
    }

    console.log('[API] Image received (base64):', image.substring(0, 50) + '...');

    // 获取用户并验证积分
    const user_uuid = await getUserUuid();
    if (!user_uuid) {
      return respErr("User not authenticated");
    }

    const cost = parseInt(
      process.env.NEXT_PUBLIC_OUTFIT_GENERATION_COST || "5"
    );

    const { left_credits = 0 } = await getUserCredits(user_uuid);
    if (left_credits < cost) {
      return respErr("Not enough credits");
    }

    // 验证 API Token
    const apiToken = process.env.REPLICATE_API_TOKEN;
    if (!apiToken) {
      console.error('[API] REPLICATE_API_TOKEN not configured');
      return respErr('Font recognition service not configured');
    }

    // 创建客户端
    const client = new ReplicateFontClient(apiToken, 60000);

    // 调用字体识别（传递 base64 图片）
    const result = await client.recognizeFont(image);

    console.log('[API] Font recognition completed:', result.detectedFont);

    // 扣减积分
    await decreaseCredits({
      user_uuid,
      trans_type: CreditsTransType.OutfitGeneration,
      credits: cost,
    });

    // 返回结果
    return respData({
      detectedFont: result.detectedFont,
      confidence: result.confidence,
      similarFonts: result.similarFonts,
    });

  } catch (error) {
    console.error('[API] Font recognition error:', error);
    return respErr(
      error instanceof Error ? error.message : 'Font recognition failed'
    );
  }
}
