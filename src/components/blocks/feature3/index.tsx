import NextImage from "next/image";

import { Badge } from "@/components/ui/badge";
import { Section as SectionType } from "@/types/blocks/section";

export default function Feature3({ section }: { section: SectionType }) {
  if (section.disabled) {
    return null;
  }

  return (
    <section className="landing-section landing-section--alt py-20">
      <div className="container">
        <div className="mx-auto max-w-3xl text-center">
          {section.label && (
            <Badge variant="outline" className="mb-4">
              {section.label}
            </Badge>
          )}
          <h2 className="text-3xl font-semibold sm:text-4xl">
            {section.title}
          </h2>
          {section.description && (
            <p className="mt-4 text-muted-foreground">
              {section.description}
            </p>
          )}
        </div>
        <div className="mt-12 grid gap-8 lg:grid-cols-3">
          {section.items?.map((item, index) => (
            <div
              key={item.title ?? index}
              data-slot="card"
              className="rounded-[28px] border p-8 text-center shadow-lg sm:p-10"
            >
              <div className="aspect-[3/2] overflow-hidden rounded-[20px] bg-muted/20">
                {item.image && (
                  <NextImage
                    src={item.image?.src || ""}
                    alt={item.image?.alt || item.title || ""}
                    width={520}
                    height={520}
                    className="h-full w-full object-cover"
                    loading="lazy"
                    sizes="(max-width: 1024px) 100vw, 360px"
                  />
                )}
              </div>
              <div className="mt-8 text-base font-normal uppercase tracking-[0.18em] text-primary">
                {item.label || `Step ${index + 1}`}
              </div>
              <h3 className="mt-3 text-2xl font-normal">
                {item.title}
              </h3>
              <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
