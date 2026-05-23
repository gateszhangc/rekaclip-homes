import { getUuid } from "@/lib/hash";
import { respErr, respData } from "@/lib/resp";
import { newStorage } from "@/lib/storage";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/upload-image");

export async function POST(req: Request) {
  try {
    const { image, type } = await req.json();
    log.info(
      { hasImage: Boolean(image), type, imageLength: image?.length },
      "upload-image request received"
    );

    // 1. Validate parameters
    if (!image) {
      log.warn("upload-image aborted: missing image");
      return respErr("Missing image");
    }

    const batch = getUuid();
    const storage = newStorage();

    // 3. Upload image to R2
    log.info({ batch, type }, "Starting image upload");
    const imageBuffer = Buffer.from(image.split(",")[1], "base64");
    const imageKey = `upload/${batch}_${type || "image"}.png`;
    log.info({ imageKey, bufferSize: imageBuffer.length }, "upload-image buffer ready");

    const uploadResult = await storage.uploadFile({
      body: imageBuffer,
      key: imageKey,
      contentType: "image/png",
      disposition: "inline",
    });
    log.info({ uploadResult }, "upload-image storage response");

    const imageUrl = `${process.env.STORAGE_DOMAIN}/${imageKey}`;
    log.info({ imageUrl, imageKey }, "upload-image success");

    // 4. Return response
    return respData({
      url: imageUrl,
      key: imageKey,
      batch: batch,
    });
  } catch (e) {
    log.error({ err: e }, "upload image fail");
    return respErr("upload image fail");
  }
}
