"use client";

import Image from "next/image";
import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Wallpaper {
  id: number;
  src: string;
  alt: string;
  width?: number;
  height?: number;
}

interface WallpaperGalleryProps {
  title?: string;
  description?: string;
  wallpapers: Wallpaper[];
}

export default function WallpaperGallery({
  title = "Your Inverted Images",
  description = "Review the latest images you’ve inverted—preview and download in one click",
  wallpapers,
}: WallpaperGalleryProps) {
  if (!wallpapers || wallpapers.length === 0) {
    return null;
  }

  return (
    <section className="mt-14">
      <div className="container">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold mb-4">{title}</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {description}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {wallpapers.map((wallpaper) => {
            const baseName =
              wallpaper.alt?.replace(/\s+/g, "-").toLowerCase() ||
              `wallpaper-${wallpaper.id}`;
            const downloadUrl = `/api/wallpaper/download?src=${encodeURIComponent(
              wallpaper.src
            )}&filename=${encodeURIComponent(`${baseName}.jpg`)}`;

            return (
              <div
                key={wallpaper.id}
                className="group relative transition-transform hover:scale-[1.02]"
              >
                <div className="relative overflow-hidden rounded-lg">
                  {/** Use same-origin download endpoint to avoid CORS failures */} 
                  <Image
                    src={wallpaper.src}
                    alt={wallpaper.alt}
                    width={wallpaper.width || 400}
                    height={wallpaper.height || 500}
                    className="w-full h-auto object-cover"
                  />
                  <a
                    href={downloadUrl}
                    download={`${baseName}.jpg`}
                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <Button size="sm" type="button">
                      <Download className="mr-2 h-4 w-4" />
                      Download
                    </Button>
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
