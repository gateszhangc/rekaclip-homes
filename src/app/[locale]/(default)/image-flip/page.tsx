import ImageFlipGenerator from "@/components/image-flip-generator";
import { Metadata } from "next";
import { useTranslations } from "next-intl";
import { getTranslations } from "next-intl/server";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "image_flip_generator" });

  return {
    title: t("title"),
    description: t("description"),
    keywords: ["image flip", "horizontal flip", "vertical flip", "image mirror", "image transform"],
  };
}

export default function ImageFlipPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">Image Flipper</h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Flip your images horizontally or vertically with professional quality. 
            Perfect for creating mirror effects or correcting image orientation.
          </p>
        </div>
        <ImageFlipGenerator />
      </div>
    </div>
  );
}