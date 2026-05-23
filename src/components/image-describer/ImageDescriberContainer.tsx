'use client';

import React from 'react';
import ImageDescriber from './ImageDescriber';

interface ImageDescriberContainerProps {
  className?: string;
}

export default function ImageDescriberContainer({ className }: ImageDescriberContainerProps) {
  return (
    <section className={`py-16 ${className}`}>
      <div className="container">
        <ImageDescriber />
      </div>
    </section>
  );
}