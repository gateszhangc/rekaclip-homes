import JSZip from "jszip";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const fetchCache = "force-no-store";

const isHttpUrl = (value: string) => {
  try {
    const parsed = new URL(value);
    return ["http:", "https:"].includes(parsed.protocol);
  } catch {
    return false;
  }
};

const sanitizeFilename = (value: string) => {
  return value.replace(/[^\w\-.]+/g, "_").slice(0, 120);
};

const buildContentDisposition = (filename: string) => {
  const asciiFallback = filename.replace(/[^\x20-\x7E]+/g, "_");
  const utf8Name = encodeURIComponent(filename);
  return `attachment; filename="${asciiFallback}"; filename*=UTF-8''${utf8Name}`;
};

const getExtension = (contentType: string | null, fallbackUrl: string) => {
  if (contentType?.includes("png")) return "png";
  if (contentType?.includes("webp")) return "webp";
  if (contentType?.includes("jpeg") || contentType?.includes("jpg")) return "jpg";
  if (fallbackUrl.includes(".png")) return "png";
  if (fallbackUrl.includes(".webp")) return "webp";
  if (fallbackUrl.includes(".jpg") || fallbackUrl.includes(".jpeg")) return "jpg";
  return "png";
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const images = Array.isArray(body?.images) ? body.images : [];
    const baseName = typeof body?.baseName === "string" && body.baseName
      ? body.baseName
      : "qwen-image-layered";

    if (images.length === 0) {
      return NextResponse.json({ error: "No images provided" }, { status: 400 });
    }

    const zip = new JSZip();
    let added = 0;

    for (let i = 0; i < images.length; i += 1) {
      const entry = images[i];
      const url = typeof entry?.url === "string" ? entry.url : "";
      if (!url || !isHttpUrl(url)) {
        continue;
      }

      const response = await fetch(url, { cache: "no-store", redirect: "follow" });
      if (!response.ok) {
        continue;
      }

      const buffer = Buffer.from(await response.arrayBuffer());
      const contentType = response.headers.get("content-type");
      const extension = getExtension(contentType, url);
      const nameCandidate = typeof entry?.name === "string" && entry.name
        ? entry.name
        : `layer-${i + 1}.${extension}`;
      const filename = sanitizeFilename(nameCandidate);

      zip.file(filename, buffer);
      added += 1;
    }

    if (added === 0) {
      return NextResponse.json({ error: "No valid images downloaded" }, { status: 400 });
    }

    const output = await zip.generateAsync({ type: "nodebuffer" });
    const filename = `${sanitizeFilename(baseName)}.zip`;

    const headers = new Headers();
    headers.set("Content-Type", "application/zip");
    headers.set("Content-Disposition", buildContentDisposition(filename));

    return new NextResponse(output, { status: 200, headers });
  } catch (error) {
    console.error("download-zip error", error);
    return NextResponse.json({ error: "Unable to create ZIP" }, { status: 500 });
  }
}
