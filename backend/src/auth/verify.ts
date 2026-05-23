import { NextFunction, Request, Response } from "express";

type AuthContext = {
  userId: string;
};

declare module "express-serve-static-core" {
  interface Request {
    auth?: AuthContext;
  }
}

const parseJwtPayload = (token: string) => {
  const parts = token.split(".");
  if (parts.length < 2) return null;
  try {
    const payload = Buffer.from(parts[1], "base64url").toString("utf-8");
    return JSON.parse(payload) as Record<string, unknown>;
  } catch {
    return null;
  }
};

export const requireAuth = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
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
  const userId =
    (payload?.sub as string) || (payload?.user_id as string) || token;

  req.auth = { userId };
  return next();
};
