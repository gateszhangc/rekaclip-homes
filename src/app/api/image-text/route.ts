import { getUuid } from "@/lib/hash";
import { respErr, respData } from "@/lib/resp";
import { getUserUuid } from "@/services/auth_user";
import { getUserCredits, decreaseCredits, CreditsTransType } from "@/services/credit";
import { getIsoTimestr } from "@/lib/time";
import Replicate from "replicate";
import { createLogger } from "@/lib/logger";

// This model supports image-to-text generation
const model = "openai/gpt-5-nano";
const log = createLogger("api/image-text");

export async function POST(req: Request) {
  try {
    const { base_image_url, description } = await req.json();

    log.info({ base_image_url, description }, "image-text request received");

    if (!base_image_url || typeof base_image_url !== "string") {
      log.warn({ base_image_url }, "invalid base_image_url");
      return respErr("invalid base_image_url");
    }

    // Get user and verify credits
    const user_uuid = await getUserUuid();
    if (!user_uuid) {
      return respErr("Please sign in to use this feature");
    }

    const cost = parseInt(
      process.env.NEXT_PUBLIC_OUTFIT_GENERATION_COST || "5"
    );

    const { left_credits = 0 } = await getUserCredits(user_uuid);
    if (left_credits < cost) {
      return respErr(`Insufficient credits. You need ${cost} credits but only have ${left_credits}. Please purchase more credits.`);
    }

    const batch = getUuid();

    // Generate text description using AI
    const replicateClient = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    log.info({ model }, "Starting AI text generation");
    log.info({ prompt: description }, "image-text prompt");
    const useMock = process.env.MOCK_OUTFIT_GENERATION === "true";

    let generatedText: string;

    if (useMock) {
      // Mock output for testing
      generatedText = "这是一个测试描述文本。图像显示了一个美丽的场景，包含丰富的细节和色彩。";
      log.info({ generatedText }, "Using mock image-text generation output");
    } else {
      const output = await replicateClient.run(model as any, {
        input: {
          image_input: [base_image_url],
          prompt: description,
          messages: [],
          verbosity: "medium",
          reasoning_effort: "minimal"
        },
      });

      log.info({ output }, "AI generation output");

      if (!output) {
        throw new Error("No text generated");
      }

      // Parse the output array and join into complete text
      if (Array.isArray(output)) {
        generatedText = output.join('');
      } else {
        generatedText = String(output);
      }
    }

    log.info({ generatedText }, "Generated text ready");

    // Decrease credits
    await decreaseCredits({
      user_uuid,
      trans_type: CreditsTransType.OutfitGeneration,
      credits: cost,
    });

    // Return response with text description
    const responseBody = {
      description: generatedText,
      batch_id: batch,
      created_at: getIsoTimestr(),
    };
    log.info({ batch, generatedText: generatedText.substring(0, 100) + "...", user_uuid }, "image-text response ready");
    return respData(responseBody);
  } catch (e) {
    log.error({ err: e }, "generate image-text fail");
    return respErr("generate image-text fail");
  }
}