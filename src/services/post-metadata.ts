const POST_META_MARKER = "rekaclipmart:post-meta";
const POST_META_REGEX =
  /^\s*<!--\s+rekaclipmart:post-meta\s+({[\s\S]+?})\s+-->\s*/;

export type PostContentMeta = {
  tags?: string[];
  related_listing_slugs?: string[];
};

type DecodedPostContent = {
  content: string;
  meta: PostContentMeta;
};

const dedupeStringList = (items: string[]) => {
  const seen = new Set<string>();
  const normalized: string[] = [];

  for (const item of items) {
    if (!item || seen.has(item)) {
      continue;
    }

    seen.add(item);
    normalized.push(item);
  }

  return normalized;
};

export const normalizeStringList = (value: unknown): string[] => {
  if (!Array.isArray(value)) {
    return [];
  }

  return dedupeStringList(
    value
      .map((item) => (typeof item === "string" ? item.trim() : ""))
      .filter(Boolean)
  );
};
