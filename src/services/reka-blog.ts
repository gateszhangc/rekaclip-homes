import type { Post } from "@/types/post";
import { loadRepoBlogPosts } from "./blog-repo";

export const REKA_BLOG_AUTHOR = "Reka Clip Editorial";
export const REKA_BLOG_CORE_TAG = "rekaclip";

const normalizeTag = (value: string) => value.trim().toLowerCase();

export const isRekaBlogPost = (post: Post): boolean => {
  const author = post.author_name?.trim();
  const tags = (post.tags ?? []).map(normalizeTag);

  return author === REKA_BLOG_AUTHOR || tags.includes(REKA_BLOG_CORE_TAG);
};

const sortPostsByDate = (items: Post[]) =>
  [...items].sort((left, right) => {
    const leftTime = new Date(left.updated_at || left.created_at || 0).getTime();
    const rightTime = new Date(right.updated_at || right.created_at || 0).getTime();

    return rightTime - leftTime;
  });

const getOnlineRepoPosts = async (locale: string): Promise<Post[]> => {
  const posts = await loadRepoBlogPosts(locale);

  if (posts.length > 0) {
    return posts.filter((post) => post.status === "online");
  }

  if (locale !== "en") {
    const enPosts = await loadRepoBlogPosts("en");
    return enPosts.filter((post) => post.status === "online");
  }

  return [];
};

export const getPublishedRekaBlogPosts = async (locale: string): Promise<Post[]> =>
  sortPostsByDate((await getOnlineRepoPosts(locale)).filter(isRekaBlogPost));

export const findPublishedRekaBlogPost = async (
  slug: string,
  locale: string
): Promise<Post | undefined> => {
  const post = (await getPublishedRekaBlogPosts(locale)).find((item) => item.slug === slug);
  return post;
};

export const getRelatedRekaBlogPosts = async (
  slug: string,
  locale: string,
  limit = 3
): Promise<Post[]> => {
  const posts = await getPublishedRekaBlogPosts(locale);
  const current = posts.find((item) => item.slug === slug);
  if (!current) {
    return posts.filter((item) => item.slug !== slug).slice(0, limit);
  }

  const currentTags = new Set((current.tags ?? []).map(normalizeTag));
  const ranked = posts
    .filter((item) => item.slug !== slug)
    .map((item) => {
      const overlap = (item.tags ?? []).reduce((score, tag) => {
        return currentTags.has(normalizeTag(tag)) ? score + 1 : score;
      }, 0);

      return { item, overlap };
    })
    .sort((left, right) => {
      if (right.overlap !== left.overlap) {
        return right.overlap - left.overlap;
      }

      const leftTime = new Date(
        left.item.updated_at || left.item.created_at || 0
      ).getTime();
      const rightTime = new Date(
        right.item.updated_at || right.item.created_at || 0
      ).getTime();

      return rightTime - leftTime;
    });

  return ranked.slice(0, limit).map((entry) => entry.item);
};
