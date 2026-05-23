"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface BeforeAfterSliderProps {
  beforeSrc: string;
  afterSrc: string;
  beforeAlt?: string;
  afterAlt?: string;
  initialPosition?: number;
  className?: string;
  onPositionChange?: (value: number) => void;
  priority?: boolean;
}

export default function BeforeAfterSlider({
  beforeSrc,
  afterSrc,
  beforeAlt = "Before",
  afterAlt = "After",
  initialPosition = 50,
  className,
  onPositionChange,
  priority,
}: BeforeAfterSliderProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [position, setPosition] = useState(initialPosition);
  const [isDragging, setIsDragging] = useState(false);

  const clampPosition = useCallback(
    (value: number) => Math.min(100, Math.max(0, value)),
    []
  );

  const updatePosition = useCallback(
    (clientX: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const percentage = ((clientX - rect.left) / rect.width) * 100;
      const next = clampPosition(percentage);
      setPosition(next);
      onPositionChange?.(next);
    },
    [clampPosition, onPositionChange]
  );

  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (event: MouseEvent | TouchEvent) => {
      const clientX =
        event instanceof TouchEvent
          ? event.touches[0]?.clientX
          : event.clientX;
      if (typeof clientX === "number") {
        updatePosition(clientX);
      }
    };

    const stopDragging = () => setIsDragging(false);

    window.addEventListener("mousemove", handleMove);
    window.addEventListener("touchmove", handleMove);
    window.addEventListener("mouseup", stopDragging);
    window.addEventListener("touchend", stopDragging);

    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("touchmove", handleMove);
      window.removeEventListener("mouseup", stopDragging);
      window.removeEventListener("touchend", stopDragging);
    };
  }, [isDragging, updatePosition]);

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative aspect-[4/3] w-full overflow-hidden rounded-[28px] bg-gradient-to-br from-slate-900/10 via-slate-800/5 to-slate-900/10 shadow-2xl border border-white/10 cursor-ew-resize select-none",
        className
      )}
      role="slider"
      aria-label="Before and after comparison"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(position)}
      draggable={false}
      onDragStart={(e) => e.preventDefault()}
      onMouseDown={(e) => {
        setIsDragging(true);
        updatePosition(e.clientX);
      }}
      onMouseMove={(e) => {
        if (isDragging) updatePosition(e.clientX);
      }}
      onTouchStart={(e) => {
        const clientX = e.touches[0]?.clientX;
        if (typeof clientX === "number") {
          setIsDragging(true);
          updatePosition(clientX);
        }
      }}
    >
      <div className="absolute inset-0">
        <Image
          src={afterSrc}
          alt={afterAlt}
          fill
          className="object-fill select-none"
          draggable={false}
          sizes="(min-width: 1024px) 640px, 100vw"
          priority={priority}
        />
      </div>
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <Image
          src={beforeSrc}
          alt={beforeAlt}
          fill
          className="object-fill select-none"
          draggable={false}
          sizes="(min-width: 1024px) 640px, 100vw"
          priority={priority}
        />
      </div>
      <div className="absolute inset-0 pointer-events-none">
        {/* Before label */}
        <div className="absolute bottom-4 left-4">
          <div className="px-3 py-1.5 bg-black/60 backdrop-blur-sm text-white text-sm font-medium rounded-full">
            Before
          </div>
        </div>
        
        {/* After label */}
        <div className="absolute bottom-4 right-4">
          <div className="px-3 py-1.5 bg-black/60 backdrop-blur-sm text-white text-sm font-medium rounded-full">
            After
          </div>
        </div>
        
        <div
          className="absolute top-0 bottom-0 w-[2px] bg-white/90 shadow-[0_0_0_1px_rgba(0,0,0,0.08)]"
          style={{ left: `${position}%` }}
        />
        <div
          className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-14 h-14 rounded-full bg-white text-slate-900 shadow-[0_12px_32px_rgba(0,0,0,0.18)] ring-1 ring-black/5 flex items-center justify-center"
          style={{ left: `${position}%` }}
        >
          <div className="flex items-center gap-1 text-lg leading-none">
            <span className="-translate-y-[1px]">‹</span>
            <span className="-translate-y-[1px]">›</span>
          </div>
        </div>
      </div>
    </div>
  );
}
