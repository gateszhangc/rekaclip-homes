import { Metadata } from "next";
import AIImageExpanderContainer from "@/components/ai-image-expander/ai-image-expander-container";

export const metadata: Metadata = {
  title: "AI Image Expander",
  description: "Expand your images to different aspect ratios using AI",
};

export default function AIImageExpanderPage() {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-4">AI Image Expander</h1>
          <p className="text-lg text-muted-foreground">
            Upload an image and expand it to different aspect ratios using AI
          </p>
        </div>
        <AIImageExpanderContainer />
      </div>
    </div>
  );
}