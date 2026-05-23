import { getWallpapersByUserUuid, WallpaperStatus } from "@/models/wallpaper";
import { Wallpaper } from "@/types/wallpaper";
import { db } from "@/db";
import { outfits, wallpapers } from "@/db/schema";
import { desc, eq, and } from "drizzle-orm";
import { getUserUuid } from "@/services/auth_user";

export async function getPublicWallpapers(
  limit: number = 6,
  user_uuid?: string
): Promise<Wallpaper[]> {
  try {
    const effectiveUserUuid = user_uuid || (await getUserUuid());
    if (!effectiveUserUuid) {
      // 未登录则不返回任何图片
      return [];
    }

    // Query from outfits table instead of wallpapers
    const data = await db()
      .select()
      .from(outfits)
      .where(
        and(eq(outfits.status, "active"), eq(outfits.user_uuid, effectiveUserUuid))
      )
      .orderBy(desc(outfits.created_at))
      .limit(limit);

    return data as Wallpaper[];
  } catch (error) {
    console.error("Failed to fetch public wallpapers:", error);
    return [];
  }
}

export async function getUserWallpapers(
  user_uuid: string,
  page: number = 1,
  limit: number = 50
): Promise<Wallpaper[]> {
  try {
    const data = await getWallpapersByUserUuid(user_uuid, page, limit);
    return data || [];
  } catch (error) {
    console.error("Failed to fetch user wallpapers:", error);
    return [];
  }
}
