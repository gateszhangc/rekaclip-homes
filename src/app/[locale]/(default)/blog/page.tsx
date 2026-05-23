import RekaBlogPage from "@/components/landing/reka-blog-page";
import RekaBlogShell from "@/components/landing/reka-blog-shell";
import { getBlogPage, getLandingPage } from "@/services/page";
import { getPublishedRekaBlogPosts } from "@/services/reka-blog";
import { getSiteUrl } from "@/lib/site-url";
import {
  buildAlternateLanguageUrls,
  getAbsoluteLocalizedUrl,
} from "@/i18n/url";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const blogPage = await getBlogPage(locale);
  const section = blogPage.blog;
  const siteUrl = getSiteUrl();
  const canonicalUrl = getAbsoluteLocalizedUrl(siteUrl, locale, "/blog");
  const languages = buildAlternateLanguageUrls(siteUrl, "/blog");

  return {
    title: `${section?.title ?? "Blog"} | Reka Clip`,
    description: section?.description,
    alternates: {
      canonical: canonicalUrl,
      languages,
    },
  };
}

export default async function BlogRoute({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const [blogPage, landing, posts] = await Promise.all([
    getBlogPage(locale),
    getLandingPage(locale),
    getPublishedRekaBlogPosts(locale),
  ]);

  const section = blogPage.blog;
  if (!section || section.disabled) {
    return null;
  }

  return (
    <RekaBlogShell>
      <RekaBlogPage posts={posts} section={section} footer={landing.footer} />
    </RekaBlogShell>
  );
}
