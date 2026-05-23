export interface RekaFaqData {
  disabled: boolean;
  label: string;
  title: string;
  description: string;
  contact_email?: string;
  items: Array<{ title: string; description: string }>;
}

export default function RekaFaqSection({ data }: { data: RekaFaqData }) {
  if (data.disabled) return null;

  const contactEmail = data.contact_email || "support@rekaclip.com";

  return (
    <section className="reka-faq-page">
      <div className="reka-page-container reka-faq-inner">
        <div className="reka-section-header text-center landing-reveal landing-reveal--1">
          <span className="reka-pill mb-4">{data.label}</span>
          <h2 className="reka-faq-title">{data.title}</h2>
          <p className="reka-faq-desc mx-auto">
            {data.description}{" "}
            <span className="text-[var(--text-secondary)]">
              Have another question? Contact us at{" "}
              <a href={`mailto:${contactEmail}`} className="reka-faq-contact-link">
                {contactEmail}
              </a>
            </span>
          </p>
        </div>

        <div className="reka-faq-grid landing-reveal landing-reveal--2">
          {data.items.map((item, index) => (
            <article key={item.title} className="reka-faq-item">
              <div className="reka-faq-item-head">
                <span className="reka-faq-number" aria-hidden>
                  {index + 1}
                </span>
                <h3 className="reka-faq-question">{item.title}</h3>
              </div>
              <p className="reka-faq-answer">{item.description}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
