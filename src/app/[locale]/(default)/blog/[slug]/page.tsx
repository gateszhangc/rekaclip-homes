import { notFound } from "next/navigation";
import RekaBlogDetailPage from "@/components/landing/reka-blog-detail-page";
import RekaBlogShell from "@/components/landing/reka-blog-shell";
import { getLandingPage } from "@/services/page";
import {
  findPublishedRekaBlogPost,
  getPublishedRekaBlogPosts,
  getRelatedRekaBlogPosts,
} from "@/services/reka-blog";
import { getSiteUrl } from "@/lib/site-url";
import {
  buildAlternateLanguageUrls,
  getAbsoluteLocalizedUrl,
} from "@/i18n/url";

export async function generateStaticParams() {
  const posts = await getPublishedRekaBlogPosts("en");

  return posts
    .map((post) => post.slug)
    .filter((slug): slug is string => Boolean(slug))
    .map((slug) => ({ locale: "en", slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const post = await findPublishedRekaBlogPost(slug, locale);
  const siteUrl = getSiteUrl();
  const pathname = `/blog/${slug}`;
  const canonicalUrl = getAbsoluteLocalizedUrl(siteUrl, locale, pathname);
  const languages = buildAlternateLanguageUrls(siteUrl, pathname);

  if (!post) {
    return {
      title: "Blog | Reka Clip",
      alternates: { canonical: canonicalUrl, languages },
    };
  }

  return {
    title: `${post.title} | Reka Clip`,
    description: post.description,
    alternates: {
      canonical: canonicalUrl,
      languages,
    },
  };
}

export default async function BlogDetailRoute({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const post = await findPublishedRekaBlogPost(slug, locale);

  if (!post) {
    notFound();
  }

  const [relatedPosts, landing] = await Promise.all([
    getRelatedRekaBlogPosts(slug, locale, 3),
    getLandingPage(locale),
  ]);

  return (
    <RekaBlogShell>
      <RekaBlogDetailPage post={post} relatedPosts={relatedPosts} footer={landing.footer} />
    </RekaBlogShell>
  );
}
