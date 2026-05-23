import { StylePageData } from "./types";

export const corporateMemphisData: StylePageData = {
  slug: "corporate-memphis",
  metadata: {
    title: "Corporate Memphis Caricature Generator | OpenClaw",
    description:
      "Generate Corporate Memphis caricatures for teams, decks, and brand campaigns. Flat vectors, bold palettes, and friendly shapes in seconds.",
    openGraph: {
      title: "Corporate Memphis Caricature Generator | OpenClaw",
      description:
        "Generate Corporate Memphis caricatures for teams, decks, and brand campaigns. Flat vectors, bold palettes, and friendly shapes in seconds.",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Corporate Memphis Caricature Generator | OpenClaw",
      description:
        "Generate Corporate Memphis caricatures for teams, decks, and brand campaigns. Flat vectors, bold palettes, and friendly shapes in seconds.",
    },
  },
  hero: {
    badge: "Corporate Memphis Style",
    title: "Corporate Memphis Caricature Generator",
    description:
      "Turn team photos and ideas into flat vector portraits with bold color blocks, friendly geometry, and clean office-ready vibes.",
    cta: {
      label: "Create Memphis Portraits ->",
      href: "/?style=corporate-memphis",
    },
    image: {
      src: "/images/corporate-memphis/hero.jpg",
      alt: "Corporate Memphis hero",
      width: 900,
      height: 900,
      sizes: "(min-width: 1024px) 45vw, 90vw",
      className: "h-full w-full object-cover",
    },
    media: {
      containerClassName: "relative w-full max-w-2xl",
      frameClassName:
        "relative aspect-square overflow-hidden rounded-[28px] border border-white/10 bg-black/20 shadow-[0_30px_70px_rgba(0,0,0,0.45)]",
    },
  },
  intro: {
    title: "What is Corporate Memphis style?",
    description: [
      "Corporate Memphis is a modern flat illustration style defined by bold colors, simple shapes, and expressive characters. It is widely used in product design, marketing, and internal documentation because it feels friendly and professional at once. The clean geometry keeps faces readable at small sizes, making it perfect for org charts, decks, and onboarding kits.",
      "To get the best results, describe role, outfit, and mood in a few clear phrases. Example prompt: \"A smiling product designer in a teal hoodie, flat vector shapes, warm orange background, Corporate Memphis style.\" This helps the generator lock in the clean outlines, bold color blocks, and playful proportions that define the look.",
      "Use these portraits for team directories, internal wikis, brand mascots, and customer-facing slides when you need consistency across a whole team.",
    ],
  },
  features: [
    {
      iconImage: {
        src: "/images/corporate-memphis/feature-01.png",
        alt: "Puzzle icon",
        width: 48,
        height: 48,
      },
      title: "Flat vector clarity",
      description:
        "Clean shapes and balanced contrast keep portraits readable in decks, docs, and dashboards.",
    },
    {
      iconImage: {
        src: "/images/corporate-memphis/feature-02.png",
        alt: "Playful palette icon",
        width: 48,
        height: 48,
      },
      title: "Office-ready palette",
      description:
        "Bold yet professional colors that feel playful without overwhelming your brand system.",
    },
    {
      iconImage: {
        src: "/images/corporate-memphis/feature-03.png",
        alt: "Team consistency icon",
        width: 48,
        height: 48,
      },
      title: "Instant consistency",
      description:
        "Generate an entire team set that matches in line weight, tone, and visual rhythm.",
    },
  ],
  useCases: [
    {
      title: "Team avatars for org charts",
      description:
        "Give every teammate a matching Memphis portrait for org charts, onboarding kits, and internal profiles.",
      cta: {
        label: "Build a team set ->",
        href: "/?style=corporate-memphis",
      },
      image: "/images/corporate-memphis/use-case-1.png",
    },
    {
      title: "Slide deck illustrations",
      description:
        "Add bold, friendly characters to keynote slides, investor updates, and training modules.",
      cta: {
        label: "Design slide art ->",
        href: "/?style=corporate-memphis",
      },
      image: "/images/corporate-memphis/use-case-2.jpg",
      reverse: true,
    },
    {
      title: "Brand mascots and onboarding",
      description:
        "Create consistent mascots for product tours, welcome emails, and customer success flows.",
      cta: {
        label: "Create a mascot ->",
        href: "/?style=corporate-memphis",
      },
      image: "/images/corporate-memphis/use-case-3.jpg",
    },
  ],
  stepsIntro: {
    title: "How to create Corporate Memphis portraits",
    description: "Three steps to friendly, consistent team art.",
  },
  steps: [
    {
      number: "Step 1",
      title: "Describe the vibe",
      description:
        "Share role, outfit, pose, and mood. Memphis portraits love confident, simple shapes.",
      image: "/images/corporate-memphis/step-01.jpg",
    },
    {
      number: "Step 2",
      title: "Pick Corporate Memphis",
      description:
        "Select the Memphis preset to lock in flat vectors, bold color blocks, and playful geometry.",
      image: "/images/corporate-memphis/step-02.png",
    },
    {
      number: "Step 3",
      title: "Download and deploy",
      description:
        "Export portraits instantly and drop them into decks, docs, or product marketing.",
      image: "/images/corporate-memphis/step-03.jpg",
    },
  ],
  faq: {
    title: "Common Questions",
    description: "Everything you need to know about Corporate Memphis style.",
    items: [
      {
        question: "What is Corporate Memphis style?",
        answer:
          "Corporate Memphis is a modern flat illustration style defined by bold colors, simple shapes, and expressive characters. It is widely used in product design, marketing, and internal documentation because it feels friendly and professional at once.",
      },
      {
        question: "Can I match our brand palette?",
        answer:
          "Yes. Include brand colors in your prompt or select custom colors in post. The style keeps a clean, consistent palette that adapts well to brand systems.",
      },
      {
        question: "Is this style good for teams and org charts?",
        answer:
          "Absolutely. Memphis portraits are clean, readable at small sizes, and consistent across large batches, making them great for org charts and team directories.",
      },
      {
        question: "Can I use the images commercially?",
        answer:
          "Yes. Pro users can use generated portraits in marketing, presentations, merchandise, and other commercial materials.",
      },
    ],
  },
};
