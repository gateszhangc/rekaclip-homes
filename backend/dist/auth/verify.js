const parseJwtPayload = (token) => {
    const parts = token.split(".");
    if (parts.length < 2)
        return null;
    try {
        const payload = Buffer.from(parts[1], "base64url").toString("utf-8");
        return JSON.parse(payload);
    }
    catch {
        return null;
    }
};
export const requireAuth = (req, res, next) => {
    if (process.env.AUTH_DISABLED === "true") {
        req.auth = { userId: "test-user" };
        return next();
    }
    const header = req.headers.authorization;
    if (!header || !header.startsWith("Bearer ")) {
        return res.status(401).json({ error: "Missing bearer token" });
    }
    const token = header.replace("Bearer ", "").trim();
    if (!token) {
        return res.status(401).json({ error: "Invalid bearer token" });
    }
    const payload = parseJwtPayload(token);
    const userId = payload?.sub || payload?.user_id || token;
    req.auth = { userId };
    return next();
};
