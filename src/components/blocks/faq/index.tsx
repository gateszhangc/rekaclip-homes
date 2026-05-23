import * as AccordionPrimitive from "@radix-ui/react-accordion";
import { ChevronDown } from "lucide-react";
import { Accordion, AccordionContent, AccordionItem } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Section as SectionType } from "@/types/blocks/section";

export default function FAQ({ section }: { section: SectionType }) {
  if (section.disabled) {
    return null;
  }

  const faqSchema =
    section.items && section.items.length
      ? {
          "@context": "https://schema.org",
          "@type": "FAQPage",
          mainEntity: section.items
            .filter((item) => item.title && item.description)
            .map((item) => ({
              "@type": "Question",
              name: item.title,
              acceptedAnswer: {
                "@type": "Answer",
                text: item.description,
              },
            })),
        }
      : null;

  return (
    <section id={section.name} className="landing-section py-16">
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}
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
          <p className="mt-4 text-muted-foreground">
            {section.description}
          </p>
        </div>
        <Accordion
          type="single"
          collapsible
          className="mx-auto mt-10 max-w-3xl space-y-4"
        >
          {section.items?.map((item, index) => (
            <AccordionItem
              key={`${item.title}-${index}`}
              value={`faq-${index}`}
              className="rounded-[22px] border border-white/10 bg-background/40 px-6"
            >
              <AccordionPrimitive.Header className="flex items-center justify-between gap-4 py-5">
                <span className="min-w-0 flex-1 text-left text-lg font-semibold text-foreground">
                  {item.title}
                </span>
                <AccordionPrimitive.Trigger className="group flex size-9 shrink-0 items-center justify-center rounded-full border border-border/60 bg-muted/30 text-foreground/80 transition hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <span className="sr-only">Toggle answer</span>
                  <ChevronDown className="h-4 w-4 transition-transform duration-200 group-data-[state=open]:rotate-180" />
                </AccordionPrimitive.Trigger>
              </AccordionPrimitive.Header>
              <AccordionContent className="text-base leading-relaxed text-muted-foreground">
                {item.description}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
