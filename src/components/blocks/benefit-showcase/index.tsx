import BeforeAfterSlider from "@/components/before-after-slider";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Section, SectionItem } from "@/types/blocks/section";

interface BenefitShowcaseProps {
  section: Section;
}

export default function BenefitShowcase({ section }: BenefitShowcaseProps) {
  if (section.disabled || !section.items?.length) {
    return null;
  }

  const renderTitle = (item: SectionItem) => {
    if (!item.highlight) {
      return item.title;
    }

    return (
      <>
        {item.title}{" "}
        <span className="text-primary">{item.highlight}</span>
      </>
    );
  };

  return (
    <section className="landing-section py-16">
      <div className="container">
        <div className="mb-12 max-w-3xl">
          {section.label && (
            <Badge variant="outline" className="mb-4">
              {section.label}
            </Badge>
          )}
          {section.title && (
            <h2 className="mb-4 text-3xl font-bold lg:text-4xl">
              {section.title}
            </h2>
          )}
          {section.description && (
            <p className="text-muted-foreground text-lg leading-relaxed">
              {section.description}
            </p>
          )}
        </div>

        <div className="space-y-10">
          {section.items.map((item, idx) => (
            <div
              key={idx}
              className={cn(
                "grid gap-10 rounded-[32px] border bg-gradient-to-br from-muted/60 via-background to-muted/60 p-8 shadow-sm lg:grid-cols-2 lg:p-12",
                item.reverse && "lg:[&>div:first-child]:order-2 lg:[&>div:last-child]:order-1"
              )}
            >
              <div className="space-y-4 lg:space-y-6">
                {item.label && (
                  <Badge variant="outline" className="mb-2">
                    {item.label}
                  </Badge>
                )}
                {item.title && (
                  <h3 className="text-2xl font-semibold leading-tight lg:text-3xl">
                    {renderTitle(item)}
                  </h3>
                )}
                {item.description && (
                  <p className="text-muted-foreground leading-relaxed lg:text-lg">
                    {item.description}
                  </p>
                )}
                {item.buttons?.length ? (
                  <div className="flex flex-wrap gap-3">
                    {item.buttons.map((btn, buttonIdx) => (
                      <a
                        key={buttonIdx}
                        href={btn.url}
                        target={btn.target}
                        className="text-primary font-medium hover:underline"
                      >
                        {btn.title}
                      </a>
                    ))}
                  </div>
                ) : null}
              </div>

              <div className="relative">
                <BeforeAfterSlider
                  beforeSrc={item.beforeSrc || "https://pub-e1eb76428e24457ebfc067c635cb4fc4.r2.dev/before.png"}
                  afterSrc={item.afterSrc || "https://pub-e1eb76428e24457ebfc067c635cb4fc4.r2.dev/after.png"}
                  beforeAlt={item.beforeAlt || item.title || "Before"}
                  afterAlt={item.afterAlt || item.title || "After"}
                  priority={idx === 0}
                  className="shadow-2xl"
                />
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
