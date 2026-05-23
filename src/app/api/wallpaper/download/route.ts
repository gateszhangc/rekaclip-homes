import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const fetchCache = "force-no-store";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const src = searchParams.get("src");
  const filenameParam = searchParams.get("filename");

  if (!src) {
    return NextResponse.json(
      { error: "Missing required query param: src" },
      { status: 400 }
    );
  }

  try {
    const srcUrl = new URL(src);
    if (!["http:", "https:"].includes(srcUrl.protocol)) {
      return NextResponse.json(
        { error: "Only http/https sources are allowed" },
        { status: 400 }
      );
    }

    const response = await fetch(srcUrl.toString(), {
      cache: "no-store",
      redirect: "follow",
    });

    if (!response.ok || !response.body) {
      console.error(
        "Download proxy upstream error:",
        response.status,
        response.statusText
      );
      return NextResponse.json(
        { error: "Failed to fetch image for download" },
        { status: response.status || 502 }
      );
    }

    const contentType =
      response.headers.get("content-type") || "application/octet-stream";
    const derivedName =
      srcUrl.pathname.split("/").filter(Boolean).pop() || "wallpaper";
    const filename = filenameParam || derivedName;

    // Build a safe Content-Disposition with ASCII fallback and UTF-8 filename*
    const asciiFallback = filename.replace(/[^\x20-\x7E]+/g, "_");
    const utf8Name = encodeURIComponent(filename);
    const disposition = `attachment; filename="${asciiFallback}"; filename*=UTF-8''${utf8Name}`;

    const headers = new Headers();
    headers.set("Content-Type", contentType);
    headers.set("Content-Disposition", disposition);

    return new NextResponse(response.body, {
      status: 200,
      headers,
    });
  } catch (error) {
    console.error("Download proxy error:", error);
    return NextResponse.json(
      { error: "Unable to download image" },
      { status: 500 }
    );
  }
}
