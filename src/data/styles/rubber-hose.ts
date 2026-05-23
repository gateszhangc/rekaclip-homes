import { StylePageData } from "./types";

export const rubberHoseData: StylePageData = {
  slug: "rubber-hose",
  metadata: {
    title: "Free Rubber Hose Caricature Generator | OpenClaw",
    description:
      "Transform photos or text into authentic 1920s rubber hose cartoon art. Free daily credits, no sign-up required. Create Cuphead-style caricatures in seconds.",
    openGraph: {
      title: "Free Rubber Hose Caricature Generator | OpenClaw",
      description:
        "Transform photos or text into authentic 1920s rubber hose cartoon art. Free daily credits, no sign-up required. Create Cuphead-style caricatures in seconds.",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title: "Free Rubber Hose Caricature Generator | OpenClaw",
      description:
        "Transform photos or text into authentic 1920s rubber hose cartoon art. Free daily credits, no sign-up required. Create Cuphead-style caricatures in seconds.",
    },
  },
  hero: {
    badge: "1920s Vintage Cartoon Style",
    title: "Rubber Hose Caricature Generator",
    description:
      "Transform any photo or text into authentic 1920s-style cartoon art. Capture the charm of Cuphead, early Mickey Mouse, and Betty Boop — in seconds.",
    cta: {
      label: "Create Your Caricature →",
      href: "/?style=rubber-hose",
    },
    image: {
      src: "/images/rubber-hose/hero.jpg",
      alt: "Rubber hose caricature examples",
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
    title: "What is Rubber Hose Animation?",
    subheading: "什么是橡皮管动画风格？",
    description: [
      "Rubber hose animation is the iconic cartoon style from the 1920s-1930s, defined by characters with flexible, jointless limbs, round shapes, and expressive pie-cut eyes. Think early Mickey Mouse, Betty Boop, and Felix the Cat.",
      "Recently revived by the hit game Cuphead, this timeless style brings instant nostalgia and playful energy to any portrait. Our AI captures these authentic vintage details — from white gloves to bouncy movements — transforming your descriptions into genuine rubber hose art.",
      "For the best results, describe the character and setting clearly. Example prompt: \"A jazz trumpet player with white gloves, big pie-cut eyes, and stretchy limbs, 1930s rubber hose style, sepia background.\"",
    ],
  },
  features: [
    {
      iconImage: {
        src: "/images/rubber-hose/feature-icon.png",
        alt: "Rubber hose feature icon",
        width: 48,
        height: 48,
      },
      title: "Free to Start",
      subtitle: "免费开始",
      description:
        "Get daily free credits. No sign-up, no credit card. Just create.",
      descriptionSecondary: "每日免费积分，无需注册，无需信用卡，即刻创作。",
    },
    {
      iconImage: {
        src: "/images/rubber-hose/feature-02.png",
        alt: "Retro robot icon",
        width: 48,
        height: 48,
      },
      title: "1920s-Accurate AI",
      subtitle: "1920s 风格精准AI",
      description:
        "Trained on authentic vintage animations to capture every bouncy curve and pie-cut eye.",
      descriptionSecondary:
        "基于经典复古动画训练，精准还原每一个弹性曲线和饼状眼睛。",
    },
    {
      iconImage: {
        src: "/images/rubber-hose/feature-03.png",
        alt: "Palette badge icon",
        width: 48,
        height: 48,
      },
      title: "Use Anywhere",
      subtitle: "随处可用",
      description:
        "Avatars, social posts, merchandise, marketing — your caricature, your rules.",
      descriptionSecondary: "头像、社交媒体、周边商品、营销素材 — 你的漫画，你做主。",
    },
    {
      iconImage: {
        src: "/images/rubber-hose/feature-04.png",
        alt: "Energy badge icon",
        width: 48,
        height: 48,
      },
      title: "Ready in Seconds",
      subtitle: "秒速生成",
      description:
        "Describe your idea, click generate, download. Three steps, one vintage masterpiece.",
      descriptionSecondary: "描述创意，点击生成，下载作品。三步完成，一件复古杰作。",
    },
  ],
  useCases: [
    {
      title: "Create Cuphead-Inspired Characters",
      description:
        "Love the Cuphead aesthetic? Generate original characters in authentic 1930s rubber hose style — perfect for game concepts, fan art, Twitch emotes, or Discord stickers. Capture that bouncy, hand-animated charm that made vintage cartoons unforgettable.",
      cta: {
        label: "Generate Game Art →",
        href: "/?style=rubber-hose",
      },
      image: "/images/rubber-hose/use-case-1.png",
    },
    {
      title: "Stand Out With a 1920s Cartoon Avatar",
      description:
        "Replace your photo with a unique rubber hose portrait. Get that timeless, hand-drawn charm that makes your Discord, Twitter, LinkedIn, or Instagram profile unforgettable. Express your personality through the golden age of animation.",
      cta: {
        label: "Create My Vintage Avatar →",
        href: "/?style=rubber-hose&mode=avatar",
      },
      image: "/images/rubber-hose/use-case-2.png",
      reverse: true,
    },
    {
      title: "Bring the Roaring Twenties to Life",
      description:
        "Creating a Gatsby party, Halloween event, or jazz night? Generate authentic 1920s-style caricatures for invitations, posters, decorations, and social posts. Perfect for themed events, retro marketing campaigns, or anywhere vintage charm is needed.",
      cta: {
        label: "Design Event Graphics →",
        href: "/?style=rubber-hose",
      },
      image: "/images/rubber-hose/use-case-3.png",
    },
  ],
  stepsIntro: {
    title: "How to Create Rubber Hose Caricatures",
    description: "Three simple steps to vintage cartoon magic.",
  },
  steps: [
    {
      number: "Step 1",
      title: "Describe Your Character",
      description:
        "Enter details: appearance, expression, outfit, setting. The more specific, the better your vintage caricature.",
      image: "/images/rubber-hose/step-1.png",
    },
    {
      number: "Step 2",
      title: "Choose Rubber Hose Style",
      description:
        "Select the 1920s vintage animation preset to get authentic bouncy limbs, pie-cut eyes, and classic charm.",
      image: "/images/rubber-hose/step-2.png",
    },
    {
      number: "Step 3",
      title: "Download & Use",
      description:
        "Get your caricature in seconds. Use it for avatars, social posts, game art, or print — anywhere you want.",
      image: "/images/rubber-hose/step-3.png",
    },
  ],
  faq: {
    title: "Common Questions",
    description: "Everything you need to know about rubber hose caricatures.",
    items: [
      {
        question: "What is rubber hose animation style?",
        answer:
          "Rubber hose animation is a distinctive cartoon style from the 1920s-1930s, characterized by characters with flexible, jointless limbs, round shapes, expressive pie-cut eyes, and iconic white gloves. This style was popularized by early Mickey Mouse, Betty Boop, and recently revived by the video game Cuphead.",
      },
      {
        question: "How do I create a rubber hose caricature?",
        answer:
          "Simply describe what you want in the text box, select the Rubber Hose style if available, and click Generate. Our AI will transform your input into a charming vintage cartoon portrait in seconds.",
      },
      {
        question: "Is the caricature maker free to use?",
        answer:
          "Yes! You can generate caricatures for free with daily credits. No sign-up required for basic usage. For unlimited generations and premium features, check out our affordable pricing plans.",
      },
      {
        question: "Can I use the generated caricatures commercially?",
        answer:
          "Yes, all caricatures generated with our Pro plan can be used for commercial purposes, including marketing materials, merchandise, publications, and business branding.",
      },
      {
        question: "What makes your caricature maker different from other AI tools?",
        answer:
          "Our AI is specifically trained to capture authentic cartoon aesthetics and create expressive, high-quality caricatures. We focus on personality and artistic flair, not just generic stylization.",
      },
    ],
  },
};
