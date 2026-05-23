import { auth } from "@/auth";
import { getUserUuidByApiKey } from "@/models/apikey";
import { headers } from "next/headers";
import { findUserByUuid } from "@/models/user";

export async function getBearerToken() {
    const h = await headers();
    const auth = h.get("Authorization");
    if (!auth) {
        return "";
    }

    return auth.replace("Bearer ", "");
}

export async function getUserUuid() {
    let user_uuid = "";

    const token = await getBearerToken();

    if (token) {
        // api key
        if (token.startsWith("sk-")) {
            const user_uuid = await getUserUuidByApiKey(token);

            return user_uuid || "";
        }
    }

    const session = await auth();
    if (session && session.user && session.user.uuid) {
        user_uuid = session.user.uuid;
    }

    return user_uuid;
}

export async function getUserEmail() {
    let user_email = "";

    const session = await auth();
    if (session && session.user && session.user.email) {
        user_email = session.user.email;
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
