import sharp from "sharp";
import { getUuid } from "@/lib/hash";
import { respErr, respData } from "@/lib/resp";
import { getUserUuid } from "@/services/auth_user";
import { newStorage } from "@/lib/storage";
import { getIsoTimestr } from "@/lib/time";
import { insertOutfit, OutfitStatus } from "@/models/outfit";
import { createLogger } from "@/lib/logger";

export const runtime = "nodejs";

const log = createLogger("api/flip-image");

export async function POST(req: Request) {
  try {
    const { base_image_url, flip_type, description } = await req.json();

    log.info(
      { base_image_url, flip_type, description },
      "flip-image request received"
    );

    // Validate required parameters
    if (!base_image_url || typeof base_image_url !== "string") {
      log.warn({ base_image_url }, "invalid base_image_url");
      return respErr("invalid base_image_url");
    }

    if (!flip_type || !["horizontal", "vertical"].includes(flip_type)) {
      log.warn({ flip_type }, "invalid flip_type");
      return respErr("invalid flip_type, must be 'horizontal' or 'vertical'");
    }

    // Auth is optional for flip; use if available for logging/records only
    const user_uuid = await getUserUuid();

    const batch = getUuid();
    const storage = newStorage();

    log.info({ base_image_url }, "Downloading base image");
    const baseResp = await fetch(base_image_url);
    if (!baseResp.ok) {
      log.warn(
        { status: baseResp.status, statusText: baseResp.statusText },
        "Failed to fetch base image"
      );
      return respErr("Failed to fetch base image");
    }

    const baseBuffer = Buffer.from(await baseResp.arrayBuffer());

    log.info({ flip_type }, "Applying flip transformation");

    // Apply the appropriate flip transformation
    let sharpInstance = sharp(baseBuffer);

    if (flip_type === "horizontal") {
      sharpInstance = sharpInstance.flop(); // Horizontal flip (left-right)
    } else if (flip_type === "vertical") {
      sharpInstance = sharpInstance.flip(); // Vertical flip (top-bottom)
    }

    const flippedBuffer = await sharpInstance.png().toBuffer();

    const generatedImageKey = `gen/${batch}_${flip_type}_flip.png`;

    const uploadResult = await storage.uploadFile({
      body: flippedBuffer,
      key: generatedImageKey,
      contentType: "image/png",
      disposition: "inline",
    });

    const finalImageUrl = uploadResult.url;
    log.info({ finalImageUrl }, "Final image URL ready");

    // Create outfit record
    const outfit = user_uuid
      ? {
        uuid: batch,
        user_uuid,
        created_at: getIsoTimestr(),
        base_image_url: base_image_url,
        img_url: finalImageUrl,
        img_description: description || `${flip_type} flipped image`,
        status: OutfitStatus.Active,
      }
      : null;

    if (outfit) {
      await insertOutfit(outfit);
    }

    const responseBody = {
      flipped_image_url: finalImageUrl,
      original_image_url: base_image_url,
      flip_type: flip_type,
      outfits: outfit ? [outfit] : [],
    };

    log.info(
      { batch, finalImageUrl, user_uuid, flip_type },
      "flip-image response ready"
    );
    return respData(responseBody);
  } catch (e) {
    log.error({ err: e }, "flip image fail");
    return respErr("flip image fail");
  }
}
