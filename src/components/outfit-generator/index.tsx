"use client";

import type { ChangeEvent, DragEvent, KeyboardEvent } from "react";
import { useEffect, useState } from "react";
import Image from "next/image";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import BeforeAfterSlider from "@/components/before-after-slider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createLogger } from "@/lib/logger";
import { uploadFileToR2 } from "@/lib/r2-upload";

interface GeneratorState {
  baseImage: File | null;
  imagePreview: string | null;
  baseImageUrl: string | null;
  isGenerating: boolean;
  isUploading: boolean;
  userCredits: number;
  generationCost: number;
}

export default function OutfitGenerator() {
  const t = useTranslations("outfit_generator");
  const log = createLogger("outfit-generator");

  const [state, setState] = useState<GeneratorState>({
    baseImage: null,
    imagePreview: null,
    baseImageUrl: null,
    isGenerating: false,
    isUploading: false,
    userCredits: 0,
    generationCost: 5,
  });

  // Fetch user credits on mount
  useEffect(() => {
    const fetchCredits = async () => {
      try {
        const resp = await fetch("/api/get-user-credits", {
          method: "POST",
        });
        const data = await resp.json();
        if (data.code === 0) {
          setState((prev) => ({
            ...prev,
            userCredits: data.data.left_credits || 0,
          }));
        }
      } catch (error) {
        console.error("Failed to fetch credits:", error);
      }
    };

    fetchCredits();

    // Get generation cost from environment variable
    const cost = parseInt(
      process.env.NEXT_PUBLIC_OUTFIT_GENERATION_COST || "5"
    );
    setState((prev) => ({ ...prev, generationCost: cost }));
  }, []);

  // Handle file selection and upload to R2
  const handleFileSelect = async (file: File) => {
    log.info(
      { name: file.name, size: file.size, type: file.type },
      "handleFileSelect called"
    );

    // Validate file type
    const validTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (!validTypes.includes(file.type)) {
      log.warn({ type: file.type }, "handleFileSelect aborted: invalid type");
      toast.error(t("errors.invalid_format"));
      return;
    }

    // Validate file size (10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      log.warn({ size: file.size, maxSize }, "handleFileSelect aborted: file too large");
      toast.error(t("errors.file_too_large"));
      return;
    }

    setState((prev) => ({ ...prev, isUploading: true }));

    // Generate preview
    const reader = new FileReader();
    reader.onload = async (e) => {
      const base64Image = e.target?.result as string;
      log.info({ name: file.name, size: file.size }, "handleFileSelect read complete");
      
      setState((prev) => ({
        ...prev,
        baseImage: file,
        imagePreview: base64Image,
      }));

      // Upload to R2 immediately
      try {
        const { url } = await uploadFileToR2(file);
        setState((prev) => ({
          ...prev,
          baseImage: file,
          imagePreview: base64Image,
          baseImageUrl: url,
          isUploading: false,
        }));
        log.info({ url }, "handleFileSelect upload success");
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to upload image";
        const isAuthErr = message.toLowerCase().includes("authenticated");
        log.error({ err: error, name: file.name }, "Upload error");
        toast.dismiss();
        toast.error(isAuthErr ? "Please sign in to upload images." : message);
        setState((prev) => ({
          ...prev,
          baseImage: null,
          imagePreview: null,
          baseImageUrl: null,
          isUploading: false,
        }));
      }
    };
    reader.onerror = () => {
      log.error({ name: file.name }, "File read error");
      toast.error("Failed to read file");
      setState((prev) => ({
        ...prev,
        baseImage: null,
        imagePreview: null,
        baseImageUrl: null,
        isUploading: false,
      }));
    };
    reader.readAsDataURL(file);
  };

  // Handle file input change
  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  // Handle drag and drop
  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleKeyboardUpload = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      document.getElementById("file-input")?.click();
    }
  };

  // Handle delete image
  const handleDeleteImage = () => {
    setState((prev) => ({
      ...prev,
      baseImage: null,
      imagePreview: null,
      baseImageUrl: null,
      isUploading: false,
    }));
  };

  // Handle generate
  const handleGenerate = async () => {
    log.info(
      {
        baseImageName: state.baseImage?.name,
        baseImageUrl: state.baseImageUrl,
        userCredits: state.userCredits,
        generationCost: state.generationCost,
      },
      "handleGenerate called"
    );

    // Refresh credits right before generation to avoid stale balance
    const refreshCredits = async () => {
      try {
        const resp = await fetch("/api/get-user-credits", { method: "POST" });
        const data = await resp.json();
        if (data.code === 0) {
          log.info({ leftCredits: data.data.left_credits }, "credits refreshed");
          return data.data.left_credits || 0;
        }
      } catch (error) {
        log.error({ err: error }, "Refresh credits error");
      }
      log.warn({ cachedCredits: state.userCredits }, "Using cached credits");
      return state.userCredits;
    };

    // Validate
    if (!state.baseImage) {
      log.warn("handleGenerate aborted: no base image");
      toast.error(t("errors.no_image"));
      return;
    }

    // Validate credits
    const latestCredits = await refreshCredits();
    if (latestCredits < state.generationCost) {
      setState((prev) => ({ ...prev, userCredits: latestCredits }));
      log.warn(
        { latestCredits, generationCost: state.generationCost },
        "handleGenerate aborted: insufficient credits"
      );
      toast.error(t("insufficient_credits"));
      return;
    }

    setState((prev) => ({ ...prev, isGenerating: true }));

    try {
      // Call API with uploaded image URL
      const resp = await fetch("/api/gen-outfit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base_image_url: state.baseImageUrl,
          description: "Apply color inversion effects while preserving the original subject, lighting, and composition. Enhance visual quality and create unique effects. Output at original resolution.",
        }),
      });

      if (!resp.ok) {
        throw new Error("Generate outfit failed");
      }

      const { code, message } = await resp.json();

      if (code !== 0) {
        throw new Error(message);
      }

      log.info({ code, baseImageUrl: state.baseImageUrl }, "handleGenerate success");
      toast.success(t("success.generated"));
      window.location.reload();
    } catch (error) {
      toast.error(t("errors.generation_failed"));
      log.error({ err: error }, "Generation error");
      setState((prev) => ({ ...prev, isGenerating: false }));
    }
  };

  return (
    <section>
      <div className="container">
        <div className="w-full max-w-6xl mx-auto">
          <Card className="p-6 md:p-8 lg:p-10 shadow-xl border border-border/60">
            <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] items-center">
              <BeforeAfterSlider
                beforeSrc="https://pub-e1eb76428e24457ebfc067c635cb4fc4.r2.dev/before.png"
                afterSrc="https://pub-e1eb76428e24457ebfc067c635cb4fc4.r2.dev/after.png"
                beforeAlt="Before preview"
                afterAlt="After preview"
                priority
              />

              <div className="space-y-6 w-full min-w-0">

                <div
                  className="rounded-2xl border-2 border-dashed border-muted-foreground/50 bg-muted/40 p-6 transition-colors hover:border-primary min-h-[180px] w-full flex items-center"
                  onDrop={handleDrop}
                  onDragOver={handleDragOver}
                  onClick={() => document.getElementById("file-input")?.click()}
                  onKeyDown={handleKeyboardUpload}
                  role="button"
                  tabIndex={0}
                >
                  {!state.imagePreview ? (
                    <div className="flex flex-col items-center justify-center gap-4 text-center w-full">
                      <Button
                        variant="default"
                        size="lg"
                        className="px-6 bg-primary text-primary-foreground"
                        type="button"
                      >
                        Browse files 
                      </Button>
                      <p className="text-sm text-muted-foreground">
                        Drop, paste or add a URL
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 w-full min-w-0">
                      <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border bg-background">
                        <Image
                          src={state.imagePreview}
                          alt="Uploaded image"
                          fill
                          className="object-cover"
                          sizes="64px"
                        />
                      </div>
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <p className="font-semibold truncate text-sm">
                          {state.baseImage?.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Ready to invert and enhance.
                        </p>
                        <div className="mt-2 flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            type="button"
                            className="text-xs h-7 px-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              document.getElementById("file-input")?.click();
                            }}
                          >
                            Replace
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            type="button"
                            className="text-xs h-7 px-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteImage();
                            }}
                          >
                            Remove
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                  <input
                    id="file-input"
                    type="file"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>

                <p className="text-xs text-muted-foreground">
                  By uploading a file, you agree to our Terms of Use and Privacy
                  Policy. 
                </p>

                <Button
                  className="w-full h-12 text-base"
                  size="lg"
                  onClick={handleGenerate}
                  disabled={
                    state.isGenerating ||
                    state.isUploading ||
                    !state.baseImage ||
                    !state.baseImageUrl
                  }
                >
                  {state.isGenerating
                    ? "Processing..."
                    : state.isUploading
                      ? "Uploading..."
                      : "Flip Image"}
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </section>
  );
}
