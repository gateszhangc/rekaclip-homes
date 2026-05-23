import { getSiteUrl } from "@/lib/site-url";

export function GET() {
  const siteUrl = getSiteUrl();
  const content = `User-agent: *\nAllow: /\n\nSitemap: ${siteUrl}/sitemap.xml\n`;

  return new Response(content, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=86400, no-transform",
    },
  });
}
