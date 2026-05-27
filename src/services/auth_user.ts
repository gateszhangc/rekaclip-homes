import { auth } from "@/auth";
import { getUserUuidByApiKey } from "@/models/apikey";
import { headers } from "next/headers";
import { findUserByEmail, findUserByUuid } from "@/models/user";
import { saveUser } from "@/services/user";

export async function getBearerToken() {
    const h = await headers();
    const auth = h.get("Authorization");
    if (!auth) {
        return "";
    }

    return auth.replace("Bearer ", "");
}

async function getSessionUser() {
    const session = await auth();
    return session?.user;
}

async function getOrCreateUserFromSessionEmail(
    sessionUser: Awaited<ReturnType<typeof getSessionUser>>
) {
    if (!sessionUser?.email) {
        return;
    }

    const user = await findUserByEmail(sessionUser.email);
    if (user) {
        return user;
    }

    return saveUser({
        email: sessionUser.email,
        nickname: sessionUser.nickname || sessionUser.name || "",
        avatar_url: sessionUser.avatar_url || sessionUser.image || "",
        signin_type: "oauth",
        signin_provider: "session",
        signin_openid: sessionUser.email,
        created_at: new Date(),
    });
}

export async function getUserUuid() {
    const token = await getBearerToken();

    if (token) {
        // api key
        if (token.startsWith("sk-")) {
            const user_uuid = await getUserUuidByApiKey(token);

            return user_uuid || "";
        }
    }

    const sessionUser = await getSessionUser();
    if (sessionUser?.uuid) {
        return sessionUser.uuid;
    }

    if (!sessionUser?.email) {
        return "";
    }

    const user = await getOrCreateUserFromSessionEmail(sessionUser);
    return user?.uuid || "";
}

export async function getUserEmail() {
    let user_email = "";

    const sessionUser = await getSessionUser();
    if (sessionUser?.email) {
        user_email = sessionUser.email;
    }

    return user_email;
}

export async function getUserInfo() {
    let user_uuid = await getUserUuid();

    if (!user_uuid) {
        return;
    }

    const user = await findUserByUuid(user_uuid);

    return user;
}
