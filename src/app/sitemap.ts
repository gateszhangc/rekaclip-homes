import { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";
import { locales } from "@/i18n/locale";
import { getAbsoluteLocalizedUrl } from "@/i18n/url";
import { getPublishedRekaBlogPosts } from "@/services/reka-blog";

const PUBLIC_ROUTES: Array<{
  path: string;
  changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"];
  priority: number;
}> = [
  { path: "/", changeFrequency: "daily", priority: 1.0 },
  { path: "/pricing", changeFrequency: "weekly", priority: 0.9 },
  { path: "/showcase", changeFrequency: "weekly", priority: 0.8 },
  { path: "/posts", changeFrequency: "weekly", priority: 0.8 },
  { path: "/blog", changeFrequency: "weekly", priority: 0.8 },
  { path: "/privacy-policy", changeFrequency: "monthly", priority: 0.6 },
  { path: "/terms-of-service", changeFrequency: "monthly", priority: 0.6 },
  { path: "/refund-policy", changeFrequency: "monthly", priority: 0.6 },
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();
  const now = new Date();
  const entries: MetadataRoute.Sitemap = [];

  for (const route of PUBLIC_ROUTES) {
    for (const locale of locales) {
      entries.push({
        url: getAbsoluteLocalizedUrl(siteUrl, locale, route.path),
        lastModified: now,
        changeFrequency: route.changeFrequency,
        priority: route.priority,
      });
    }
  }

  const blogPosts = await getPublishedRekaBlogPosts("en");
  for (const post of blogPosts) {
    if (!post.slug) continue;
    const postDate = post.updated_at || post.created_at;
    const lastModified = postDate ? new Date(postDate) : now;

    for (const locale of locales) {
      entries.push({
        url: getAbsoluteLocalizedUrl(siteUrl, locale, `/blog/${post.slug}`),
        lastModified,
        changeFrequency: "monthly",
        priority: 0.7,
      });
    }
  }

  return entries;
}
