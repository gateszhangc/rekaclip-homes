import { ArrowRight } from "lucide-react";
import { Blog as BlogType } from "@/types/blocks/blog";
import { Link } from "@/i18n/navigation";

export default function Blog({
  blog,
  isStandalone = false,
}: {
  blog: BlogType;
  isStandalone?: boolean;
}) {
  if (blog.disabled) {
    return null;
  }

  const TitleTag = isStandalone ? "h1" : "h2";

  return (
    <section className="landing-section landing-blog-section w-full py-16">
      <div className="container flex flex-col gap-10 lg:gap-12 lg:px-16">
        <div className="landing-blog-header text-center">
          {blog.label && (
            <p className="landing-blog-label landing-reveal landing-reveal--1">
              {blog.label}
            </p>
          )}
          <TitleTag className="landing-blog-title landing-reveal landing-reveal--2">
            {blog.title}
          </TitleTag>
          <p className="landing-blog-description landing-reveal landing-reveal--3">
            {blog.description}
          </p>
        </div>
        <div className="landing-blog-grid">
          {blog.items?.map((item, idx) => (
            <Link
              key={idx}
              href={(item.url as any) || `/posts/${item.slug}`}
              target={item.target || "_self"}
              className="landing-blog-link"
            >
              <article className="landing-blog-card">
                {item.cover_url && (
                  <div className="landing-blog-card__media">
                    <img
                      src={item.cover_url}
                      alt={item.title || ""}
                      className="landing-blog-card__image"
                    />
                  </div>
                )}
                <div className="landing-blog-card__body">
                  <h3 className="landing-blog-card__title">{item.title}</h3>
                  <p className="landing-blog-card__description">
                    {item.description}
                  </p>
                  {blog.read_more_text && (
                    <p className="landing-blog-card__cta">
                      {blog.read_more_text}
                      <ArrowRight className="ml-2 size-4" />
                    </p>
                  )}
                </div>
              </article>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
