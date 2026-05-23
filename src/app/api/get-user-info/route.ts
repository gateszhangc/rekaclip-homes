import { respData, respErr, respJson } from "@/lib/resp";

import { findUserByUuid } from "@/models/user";
import { getUserUuid } from "@/services/auth_user";
import { getUserCredits } from "@/services/credit";
import {
  createDefaultDeployEligibility,
  getDeployEligibilityByUserUuid,
} from "@/models/order";
import { User } from "@/types/user";

export async function POST(req: Request) {
  try {
    const user_uuid = await getUserUuid();
    if (!user_uuid) {
      return respJson(-2, "no auth");
    }

    const dbUser = await findUserByUuid(user_uuid);
    if (!dbUser) {
      return respErr("user not exist");
    }

    const userCredits = await getUserCredits(user_uuid);

    let deployEligibility = createDefaultDeployEligibility();
    try {
      deployEligibility = await getDeployEligibilityByUserUuid(user_uuid);
    } catch (deployEligibilityError) {
      console.error(
        "get user deploy eligibility failed, falling back to defaults:",
        deployEligibilityError
      );
    }
    const hasActiveSubscription = deployEligibility.hasActiveSubscription;
    const subscriptionTier = deployEligibility.subscriptionTier;

    // Check if user is admin
    const adminEmails = process.env.ADMIN_EMAILS?.split(",") || [];
    const isAdmin = adminEmails.includes((dbUser as unknown as User).email);

    const user = {
      ...(dbUser as unknown as User),
      credits: userCredits,
      isAdmin,
      hasActiveSubscription,
      canDeploy: deployEligibility.canDeploy,
      remainingDeployQuota: deployEligibility.remainingDeployQuota,
      subscriptionTier,
    };

    return respData(user);
  } catch (e) {
    console.log("get user info failed: ", e);
    return respErr("get user info failed");
  }
}
