import React from "react";
import NextImage from "next/image";
import { Button } from "@/components/ui/button";
import { GET_INSPIRED_ITEMS } from "./constants";
import { ArrowUpRight } from "lucide-react";

interface GetInspiredProps {
    onSelectPrompt: (prompt: string) => void;
}

export function GetInspired({ onSelectPrompt }: GetInspiredProps) {
    return (
        <section className="landing-section relative overflow-hidden rounded-[32px] border border-border/60 px-6 py-10 shadow-[0_30px_80px_rgba(15,23,42,0.12)] sm:px-10 sm:py-12">
            <div className="text-center">
                <h2 className="text-balance text-3xl font-semibold tracking-tight sm:text-4xl">
                    Get <span className="landing-title-highlight">Inspired</span>
                </h2>
                <p className="mx-auto mt-3 max-w-2xl text-sm text-muted-foreground sm:text-base lg:text-lg">
                    Browse our gallery of curated styles and prompts
                </p>
            </div>

            <div className="mt-10 grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
                {GET_INSPIRED_ITEMS.map((item, index) => (
                    <div
                        key={index}
                        className="group relative aspect-[9/16] overflow-hidden rounded-2xl border border-border/40 bg-muted/20 shadow-sm transition-all duration-300 hover:scale-[1.02] hover:border-border/80 hover:shadow-xl"
                    >
                        <NextImage
                            src={item.image}
                            alt={item.prompt}
                            fill
                            className="object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                            sizes="(max-width: 640px) 42vw, (max-width: 1024px) 28vw, 260px"
                            quality={60}
                        />
                        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 opacity-0 transition-all duration-300 group-hover:opacity-100">
                            <p className="mb-3 line-clamp-3 text-sm leading-relaxed text-white/90 drop-shadow-md sm:text-base">
                                {item.prompt}
                            </p>
                            <Button
                                size="sm"
                                variant="secondary"
                                className="w-full gap-2 rounded-full bg-white/95 text-xs font-semibold text-black backdrop-blur transition-colors hover:bg-white"
                                onClick={() => onSelectPrompt(item.prompt)}
                            >
                                <ArrowUpRight className="h-3 w-3" />
                                Click to use
                            </Button>
                        </div>
                    </div>
                ))}
            </div>
        </section>
    );
}
