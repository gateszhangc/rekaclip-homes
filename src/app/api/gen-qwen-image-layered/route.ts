import { getUuid } from "@/lib/hash";
import { respErr, respData } from "@/lib/resp";
import { getUserUuid } from "@/services/auth_user";
import {
  getUserCredits,
  decreaseCredits,
  CreditsTransType,
} from "@/services/credit";
import { newStorage } from "@/lib/storage";
import { getIsoTimestr } from "@/lib/time";
import { insertOutfit, OutfitStatus } from "@/models/outfit";
import Replicate from "replicate";
import { createLogger } from "@/lib/logger";

const model = "qwen/qwen-image-layered";
const log = createLogger("api/gen-qwen-image-layered");

const DEFAULT_OUTPUT_FORMAT = "webp";
const DEFAULT_OUTPUT_QUALITY = 95;
const DEFAULT_NUM_LAYERS = 4;

export async function POST(req: Request) {
  try {
    const {
      image,
      description,
      num_layers,
      go_fast,
      output_format,
      output_quality,
    } = await req.json();

    log.info(
      { image, description, num_layers, go_fast, output_format, output_quality },
      "gen-qwen-image-layered request received"
    );

    if (!image || typeof image !== "string") {
      log.warn({ image }, "invalid image");
      return respErr("invalid image");
    }

    // Get user and verify credits
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

    const batch = getUuid();
    const storage = newStorage();

    // Generate layered images via Replicate
    const replicateClient = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    log.info({ model }, "Starting AI generation");
    const useMock = process.env.MOCK_OUTFIT_GENERATION === "true";

    let outputUrls: string[] = [];
    const resolvedDescription = typeof description === "string" && description
      ? description
      : "auto";
    const resolvedOutputFormat =
      typeof output_format === "string" && output_format
        ? output_format.toLowerCase()
        : DEFAULT_OUTPUT_FORMAT;
    const normalizedOutputFormat =
      resolvedOutputFormat === "png" ? "png" : "webp";
    const resolvedOutputQuality =
      typeof output_quality === "number" ? output_quality : DEFAULT_OUTPUT_QUALITY;
    const resolvedNumLayers =
      typeof num_layers === "number" ? num_layers : DEFAULT_NUM_LAYERS;
    const resolvedGoFast = typeof go_fast === "boolean" ? go_fast : true;

    if (useMock) {
      outputUrls = [
        "https://pub-f6dab13c3cbf4c8c95f916516af9779f.r2.dev/gen/3db8c30e-43bf-4888-aee8-7910f214690d_layer_0.webp",
        "https://pub-f6dab13c3cbf4c8c95f916516af9779f.r2.dev/gen/3db8c30e-43bf-4888-aee8-7910f214690d_layer_1.webp",
        "https://pub-f6dab13c3cbf4c8c95f916516af9779f.r2.dev/gen/3db8c30e-43bf-4888-aee8-7910f214690d_layer_2.webp",
        "https://pub-f6dab13c3cbf4c8c95f916516af9779f.r2.dev/gen/3db8c30e-43bf-4888-aee8-7910f214690d_layer_3.webp",
      ];
      log.info({ outputUrls }, "Using mock qwen-image-layered output");
    } else {
      const output = await replicateClient.run(model as any, {
        input: {
          image,
          go_fast: resolvedGoFast,
          num_layers: resolvedNumLayers,
          description: resolvedDescription,
          output_format: normalizedOutputFormat,
          output_quality: resolvedOutputQuality,
        },
      });

      log.info({ output }, "AI generation output");

      if (!output) {
        throw new Error("No images generated");
      }

      outputUrls = Array.isArray(output) ? output : [output];
    }

    if (outputUrls.length === 0) {
      throw new Error("No images generated");
    }

    const fileExtension = normalizedOutputFormat;
    const contentType =
      normalizedOutputFormat === "png" ? "image/png" : "image/webp";
    const createdAt = getIsoTimestr();

    const outfits: any[] = [];

    for (let index = 0; index < outputUrls.length; index += 1) {
      const outputUrl = outputUrls[index];
      const generatedImageKey = `gen/${batch}_layer_${index}.${fileExtension}`;

      log.info({ generatedImageKey }, "Downloading generated image");
      const uploadResult = await storage.downloadAndUpload({
        url: outputUrl,
        key: generatedImageKey,
        contentType,
        disposition: "inline",
      });

      const outfit = {
        uuid: getUuid(),
        user_uuid,
        created_at: createdAt,
        base_image_url: image,
        img_url: uploadResult.url,
        img_description: resolvedDescription,
        status: OutfitStatus.Active,
      };

      await insertOutfit(outfit);
      outfits.push(outfit);
    }

    // Decrease credits once per request
    await decreaseCredits({
      user_uuid,
      trans_type: CreditsTransType.OutfitGeneration,
      credits: cost,
    });

    const responseBody = { outfits };
    log.info({ batch, user_uuid }, "gen-qwen-image-layered response ready");
    return respData(responseBody);
  } catch (e) {
    log.error({ err: e }, "generate qwen-image-layered fail");
    return respErr("generate qwen-image-layered fail");
  }
}
