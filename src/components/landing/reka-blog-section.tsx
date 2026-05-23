"use client";

import { ArrowRight, BookOpenText } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Post } from "@/types/post";
import type { RekaBlogSectionData } from "@/services/page";

const formatDate = (value?: string) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};

const formatTagLabel = (tag: string) =>
  tag
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export default function RekaBlogSection({
  section,
  posts,
}: {
  section: RekaBlogSectionData;
  posts: Post[];
}) {
  if (section.disabled || !posts.length) return null;

  const featured = posts.slice(0, 4);

  return (
    <section id="blog" className="reka-blog-section reka-section-anchor">
      <div className="reka-page-container reka-blog-inner">
        <div className="reka-section-header landing-reveal landing-reveal--1">
          <div className="reka-blog-section-label">
            <BookOpenText size={16} aria-hidden />
            <span>{section.label}</span>
          </div>
          <h2 className="reka-blog-section-title">{section.title}</h2>
          <p className="reka-blog-section-desc">{section.description}</p>
        </div>

        <div className="reka-blog-grid landing-reveal landing-reveal--2">
          {featured.map((post) => (
            <Link
              key={post.slug}
              href={`/blog/${post.slug}` as "/"}
              className="reka-blog-card group"
            >
              <div className="reka-blog-card-meta">
                <span>{formatDate(post.created_at)}</span>
              </div>
              <h3 className="reka-blog-card-title">{post.title}</h3>
              <p className="reka-blog-card-desc">{post.description}</p>
              <div className="reka-blog-card-tags">
                {(post.tags ?? [])
                  .filter((tag) => tag.toLowerCase() !== "rekaclip")
                  .slice(0, 2)
                  .map((tag) => (
                    <span key={tag} className="reka-blog-tag">
                      {formatTagLabel(tag)}
                    </span>
                  ))}
              </div>
              <span className="reka-blog-card-cta">
                {section.read_more_text}
                <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>

        <div className="reka-blog-view-all landing-reveal landing-reveal--3">
          <Link href="/blog" className="reka-blog-view-all-link">
            {section.view_all_text}
            <ArrowRight size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
