import { NextRequest, NextResponse } from "next/server";
import { getPostsByLocale } from "@/models/post";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const locale = searchParams.get("locale") || "en";
    const limitParam = searchParams.get("limit");
    const limit = limitParam ? Number.parseInt(limitParam, 10) : 50;
    const safeLimit = Number.isFinite(limit) && limit > 0 ? limit : 50;

    const posts = await getPostsByLocale(locale, 1, safeLimit);
    const slugs = (posts || [])
      .map((post) => post.slug)
      .filter((slug): slug is string => Boolean(slug));

    return NextResponse.json({ slugs });
  } catch (error) {
    console.error("[api/posts/slugs] failed", error);
    return NextResponse.json({ slugs: [] }, { status: 200 });
  }
}
