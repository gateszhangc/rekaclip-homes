"use client";

import { useState } from "react";
import { ArrowRight, BookOpenText, Clock3, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import type { Post } from "@/types/post";
import type { RekaBlogSectionData } from "@/services/page";
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

const TOPIC_ORDER = ["clipping", "boost", "captions", "platforms", "workflow", "shorts", "editing"];

const getTopicOptions = (posts: Post[]) => {
  const tagSet = new Set<string>();
  posts.forEach((post) => {
    (post.tags ?? []).forEach((tag) => {
      const normalized = tag.trim().toLowerCase();
      if (normalized && normalized !== "rekaclip") {
        tagSet.add(normalized);
      }
    });
  });

  const ordered = TOPIC_ORDER.filter((tag) => tagSet.has(tag));
  const remaining = Array.from(tagSet)
    .filter((tag) => !TOPIC_ORDER.includes(tag))
    .sort((a, b) => a.localeCompare(b));

  return ["all", ...ordered, ...remaining];
};

export default function RekaBlogPage({
  posts,
  section,
  footer,
}: {
  posts: Post[];
  section: RekaBlogSectionData;
  footer?: Footer;
}) {
  const [selectedTopic, setSelectedTopic] = useState("all");
  const featuredPost = posts.find((p) => p.slug === "what-is-reka-clip") ?? posts[0];
  const topicOptions = getTopicOptions(posts);

  const gridPosts = posts.filter((post) => {
    if (post.slug === featuredPost?.slug) return false;
    if (selectedTopic === "all") return true;
    return (post.tags ?? []).some((tag) => tag.trim().toLowerCase() === selectedTopic);
  });

  return (
    <>
      <section className="reka-blog-list-page">
        <div className="reka-page-container reka-blog-list-inner">
          <div className="reka-blog-list-hero landing-reveal landing-reveal--1">
            <div className="reka-blog-section-label">
              <BookOpenText size={16} aria-hidden />
              <span>{section.label}</span>
            </div>
            <h1 className="reka-blog-list-title">{section.title}</h1>
            <p className="reka-blog-list-desc">{section.description}</p>
          </div>

          <div className="reka-blog-list-body landing-reveal landing-reveal--2">
            {featuredPost && (
              <div className="reka-blog-featured-wrap">
                <Link href={`/blog/${featuredPost.slug}` as "/"} className="reka-blog-featured group">
                  <div className="reka-blog-featured-badge">
                    <Sparkles size={14} />
                    Featured
                  </div>
                  <div className="reka-blog-featured-meta">
                    <span>{formatDate(featuredPost.created_at)}</span>
                    <span className="reka-blog-featured-read">
                      <Clock3 size={14} />
                      {estimateReadTime(featuredPost.content)} min read
                    </span>
                  </div>
                  <h2 className="reka-blog-featured-title">{featuredPost.title}</h2>
                  <p className="reka-blog-featured-desc">{featuredPost.description}</p>
                  <span className="reka-blog-card-cta">
                    {section.read_more_text}
                    <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
                  </span>
                </Link>

                <div className="reka-blog-featured-aside glass-panel">
                  <p className="reka-blog-aside-label">Quick start</p>
                  <h3 className="reka-blog-aside-title">Paste a link. Ship a short tonight.</h3>
                  <p className="reka-blog-aside-desc">
                    Drop a YouTube or Twitch VOD into Clip, turn on captions, and publish your first
                    vertical highlight with Boost.
                  </p>
                  <Link href="/#clip" className="reka-clip-cta-primary reka-blog-aside-cta">
                    Try Clip
                    <ArrowRight size={16} />
                  </Link>
                </div>
              </div>
            )}

            {topicOptions.length > 1 && (
              <div className="reka-blog-filters">
                <span className="reka-blog-filters-label">Topics</span>
                <div className="reka-blog-filter-pills">
                  {topicOptions.map((topic) => (
                    <button
                      key={topic}
                      type="button"
                      className={`reka-blog-filter-pill ${topic === selectedTopic ? "reka-blog-filter-pill--active" : ""}`}
                      onClick={() => setSelectedTopic(topic)}
                    >
                      {topic === "all" ? "All" : formatTagLabel(topic)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="reka-blog-grid reka-blog-grid--listing">
              {gridPosts.map((post) => (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}` as "/"}
                  className="reka-blog-card group"
                >
                  <div className="reka-blog-card-meta">
                    <span>{formatDate(post.created_at)}</span>
                    <span className="reka-blog-card-read">
                      <Clock3 size={14} />
                      {estimateReadTime(post.content)} min
                    </span>
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
          </div>
        </div>
      </section>
      {footer && <RekaSiteFooter footer={footer} />}
    </>
  );
}
