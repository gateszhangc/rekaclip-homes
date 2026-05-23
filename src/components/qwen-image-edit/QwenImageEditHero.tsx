import React from 'react';
import { ArrowRight, ChevronDown } from 'lucide-react';

interface QwenImageEditHeroProps {
  onStartClick: () => void;
}

const QwenImageEditHero: React.FC<QwenImageEditHeroProps> = ({ onStartClick }) => {
  return (
    <div className="relative w-full">
      {/* 
        SECTION 1: Sticky Video Background 
        This section stays fixed ('sticky') while we scroll through it until the next section overlaps it.
      */}
      <div className="sticky top-0 h-screen w-full overflow-hidden z-0">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          src="https://pub-516d6dec605949ec866b83233c40ca6e.r2.dev/herotupian/shiping.mp4"
        />
        
        {/* Dark overlay for better text readability initially */}
        <div className="absolute inset-0 bg-black/40" />

        {/* Hero Content Overlay */}
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-4 z-10">
          <div className="absolute bottom-10 flex flex-col items-center gap-4 animate-bounce">
            <span className="text-xs text-white/80 tracking-widest uppercase">Scroll to explore</span>
            <ChevronDown className="text-white w-6 h-6" />
          </div>
        </div>

        {/* Start Creating Button - Fixed or positioned absolutely at the bottom center of the view */}
        <div className="absolute bottom-24 left-0 right-0 flex justify-center z-20">
          <button
            onClick={onStartClick}
            className="group bg-white text-black px-8 py-3 rounded-full font-medium text-lg flex items-center gap-2 hover:scale-105 transition-transform shadow-lg"
          >
            Start Creating
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
          </button>
        </div>
      </div>


    </div>
  );
};

export default QwenImageEditHero;