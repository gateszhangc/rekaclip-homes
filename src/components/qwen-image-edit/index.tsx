'use client';

import React, { useRef } from 'react';
import QwenImageEditHero from './QwenImageEditHero';
import QwenImageEditPlayground from './QwenImageEditPlayground';

const QwenImageEdit: React.FC = () => {
  const playgroundRef = useRef<HTMLDivElement>(null);

  const scrollToPlayground = () => {
    playgroundRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <main className="w-full min-h-screen bg-white">
      <QwenImageEditHero onStartClick={scrollToPlayground} />
      <div ref={playgroundRef}>
        <QwenImageEditPlayground />
      </div>
    </main>
  );
};

export default QwenImageEdit;