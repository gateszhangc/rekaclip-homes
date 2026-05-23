import { outfits } from "@/db/schema";
import { db } from "@/db";
import { desc, eq, and } from "drizzle-orm";
import { Outfit } from "@/types/outfit";
import { assertDbWriteAllowed } from "@/lib/db-write-freeze";

export enum OutfitStatus {
  Created = "created",
  Active = "active",
  Deleted = "deleted",
}

export async function insertOutfit(
  data: Outfit
): Promise<Outfit | undefined> {
  assertDbWriteAllowed("outfits.insert");
  if (data.created_at && typeof data.created_at === "string") {
    data.created_at = new Date(data.created_at) as any;
  }

  const [outfit] = await db().insert(outfits).values(data as any).returning();

  return outfit as Outfit;
}

export async function getPublicOutfits(
  limit: number = 6,
  user_uuid?: string
): Promise<Outfit[] | undefined> {
  let whereConditions = eq(outfits.status, OutfitStatus.Active);
  
  // If user_uuid is provided, filter by user
  if (user_uuid) {
    whereConditions = and(
      eq(outfits.status, OutfitStatus.Active),
      eq(outfits.user_uuid, user_uuid)
    ) as any;
  }

  const data = await db()
    .select()
    .from(outfits)
    .where(whereConditions)
    .orderBy(desc(outfits.created_at))
    .limit(limit);

  return data as Outfit[];
}
