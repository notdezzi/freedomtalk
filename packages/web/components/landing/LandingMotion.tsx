'use client';

import { useEffect } from 'react';

/**
 * Arms the quiet fade-up reveals on landing sections. Content stays
 * visible by default — this only hides a section once JS knows it can
 * reveal it, and prefers-reduced-motion users skip the effect entirely.
 */
export function LandingMotion() {
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('[data-reveal]'));
    if (els.length === 0 || !('IntersectionObserver' in window)) return;

    els.forEach((el) => el.classList.add('ftl-armed'));
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('ftl-in');
            io.unobserve(entry.target);
          }
        });
      },
      { rootMargin: '0px 0px -10% 0px', threshold: 0.12 }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, []);

  return null;
}
