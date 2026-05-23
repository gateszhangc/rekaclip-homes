import Image from "next/image";
import { Check } from "lucide-react";

export interface RekaFeatureData {
  title: string;
  description: string;
  image: { src: string; alt: string };
  items: string[];
  tracking: {
    title: string;
    description: string;
    video: { src: string; alt: string };
  };
}

export default function RekaFeatureSection({ data }: { data: RekaFeatureData }) {
  return (
    <>
      <section className="reka-feature-page">
        <div className="reka-page-container">
          <div className="reka-feature-grid reka-feature-grid--image-left">
          <div className="reka-feature-visual landing-reveal landing-reveal--1">
            <Image
              src={data.image.src}
              alt={data.image.alt}
              width={960}
              height={780}
              sizes="(max-width: 1023px) 100vw, 48vw"
              className="reka-feature-image"
              priority
            />
          </div>

          <div className="reka-feature-copy landing-reveal landing-reveal--2">
            <h1 className="reka-feature-title">{data.title}</h1>
            <p className="reka-feature-desc">{data.description}</p>
            <ul className="reka-feature-list">
              {data.items.map((item) => (
                <li key={item} className="reka-feature-list-item">
                  <span className="reka-feature-check" aria-hidden>
                    <Check size={16} strokeWidth={3} />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>
          </div>
        </div>
      </section>

      <section className="reka-feature-page reka-feature-page--tracking">
        <div className="reka-page-container">
          <div className="reka-feature-grid reka-feature-grid--text-left">
          <div className="reka-feature-copy landing-reveal landing-reveal--1">
            <h2 className="reka-feature-title">{data.tracking.title}</h2>
            <p className="reka-feature-desc">{data.tracking.description}</p>
          </div>

          <div className="reka-feature-visual landing-reveal landing-reveal--2">
            <div className="reka-feature-video-frame">
              <video
                autoPlay
                loop
                muted
                playsInline
                preload="auto"
                src={data.tracking.video.src}
                aria-label={data.tracking.video.alt}
              />
            </div>
          </div>
          </div>
        </div>
      </section>
    </>
  );
}
