import { StylePageData } from "./types";

export const storybookData: StylePageData = {
  slug: "storybook",
  metadata: {
    title: "Storybook Style Caricature Generator | OpenClaw",
    description:
      "Create storybook-style caricatures with warm light and painterly texture. Start from text or a photo and generate in seconds.",
    openGraph: {
      title: "Storybook Style Caricature Generator | OpenClaw",
      description:
        "Create storybook-style caricatures with warm light and painterly texture. Start from text or a photo and generate in seconds.",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Storybook Style Caricature Generator | OpenClaw",
      description:
        "Create storybook-style caricatures with warm light and painterly texture. Start from text or a photo and generate in seconds.",
    },
  },
  hero: {
    badge: "Storybook Style Preset",
    title: "Storybook Style Caricature Generator",
    description:
      "Turn portraits and prompts into warm, storybook scenes with soft light and painterly texture.",
    cta: {
      label: "Start Generating",
      href: "/?style=storybook",
    },
    image: {
      src: "/imgs/ghibli/hero.jpg",
      alt: "Storybook style caricature preview",
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
    title: "Why storybook style feels timeless",
    description: [
      "Storybook scenes blend warm, painterly backgrounds with gentle character design. The lighting stays soft, the palette stays quiet, and the composition feels cinematic. It is ideal for portraits that read like a storybook still.",
      "For the best results, include mood, time of day, and a small setting detail. Example prompt: \"A cozy traveler in a wool coat, misty forest at sunrise, soft painterly light, storybook style.\"",
      "Use storybook portraits for avatars, posters, book covers, and illustrated announcements where you want calm, narrative energy.",
    ],
  },
  features: [
    {
      iconImage: {
        src: "/imgs/ghibli/feature-01.png",
        alt: "Painterly brush icon",
        width: 48,
        height: 48,
      },
      title: "Painterly textures",
      description:
        "Soft brush shading and light grain keep portraits natural and tactile.",
    },
    {
      iconImage: {
        src: "/imgs/ghibli/feature-02.png",
        alt: "Sun and cloud icon",
        width: 48,
        height: 48,
      },
      title: "Soft cinematic light",
      description: "Warm sun and gentle highlights create a calm, nostalgic mood.",
    },
    {
      iconImage: {
        src: "/imgs/ghibli/feature-icon.png",
        alt: "Storybook feature icon",
        width: 48,
        height: 48,
      },
      title: "Nature-first palettes",
      description:
        "Muted greens, amber skies, and quiet blues keep scenes grounded.",
    },
    {
      iconImage: {
        src: "/imgs/ghibli/feature-04.png",
        alt: "Storybook composition icon",
        width: 48,
        height: 48,
      },
      title: "Storybook composition",
      description:
        "Balanced foregrounds and wide backdrops feel like a full narrative frame.",
    },
  ],
  useCases: [
    {
      title: "Cozy village portraits",
      description:
        "Turn a single photo into a calm village scene with hand-painted detail and warm light.",
      cta: {
        label: "Generate a cozy portrait ->",
        href: "/?style=storybook&mode=avatar",
      },
      image: "/imgs/ghibli/use-case-01.png",
    },
    {
      title: "Whispering forest posters",
      description:
        "Create cinematic backdrops for prints, book covers, and event posters.",
      cta: {
        label: "Create a forest poster ->",
        href: "/?style=storybook",
      },
      image: "/imgs/ghibli/use-case-02.png",
      reverse: true,
    },
    {
      title: "Magical travel diaries",
      description:
        "Build dreamy postcard sets for journals, mood boards, and storytelling.",
      cta: {
        label: "Start a diary series ->",
        href: "/?style=storybook",
      },
      image: "/imgs/ghibli/use-case-03.png",
    },
  ],
  useCasesSectionId: "storybook-scenes",
  stepsIntro: {
    title: "How to create storybook style caricatures",
    description: "Three steps to a calm, storybook finish.",
  },
  steps: [
    {
      number: "Step 1",
      title: "Write a prompt or upload a photo",
      description:
        "Describe the character, setting, time of day, and mood or use a photo as a guide.",
      image: "/imgs/ghibli/step-01.png",
    },
    {
      number: "Step 2",
      title: "Choose the storybook preset",
      description: "Lock in warm light, painterly texture, and soft color harmony.",
      image: "/imgs/ghibli/step-02.png",
    },
    {
      number: "Step 3",
      title: "Generate and download",
      description:
        "Export your scene and reuse it across avatars, posters, and stories.",
      image: "/imgs/ghibli/step-03.png",
    },
  ],
  faq: {
    title: "Storybook Style FAQ",
    description: "Quick answers before you start.",
    badgeClassName: "mb-4 border-primary/40 bg-primary/10 text-primary",
    items: [
      {
        question: "What is storybook style?",
        answer:
          "A soft, hand-painted look with warm light, gentle gradients, and storybook composition.",
      },
      {
        question: "Can I use this style for avatars and posters?",
        answer:
          "Yes. The style works well for portraits, poster art, and calming backgrounds with strong mood.",
      },
      {
        question: "How do I get more cinematic scenes?",
        answer:
          "Add setting details, time of day, weather, and a clear mood. Lighting and atmosphere matter most.",
      },
      {
        question: "Does it work for both photos and text prompts?",
        answer:
          "Yes. Upload a photo for a guided look or start from text to build a new scene.",
      },
    ],
  },
};
