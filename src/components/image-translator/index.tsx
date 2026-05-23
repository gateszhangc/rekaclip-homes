"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card } from "@/components/ui/card";
import { languages } from "@/data/languages";
import {
  uploadImageFile,
  validateImageFile,
  VALID_IMAGE_TYPES,
} from "@/lib/upload";
import { toast } from "sonner";
import { ArrowLeftRight, Upload, X, Download } from "lucide-react";

export default function ImageTranslator() {
  const [sourceLang, setSourceLang] = useState("en");
  const [targetLang, setTargetLang] = useState("zh");
  const [fileName, setFileName] = useState<string | null>(null);
  const [baseImageUrl, setBaseImageUrl] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [translatedUrl, setTranslatedUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const languageOptions = useMemo(() => languages, []);

  const getLanguageLabel = (value: string) =>
    languageOptions.find((lang) => lang.value === value)?.label || value;

  const handleSwap = () => {
    setSourceLang(targetLang);
    setTargetLang(sourceLang);
  };

  const handleFile = async (file: File) => {
    const error = validateImageFile(file);
    if (error) {
      toast.error(error);
      return;
    }

    try {
      const { url, base64 } = await uploadImageFile(file, { type: "base" });
      setFileName(file.name);
      setBaseImageUrl(url);
      setImagePreview(base64);
      setTranslatedUrl(null);
      toast.success("Image uploaded.");
    } catch (error) {
      console.error("Upload error:", error);
      toast.error(
        error instanceof Error ? error.message : "Failed to upload image."
      );
      setFileName(null);
      setBaseImageUrl(null);
    }
  };

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      void handleFile(file);
    }
  };

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) {
      void handleFile(file);
    }
  };

  const onStart = async () => {
    if (!baseImageUrl) {
      toast.error("Please upload an image first.");
      return;
    }
    const sourceLabel = getLanguageLabel(sourceLang);
    const targetLabel = getLanguageLabel(targetLang);
    setIsProcessing(true);
    try {
      const resp = await fetch("/api/gen-outfit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          base_image_url: baseImageUrl,
          description: `translate image from ${sourceLabel} to ${targetLabel}`,
          target_lang: targetLabel,
        }),
      });

      if (!resp.ok) {
        throw new Error("Translate failed");
      }
      const result = await resp.json();
      if (result.code !== 0) {
        throw new Error(result.message || "Translate failed");
      }

      const url =
        result.data?.outfits?.[0]?.img_url ||
        result.data?.translated_image_url ||
        null;
      setTranslatedUrl(url);
      toast.success("Translation complete.");
    } catch (error) {
      console.error("Translate error:", error);
      toast.error("Failed to translate image.");
    } finally {
      setIsProcessing(false);
    }
  };

  const reset = () => {
    setFileName(null);
    setBaseImageUrl(null);
    setImagePreview(null);
    setTranslatedUrl(null);
  };

  const handleDownload = async () => {
    if (!translatedUrl) return;
    try {
      const response = await fetch(translatedUrl);
      if (!response.ok) {
        throw new Error("Failed to fetch image");
      }
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobUrl;
      const extension =
        blob.type && blob.type.includes("/")
          ? blob.type.split("/")[1]
          : "png";
      link.download = fileName
        ? `translated-${fileName}`
        : `translated-image.${extension}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error("Download failed:", error);
      toast.error("下载失败，请稍后重试。");
    }
  };

  const hasUpload = !!baseImageUrl;

  return (
    <section className="py-0">
      <div className="container">
        <div className="mx-auto w-full max-w-6xl">
          <Card className="p-2 md:p-8 lg:p-8 shadow-xl border border-border/60">
            <div className="flex flex-wrap items-center justify-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">From</span>
                <Select value={sourceLang} onValueChange={setSourceLang}>
                  <SelectTrigger className="min-w-[140px] bg-muted/60">
                    <SelectValue placeholder="Source" />
                  </SelectTrigger>
                  <SelectContent>
                    {languageOptions.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button
                type="button"
                variant="secondary"
                size="icon"
                className="rounded-full"
                onClick={handleSwap}
              >
                <ArrowLeftRight className="size-4" />
              </Button>

              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">To</span>
                <Select value={targetLang} onValueChange={setTargetLang}>
                  <SelectTrigger className="min-w-[140px] bg-muted/60">
                    <SelectValue placeholder="Target" />
                  </SelectTrigger>
                  <SelectContent>
                    {languageOptions.map((lang) => (
                      <SelectItem key={lang.value} value={lang.value}>
                        {lang.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {!hasUpload ? (
              <div
                className="w-full min-h-[420px] sm:min-h-[420px] border-2 border-dashed border-muted-foreground/40 bg-muted/30 rounded-2xl p-8 flex flex-col items-center justify-center text-center gap-4"
                onDrop={onDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => document.getElementById("img-input")?.click()}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    document.getElementById("img-input")?.click();
                  }
                }}
              >
                <div className="p-4 rounded-full bg-primary/10 text-primary">
                  <Upload className="size-6" />
                </div>
                <div>
                  <p className="text-lg font-semibold text-foreground">
                    Drag & drop an image
                  </p>
                  <p className="text-sm text-muted-foreground">
                    JPG, PNG, WebP up to 10MB.
                  </p>
                </div>
                <Button type="button" size="lg">
                  Choose a file
                </Button>
                <input
                  id="img-input"
                  type="file"
                  accept={VALID_IMAGE_TYPES.join(",")}
                  className="hidden"
                  onChange={onInputChange}
                />
              </div>
            ) : (
              <div className="grid min-h-[420px] sm:min-h-[420px] gap-6 lg:grid-cols-2 mt-4 auto-rows-fr">
                <div className="h-full min-h-[420px] rounded-2xl border bg-muted/40 p-6 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-muted-foreground">
                      Uploaded file
                    </div>
                    <button
                      type="button"
                      onClick={reset}
                      className="text-muted-foreground hover:text-foreground transition"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                  <div className="flex-1 w-full rounded-lg bg-background border px-4 py-3 text-sm text-foreground flex flex-col items-center justify-center gap-4 min-h-[320px] max-h-[320px] overflow-hidden">
                    {imagePreview && (
                      // 图片容器：自适应宽高，限制最大尺寸
                      <div className="w-full max-w-[70%] h-full flex items-center justify-center">
                        <img
                          src={imagePreview}
                          alt={fileName || "Uploaded image"}
                          className="max-h-full max-w-full rounded-md object-contain border"
                        />
                      </div>
                    )}
                  </div>
                </div>

                <div className="h-full min-h-[420px] rounded-2xl border bg-muted/40 p-6 flex flex-col gap-3">
                  <div className="text-sm text-muted-foreground">
                    Translation result
                  </div>
                  <div className="flex-1 w-full rounded-lg bg-background border flex items-center justify-center p-3 min-h-[320px] max-h-[320px] overflow-hidden">
                    {isProcessing ? (
                      <span className="text-sm text-muted-foreground">
                        Translating...
                      </span>
                    ) : translatedUrl ? (
                      <div className="relative group flex h-full w-full items-center justify-center">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={translatedUrl}
                          alt="Translated"
                          className="max-h-full max-w-full rounded-lg object-contain"
                        />
                        <div className="absolute inset-0 rounded-lg bg-black/40 opacity-0 transition-opacity group-hover:opacity-100 flex items-center justify-center">
                          <Button
                            size="sm"
                            type="button"
                            variant="default"
                            onClick={(e) => {
                              e.stopPropagation();
                              void handleDownload();
                            }}
                          >
                            <Download className="mr-2 h-4 w-4" />
                            Download
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">
                        Result will appear here.
                      </span>
                    )}
                  </div>
                </div>
              </div>
            )}

            {hasUpload && (
              <div className="flex justify-center">
                <Button
                  className="w-32 h-12 text-base bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
                  size="lg"
                  disabled={isProcessing}
                  onClick={onStart}
                >
                  {isProcessing ? "Processing..." : "Start"}
                </Button>
              </div>
            )}
          </Card>
        </div>
      </div>
    </section>
  );
}
