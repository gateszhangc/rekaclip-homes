import Blog from "@/components/blocks/blog";
import { BlogItem, Blog as BlogType } from "@/types/blocks/blog";
import { getPostsByLocale } from "@/models/post";
import { getTranslations } from "next-intl/server";
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
  const t = await getTranslations();

  const siteUrl = getSiteUrl();
  const canonicalUrl = getAbsoluteLocalizedUrl(siteUrl, locale, "/posts");
  const languages = buildAlternateLanguageUrls(siteUrl, "/posts");

  return {
    title: t("blog.title"),
    description: t("blog.description"),
    alternates: {
      canonical: canonicalUrl,
      languages,
    },
  };
}

export default async function PostsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations();

  const posts = await getPostsByLocale(locale);

  const blog: BlogType = {
    title: t("blog.title"),
    description: t("blog.description"),
    items: posts as unknown as BlogItem[],
    read_more_text: t("blog.read_more_text"),
  };

  return <Blog blog={blog} isStandalone />;
}
