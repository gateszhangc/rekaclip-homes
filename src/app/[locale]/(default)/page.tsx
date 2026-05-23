import { getLandingPage } from "@/services/page";
import RekaClipLanding from "@/components/landing/reka-clip-landing";

export async function generateMetadata() {
  return {
    title: "Reka Clip - AI Video Clipping Platform | Turn Long Videos into Viral Shorts",
    description:
      "Reka Clip uses AI to turn long videos into shorts in one click. Paste a YouTube or Twitch link, or upload a video to generate viral clips with auto-captions.",
    keywords:
      "reka clip, ai video clipping, viral clips, video to shorts, youtube clipper, twitch clipper, ai captions, video editing",
  };
}

export default async function LandingPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const page = await getLandingPage(locale);

  return <RekaClipLanding data={page as any} />;
}
