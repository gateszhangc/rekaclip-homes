import { PostStatus, findPostBySlug } from "@/models/post";

import BlogDetail from "@/components/blocks/blog-detail";
import Empty from "@/components/blocks/empty";
import { Post } from "@/types/post";
import { getSiteUrl } from "@/lib/site-url";
import {
  buildAlternateLanguageUrls,
  getAbsoluteLocalizedUrl,
} from "@/i18n/url";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;

  const post = await findPostBySlug(slug, locale);

  const siteUrl = getSiteUrl();
  const pathname = `/posts/${slug}`;
  const canonicalUrl = getAbsoluteLocalizedUrl(siteUrl, locale, pathname);
  const languages = buildAlternateLanguageUrls(siteUrl, pathname);

  return {
    title: post?.title,
    description: post?.description,
    alternates: {
      canonical: canonicalUrl,
      languages,
    },
  };
}

export default async function ({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  const post = await findPostBySlug(slug, locale);

  if (!post || post.status !== PostStatus.Online) {
    return <Empty message="Post not found" />;
  }

  return <BlogDetail post={post as unknown as Post} />;
}
