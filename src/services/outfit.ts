import { getPublicOutfits as getOutfitsFromDB } from "@/models/outfit";
import { getUserUuid } from "@/services/auth_user";

export async function getPublicOutfits(limit: number = 6) {
  try {
    // Get current user's uuid
    const user_uuid = await getUserUuid();

    // Only fetch outfits for the current user
    const outfits = await getOutfitsFromDB(limit, user_uuid || undefined);
    return outfits || [];
  } catch (e) {
    console.log("get public outfits failed:", e);
    return [];
  }
}
