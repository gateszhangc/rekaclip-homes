import { createLogger } from "@/lib/logger";

const log = createLogger("r2-upload");

interface PresignResponse {
  uploadUrl: string;
  key: string;
  publicUrl?: string;
}

export async function getR2Presign(type: string, prefix?: string): Promise<PresignResponse> {
  const resp = await fetch("/api/r2-presign", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, prefix }),
    credentials: "include",
  });
  if (!resp.ok) {
    throw new Error(`Failed to get upload url (HTTP ${resp.status})`);
  }

  const data = await resp.json().catch(() => {
    throw new Error("Invalid response from upload service");
  });

  if (data.code !== 0 || !data.data?.uploadUrl) {
    throw new Error(data.message || "presign failed");
  }
  return data.data as PresignResponse;
}

export async function uploadFileToR2(
  file: File,
  options?: { prefix?: string }
) {
  const presign = await getR2Presign(file.type, options?.prefix);

  const uploadResp = await fetch(presign.uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": file.type },
    body: file,
  });

  if (!uploadResp.ok) {
    throw new Error("Upload to R2 failed");
  }

  log.info(
    { key: presign.key, size: file.size, type: file.type },
    "upload to r2 success"
  );

  return {
    key: presign.key,
    url: presign.publicUrl || presign.key,
  };
}
