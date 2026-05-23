import { Section as SectionType } from "@/types/blocks/section";

export default function Comparison({ section }: { section: SectionType }) {
  if (section.disabled) {
    return null;
  }

  const beforeLabel = section.before_label || "Before";
  const afterLabel = section.after_label || "After";

  return (
    <section id={section.name} className="landing-section landing-section--alt py-16">
      <div className="container">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-3xl font-semibold sm:text-4xl">{section.title}</h2>
          {section.description && (
            <p className="mt-4 text-muted-foreground">{section.description}</p>
          )}
        </div>

        <div className="mx-auto mt-10 max-w-4xl overflow-hidden rounded-2xl border border-border/70 bg-card/70 shadow-sm">
          <div className="grid grid-cols-2 border-b border-border/70 bg-muted/40">
            <div className="px-6 py-4 text-left text-sm font-semibold text-foreground/90">
              {beforeLabel}
            </div>
            <div className="px-6 py-4 text-left text-sm font-semibold text-foreground">
              {afterLabel}
            </div>
          </div>

          <div>
            {section.items?.map((item, index) => (
              <div
                key={`${item.before}-${item.after}-${index}`}
                className="grid grid-cols-2 border-b border-border/60 last:border-b-0"
              >
                <div className="px-6 py-4 text-sm text-muted-foreground">
                  {item.before}
                </div>
                <div className="bg-primary/5 px-6 py-4 text-sm font-medium text-foreground">
                  {item.after}
                </div>
              </div>
            ))}
          </div>
        </div>

        {section.footer && (
          <p className="mt-6 text-center text-sm text-muted-foreground">
            {section.footer}
          </p>
        )}
      </div>
    </section>
  );
}
