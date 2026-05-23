import sharp from "sharp";
import { getUuid } from "@/lib/hash";
import { respErr, respData } from "@/lib/resp";
import { getUserUuid } from "@/services/auth_user";
import {
  CreditsTransType,
  decreaseCredits,
  getUserCredits,
} from "@/services/credit";
import { newStorage } from "@/lib/storage";
import { getIsoTimestr } from "@/lib/time";
import { insertOutfit, OutfitStatus } from "@/models/outfit";
import { createLogger } from "@/lib/logger";

export const runtime = "nodejs";

const log = createLogger("api/invert-image");

export async function POST(req: Request) {
  try {
    const { base_image_url, description = "Inverted image" } = await req.json();

    log.info(
      { base_image_url, description },
      "invert-image request received"
    );

    if (!base_image_url || typeof base_image_url !== "string") {
      log.warn({ base_image_url }, "invalid base_image_url");
      return respErr("invalid base_image_url");
    }

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

    log.info("Inverting image colors");
    const invertedBuffer = await sharp(baseBuffer)
      .negate({ alpha: false })
      .png()
      .toBuffer();

    const generatedImageKey = `gen/${batch}_invert.png`;

    const uploadResult = await storage.uploadFile({
      body: invertedBuffer,
      key: generatedImageKey,
      contentType: "image/png",
      disposition: "inline",
    });

    const finalImageUrl = uploadResult.url;
    log.info({ finalImageUrl }, "Final image URL ready");

    await decreaseCredits({
      user_uuid,
      trans_type: CreditsTransType.OutfitGeneration,
      credits: cost,
    });

    const outfit = {
      uuid: batch,
      user_uuid,
      created_at: getIsoTimestr(),
      base_image_url: base_image_url,
      img_url: finalImageUrl,
      img_description: description,
      status: OutfitStatus.Active,
    };

    await insertOutfit(outfit);

    const responseBody = {
      outfits: [outfit],
    };
    log.info(
      { batch, finalImageUrl, user_uuid },
      "invert-image response ready"
    );
    return respData(responseBody);
  } catch (e) {
    log.error({ err: e }, "invert image fail");
    return respErr("invert image fail");
  }
}
