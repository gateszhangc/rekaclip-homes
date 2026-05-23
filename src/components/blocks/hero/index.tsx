import NextImage from "next/image";
import { Badge } from "@/components/ui/badge";
import { Hero as HeroType } from "@/types/blocks/hero";
import { Link } from "@/i18n/navigation";
import CaricatureMakerLazy from "@/components/caricature-maker/lazy";
import { cn } from "@/lib/utils";
import { Sparkles } from "lucide-react";

export default function Hero({ hero }: { hero: HeroType }) {
  if (hero.disabled) {
    return null;
  }

  const highlightText = hero.highlight_text;
  let texts = null;
  if (highlightText) {
    texts = hero.title?.split(highlightText, 2);
  }
  const titleContent =
    texts && texts.length > 1 ? (
      <>
        {texts[0]}
        <span className="landing-title-highlight">{highlightText}</span>
        {texts[1]}
      </>
    ) : (
      hero.title
    );
  const featureAccentClasses = [
    "border-amber-500/30 bg-amber-500/30 text-white",
    "border-emerald-500/30 bg-emerald-500/30 text-white",
    "border-sky-500/30 bg-sky-500/30 text-white",
    "border-rose-500/30 bg-rose-500/30 text-white",
  ];

  return (
    <section className="landing-hero relative">
      <div className="container relative z-10">
        {hero.show_badge && (
          <div className="landing-reveal landing-reveal--1 mb-8 flex items-center justify-center lg:justify-start">
            <NextImage
              src="https://pub-e1eb76428e24457ebfc067c635cb4fc4.r2.dev/imgs/badges/phdaily.svg"
              alt="phdaily"
              width={120}
              height={40}
              className="object-cover"
              priority
            />
          </div>
        )}
        <div className="flex flex-col items-center gap-10">
          <div className="text-center mt-4 sm:-mt-20">
            {hero.announcement && (
              <Link
                href={hero.announcement.url as any}
                className="landing-hero-chip landing-reveal landing-reveal--2 mx-auto mb-3 inline-flex items-center gap-3 px-3 py-1 text-xs uppercase tracking-wide text-muted-foreground lg:mx-0"
              >
                {hero.announcement.label && (
                  <Badge
                    variant="outline"
                    className="landing-hero-badge bg-primary/20 text-primary border-primary/40"
                  >
                    {hero.announcement.label}
                  </Badge>
                )}
                {hero.announcement.title}
              </Link>
            )}

            <h1 className="landing-title landing-reveal landing-reveal--3 landing-reveal--instant mx-auto mb-3 mt-3 max-w-4xl text-balance text-3xl font-semibold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
              <span className="inline-flex items-center justify-center gap-3 text-center lg:justify-start">
                {hero.title_logo?.src && (
                  <NextImage
                    src={hero.title_logo.src}
                    alt={hero.title_logo.alt || "OpenClaw logo"}
                    width={44}
                    height={44}
                    className="h-11 w-11 object-contain drop-shadow-sm"
                  />
                )}
                <span>{titleContent}</span>
              </span>
            </h1>

            {hero.subtitle && (
              <p className="landing-reveal landing-reveal--4 mx-auto mt-1 max-w-3xl text-base text-white sm:text-lg lg:text-xl">
                <span className="inline-flex items-center justify-center gap-2">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  <span>{hero.subtitle}</span>
                  <Sparkles className="h-4 w-4 text-amber-400" />
                </span>
              </p>
            )}

            <p
              className="landing-reveal landing-reveal--4 mx-auto max-w-3xl text-base text-muted-foreground/90 sm:text-lg lg:text-xl line-clamp-2"
              dangerouslySetInnerHTML={{ __html: hero.description || "" }}
            />

            {hero.features && hero.features.length > 0 && (
              <div className="landing-reveal landing-reveal--5 mt-3 flex flex-wrap justify-center gap-2">
                {hero.features.map((feature, index) => (
                  <Badge
                    key={`${feature}-${index}`}
                    variant="outline"
                    className={cn(
                      "landing-hero-badge border px-4 py-1 text-xs font-semibold uppercase leading-[1.1] tracking-[0.2em]",
                      featureAccentClasses[index % featureAccentClasses.length]
                    )}
                  >
                    {feature}
                  </Badge>
                ))}
              </div>
            )}
          </div>

          <div
            id="caricature-maker"
            className="landing-reveal landing-reveal--6 w-full scroll-mt-28"
          >
            <CaricatureMakerLazy />
          </div>
        </div>
      </div>
    </section>
  );
}
