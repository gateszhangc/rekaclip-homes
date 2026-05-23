"use client";

import Image from "next/image";

export interface RekaTestimonialItem {
  quote: string;
  name: string;
  role: string;
  avatar: string;
}

export interface RekaTestimonialsData {
  disabled?: boolean;
  label?: string;
  title: string;
  description: string;
  rating?: string;
  items: RekaTestimonialItem[];
}

function splitIntoColumns<T>(items: T[], columnCount: number): T[][] {
  const columns: T[][] = Array.from({ length: columnCount }, () => []);
  items.forEach((item, index) => {
    columns[index % columnCount].push(item);
  });
  return columns;
}

function TestimonialCard({ item }: { item: RekaTestimonialItem }) {
  return (
    <article className="reka-testimonial-card">
      <p className="reka-testimonial-quote">&ldquo;{item.quote}&rdquo;</p>
      <div className="reka-testimonial-author">
        <Image
          src={item.avatar}
          alt={item.name}
          width={40}
          height={40}
          className="reka-testimonial-avatar"
        />
        <div className="reka-testimonial-meta">
          <p className="reka-testimonial-name">{item.name}</p>
          <p className="reka-testimonial-role">{item.role}</p>
        </div>
      </div>
    </article>
  );
}

function TestimonialColumn({
  items,
  durationSeconds,
}: {
  items: RekaTestimonialItem[];
  durationSeconds: number;
}) {
  if (!items.length) return null;

  const loopItems = [...items, ...items];

  return (
    <div className="reka-testimonials-column">
      <div
        className="reka-testimonials-track"
        style={{ animationDuration: `${durationSeconds}s` }}
      >
        {loopItems.map((item, index) => (
          <TestimonialCard key={`${item.name}-${index}`} item={item} />
        ))}
      </div>
    </div>
  );
}

export default function RekaTestimonialsSection({ data }: { data: RekaTestimonialsData }) {
  if (data.disabled || !data.items.length) return null;

  const columns = splitIntoColumns(data.items, 3);
  const durations = [38, 46, 42];

  return (
    <section className="reka-testimonials-page" aria-labelledby="reka-testimonials-title">
      <div className="reka-page-container">
        <div className="reka-testimonials-header text-center landing-reveal landing-reveal--1">
          {data.label ? <span className="reka-pill mb-4">{data.label}</span> : null}
          <h2 id="reka-testimonials-title" className="reka-testimonials-title">
            {data.title}
          </h2>
          <p className="reka-testimonials-desc">{data.description}</p>
          {data.rating ? <p className="reka-testimonials-rating">{data.rating}</p> : null}
        </div>

        <div className="reka-testimonials-columns landing-reveal landing-reveal--2">
          {columns.map((columnItems, columnIndex) => (
            <TestimonialColumn
              key={columnIndex}
              items={columnItems}
              durationSeconds={durations[columnIndex] ?? 42}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
