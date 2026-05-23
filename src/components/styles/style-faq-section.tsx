"use client";

import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { StylePageFAQ } from "@/data/styles/types";

export default function StyleFaqSection({ faq }: { faq: StylePageFAQ }) {
  const itemClassName =
    faq.itemClassName ??
    "rounded-[22px] border border-white/10 bg-background/40 px-6";
  const itemTriggerClassName =
    faq.itemTriggerClassName ?? "gap-4 py-5 text-left text-lg font-semibold";
  const itemContentClassName =
    faq.itemContentClassName ?? "text-base leading-relaxed text-muted-foreground";
  const faqSchema = faq.items?.length
    ? {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        mainEntity: faq.items
          .filter((item) => item.question && item.answer)
          .map((item) => ({
            "@type": "Question",
            name: item.question,
            acceptedAnswer: {
              "@type": "Answer",
              text: item.answer,
            },
          })),
      }
    : null;

  return (
    <section className="landing-section py-20">
      {faqSchema && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
        />
      )}
      <div className="container">
        <div className="mx-auto max-w-3xl text-center">
          <Badge
            variant="outline"
            className={cn("mb-4", faq.badgeClassName)}
          >
            {faq.badgeLabel ?? "FAQ"}
          </Badge>
          <h2 className="text-3xl font-semibold sm:text-4xl">
            {faq.title}
          </h2>
          <p className="mt-4 text-muted-foreground">
            {faq.description}
          </p>
        </div>

        <Accordion type="single" collapsible className="mx-auto mt-10 max-w-3xl space-y-4">
          {faq.items.map((item, index) => (
            <AccordionItem
              key={item.question}
              value={`faq-${index}`}
              className={itemClassName}
            >
              {faq.itemOverlayClassName && (
                <div className={faq.itemOverlayClassName} />
              )}
              <AccordionTrigger
                className={itemTriggerClassName}
              >
                {item.questionSecondary ? (
                  <div>
                    <div>{item.question}</div>
                    <div className="mt-2 text-sm font-normal text-muted-foreground">
                      {item.questionSecondary}
                    </div>
                  </div>
                ) : (
                  item.question
                )}
              </AccordionTrigger>
              <AccordionContent
                className={itemContentClassName}
              >
                {item.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}
