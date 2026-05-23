"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Textarea } from "@/components/ui/textarea";
import { CARICATURE_STYLES, ASPECT_RATIOS, RESOLUTIONS } from "./constants";
import { GetInspired } from "./get-inspired";
import { useAppContext } from "@/contexts/app";
import { CreditIcon } from "@/components/credits/credit-badge";
import { useRouter } from "@/i18n/navigation";
import {
  ArrowRight,
  Ban,
  Check,
  ChevronDown,
  Download,
  Loader2,
  Square,
  Upload,
} from "lucide-react";
import NextImage from "next/image";
import { toast } from "sonner";
import { uploadImageFile } from "@/lib/upload";
import { cn } from "@/lib/utils";
import { getImageModelApiPath } from "@/lib/image-model";
import { trackEvent } from "@/lib/analytics";

type GeneratedImage = {
  uuid: string;
  img_url: string;
  img_description: string;
  created_at?: string;
};

type GenerationSession = {
  id: string;
  prompt: string;
  startedAt: number;
  finishedAt?: number;
  count: number;
  status: "generating" | "completed" | "failed";
  images: GeneratedImage[];
  error?: string;
  requestId?: string;
};

type LastAction = {
  action: string;
  at: number;
};

type CaricatureMakerInnerProps = {
  recordAction: (action: string) => void;
};

type ErrorBoundaryProps = {
  children: React.ReactNode;
  onError?: (error: Error, info: React.ErrorInfo) => void;
};

type ErrorBoundaryState = {
  hasError: boolean;
};

class CaricatureMakerErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    this.props.onError?.(error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="studio-panel rounded-[26px] border border-border/60 p-6 text-center shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
          <p className="text-base font-semibold text-foreground">
            Something went wrong.
          </p>
          <p className="mt-2 text-sm text-muted-foreground">
            Please refresh and try again.
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

const STYLE_SWATCHES: Record<string, string> = {
  storybook: "from-amber-300 via-orange-300 to-rose-300",
  "3d-family": "from-sky-300 via-blue-400 to-indigo-400",
  "classic-animation": "from-pink-300 via-rose-300 to-red-300",
  "graphic-comic": "from-violet-300 via-purple-300 to-indigo-300",
  "clean-line": "from-teal-300 via-cyan-300 to-sky-300",
  anime: "from-fuchsia-300 via-pink-300 to-rose-300",
  "q-style": "from-pink-300 via-rose-300 to-red-300",
  snoopy: "from-yellow-200 via-amber-200 to-orange-200",
  "gouache-painting": "from-teal-300 via-cyan-300 to-sky-300",
};

const STYLE_ALIASES: Record<string, string> = {
  ghibli: "storybook",
  disney: "classic-animation",
  pixar: "3d-family",
  "spider-verse": "graphic-comic",
  "ligne-claire": "clean-line",
};

const getStyleSwatch = (value: string) =>
  STYLE_SWATCHES[value] ?? "from-slate-300 to-slate-400";

const formatGenerationTime = (timestamp?: number) => {
  if (!timestamp) {
    return "";
  }
  const date = new Date(timestamp);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
};

function CaricatureMakerInner({ recordAction }: CaricatureMakerInnerProps) {
  const { user, setUser, setShowSignModal } = useAppContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const downloadAnchorRef = useRef<HTMLAnchorElement | null>(null);
  const generationLockRef = useRef(false);

  const creditCost = Number(process.env.NEXT_PUBLIC_OUTFIT_GENERATION_COST || 5);
  const resolvedCreditCost = Number.isFinite(creditCost) ? creditCost : 5;

  const [activeTab, setActiveTab] =
    useState<"text-to-image" | "image-to-image">("image-to-image");
  const [prompt, setPrompt] = useState("");
  const [selectedStyle, setSelectedStyle] = useState(
    CARICATURE_STYLES.find((s) => s.value === "custom") || CARICATURE_STYLES[0]
  );
  const [selectedRatio, setSelectedRatio] = useState(ASPECT_RATIOS[0]);
  const [selectedResolution, setSelectedResolution] = useState(RESOLUTIONS[1]);
  const selectedCount = 1;
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [uploadedImageUrl, setUploadedImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationHistory, setGenerationHistory] = useState<GenerationSession[]>(
    []
  );
  const [isStyleDialogOpen, setIsStyleDialogOpen] = useState(false);

  const [isUploading, setIsUploading] = useState(false);
  const [userCredits, setUserCredits] = useState<number | null>(null);
  const [showCreditsModal, setShowCreditsModal] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageModelApiPath = getImageModelApiPath();

  useEffect(() => {
    if (!user) {
      setUserCredits(null);
      return;
    }
    if (typeof user.credits?.left_credits === "number") {
      setUserCredits(user.credits.left_credits);
    }
  }, [user]);

  const refreshCredits = useCallback(async () => {
    if (!user) {
      return null;
    }
    try {
      const resp = await fetch("/api/get-user-credits", {
        method: "POST",
      });
      if (!resp.ok) {
        throw new Error("fetch credits failed");
      }
      const { code, data } = await resp.json();
      if (code !== 0) {
        throw new Error("fetch credits failed");
      }
      const leftCredits = typeof data?.left_credits === "number" ? data.left_credits : 0;
      setUserCredits(leftCredits);
      setUser((prev) => (prev ? { ...prev, credits: data } : prev));
      return leftCredits;
    } catch (error) {
      return userCredits ?? 0;
    }
  }, [setUser, user, userCredits]);

  useEffect(() => {
    const styleParam = searchParams?.get("style");
    if (styleParam) {
      const resolvedStyle = STYLE_ALIASES[styleParam] ?? styleParam;
      const matchedStyle = CARICATURE_STYLES.find(
        (style) => style.value === resolvedStyle
      );
      if (matchedStyle) {
        setSelectedStyle(matchedStyle);
      }
      requestAnimationFrame(() => {
        const target =
          document.getElementById("caricature-maker-panel") ??
          document.getElementById("caricature-maker-input") ??
          document.getElementById("caricature-maker");
        target?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    }
  }, [searchParams]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      recordAction("upload_cancelled");
      return;
    }
    recordAction("upload_file_selected");
    setIsUploading(true);
    try {
      setUploadedImage(URL.createObjectURL(file));
      const { url } = await uploadImageFile(file, { type: "caricature" });
      setUploadedImageUrl(url);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to upload image";
      const normalizedMessage = message.toLowerCase();
      const isAuthError =
        normalizedMessage.includes("authenticated") ||
        normalizedMessage.includes("sign in") ||
        normalizedMessage.includes("no auth");

      if (isAuthError) {
        toast.error("Please sign in to upload images.");
      } else {
        toast.error("Failed to upload image");
      }
      setUploadedImage(null);
      setUploadedImageUrl(null);
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const handleGenerate = async () => {
    if (generationLockRef.current) {
      return;
    }

    const source =
      activeTab === "image-to-image" ? "image_to_image" : "text_to_image";
    const styleValue = selectedStyle.value;
    recordAction("generate_clicked");
    trackEvent("generate_clicked", {
      ui_source: source,
      style: styleValue,
    });

    if (!user) {
      setShowSignModal(true);
      return;
    }

    if (activeTab === "text-to-image" && !prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    if (activeTab === "image-to-image" && !uploadedImageUrl) {
      toast.error("Please upload an image");
      return;
    }

    generationLockRef.current = true;
    setIsGenerating(true);
    let newSessionId = "";
    try {
      const latestCredits = await refreshCredits();
      if (
        typeof latestCredits === "number" &&
        latestCredits < resolvedCreditCost
      ) {
        setShowCreditsModal(true);
        return;
      }

      const trimmedPrompt = prompt.trim();
      const ratioHint = selectedRatio?.value;
      const hasRatioHint = /\b\d+:\d+\b/.test(trimmedPrompt);
      const stylePrefix =
        selectedStyle && selectedStyle.value !== "custom"
          ? `${selectedStyle.label} style`
          : "";
      const baseDescription = [stylePrefix, trimmedPrompt]
        .filter(Boolean)
        .join(", ");
      const description = baseDescription;

      newSessionId = Date.now().toString();
      const newSession: GenerationSession = {
        id: newSessionId,
        prompt: description,
        startedAt: Date.now(),
        count: selectedCount,
        status: "generating",
        images: [],
      };

      setGenerationHistory((prev) => [newSession, ...prev]);

      const payload: any = {
        description,
        aspect_ratio: selectedRatio.value,
      };

      payload.resolution = selectedResolution.value;

      if (activeTab === "image-to-image" && uploadedImageUrl) {
        payload.image = uploadedImageUrl;
      }

      const response = await fetch(imageModelApiPath, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      let data: any = null;
      try {
        data = await response.json();
      } catch {
        data = null;
      }

      const isSafetyError =
        response.status === 422 || data?.code === "CONTENT_FLAGGED";
      if (isSafetyError) {
        const safetyMessage =
          typeof data?.message === "string"
            ? data.message
            : "Content flagged by safety system. Please revise your prompt and try again.";
        toast.error(safetyMessage);
        setGenerationHistory((prev) =>
          prev.map((session) => {
            if (session.id === newSessionId) {
              return {
                ...session,
                status: "failed",
                error: safetyMessage,
              };
            }
            return session;
          })
        );
        return;
      }

      if (!response.ok || data?.code !== 0) {
        const error = new Error(
          data?.message || "Generation failed"
        );
        (error as any).requestId = data?.requestId;
        throw error;
      }

      const outfits: GeneratedImage[] = data.data.outfits || [];
      const completedAt = outfits[0]?.created_at
        ? new Date(outfits[0].created_at).getTime()
        : Date.now();

      setGenerationHistory((prev) =>
        prev.map((session) => {
          if (session.id === newSessionId) {
            return {
              ...session,
              status: "completed",
              images: outfits,
              finishedAt: completedAt,
            };
          }
          return session;
        })
      );
      const latencyMs = completedAt - newSession.startedAt;
      trackEvent("result_viewed", {
        style: styleValue,
        latency_ms: latencyMs,
      });
      refreshCredits();
      toast.success("Generation complete!");
    } catch (error) {
      console.error(error);
      const errorMessage =
        error instanceof Error ? error.message : "Generation failed";
      const normalizedMessage = errorMessage.toLowerCase();
      const isCreditsError =
        normalizedMessage.includes("not enough credits") ||
        normalizedMessage.includes("insufficient credits");
      if (isCreditsError) {
        setShowCreditsModal(true);
        setGenerationHistory((prev) =>
          prev.filter((session) => session.id !== newSessionId)
        );
      } else {
        const requestId = (error as any).requestId;
        const displayMessage = requestId ? `${errorMessage} (Request ID: ${requestId})` : errorMessage;

        toast.error(displayMessage);
        setGenerationHistory((prev) =>
          prev.map((session) => {
            if (session.id === newSessionId) {
              return {
                ...session,
                status: "failed",
                error: errorMessage,
              };
            }
            return session;
          })
        );
      }
    } finally {
      setIsGenerating(false);
      generationLockRef.current = false;
    }
  };

  const handleUsePrompt = (value: string) => {
    setPrompt(value);
  };

  const downloadImage = (url: string, filename: string) => {
    try {
      recordAction("download");
      const downloadUrl = url.startsWith("data:")
        ? url
        : `/api/wallpaper/download?src=${encodeURIComponent(
          url
        )}&filename=${encodeURIComponent(filename)}`;
      const anchor = downloadAnchorRef.current;
      if (!anchor) {
        window.open(downloadUrl, "_blank", "noopener");
        return;
      }
      anchor.href = downloadUrl;
      anchor.download = filename;
      anchor.rel = "noopener";
      anchor.click();
    } catch (error) {
      console.error("Download failed:", error);
      toast.error("Failed to download image");
    }
  };

  const controlButtonClass =
    "landing-hero-button h-11 w-full sm:w-auto justify-between rounded-full bg-background/60 px-4 text-sm font-medium text-foreground/80 shadow-[0_12px_30px_rgba(0,0,0,0.35)] backdrop-blur transition hover:bg-background/80 hover:text-foreground";
  const tabListClass =
    "relative !grid !h-auto !w-full grid-cols-2 gap-2 rounded-full border border-amber-200/10 bg-gradient-to-r from-black/50 via-amber-950/30 to-black/50 p-1.5 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06),0_22px_55px_rgba(0,0,0,0.5)] before:absolute before:inset-0 before:rounded-full before:bg-[radial-gradient(circle_at_top,rgba(255,214,140,0.16),transparent_70%)] before:opacity-90 before:content-['']";
  const tabTriggerClass =
    "relative !h-11 items-center justify-center !rounded-full px-5 text-xs font-semibold uppercase tracking-[0.28em] text-amber-100/65 transition-all duration-300 hover:text-amber-50/90 data-[state=active]:text-amber-50 data-[state=active]:border data-[state=active]:border-amber-200/30 data-[state=active]:bg-[radial-gradient(circle_at_top,rgba(255,221,160,0.5),rgba(140,70,30,0.35))] data-[state=active]:shadow-[0_14px_35px_rgba(240,170,90,0.45)]";

  return (
    <div className="space-y-6">
      <a ref={downloadAnchorRef} className="sr-only" aria-hidden />
      <div className="w-full max-w-6xl mx-auto space-y-6">
        <div id="caricature-maker-input" className="landing-studio !mt-0 !pb-0">
          <div className="landing-studio-shell !mt-3 sm:!mt-4">
            <div className="landing-studio-shell__glow" />
            <div className="landing-studio-shell__inner">
              <div className="landing-studio-frame rounded-[24px] p-4 sm:p-6">
                <Tabs
                  defaultValue="image-to-image"
                  value={activeTab}
                  onValueChange={(v) =>
                    setActiveTab(v as "text-to-image" | "image-to-image")
                  }
                  className="w-full"
                >
                  <TabsList className={tabListClass}>
                    <TabsTrigger
                      value="image-to-image"
                      className={tabTriggerClass}
                    >
                      Image to Image
                    </TabsTrigger>
                    <TabsTrigger
                      value="text-to-image"
                      className={tabTriggerClass}
                    >
                      Text to Image
                    </TabsTrigger>
                  </TabsList>

                  <div
                    id="caricature-maker-panel"
                    className="studio-panel studio-canvas studio-canvas--clean mt-4 min-h-[260px] rounded-2xl p-4 sm:p-5"
                  >
                    <TabsContent
                      value="text-to-image"
                      className="mt-0 h-full data-[state=inactive]:hidden"
                      forceMount
                    >
                      <Textarea
                        placeholder="Describe your idea, AI art generator creates instantly"
                        className="min-h-[200px] w-full resize-none border-none bg-transparent p-0 !text-xl md:!text-xl leading-relaxed text-foreground placeholder:text-muted-foreground/70 focus-visible:ring-0"
                        value={prompt}
                        onChange={(e) => setPrompt(e.target.value)}
                      />
                    </TabsContent>
                    <TabsContent
                      value="image-to-image"
                      className="mt-0 data-[state=inactive]:hidden"
                      forceMount
                    >
                      <div className="flex flex-col gap-4 md:flex-row">
                        <div className="relative aspect-square w-full max-w-[220px]">
                          <div
                            onClick={() => {
                              recordAction("upload_clicked");
                              trackEvent("upload_clicked", {
                                ui_source: "generator",
                              });
                              fileInputRef.current?.click();
                            }}
                            className={cn(
                              "absolute inset-0 flex cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-muted-foreground/40 bg-muted/30 px-4 text-center text-sm text-muted-foreground transition hover:border-foreground/40 hover:bg-muted/50",
                              uploadedImage
                                ? "pointer-events-none opacity-0"
                                : "opacity-100"
                            )}
                          >
                            <Upload className="mb-2 size-7 text-muted-foreground" />
                            <p className="font-medium text-foreground">
                              Upload Image
                            </p>
                            <p className="text-xs text-muted-foreground/80">
                              support click/drag/paste to upload
                            </p>
                          </div>

                          <div
                            className={cn(
                              "group absolute inset-0 overflow-hidden rounded-2xl border border-border/60 bg-muted/40 transition-opacity",
                              uploadedImage
                                ? "opacity-100"
                                : "pointer-events-none opacity-0"
                            )}
                          >
                            {uploadedImage && (
                              <NextImage
                                src={uploadedImage}
                                alt="Uploaded"
                                fill
                                className="object-cover"
                                sizes="220px"
                              />
                            )}
                            <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100">
                              <Button
                                variant="secondary"
                                onClick={() => {
                                  recordAction("remove_uploaded");
                                  setUploadedImage(null);
                                  setUploadedImageUrl(null);
                                }}
                              >
                                Remove
                              </Button>
                            </div>
                          </div>

                          <input
                            type="file"
                            ref={fileInputRef}
                            className="sr-only"
                            accept="image/*"
                            onChange={handleFileUpload}
                          />
                        </div>
                        <Textarea
                          placeholder="Enter prompt to describe desired style or effect"
                          className="min-h-[200px] flex-1 resize-none border-none bg-transparent p-0 !text-xl md:!text-xl leading-relaxed text-foreground placeholder:text-muted-foreground/70 focus-visible:ring-0"
                          value={prompt}
                          onChange={(e) => setPrompt(e.target.value)}
                        />
                      </div>
                    </TabsContent>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-3">
                      <Dialog
                        open={isStyleDialogOpen}
                        onOpenChange={setIsStyleDialogOpen}
                      >
                        <DialogTrigger asChild>
                          <Button variant="ghost" className={controlButtonClass}>
                            <span className="flex items-center gap-3">
                              <span className="relative size-8 overflow-hidden rounded-full">
                                {selectedStyle.image ? (
                                  <NextImage
                                    src={selectedStyle.image}
                                    alt={selectedStyle.label}
                                    fill
                                    className="object-cover"
                                    sizes="32px"
                                    quality={60}
                                  />
                                ) : (
                                  <span className="flex h-full w-full items-center justify-center rounded-full bg-slate-900/85 text-white/70">
                                    <Ban className="size-4" />
                                  </span>
                                )}
                              </span>
                              <span className="whitespace-nowrap">
                                {selectedStyle.label} Style
                              </span>
                            </span>
                            <ChevronDown className="size-4 text-muted-foreground" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="landing-raphael-dialog dark studio-panel !left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2 w-[min(94vw,980px)] max-h-[75vh] gap-3 overflow-hidden !rounded-[28px] !border-0 !p-5 shadow-[0_32px_85px_rgba(0,0,0,0.55)] backdrop-blur-2xl">
                          <DialogHeader className="space-y-1 text-left">
                            <DialogTitle>Choose a style</DialogTitle>
                          </DialogHeader>
                          <div className="grid max-h-[55vh] grid-cols-2 gap-3 overflow-y-auto py-1 sm:grid-cols-3 lg:grid-cols-4">
                            {CARICATURE_STYLES.map((style) => (
                              <button
                                key={style.value}
                                type="button"
                                className={cn(
                                  "group rounded-2xl bg-muted/25 p-2 text-left shadow-[0_12px_28px_rgba(0,0,0,0.25)] transition hover:bg-muted/35 hover:shadow-[0_18px_45px_rgba(0,0,0,0.35)]",
                                  selectedStyle.value === style.value &&
                                  "bg-amber-500/10 shadow-[0_18px_45px_rgba(240,170,90,0.3)]"
                                )}
                                onClick={() => {
                                  setSelectedStyle(style);
                                  setIsStyleDialogOpen(false);
                                }}
                              >
                                <div className="relative aspect-square overflow-hidden rounded-xl">
                                  {style.image ? (
                                    <NextImage
                                      src={style.image}
                                      alt={`${style.label} Style`}
                                      fill
                                      className="object-cover"
                                      sizes="(max-width: 640px) 46vw, (max-width: 1024px) 30vw, 160px"
                                      quality={60}
                                    />
                                  ) : (
                                    <div className="flex h-full w-full items-center justify-center rounded-xl bg-slate-900/85 text-white/70">
                                      <Ban className="size-10" />
                                    </div>
                                  )}
                                </div>
                                <div className="mt-1 flex items-center justify-between">
                                  <span className="text-sm font-semibold">
                                    {style.label} Style
                                  </span>
                                  {selectedStyle.value === style.value && (
                                    <Check className="size-4 text-foreground" />
                                  )}
                                </div>
                              </button>
                            ))}
                          </div>
                        </DialogContent>
                      </Dialog>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className={controlButtonClass}>
                            <span className="flex items-center gap-3">
                              <span className="flex size-8 items-center justify-center rounded-full bg-muted/60 text-foreground">
                                <Square className="size-4" />
                              </span>
                              <span className="whitespace-nowrap">
                                {selectedRatio.label}
                              </span>
                            </span>
                            <ChevronDown className="size-4 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          side="top"
                          align="start"
                          sideOffset={12}
                          avoidCollisions={false}
                          className="dark studio-panel w-72 max-h-[260px] min-h-0 overflow-y-auto rounded-2xl border border-border/60 p-2 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl"
                        >
                          <DropdownMenuLabel className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground/80">
                            Select Image Ratio
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator className="bg-border/50" />
                          {ASPECT_RATIOS.map((ratio) => (
                            <DropdownMenuItem
                              key={ratio.value}
                              className="flex cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 text-sm text-foreground/80 transition hover:bg-muted/30 focus:bg-muted/40"
                              onSelect={() => setSelectedRatio(ratio)}
                            >
                              <div className="flex items-center gap-3">
                                <span className="flex size-8 items-center justify-center rounded-lg border border-border/60 bg-background/30">
                                  <span
                                    className={`block rounded-sm border border-foreground/40 ${ratio.widthClass} ${ratio.heightClass}`}
                                  />
                                </span>
                                <span>{ratio.label}</span>
                              </div>
                              {selectedRatio.value === ratio.value && (
                                <Check className="size-4 text-foreground" />
                              )}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className={controlButtonClass}>
                            <span className="flex items-center gap-3">
                              <span className="flex size-8 items-center justify-center rounded-full bg-muted/60 text-foreground">
                                <Square className="size-4" />
                              </span>
                              <span className="whitespace-nowrap">
                                {selectedResolution.label}
                              </span>
                            </span>
                            <ChevronDown className="size-4 text-muted-foreground" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent
                          side="top"
                          align="start"
                          sideOffset={12}
                          avoidCollisions={false}
                          className="dark studio-panel w-64 max-h-[220px] min-h-0 overflow-y-auto rounded-2xl border border-border/60 p-2 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl"
                        >
                          <DropdownMenuLabel className="text-[11px] uppercase tracking-[0.28em] text-muted-foreground/80">
                            Select Resolution
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator className="bg-border/50" />
                          {RESOLUTIONS.map((resolution) => (
                            <DropdownMenuItem
                              key={resolution.value}
                              className="flex cursor-pointer items-center justify-between rounded-xl px-3 py-2.5 text-sm text-foreground/80 transition hover:bg-muted/30 focus:bg-muted/40"
                              onSelect={() => setSelectedResolution(resolution)}
                            >
                              <span>{resolution.label}</span>
                              {selectedResolution.value === resolution.value && (
                                <Check className="size-4 text-foreground" />
                              )}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>

                    </div>

                    <Button
                      size="lg"
                      className="landing-hero-button h-12 rounded-full bg-primary px-8 text-base font-semibold text-primary-foreground shadow-[0_20px_45px_rgba(0,0,0,0.35)] transition hover:bg-primary/90"
                      onClick={handleGenerate}
                      disabled={isGenerating || isUploading}
                    >
                      {isGenerating ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Generating...
                        </>
                      ) : isUploading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Uploading...
                        </>
                      ) : (
                        <span className="flex items-center gap-3">
                          <span>{user ? "Generate" : "Sign In to Generate"}</span>
                          <span className="inline-flex items-center gap-1 rounded-full bg-black/30 px-2 py-0.5 text-xs font-semibold text-amber-100 shadow-[0_10px_25px_rgba(0,0,0,0.35)]">
                            <CreditIcon size="sm" />
                            {resolvedCreditCost}
                          </span>
                        </span>
                      )}
                    </Button>
                  </div>
                </Tabs>
              </div>
            </div>
          </div>
        </div>

        <Dialog open={showCreditsModal} onOpenChange={setShowCreditsModal}>
          <DialogContent className="landing-raphael-dialog dark studio-panel !left-1/2 !top-1/2 !-translate-x-1/2 !-translate-y-1/2 w-[min(92vw,520px)] gap-4 rounded-3xl border border-amber-200/30 bg-background/95 p-6 shadow-[0_35px_90px_rgba(0,0,0,0.6)] backdrop-blur-2xl">
            <DialogHeader className="space-y-2 text-left">
              <DialogTitle className="text-2xl font-semibold text-foreground">
                Not Enough Credits
              </DialogTitle>
            </DialogHeader>
            <p className="text-sm text-muted-foreground sm:text-base">
              You have consumed all of your credits, please upgrade your plan to
              continue.
            </p>
            <div className="mt-2 flex flex-wrap justify-end gap-3">
              <Button
                variant="ghost"
                className="rounded-full border border-border/60 bg-muted/20 px-6 text-foreground hover:bg-muted/40"
                onClick={() => setShowCreditsModal(false)}
              >
                Cancel
              </Button>
              <Button
                className="landing-hero-button rounded-full bg-primary px-6 text-primary-foreground shadow-[0_20px_45px_rgba(0,0,0,0.35)] hover:bg-primary/90"
                onClick={() => {
                  setShowCreditsModal(false);
                  trackEvent("pricing_viewed", {
                    ui_source: "credits_modal",
                  });
                  router.push("/pricing");
                }}
              >
                Upgrade
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {generationHistory.map((session) => (
          <div
            key={session.id}
            className="studio-panel rounded-[26px] border border-border/60 p-4 shadow-[0_30px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl sm:p-6"
          >
            <div className="flex flex-col gap-1 text-base sm:flex-row sm:items-start sm:justify-between">
              <p className="line-clamp-2 text-base leading-snug text-foreground/85 sm:text-lg">
                <span className="font-semibold text-foreground">Generate:</span>{" "}
                {session.prompt}
              </p>
              <span className="shrink-0 text-sm text-muted-foreground sm:text-base">
                {formatGenerationTime(session.finishedAt ?? session.startedAt)}
              </span>
            </div>

            <div className="mt-4 flex flex-wrap justify-center gap-4">
              {session.status === "generating" ? (
                Array.from({ length: session.count }).map((_, index) => (
                  <div
                    key={`loading-${index}`}
                    className="studio-canvas studio-canvas--clean flex aspect-square w-full max-w-[420px] flex-auto items-center justify-center rounded-2xl bg-muted/30 text-center shadow-lg sm:w-[calc(50%-1rem)] lg:w-[calc(33.333%-1rem)]"
                  >
                    <div className="flex flex-col items-center gap-3 text-sm text-muted-foreground">
                      <Loader2 className="h-8 w-8 animate-spin text-foreground/70" />
                      <span>Estimated time: 20s</span>
                    </div>
                  </div>
                ))
              ) : session.status === "completed" ? (
                session.images.map((img) => (
                  <div
                    key={img.uuid}
                    className="studio-canvas studio-canvas--clean group relative aspect-square w-full max-w-[420px] flex-auto overflow-hidden rounded-2xl border border-border/50 bg-muted/20 shadow-lg sm:w-[calc(50%-1rem)] lg:w-[calc(33.333%-1rem)]"
                  >
                    <div className="relative h-full w-full p-4">
                      <NextImage
                        src={img.img_url}
                        alt={img.img_description}
                        fill
                        className="object-contain"
                      />
                    </div>
                    <div className="absolute inset-x-0 bottom-0 flex justify-end bg-gradient-to-t from-black/70 to-transparent p-3 opacity-0 transition-opacity group-hover:opacity-100">
                      <button
                        onClick={() =>
                          downloadImage(
                            img.img_url,
                            `caricature-${img.uuid}.png`
                          )
                        }
                        className="rounded-full bg-white/20 p-2 text-white backdrop-blur-md transition-colors hover:bg-white/40"
                      >
                        <Download className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="w-full rounded-2xl border border-red-500/40 bg-red-500/10 p-6 text-center text-red-200">
                  <p>Generation failed</p>
                  {session.error && (
                    <p className="mt-1 text-sm opacity-80">{session.error}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="w-full max-w-6xl mx-auto !mt-10 sm:!mt-14">
        <GetInspired
          onSelectPrompt={(p) => {
            setPrompt(p);
            setActiveTab("text-to-image");
            requestAnimationFrame(() => {
              const target =
                document.getElementById("caricature-maker-panel") ??
                document.getElementById("caricature-maker-input") ??
                document.getElementById("caricature-maker");
              target?.scrollIntoView({ behavior: "smooth", block: "center" });
            });
          }}
        />
      </div>
    </div>
  );
}

export default function CaricatureMaker() {
  const lastActionRef = useRef<LastAction | null>(null);

  const recordAction = useCallback((action: string) => {
    lastActionRef.current = { action, at: Date.now() };
    if (typeof window !== "undefined") {
      (window as Window & { __logrocketLastAction?: string })
        .__logrocketLastAction = action;
    }
  }, []);

  const handleError = useCallback((error: Error, info: React.ErrorInfo) => {
    const w = typeof window !== "undefined" ? window : null;
    const lastAction = lastActionRef.current?.action ?? (w as Window & { __logrocketLastAction?: string } | null)?.__logrocketLastAction;
    console.error("[CaricatureMaker] error", {
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
      lastAction,
    });
  }, []);

  return (
    <CaricatureMakerErrorBoundary onError={handleError}>
      <CaricatureMakerInner recordAction={recordAction} />
    </CaricatureMakerErrorBoundary>
  );
}
