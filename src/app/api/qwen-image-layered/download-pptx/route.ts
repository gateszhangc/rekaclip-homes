import PptxGenJS from "pptxgenjs";
import sharp from "sharp";
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

    const pptx = new PptxGenJS();
    pptx.layout = "LAYOUT_WIDE";
    pptx.author = "Qwen Image Layered";

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

      let buffer = Buffer.from(await response.arrayBuffer());
      let contentType = response.headers.get("content-type") || "image/png";

      if (contentType.includes("webp")) {
        buffer = await sharp(buffer).png().toBuffer();
        contentType = "image/png";
      }

      const dataUri = `data:${contentType};base64,${buffer.toString("base64")}`;

      const slide = pptx.addSlide();
      slide.addImage({ data: dataUri, x: 0, y: 0, w: 13.33, h: 7.5 });
      added += 1;
    }

    if (added === 0) {
      return NextResponse.json({ error: "No valid images downloaded" }, { status: 400 });
    }

    const output = await pptx.write("nodebuffer");
    const filename = `${sanitizeFilename(baseName)}.pptx`;

    const headers = new Headers();
    headers.set(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation"
    );
    headers.set("Content-Disposition", buildContentDisposition(filename));

    return new NextResponse(output, { status: 200, headers });
  } catch (error) {
    console.error("download-pptx error", error);
    return NextResponse.json({ error: "Unable to create PPTX" }, { status: 500 });
  }
}
