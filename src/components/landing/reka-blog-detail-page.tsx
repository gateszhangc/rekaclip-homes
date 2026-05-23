"use client";

import Image from "next/image";
import { ArrowLeft, ArrowRight, Clock3 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import Markdown from "@/components/markdown";
import type { Post } from "@/types/post";
import RekaSiteFooter from "@/components/landing/reka-site-footer";
import type { Footer } from "@/types/blocks/footer";

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

const estimateReadTime = (content?: string) => {
  const words = (content || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`[^`]*`/g, " ")
    .replace(/[#>*_[\]-]/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;

  return Math.max(1, Math.ceil(words / 220));
};

const formatTagLabel = (tag: string) =>
  tag
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export default function RekaBlogDetailPage({
  post,
  relatedPosts,
  footer,
}: {
  post: Post;
  relatedPosts: Post[];
  footer?: Footer;
}) {
  return (
    <>
      <article className="reka-blog-detail-page">
        <div className="reka-page-container reka-blog-detail-inner">
          <Link href="/blog" className="reka-blog-back">
            <ArrowLeft size={16} />
            Back to Blog
          </Link>

          <header className="reka-blog-detail-header landing-reveal landing-reveal--1">
            <div className="reka-blog-card-tags">
              {(post.tags ?? [])
                .filter((tag) => tag.toLowerCase() !== "rekaclip")
                .map((tag) => (
                  <span key={tag} className="reka-blog-tag">
                    {formatTagLabel(tag)}
                  </span>
                ))}
            </div>
            <h1 className="reka-blog-detail-title">{post.title}</h1>
            <p className="reka-blog-detail-desc">{post.description}</p>
            <div className="reka-blog-detail-meta">
              {post.author_avatar_url && (
                <Image
                  src={post.author_avatar_url}
                  alt={post.author_name || "Author"}
                  width={40}
                  height={40}
                  className="reka-blog-detail-avatar"
                />
              )}
              <div>
                <p className="reka-blog-detail-author">{post.author_name}</p>
                <p className="reka-blog-detail-date">
                  {formatDate(post.created_at)}
                  <span aria-hidden> · </span>
                  <Clock3 size={14} className="inline align-text-bottom" />{" "}
                  {estimateReadTime(post.content)} min read
                </p>
              </div>
            </div>
            {post.cover_url && (
              <div className="reka-blog-detail-cover">
                <Image
                  src={post.cover_url}
                  alt=""
                  width={1200}
                  height={675}
                  className="h-auto w-full rounded-2xl object-cover"
                  priority
                />
              </div>
            )}
          </header>

          <div className="reka-blog-detail-content landing-reveal landing-reveal--2">
            <Markdown content={post.content || ""} />
          </div>

          {relatedPosts.length > 0 && (
            <aside className="reka-blog-related landing-reveal landing-reveal--3">
              <h2 className="reka-blog-related-title">More to read</h2>
              <div className="reka-blog-related-grid">
                {relatedPosts.map((related) => (
                  <Link
                    key={related.slug}
                    href={`/blog/${related.slug}` as "/"}
                    className="reka-blog-related-card group"
                  >
                    <h3>{related.title}</h3>
                    <p>{related.description}</p>
                    <span className="reka-blog-card-cta">
                      Read article
                      <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                ))}
              </div>
            </aside>
          )}
        </div>
      </article>
      {footer && <RekaSiteFooter footer={footer} />}
    </>
  );
}
