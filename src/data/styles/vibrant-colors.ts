import { StylePageData } from "./types";

export const vibrantColorsData: StylePageData = {
  slug: "vibrant-colors",
  metadata: {
    title: "Vibrant Colors Pop-Art Caricature Generator | OpenClaw",
    description:
      "Create high-saturation caricatures from photos or prompts. Bold contrast, clean skin tones, and print-ready color in seconds.",
    openGraph: {
      title: "Vibrant Colors Pop-Art Caricature Generator | OpenClaw",
      description:
        "Create high-saturation caricatures from photos or prompts. Bold contrast, clean skin tones, and print-ready color in seconds.",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Vibrant Colors Pop-Art Caricature Generator | OpenClaw",
      description:
        "Create high-saturation caricatures from photos or prompts. Bold contrast, clean skin tones, and print-ready color in seconds.",
    },
  },
  hero: {
    badge: "Vibrant Colors Preset",
    title: "Turn any photo into a pop-art caricature that pops",
    description:
      "Upload a photo or write a prompt. Vibrant Colors boosts saturation and contrast while keeping skin tones clean and print-ready.",
    cta: {
      label: "Generate a vibrant caricature ->",
      href: "/?style=vibrant-colors",
    },
    image: {
      src: "/imgs/vibrant-colors/hero.png",
      alt: "Vibrant Colors hero preview",
      width: 900,
      height: 900,
      sizes: "(min-width: 1024px) 45vw, 90vw",
      className: "h-full w-full object-cover",
    },
    imageFooter: {
      left: "Tuned for portraits and clean contrast",
      right: "Color Heat: 98%",
    },
    media: {
      containerClassName: "relative w-full max-w-2xl",
      frameClassName:
        "relative aspect-square overflow-hidden rounded-[28px] border border-white/10 bg-black/20 shadow-[0_30px_70px_rgba(0,0,0,0.45)]",
    },
  },
  intro: {
    title: "Why vibrant color caricatures feel electric",
    description: [
      "Vibrant Colors pushes saturation and contrast without washing out detail. Every hue stays clean, skin tones stay natural, and edges stay crisp so your artwork reads fast on feeds, prints, and merch.",
      "For the best results, call out the palette and mood. Example prompt: \"A confident gamer with neon magenta and cyan lighting, high-contrast pop-art colors, bold outlines, vibrant style.\"",
      "Use vibrant portraits for profile photos, posters, sticker packs, and merch where you want maximum visual impact.",
    ],
  },
  features: [
    {
      iconImage: {
        src: "/imgs/vibrant-colors/feature-01.png",
        alt: "Sparkle icon",
        width: 48,
        height: 48,
      },
      title: "Vivid, clean saturation",
      description: "Push saturation without muddy skin tones or blown highlights.",
    },
    {
      iconImage: {
        src: "/imgs/vibrant-colors/feature-02.png",
        alt: "Artist palette icon",
        width: 48,
        height: 48,
      },
      title: "Balanced warm + cool tones",
      description:
        "Balanced warm and cool tones keep every palette energetic, not chaotic.",
    },
    {
      iconImage: {
        src: "/imgs/vibrant-colors/feature-03.png",
        alt: "Printer icon",
        width: 48,
        height: 48,
      },
      title: "Print-ready contrast",
      description:
        "Bold edges and crisp contrast that stay vivid on posters, stickers, and merch.",
    },
    {
      iconImage: {
        src: "/imgs/vibrant-colors/feature-04.png",
        alt: "Lightning icon",
        width: 48,
        height: 48,
      },
      title: "One-click palette variations",
      description:
        "Generate multiple color stories from one prompt in seconds.",
    },
  ],
  useCases: [
    {
      title: "Profile photos that stop the scroll",
      description: "Turn selfies into vibrant avatars that pop in crowded feeds.",
      cta: {
        label: "Create a vibrant profile photo ->",
        href: "/?style=vibrant-colors&mode=avatar",
      },
      image: "/imgs/vibrant-colors/use-case-01.jpg",
    },
    {
      title: "Event posters and announcements",
      description:
        "Generate key art for gigs, launches, and pop-ups with bold color and clear readability.",
      cta: {
        label: "Create an event poster ->",
        href: "/?style=vibrant-colors",
      },
      image: "/imgs/vibrant-colors/use-case-02.png",
      reverse: true,
    },
    {
      title: "Merch that sells",
      description:
        "Design sticker packs, tees, and drops with sharp lines and candy-bright palettes.",
      cta: {
        label: "Design merch artwork ->",
        href: "/?style=vibrant-colors",
      },
      image: "/imgs/vibrant-colors/use-case-03.jpg",
    },
  ],
  stepsIntro: {
    title: "Create a vibrant caricature in three steps",
    description: "Three steps to a bold, pop-art finish.",
  },
  steps: [
    {
      number: "Step 1",
      title: "Define the palette",
      description:
        "Describe the mood: neon, tropical, or candy-bright. Your prompt sets the palette.",
      image: "/imgs/vibrant-colors/step-01.png",
    },
    {
      number: "Step 2",
      title: "Boost saturation and contrast",
      description:
        "Select the preset to boost saturation, contrast, and highlight glow.",
      image: "/imgs/vibrant-colors/step-02.png",
    },
    {
      number: "Step 3",
      title: "Export and recolor",
      description:
        "Download in seconds, then spin new colorways for avatars, posters, and merch.",
      image: "/imgs/vibrant-colors/step-03.png",
    },
  ],
  faq: {
    title: "Common Questions",
    description: "Color-ready answers for bold creators.",
    items: [
      {
        question: "What does Vibrant Colors do?",
        answer:
          "A high-saturation preset that boosts contrast and glow while keeping details clean.",
      },
      {
        question: "Can I use it for printed merch?",
        answer:
          "Yes. Palettes are tuned for print-friendly contrast so stickers, tees, and posters stay vivid.",
      },
      {
        question: "How do I keep colors balanced?",
        answer:
          "Include lighting and mood in your prompt. The model balances warm and cool tones while staying high-saturation.",
      },
      {
        question: "Does it work for photos and text prompts?",
        answer:
          "Yes. Upload a photo or start with text, and the preset applies the same punchy treatment.",
      },
    ],
  },
};
