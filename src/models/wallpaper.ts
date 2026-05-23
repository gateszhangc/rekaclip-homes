import { wallpapers } from "@/db/schema";
import { db } from "@/db";
import { and, desc, eq } from "drizzle-orm";
import { Wallpaper } from "@/types/wallpaper";
import { assertDbWriteAllowed } from "@/lib/db-write-freeze";

export enum WallpaperStatus {
  Created = "created",
  Active = "active",
  Deleted = "deleted",
}

export async function insertWallpaper(
  data: Wallpaper
): Promise<Wallpaper | undefined> {
  assertDbWriteAllowed("wallpapers.insert");
  if (data.created_at && typeof data.created_at === "string") {
    data.created_at = new Date(data.created_at) as any;
  }

  const [wallpaper] = await db().insert(wallpapers).values(data as any).returning();

  return wallpaper as Wallpaper;
}

export async function insertWallpapers(
  dataList: Wallpaper[]
): Promise<Wallpaper[]> {
  assertDbWriteAllowed("wallpapers.insertBatch");
  const processedData = dataList.map((data) => {
    if (data.created_at && typeof data.created_at === "string") {
      data.created_at = new Date(data.created_at) as any;
    }
    return data;
  });

  const result = await db().insert(wallpapers).values(processedData as any).returning();

  return result as Wallpaper[];
}

export async function getWallpapersByUserUuid(
  user_uuid: string,
  page: number = 1,
  limit: number = 50
): Promise<Wallpaper[] | undefined> {
  const offset = (page - 1) * limit;

  const data = await db()
    .select()
    .from(wallpapers)
    .where(
      and(
        eq(wallpapers.user_uuid, user_uuid),
        eq(wallpapers.status, WallpaperStatus.Active)
      )
    )
    .orderBy(desc(wallpapers.created_at))
    .limit(limit)
    .offset(offset);

  return data as Wallpaper[];
}
