import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import {
  getDbWriteFreezePayload,
  isDbWriteFreezeEnabled,
  isWriteMethod,
} from "./lib/db-write-freeze";

const intlMiddleware = createMiddleware(routing);

export default function middleware(req: NextRequest) {
  if (req.nextUrl.pathname.startsWith("/api")) {
    if (isDbWriteFreezeEnabled() && isWriteMethod(req.method)) {
      return NextResponse.json(getDbWriteFreezePayload(), { status: 503 });
    }

    return NextResponse.next();
  }

  return intlMiddleware(req);
}

export const config = {
  matcher: ["/api/:path*", "/((?!api|_next|_vercel|.*\\..*).*)"],
};
