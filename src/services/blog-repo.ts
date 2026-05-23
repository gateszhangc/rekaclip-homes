import { readdir, readFile } from "fs/promises";
import path from "path";

import { Post } from "@/types/post";
import { normalizeStringList } from "./post-metadata";

const BLOG_ROOT = path.join(process.cwd(), "content", "blog");
const ONLINE_STATUS = "online";
const DEFAULT_AUTHOR = "Reka Clip Editorial";

type RepoFrontmatter = {
  title: string;
  slug: string;
  description: string;
  cover_image?: string;
  author_name?: string;
  author_avatar_url?: string;
  published_at: string;
  updated_at?: string;
  status: string;
  tags?: string[];
  related_listing_slugs?: string[];
};

type ParsedFrontmatterDocument = {
  frontmatter: Record<string, unknown>;
  content: string;
};

const BLOG_FRONTMATTER_REGEX = /^---\s*\n([\s\S]*?)\n---\s*\n?([\s\S]*)$/;

const parseFrontmatterValue = (value: string): unknown => {
  const trimmed = value.trim();

  if (!trimmed) {
    return "";
  }

  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    return JSON.parse(trimmed);
  }

  if (
    (trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return JSON.parse(trimmed.replace(/^'/, "\"").replace(/'$/, "\""));
  }

  if (trimmed === "true") {
    return true;
  }

  if (trimmed === "false") {
    return false;
  }

  return trimmed;
};

export const parseFrontmatter = (raw: string): Record<string, unknown> => {
  const data: Record<string, unknown> = {};

  for (const line of raw.split("\n")) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf(":");
    if (separatorIndex === -1) {
      throw new Error(`Invalid frontmatter line: ${line}`);
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();

    data[key] = parseFrontmatterValue(value);
  }

  return data;
};

const ensureString = (value: unknown, fieldName: string): string => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`Missing required frontmatter field "${fieldName}"`);
  }

  return value.trim();
};

const ensureDateString = (value: unknown, fieldName: string): string => {
  const normalized = ensureString(value, fieldName);
  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    throw new Error(`Invalid date for frontmatter field "${fieldName}"`);
  }

  return date.toISOString();
};

export const parseFrontmatterDocument = (raw: string): ParsedFrontmatterDocument => {
  const match = raw.match(BLOG_FRONTMATTER_REGEX);

  if (!match) {
    throw new Error("Blog markdown file is missing frontmatter");
  }

  return {
    frontmatter: parseFrontmatter(match[1]),
    content: match[2].trim(),
  };
};

export const normalizeRepoFrontmatter = (
  frontmatter: Record<string, unknown>
): RepoFrontmatter => ({
  title: ensureString(frontmatter.title, "title"),
  slug: ensureString(frontmatter.slug, "slug"),
  description: ensureString(frontmatter.description, "description"),
  cover_image:
    typeof frontmatter.cover_image === "string"
      ? frontmatter.cover_image.trim()
      : "",
  author_name:
    typeof frontmatter.author_name === "string"
      ? frontmatter.author_name.trim()
      : DEFAULT_AUTHOR,
  author_avatar_url:
    typeof frontmatter.author_avatar_url === "string"
      ? frontmatter.author_avatar_url.trim()
      : "/imgs/logos/logo.svg",
  published_at: ensureDateString(frontmatter.published_at, "published_at"),
  updated_at:
    typeof frontmatter.updated_at === "string" && frontmatter.updated_at.trim()
      ? ensureDateString(frontmatter.updated_at, "updated_at")
      : undefined,
  status:
    typeof frontmatter.status === "string" && frontmatter.status.trim()
      ? frontmatter.status.trim().toLowerCase()
      : ONLINE_STATUS,
  tags: normalizeStringList(frontmatter.tags),
  related_listing_slugs: normalizeStringList(frontmatter.related_listing_slugs),
});

export const buildRepoPost = (
  locale: string,
  frontmatter: RepoFrontmatter,
  content: string
): Post => ({
  uuid: `repo-blog:${locale}:${frontmatter.slug}`,
  slug: frontmatter.slug,
  title: frontmatter.title,
  description: frontmatter.description,
  content,
  cover_url: frontmatter.cover_image || undefined,
  author_name: frontmatter.author_name,
  author_avatar_url: frontmatter.author_avatar_url,
  locale,
  status: frontmatter.status,
  created_at: frontmatter.published_at,
  updated_at: frontmatter.updated_at,
  tags: frontmatter.tags,
  related_listing_slugs: frontmatter.related_listing_slugs,
});

const sortPostsByDate = (items: Post[]) =>
  [...items].sort((left, right) => {
    const leftTime = new Date(left.updated_at || left.created_at || 0).getTime();
    const rightTime = new Date(right.updated_at || right.created_at || 0).getTime();

    return rightTime - leftTime;
  });

export const readRepoBlogFile = async (
  locale: string,
  fileName: string
): Promise<Post> => {
  const raw = await readFile(path.join(BLOG_ROOT, locale, fileName), "utf8");
  const parsed = parseFrontmatterDocument(raw);
  const frontmatter = normalizeRepoFrontmatter(parsed.frontmatter);

  return buildRepoPost(locale, frontmatter, parsed.content);
};

export const loadRepoBlogPosts = async (locale: string): Promise<Post[]> => {
  const dir = path.join(BLOG_ROOT, locale);

  try {
    const files = (await readdir(dir))
      .filter((file) => file.endsWith(".md"))
      .sort();

    const posts = await Promise.all(files.map((file) => readRepoBlogFile(locale, file)));
    return sortPostsByDate(posts);
  } catch (error: unknown) {
    if (error && typeof error === "object" && "code" in error && error.code === "ENOENT") {
      return [];
    }

    throw error;
  }
};
