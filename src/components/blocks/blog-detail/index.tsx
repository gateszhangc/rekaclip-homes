"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import Markdown from "@/components/markdown";
import { Post } from "@/types/post";
import { motion, useScroll, useTransform } from "framer-motion";
import { CalendarIcon, ChevronLeft, Clock, Share2, UserIcon } from "lucide-react";
import Link from "next/link";
import { useRef } from "react";

export default function BlogDetail({ post }: { post: Post }) {
  const ref = useRef(null);
  const formatDate = (value?: string) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
      return value;
    }

    const locale = post.locale === "zh" ? "zh-CN" : "en-US";
    return new Intl.DateTimeFormat(locale, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  };

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end end"],
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "20%"]);
  const scale = useTransform(scrollYProgress, [0, 0.2], [1, 0.95]);
  const opacity = useTransform(scrollYProgress, [0, 0.2], [1, 0]);
  const title = post.title?.trim() ?? "";
  const titleLength = title.length;
  const titleClassName = [
    "landing-blog-detail__title",
    "text-left",
    "text-balance",
    titleLength > 60 ? "landing-blog-detail__title--long" : "",
    titleLength > 90 ? "landing-blog-detail__title--xlong" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <article className="landing-raphael dark min-h-screen relative selection:bg-primary/30" ref={ref}>
      {/* Scroll Progress Bar */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-raphael-gold to-raphael-rose origin-left z-50"
        style={{ scaleX: scrollYProgress }}
      />

      <div className="container px-4 mx-auto max-w-5xl py-12 md:py-24 relative z-10">
        {/* Navigation */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-12"
        >
          <Button variant="ghost" size="sm" asChild className="group -ml-4 text-muted-foreground hover:text-foreground transition-all duration-300 hover:bg-white/5 rounded-full px-4">
            <Link href={post.locale === "en" ? "/posts" : `/${post.locale}/posts`}>
              <ChevronLeft className="w-4 h-4 mr-2 group-hover:-translate-x-1 transition-transform" />
              Back to Blog
            </Link>
          </Button>
        </motion.div>

        {/* Header Content */}
        <div className="landing-blog-detail__header mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="flex flex-col gap-6"
          >
            {post.tags && post.tags.length > 0 && (
              <div className="flex justify-start">
                <Badge variant="secondary" className="rounded-full px-4 py-1 text-xs font-semibold tracking-wider uppercase bg-secondary/30 border-white/10 text-primary backdrop-blur-md">
                  {post.tags[0]}
                </Badge>
              </div>
            )}
            <h1 className={titleClassName}>{title}</h1>
          </motion.div>

          {(post.author_name || post.created_at) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="landing-blog-detail__meta mt-8 py-6 border-y border-white/5 flex items-center justify-between flex-wrap gap-4"
            >
              <div className="flex items-center gap-4">
                {post.author_name && (
                  <div className="flex items-center gap-3">
                    <div className="rounded-full overflow-hidden border border-white/10 w-10 h-10 relative shadow-inner">
                      {post.author_avatar_url ? (
                        <img src={post.author_avatar_url} alt={post.author_name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-secondary flex items-center justify-center">
                          <UserIcon className="w-5 h-5 text-muted-foreground" />
                        </div>
                      )}
                    </div>
                    <div>
                      <span className="block text-sm font-semibold text-foreground tracking-wide">{post.author_name}</span>
                      <span className="block text-xs text-muted-foreground uppercase tracking-wider">Author</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-6 text-sm text-muted-foreground">
                {post.created_at && (
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-4 h-4 text-primary/60" />
                    <time dateTime={post.created_at}>
                      {formatDate(post.created_at)}
                    </time>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-primary/60" />
                  <span>5 min read</span>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Feature Image */}
        {post.cover_url && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.3, type: "spring", bounce: 0.2 }}
            className="landing-blog-detail__cover mb-20 aspect-video relative overflow-hidden rounded-3xl border border-white/10 shadow-2xl bg-muted/20"
          >
            <motion.div style={{ y }} className="w-full h-full absolute inset-0">
              <div className="absolute inset-0 bg-gradient-to-t from-background/60 via-transparent to-transparent z-10" />
              <img
                src={post.cover_url}
                alt={post.title || "Blog cover"}
                className="w-full h-full object-cover transform scale-105"
              />
            </motion.div>
          </motion.div>
        )}

        {/* Main Content Grid */}
        <div className="landing-blog-detail__grid relative items-start">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.4 }}
            className="landing-blog-detail__content min-w-0"
          >
            <div className="prose prose-lg md:prose-xl dark:prose-invert max-w-none
              prose-headings:font-serif prose-headings:font-medium prose-headings:tracking-tight prose-headings:text-foreground
              prose-h1:text-4xl prose-h2:text-3xl prose-h3:text-2xl
              prose-p:text-muted-foreground prose-p:leading-8 prose-p:font-light
              prose-strong:text-foreground prose-strong:font-semibold
              prose-a:text-primary prose-a:font-medium prose-a:no-underline hover:prose-a:text-primary/80 hover:prose-a:underline prose-a:transition-colors
              prose-img:rounded-2xl prose-img:shadow-xl prose-img:border prose-img:border-white/10
              prose-code:text-primary prose-code:bg-secondary/30 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded-md prose-code:font-mono prose-code:text-sm prose-code:border prose-code:border-white/5
              prose-pre:bg-secondary/20 prose-pre:border prose-pre:border-white/5 prose-pre:backdrop-blur-sm prose-pre:shadow-lg
              prose-blockquote:border-l-4 prose-blockquote:border-l-primary prose-blockquote:bg-gradient-to-r prose-blockquote:from-primary/5 prose-blockquote:to-transparent prose-blockquote:py-4 prose-blockquote:px-8 prose-blockquote:rounded-r-xl prose-blockquote:not-italic prose-blockquote:text-xl prose-blockquote:text-foreground/90 prose-blockquote:font-serif
              prose-li:text-muted-foreground prose-li:marker:text-primary/60
              first-letter:float-left first-letter:text-6xl first-letter:pr-4 first-letter:font-serif first-letter:text-primary first-letter:font-bold prose-p:first-of-type:leading-relaxed
              "
            >
              {post.content && <Markdown content={post.content} />}
            </div>
          </motion.div>

          <aside className="landing-blog-detail__aside space-y-8 hidden xl:block w-64 shrink-0">
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="sticky top-32"
            >
              <div className="p-6 rounded-2xl border border-white/5 bg-white/5 backdrop-blur-md shadow-xl transition-all duration-300 hover:bg-white/10 hover:border-white/10 hover:shadow-2xl">
                <h3 className="text-xs font-semibold mb-6 text-foreground/60 uppercase tracking-widest flex items-center gap-2">
                  <Share2 className="w-3 h-3" />
                  Share
                </h3>
                <div className="flex flex-col gap-3">
                  <Button variant="outline" className="w-full justify-start border-white/10 bg-transparent hover:bg-primary/10 transition-all text-muted-foreground hover:text-primary hover:border-primary/20">
                    <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center mr-3 group-hover:bg-primary/20">
                      <span className="text-xs">𝕏</span>
                    </span>
                    Twitter
                  </Button>
                  <Button variant="outline" className="w-full justify-start border-white/10 bg-transparent hover:bg-primary/10 transition-all text-muted-foreground hover:text-primary hover:border-primary/20">
                    <span className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center mr-3">
                      <span className="text-xs">in</span>
                    </span>
                    LinkedIn
                  </Button>
                </div>
              </div>
            </motion.div>
          </aside>
        </div>

        <div className="mt-24 pt-12 border-t border-white/10">
          <div className="flex flex-col md:flex-row justify-between items-center text-muted-foreground gap-6">
            <p className="text-sm font-medium opacity-60">
              © {new Date().getFullYear()} easyclaw. All rights reserved.
            </p>
            <Button variant="outline" className="rounded-full px-8 py-6 h-auto border-white/10 hover:bg-white/5 hover:text-white transition-all hover:scale-105 duration-300" asChild>
              <Link href={post.locale === "en" ? "/posts" : `/${post.locale}/posts`} className="flex items-center gap-2">
                <span>Read more articles</span>
                <ChevronLeft className="w-4 h-4 rotate-180" />
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}
