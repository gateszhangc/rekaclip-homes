import { getUuid } from "@/lib/hash";
import { respErr, respData } from "@/lib/resp";
import { getUserUuid } from "@/services/auth_user";
import { getUserCredits, decreaseCredits, CreditsTransType } from "@/services/credit";
import { newStorage } from "@/lib/storage";
import { getIsoTimestr } from "@/lib/time";
import { insertOutfit, OutfitStatus } from "@/models/outfit";
import Replicate from "replicate";
import { createLogger } from "@/lib/logger";

// This model needs to support image-to-image generation
const model = "qwen/qwen-image-layered";
const log = createLogger("api/gen-outfit");
const DEFAULT_OUTPUT_FORMAT = "webp";
const DEFAULT_OUTPUT_QUALITY = 95;
const DEFAULT_NUM_LAYERS = 4;
const LOCAL_HOSTNAMES = new Set(["localhost", "127.0.0.1", "0.0.0.0", "::1"]);
type StorageClient = ReturnType<typeof newStorage>;

const isDataUrl = (value: string) => value.startsWith("data:");

const getRequestOrigin = (req: Request): string | null => {
  const origin = req.headers.get("origin");
  if (origin) {
    return origin;
  }

  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  if (!host) {
    return null;
  }

  const proto = req.headers.get("x-forwarded-proto") ?? "http";
  return `${proto}://${host}`;
};

const resolveImageUrl = (req: Request, value: string): string => {
  if (isDataUrl(value)) {
    return value;
  }

  try {
    return new URL(value).toString();
  } catch {
    const origin = getRequestOrigin(req);
    if (!origin) {
      return value;
    }
    return new URL(value, origin).toString();
  }
};

const getExtensionFromUrl = (value: string): string => {
  const sanitized = value.split("?")[0].split("#")[0];
  const match = sanitized.match(/\.([a-zA-Z0-9]+)$/);
  const extension = match?.[1]?.toLowerCase();
  if (!extension) {
    return "png";
  }
  if (extension === "jpeg") {
    return "jpg";
  }
  if (extension === "png" || extension === "webp" || extension === "jpg") {
    return extension;
  }
  return "png";
};

const getContentTypeForExtension = (extension: string): string => {
  if (extension === "png") {
    return "image/png";
  }
  if (extension === "webp") {
    return "image/webp";
  }
  if (extension === "jpg") {
    return "image/jpeg";
  }
  return "application/octet-stream";
};

const ensureRemoteSourceImage = async (
  input: string,
  req: Request,
  storage: StorageClient,
  batch: string
): Promise<string> => {
  if (!input || isDataUrl(input)) {
    return input;
  }

  const resolvedUrl = resolveImageUrl(req, input);
  let parsed: URL;
  try {
    parsed = new URL(resolvedUrl);
  } catch {
    return resolvedUrl;
  }

  if (!LOCAL_HOSTNAMES.has(parsed.hostname)) {
    return resolvedUrl;
  }

  const extension = getExtensionFromUrl(parsed.pathname);
  const contentType = getContentTypeForExtension(extension);
  const uploadKey = `input/${batch}_source.${extension}`;
  const uploadResult = await storage.downloadAndUpload({
    url: resolvedUrl,
    key: uploadKey,
    contentType,
    disposition: "inline",
  });

  log.info({ resolvedUrl, uploadUrl: uploadResult.url }, "Uploaded local source image");
  return uploadResult.url;
};

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      base_image_url,
      image,
      description,
      aspect_ratio,
      resolution_input,
      num_layers,
      go_fast,
      output_format,
      output_quality,
      disable_safety_checker,
    } = body ?? {};
    // const base_image_url ='https://pub-0b4d65c47a354c96a93bef01c4b992f7.r2.dev/upload/2a81b0b0-eb19-4254-bafc-d1883ef5e36b_base.png';
    // const description='Enhance image clarity and sharpness while preserving the original subject, colors, lighting, and composition. Improve detail quality and reduce blur. Output at original resolution.';
    log.info(
      {
        base_image_url,
        image,
        description,
        aspect_ratio,
        resolution_input,
        num_layers,
        go_fast,
        output_format,
        output_quality,
      },
      "gen-outfit request received"
    );

    const isLayeredRequest = typeof image === "string";
    const sourceImage = isLayeredRequest ? image : base_image_url;

    if (!sourceImage || typeof sourceImage !== "string") {
      log.warn({ base_image_url, image }, "invalid base_image_url");
      return respErr(isLayeredRequest ? "invalid image" : "invalid base_image_url");
    }

    // 2. Get user and verify credits
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
    const resolvedSourceImage = await ensureRemoteSourceImage(
      sourceImage,
      req,
      storage,
      batch
    );

    const resolvedDescription =
      typeof description === "string" && description ? description : "auto";

    // 5. Generate outfit using AI with Nano Banana Pro image edit model
    const replicateClient = new Replicate({
      auth: process.env.REPLICATE_API_TOKEN,
    });

    log.info({ model }, "Starting AI generation");
    log.info({ prompt: resolvedDescription }, "gen-outfit prompt");
    const useMock = process.env.MOCK_OUTFIT_GENERATION === "true";

    let outputUrls: string[] = [];
    let fileExtension = "png";
    let contentType = "image/png";

    let resolvedOutputFormat = DEFAULT_OUTPUT_FORMAT;
    let normalizedOutputFormat = "webp";
    let resolvedOutputQuality = DEFAULT_OUTPUT_QUALITY;
    let resolvedNumLayers = DEFAULT_NUM_LAYERS;
    let resolvedGoFast = true;
    let resolvedDisableSafetyChecker = false;

    if (isLayeredRequest) {
      resolvedOutputFormat =
        typeof output_format === "string" && output_format
          ? output_format.toLowerCase()
          : DEFAULT_OUTPUT_FORMAT;
      normalizedOutputFormat =
        resolvedOutputFormat === "png" ? "png" : "webp";
      resolvedOutputQuality =
        typeof output_quality === "number"
          ? output_quality
          : DEFAULT_OUTPUT_QUALITY;
      resolvedNumLayers =
        typeof num_layers === "number" ? num_layers : DEFAULT_NUM_LAYERS;
      resolvedGoFast = typeof go_fast === "boolean" ? go_fast : true;
      resolvedDisableSafetyChecker =
        typeof disable_safety_checker === "boolean"
          ? disable_safety_checker
          : true;

      fileExtension = normalizedOutputFormat;
      contentType =
        normalizedOutputFormat === "png" ? "image/png" : "image/webp";
    }

    if (useMock) {
      if (isLayeredRequest) {
        outputUrls = [
          "https://pub-f6dab13c3cbf4c8c95f916516af9779f.r2.dev/gen/3db8c30e-43bf-4888-aee8-7910f214690d_layer_0.webp",
          "https://pub-f6dab13c3cbf4c8c95f916516af9779f.r2.dev/gen/3db8c30e-43bf-4888-aee8-7910f214690d_layer_1.webp",
          "https://pub-f6dab13c3cbf4c8c95f916516af9779f.r2.dev/gen/3db8c30e-43bf-4888-aee8-7910f214690d_layer_2.webp",
          "https://pub-f6dab13c3cbf4c8c95f916516af9779f.r2.dev/gen/3db8c30e-43bf-4888-aee8-7910f214690d_layer_3.webp",
        ];
        outputUrls = outputUrls.slice(0, resolvedNumLayers);
        log.info({ outputUrls }, "Using mock qwen-image-layered output");
      } else {
        outputUrls = [
          "https://pub-453ee7f62d7b43479f418b2674b1c1f0.r2.dev/gen/38d63328-01a4-409f-ba65-447a30ffba0c_outfit.png",
        ];
        log.info({ outputUrls }, "Using mock outfit generation output");
      }
    } else {
      if (isLayeredRequest) {
        const output = await replicateClient.run(model as any, {
          input: {
            image: resolvedSourceImage,
            go_fast: resolvedGoFast,
            num_layers: resolvedNumLayers,
            description: resolvedDescription,
            output_format: normalizedOutputFormat,
            output_quality: resolvedOutputQuality,
            disable_safety_checker: resolvedDisableSafetyChecker,
          },
        });

        log.info({ output }, "AI generation output");

        if (!output) {
          throw new Error("No images generated");
        }

        outputUrls = Array.isArray(output) ? output : [output];
      } else {
        const output = await replicateClient.run(model as any, {
          input: {
            // image_input: [base_image_url], // Qwen model expects an array
            image: resolvedSourceImage,
            prompt: resolvedDescription,
            aspect_ratio: aspect_ratio,
            output_format: "png",
            resolution: resolution_input,
          },
        });

        log.info({ output }, "AI generation output");

        if (!output) {
          throw new Error("No images generated");
        }

        outputUrls = Array.isArray(output) ? [output[0]] : [output];
      }
    }

    if (outputUrls.length === 0) {
      throw new Error("No images generated");
    }

    const createdAt = getIsoTimestr();
    const outfits: any[] = [];

    for (let index = 0; index < outputUrls.length; index += 1) {
      const outputUrl = outputUrls[index];
      const suffix = isLayeredRequest ? `_layer_${index}` : "_outfit";
      const generatedImageKey = `gen/${batch}${suffix}.${fileExtension}`;

      // 6. Download and upload generated image to R2
      log.info({ generatedImageKey }, "Downloading generated image");

      const uploadResult = await storage.downloadAndUpload({
        url: outputUrl,
        key: generatedImageKey,
        contentType,
        disposition: "inline",
      });

      const outfitUuid = outputUrls.length === 1 ? batch : getUuid();
      const outfit = {
        uuid: outfitUuid,
        user_uuid,
        created_at: createdAt,
        base_image_url: resolvedSourceImage,
        img_url: uploadResult.url,
        img_description: resolvedDescription,
        status: OutfitStatus.Active,
      };
      await insertOutfit(outfit);
      outfits.push(outfit);
    }

    // 7. Decrease credits
    await decreaseCredits({
      user_uuid,
      trans_type: CreditsTransType.OutfitGeneration,
      credits: cost,
    });

    // 9. Return response
    const responseBody = {
      outfits,
    };
    log.info({ batch, outputs: outfits.length, user_uuid }, "gen-outfit response ready");
    return respData(responseBody);
  } catch (e) {
    log.error({ err: e }, "generate outfit fail");
    return respErr("generate outfit fail");
  }
}
