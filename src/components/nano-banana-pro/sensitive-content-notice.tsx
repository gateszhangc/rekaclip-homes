import React from "react";
import { ShieldAlert, PencilLine } from "lucide-react";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

interface SensitiveContentNoticeProps {
  message?: string;
  requestId?: string;
  onEditPrompt: () => void;
  className?: string;
}

const DEFAULT_MESSAGE =
  "Content flagged by safety system. Please revise your prompt and try again.";

const SensitiveContentNotice: React.FC<SensitiveContentNoticeProps> = ({
  message = DEFAULT_MESSAGE,
  requestId,
  onEditPrompt,
  className,
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }} // Elegant "landing-reveal" style curve
      className={cn(
        "group relative w-full overflow-hidden rounded-3xl p-[1px]",
        className
      )}
    >
      {/* Animated Gradient Border */}
      <div className="absolute inset-0 bg-gradient-to-br from-amber-500/30 via-rose-500/20 to-amber-900/10 opacity-60 backdrop-blur-3xl transition-opacity duration-1000 group-hover:opacity-100" />
      
      {/* Main Glass Container */}
      <div className="relative h-full w-full overflow-hidden rounded-[23px] bg-gradient-to-br from-background/95 via-background/90 to-background/80 p-6 backdrop-blur-xl transition-colors duration-500">
        
        {/* Ambient Raphael Glows */}
        <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-amber-500/10 blur-[80px] transition-transform duration-1000 group-hover:translate-x-4 group-hover:translate-y-4" />
        <div className="pointer-events-none absolute -bottom-24 -left-20 h-64 w-64 rounded-full bg-rose-500/10 blur-[80px] transition-transform duration-1000 group-hover:-translate-x-4 group-hover:-translate-y-4" />

        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start">
          {/* Icon Badge */}
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-rose-500/20 bg-gradient-to-br from-rose-500/10 to-transparent shadow-[0_0_20px_-10px_rgba(244,63,94,0.4)]">
            <ShieldAlert className="h-6 w-6 text-rose-400" />
          </div>

          <div className="flex-1 space-y-5">
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-500/20 bg-rose-500/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.2em] text-rose-300 backdrop-blur-sm">
                   Safety System
                </span>
                {requestId && (
                  <span className="font-mono text-[10px] text-muted-foreground/50 tracking-wide">
                    REF: {requestId}
                  </span>
                )}
              </div>
              
              {/* Premium Typography matching Landing Page Headers */}
              <h3 className="font-serif text-2xl font-medium leading-none tracking-tight text-white drop-shadow-sm">
                Request Flagged
              </h3>
              
              <p className="max-w-xl text-sm leading-relaxed text-muted-foreground/80 font-light tracking-wide">
                {message}
              </p>
            </div>

            {/* Action Button */}
            <button
              onClick={onEditPrompt}
              className="group/btn relative inline-flex items-center gap-3 overflow-hidden rounded-full border border-amber-500/20 bg-gradient-to-br from-amber-500/10 to-amber-600/5 px-6 py-2.5 text-sm font-medium text-amber-200 shadow-[0_0_20px_-12px_rgba(245,158,11,0.5)] transition-all hover:border-amber-500/40 hover:from-amber-500/20 hover:text-amber-100 hover:shadow-[0_0_25px_-10px_rgba(245,158,11,0.6)] active:scale-95"
            >
              <span className="absolute inset-0 bg-white/5 opacity-0 transition-opacity group-hover/btn:opacity-100" />
              <PencilLine className="h-4 w-4 transition-transform duration-500 group-hover/btn:-rotate-12 group-hover/btn:scale-110" />
              <span className="tracking-wide">Revise Prompt</span>
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default SensitiveContentNotice;
