"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export interface RekaFaqData {
  disabled: boolean;
  label: string;
  title: string;
  description: string;
  items: Array<{ title: string; description: string }>;
}

export default function RekaFaqSection({ data }: { data: RekaFaqData }) {
  const [openItem, setOpenItem] = useState<string | null>(null);

  if (data.disabled) return null;

  return (
    <section className="reka-faq-page">
      <div className="reka-faq-inner">
        <div className="reka-section-header text-center landing-reveal landing-reveal--1">
          <span className="reka-pill mb-4">{data.label}</span>
          <h1 className="reka-faq-title">{data.title}</h1>
          <p className="mx-auto">{data.description}</p>
        </div>

        <div className="reka-faq-list landing-reveal landing-reveal--2">
          {data.items.map((item, i) => (
            <div key={i} className="glass-panel overflow-hidden">
              <button
                type="button"
                className="w-full flex items-center justify-between p-5 text-left"
                onClick={() => setOpenItem(openItem === `faq-${i}` ? null : `faq-${i}`)}
                aria-expanded={openItem === `faq-${i}`}
              >
                <span className="font-semibold text-sm pr-4">{item.title}</span>
                <ChevronDown
                  size={16}
                  className={`shrink-0 transition-transform duration-200 ${openItem === `faq-${i}` ? "rotate-180" : ""}`}
                />
              </button>
              {openItem === `faq-${i}` && (
                <div className="px-5 pb-5 text-sm text-[var(--text-secondary)] leading-relaxed">
                  {item.description}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
