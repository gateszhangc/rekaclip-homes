import { AwsClient } from "aws4fetch";
import { createLogger } from "@/lib/logger";

const log = createLogger("r2");

const {
  STORAGE_ENDPOINT,
  STORAGE_BUCKET,
  STORAGE_ACCESS_KEY,
  STORAGE_SECRET_KEY,
  STORAGE_REGION,
  STORAGE_DOMAIN,
} = process.env;

function getR2Client() {
  if (!STORAGE_ENDPOINT || !STORAGE_BUCKET) {
    throw new Error("R2 config missing: STORAGE_ENDPOINT or STORAGE_BUCKET");
  }
  if (!STORAGE_ACCESS_KEY || !STORAGE_SECRET_KEY) {
    throw new Error("R2 credentials missing");
  }

  return new AwsClient({
    accessKeyId: STORAGE_ACCESS_KEY,
    secretAccessKey: STORAGE_SECRET_KEY,
    service: "s3",
    region: STORAGE_REGION || "auto",
  });
}

export function buildR2PublicUrl(key: string) {
  if (STORAGE_DOMAIN) {
    return `${STORAGE_DOMAIN}/${key}`;
  }
  if (STORAGE_ENDPOINT && STORAGE_BUCKET) {
    return `${STORAGE_ENDPOINT.replace(/\/$/, "")}/${STORAGE_BUCKET}/${key}`;
  }
  return key;
}

export async function presignR2Put({
  key,
  contentType,
  expiresInSeconds = 300,
}: {
  key: string;
  contentType: string;
  expiresInSeconds?: number;
}) {
  const client = getR2Client();

  const baseUrl = `${STORAGE_ENDPOINT?.replace(/\/$/, "")}/${STORAGE_BUCKET}/${key}`;
  log.info({ baseUrl }, "baseUrl");
  const signedReq = await client.sign(baseUrl, {
    method: "PUT",
    headers: {
      "Content-Type": contentType,
    },
    aws: {
      signQuery: true,
      allHeaders: true,
      signExpires: expiresInSeconds, // aws4fetch ignores signExpires for s3, but keep for forward-compat
    },
  });

  const uploadUrl = signedReq.url;
  const publicUrl = buildR2PublicUrl(key);

  log.info({ key }, "r2 presign generated");

  return { uploadUrl, publicUrl };
}
