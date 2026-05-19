// Reka Clip — Interactivity

document.addEventListener('DOMContentLoaded', () => {
  // Mobile nav toggle
  const toggle = document.querySelector('.mobile-toggle');
  const navLinks = document.querySelector('.navbar-links');
  if (toggle && navLinks) {
    toggle.addEventListener('click', () => {
      navLinks.classList.toggle('open');
    });
    // Close on link click
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => navLinks.classList.remove('open'));
    });
  }

  // FAQ accordion
  document.querySelectorAll('.faq-question').forEach(q => {
    q.addEventListener('click', () => {
      const item = q.parentElement;
      item.classList.toggle('open');
    });
  });

  // Hero CTA button — redirect to mirofish
  const heroCta = document.getElementById('hero-cta');
  if (heroCta) {
    heroCta.addEventListener('click', () => {
      window.open('https://mirofish.my/', '_blank');
    });
  }

  // Navbar CTA
  const navCta = document.getElementById('nav-cta');
  if (navCta) {
    navCta.addEventListener('click', (e) => {
      e.preventDefault();
      window.open('https://mirofish.my/', '_blank');
    });
  }

  // Other CTA buttons
  document.querySelectorAll('.btn-primary[data-href]').forEach(btn => {
    btn.addEventListener('click', () => {
      const href = btn.getAttribute('data-href');
      if (href) window.open(href, '_blank');
    });
  });

  // Scroll-padding offset for anchor links
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      const href = this.getAttribute('href');
      if (href === '#') return;
      e.preventDefault();
      const target = document.querySelector(href);
      if (target) {
        const offset = 80;
        const top = target.getBoundingClientRect().top + window.pageYOffset - offset;
        window.scrollTo({ top, behavior: 'smooth' });
      }
    });
  });
});
