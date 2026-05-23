"use client";

import dynamic from "next/dynamic";

const CaricatureMakerSkeleton = () => (
    <div className="space-y-6">
        <div className="w-full max-w-6xl mx-auto space-y-6 animate-pulse">
            <div className="rounded-[28px] border border-border/60 bg-background/70 p-6 space-y-5">
                <div className="h-6 w-52 rounded-lg bg-muted" />
                <div className="h-44 w-full rounded-2xl bg-muted/50" />
                <div className="flex flex-wrap gap-3">
                    <div className="h-11 w-36 rounded-full bg-muted" />
                    <div className="h-11 w-44 rounded-full bg-muted" />
                </div>
                <div className="flex justify-end">
                    <div className="h-12 w-full max-w-[200px] rounded-full bg-muted" />
                </div>
            </div>

            <div className="rounded-[32px] border border-border/60 bg-background/40 px-6 py-10 shadow-[0_30px_80px_rgba(15,23,42,0.12)] sm:px-10 sm:py-12">
                <div className="mx-auto flex flex-col items-center text-center">
                    <div className="h-7 w-44 rounded-full bg-muted/60 sm:h-8" />
                    <div className="mt-3 h-4 w-60 rounded-full bg-muted/50 sm:h-5" />
                </div>
                <div className="mt-10 grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
                    {Array.from({ length: 16 }).map((_, index) => (
                        <div
                            key={`inspired-skeleton-${index}`}
                            className="aspect-[9/16] rounded-2xl border border-border/40 bg-muted/30"
                        />
                    ))}
                </div>
            </div>
        </div>
    </div>
);

const CaricatureMaker = dynamic(() => import("./index"), {
    ssr: false,
    loading: () => <CaricatureMakerSkeleton />,
});

export default function CaricatureMakerLazy() {
    return <CaricatureMaker />;
}
