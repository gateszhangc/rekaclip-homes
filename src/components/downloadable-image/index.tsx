"use client";

import Image from "next/image";
import { Download } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ButtonVariant =
  | "default"
  | "destructive"
  | "outline"
  | "secondary"
  | "ghost"
  | "link";

type ButtonSize = "default" | "sm" | "lg" | "icon";

interface DownloadableImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  fill?: boolean;
  sizes?: string;
  priority?: boolean;
  showDownload?: boolean;
  downloadLabel?: string;
  downloadUrl?: string;
  downloadFileName?: string;
  onDownload?: () => void;
  className?: string;
  imageClassName?: string;
  overlayClassName?: string;
  buttonVariant?: ButtonVariant;
  buttonSize?: ButtonSize;
}

export function DownloadableImage({
  src,
  alt,
  width,
  height,
  fill,
  sizes,
  priority = false,
  showDownload = false,
  downloadLabel = "Download",
  downloadUrl,
  downloadFileName,
  onDownload,
  className,
  imageClassName,
  overlayClassName,
  buttonVariant = "default",
  buttonSize = "sm",
}: DownloadableImageProps) {
  const shouldShowOverlay = !!(showDownload && (downloadUrl || onDownload));

  const overlayClasses = cn(
    "absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center",
    overlayClassName
  );

  const downloadContent = (
    <>
      <Download className="mr-2 h-4 w-4" />
      {downloadLabel}
    </>
  );

  return (
    <div className={cn("group relative w-full h-full overflow-hidden", className)}>
      {fill ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className={cn("object-cover", imageClassName)}
        />
      ) : (
        <Image
          src={src}
          alt={alt}
          width={width || 400}
          height={height || 400}
          sizes={sizes}
          priority={priority}
          className={cn("w-full h-auto object-cover", imageClassName)}
        />
      )}

      {shouldShowOverlay &&
        (downloadUrl ? (
          <Button
            asChild
            variant={buttonVariant}
            size={buttonSize}
            className={cn(overlayClasses, "h-full w-full")}
          >
            <a
              href={downloadUrl}
              download={downloadFileName}
              onClick={(e) => e.stopPropagation()}
            >
              {downloadContent}
            </a>
          </Button>
        ) : (
          <Button
            type="button"
            aria-label={downloadLabel}
            variant={buttonVariant}
            size={buttonSize}
            className={cn(overlayClasses, "h-full w-full")}
            onClick={(e) => {
              e.stopPropagation();
              onDownload?.();
            }}
          >
            {downloadContent}
          </Button>
        ))}
    </div>
  );
}
