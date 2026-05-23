import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { StylePageData } from "@/data/styles/types";
import StyleFaqSection from "@/components/styles/style-faq-section";

export default function StyleLandingTemplate({ data }: { data: StylePageData }) {
  const featureGridClassName =
    data.features.length === 3
      ? "grid gap-6 md:grid-cols-2 xl:grid-cols-3"
      : "grid gap-6 md:grid-cols-2 xl:grid-cols-4";
  const featureCardClassName =
    data.theme?.featureCardClassName ??
    "group rounded-[28px] border p-6 transition duration-300 hover:-translate-y-1";
  const useCaseCardClassName =
    data.theme?.useCaseCardClassName ??
    "grid gap-10 rounded-[32px] border p-8 shadow-xl lg:grid-cols-2 lg:items-center lg:p-12";
  const useCaseImageWrapperClassName =
    data.theme?.useCaseImageWrapperClassName ??
    "relative w-full max-w-md overflow-hidden rounded-[28px] shadow-[0_20px_60px_rgba(0,0,0,0.35)]";
  const useCaseImageClassName =
    data.theme?.useCaseImageClassName ?? "h-auto w-full object-cover";
  const stepsCardClassName =
    data.theme?.stepsCardClassName ??
    "rounded-[28px] border p-6 text-center shadow-lg";
  const stepsImageWrapperClassName =
    data.theme?.stepsImageWrapperClassName ??
    "relative overflow-hidden rounded-[20px]";
  const stepsImageClassName =
    data.theme?.stepsImageClassName ?? "h-auto w-full object-cover";
  const introParagraphs = Array.isArray(data.intro.description)
    ? data.intro.description
    : [data.intro.description];
  const useCaseImageSize = data.useCaseImageSize ?? { width: 900, height: 900 };
  const stepImageSize = data.stepImageSize ?? { width: 520, height: 520 };
  const shouldPrioritizeUseCase = data.useCaseImagePriority === "first";
  const heroMedia = data.hero.media;
  const heroMediaClassName =
    heroMedia?.containerClassName ?? "relative w-full max-w-2xl";
  const heroMediaFrameClassName = heroMedia?.frameClassName;
  const heroMediaInnerClassName = heroMedia?.innerClassName;
  const heroMediaImageClassName = heroMedia?.imageClassName;
  const heroImageFooter = data.hero.imageFooter;
  const heroImageFooterNode = heroImageFooter ? (
    <div
      className={cn(
        "pointer-events-none absolute inset-x-3 bottom-3 flex items-center justify-between rounded-full border border-white/10 bg-black/70 px-3 py-1.5 text-[11px] font-medium text-white/70 shadow-[0_12px_30px_rgba(0,0,0,0.35)] backdrop-blur",
        heroImageFooter.className
      )}
    >
      <span>{heroImageFooter.left}</span>
      {heroImageFooter.right ? (
        <span className="text-amber-300">{heroImageFooter.right}</span>
      ) : null}
    </div>
  ) : null;
  const heroSectionDecorationClassName =
    data.hero.sectionDecorations?.wrapperClassName ??
    "pointer-events-none absolute inset-0";

  return (
    <div className="text-foreground">
      <section className={cn("landing-hero relative", data.hero.sectionClassName)}>
        {data.hero.sectionDecorations?.items?.length ? (
          <div className={heroSectionDecorationClassName}>
            {data.hero.sectionDecorations.items.map((className, index) => (
              <div key={`${className}-${index}`} className={className} />
            ))}
          </div>
        ) : null}
        <div className="container relative z-10">
          <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.95fr)]">
            <div className="landing-reveal landing-reveal--2 flex flex-col items-center text-center lg:items-start lg:text-left">
              <Badge
                variant="outline"
                className="landing-hero-badge border-primary/40 bg-primary/10 text-primary"
              >
                {data.hero.badge}
              </Badge>
              <h1 className="landing-title landing-reveal landing-reveal--3 mt-6 text-balance text-4xl font-semibold sm:text-5xl lg:text-6xl">
                {data.hero.title}
              </h1>
              <p className="landing-reveal landing-reveal--4 mt-4 max-w-2xl text-base text-muted-foreground/90 sm:text-lg lg:text-xl">
                {data.hero.description}
              </p>
              <div className="landing-hero-actions mt-8 flex flex-wrap justify-center gap-4 lg:justify-start">
                <Button
                  asChild
                  size="lg"
                  className="landing-hero-button bg-primary text-primary-foreground"
                >
                  <Link href={data.hero.cta.href}>{data.hero.cta.label}</Link>
                </Button>
              </div>
            </div>
            <div className="landing-reveal landing-reveal--4 flex justify-center lg:justify-end">
              <div className={heroMediaClassName}>
                {heroMedia?.decorations?.map((className, index) => (
                  <div key={`${className}-${index}`} className={className} />
                ))}
                {heroMediaFrameClassName ? (
                  <div className={heroMediaFrameClassName}>
                    {heroMediaInnerClassName ? (
                      <div className={heroMediaInnerClassName}>
                        <Image
                          src={data.hero.image.src}
                          alt={data.hero.image.alt}
                          width={data.hero.image.width}
                          height={data.hero.image.height}
                          sizes={data.hero.image.sizes}
                          className={cn(
                            "h-auto w-full",
                            data.hero.image.className,
                            heroMediaImageClassName
                          )}
                          priority
                        />
                      </div>
                    ) : (
                      <Image
                        src={data.hero.image.src}
                        alt={data.hero.image.alt}
                        width={data.hero.image.width}
                        height={data.hero.image.height}
                        sizes={data.hero.image.sizes}
                        className={cn(
                          "h-auto w-full",
                          data.hero.image.className,
                          heroMediaImageClassName
                        )}
                        priority
                      />
                    )}
                    {heroImageFooterNode}
                  </div>
                ) : heroMediaInnerClassName ? (
                  <div
                    className={cn(
                      heroMediaInnerClassName,
                      heroImageFooterNode ? "relative" : undefined
                    )}
                  >
                    <Image
                      src={data.hero.image.src}
                      alt={data.hero.image.alt}
                      width={data.hero.image.width}
                      height={data.hero.image.height}
                      sizes={data.hero.image.sizes}
                      className={cn(
                        "h-auto w-full",
                        data.hero.image.className,
                        heroMediaImageClassName
                      )}
                      priority
                    />
                    {heroImageFooterNode}
                  </div>
                ) : (
                  <>
                    {heroImageFooterNode ? (
                      <div className="relative">
                        <Image
                          src={data.hero.image.src}
                          alt={data.hero.image.alt}
                          width={data.hero.image.width}
                          height={data.hero.image.height}
                          sizes={data.hero.image.sizes}
                          className={cn(
                            "h-auto w-full",
                            data.hero.image.className,
                            heroMediaImageClassName
                          )}
                          priority
                        />
                        {heroImageFooterNode}
                      </div>
                    ) : (
                      <Image
                        src={data.hero.image.src}
                        alt={data.hero.image.alt}
                        width={data.hero.image.width}
                        height={data.hero.image.height}
                        sizes={data.hero.image.sizes}
                        className={cn(
                          "h-auto w-full",
                          data.hero.image.className,
                          heroMediaImageClassName
                        )}
                        priority
                      />
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="landing-section py-16">
        <div className="container">
          <div className={featureGridClassName}>
            {data.features.map((feature) => (
              <div
                key={feature.title}
                data-slot="card"
                className={featureCardClassName}
              >
                <div className="mb-4 flex items-center gap-3">
                  <div className="flex size-12 items-center justify-center rounded-2xl border border-primary/30 bg-primary/10 text-xl">
                    {feature.iconImage ? (
                      <Image
                        src={feature.iconImage.src}
                        alt={feature.iconImage.alt}
                        width={feature.iconImage.width}
                        height={feature.iconImage.height}
                        className={cn(
                          "h-10 w-10 object-contain",
                          feature.iconImage.className
                        )}
                      />
                    ) : (
                      feature.icon
                    )}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold">
                      {feature.title}
                    </h3>
                    {feature.subtitle ? (
                      <span className="mt-1 block text-xs font-normal text-muted-foreground/80">
                        {feature.subtitle}
                      </span>
                    ) : null}
                  </div>
                </div>
                <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
                {feature.descriptionSecondary ? (
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground/70">
                    {feature.descriptionSecondary}
                  </p>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section landing-section--alt py-20">
        <div className="container">
          <div className="mx-auto max-w-4xl text-center">
            <h2 className="text-3xl font-semibold sm:text-4xl">
              {data.intro.title}
            </h2>
            {data.intro.subheading ? (
              <p className="mt-3 text-lg text-muted-foreground">
                {data.intro.subheading}
              </p>
            ) : null}
            {introParagraphs.map((paragraph, index) => {
              const spacingClass =
                index === 0 ? (data.intro.subheading ? "mt-6" : "mt-4") : "mt-4";

              return (
                <p
                  key={`${paragraph.slice(0, 20)}-${index}`}
                  className={cn(
                    spacingClass,
                    "text-base leading-relaxed text-muted-foreground/90 lg:text-lg"
                  )}
                >
                  {paragraph}
                </p>
              );
            })}
          </div>
        </div>
      </section>

      <section
        id={data.useCasesSectionId}
        className="landing-section py-20"
      >
        <div className="container space-y-12">
          {data.useCases.map((useCase, index) => (
            <div
              key={useCase.title}
              data-slot="card"
              className={cn(
                useCaseCardClassName,
                useCase.reverse &&
                  "lg:[&>div:first-child]:order-2 lg:[&>div:last-child]:order-1"
              )}
            >
              <div className="space-y-4">
                <h3 className="text-2xl font-semibold lg:text-3xl">
                  {useCase.title}
                </h3>
                <p className="text-base leading-relaxed text-muted-foreground lg:text-lg">
                  {useCase.description}
                </p>
                <div className="pt-2">
                  <Button
                    asChild
                    size="lg"
                    className="landing-hero-button bg-primary text-primary-foreground"
                  >
                    <Link href={useCase.cta.href}>{useCase.cta.label}</Link>
                  </Button>
                </div>
              </div>
              <div className="flex justify-center">
                <div className={useCaseImageWrapperClassName}>
                  <Image
                    src={useCase.image}
                    alt={useCase.title}
                    width={useCaseImageSize.width}
                    height={useCaseImageSize.height}
                    className={useCaseImageClassName}
                    priority={shouldPrioritizeUseCase && index === 0}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="landing-section landing-section--alt py-20">
        <div className="container">
          <div className="mx-auto max-w-3xl text-center">
            <h2 className="text-3xl font-semibold sm:text-4xl">
              {data.stepsIntro.title}
            </h2>
            <p className="mt-4 text-muted-foreground">
              {data.stepsIntro.description}
            </p>
          </div>
          <div className="mt-12 grid gap-8 lg:grid-cols-3">
            {data.steps.map((step) => (
              <div key={step.number} data-slot="card" className={stepsCardClassName}>
                <div className={stepsImageWrapperClassName}>
                  <Image
                    src={step.image}
                    alt={step.title}
                    width={stepImageSize.width}
                    height={stepImageSize.height}
                    className={stepsImageClassName}
                  />
                </div>
                <div className="mt-6 text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                  {step.number}
                </div>
                <h3 className="mt-2 text-lg font-semibold">{step.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <StyleFaqSection faq={data.faq} />
    </div>
  );
}
