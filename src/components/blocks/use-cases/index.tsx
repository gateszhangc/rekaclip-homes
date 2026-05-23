import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { Section as SectionType } from "@/types/blocks/section";

export default function UseCases({ section }: { section: SectionType }) {
  if (section.disabled || !section.items?.length) {
    return null;
  }

  return (
    <section id={section.name} className="landing-section py-20">
      <div className="container space-y-12">
        {(section.title || section.description) && (
          <div className="mx-auto max-w-4xl text-center">
            {section.title && (
              <h2 className="text-3xl font-semibold sm:text-4xl">
                {section.title}
              </h2>
            )}
            {section.description && (
              <p className="mt-4 text-base leading-relaxed text-muted-foreground/90 lg:text-lg">
                {section.description}
              </p>
            )}
          </div>
        )}

        {section.items.map((item, index) => (
          <div
            key={item.title ?? index}
            data-slot="card"
            className={cn(
              "grid gap-10 rounded-[32px] border p-8 shadow-xl lg:grid-cols-2 lg:items-center lg:p-12",
              item.reverse &&
              "lg:[&>div:first-child]:order-2 lg:[&>div:last-child]:order-1"
            )}
          >
            <div className="space-y-4">
              {item.title && (
                <h3 className="text-2xl font-semibold lg:text-3xl">
                  {item.title}
                </h3>
              )}
              {item.description && (
                <p className="text-base leading-relaxed text-muted-foreground lg:text-lg">
                  {item.description}
                </p>
              )}
              {item.buttons?.length ? (
                <div className="pt-2">
                  {item.buttons.map((button, buttonIndex) => (
                    <Button
                      key={`${button.title ?? "button"}-${buttonIndex}`}
                      asChild
                      size="lg"
                      className={cn(
                        "landing-hero-button bg-primary text-primary-foreground",
                        button.className
                      )}
                    >
                      <Link href={button.url || "#"}>
                        {button.title}
                      </Link>
                    </Button>
                  ))}
                </div>
              ) : null}
            </div>

            {item.image?.src && (
              <div className="flex justify-center">
                <div className="relative w-full max-w-md overflow-hidden rounded-[28px] shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
                  <Image
                    src={item.image.src}
                    alt={item.image.alt || item.title || "Use case preview"}
                    width={800}
                    height={600}
                    className="h-auto w-full rounded-[28px] object-cover"
                    sizes="(max-width: 1024px) 90vw, 448px"
                  />
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
