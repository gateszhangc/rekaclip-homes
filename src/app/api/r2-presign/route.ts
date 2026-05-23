import { getUuid } from "@/lib/hash";
import { respData, respErr } from "@/lib/resp";
import { presignR2Put } from "@/lib/r2";
import { createLogger } from "@/lib/logger";

const log = createLogger("api/r2-presign");

function normalizePrefix(input?: string) {
  const raw = typeof input === "string" ? input : "upload";
  const cleaned = raw
    .toLowerCase()
    .replace(/[^a-z0-9/_-]/g, "")
    .replace(/\/{2,}/g, "/")
    .replace(/^\/|\/$/g, "");

  if (!cleaned || cleaned.includes("..")) {
    return "upload";
  }

  return cleaned;
}

export async function POST(req: Request) {
  try {
    const { type = "image/png", prefix } = await req.json();
    const safePrefix = normalizePrefix(prefix);

    const key = `${safePrefix}/${getUuid()}_base.png`;
    const { uploadUrl, publicUrl } = await presignR2Put({
      key,
      contentType: type,
      expiresInSeconds: 60 * 5,
    });

    return respData({ uploadUrl, key, publicUrl });
  } catch (err) {
    log.error({ err }, "r2 presign failed");
    return respErr("r2 presign failed");
  }
}
