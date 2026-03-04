'use client';

import { useEffect } from 'react';

/** Scrolls to the element matching window.location.hash on mount (e.g. /threats/xyz#ai-report). */
export default function ThreatDetailHashScroll() {
  useEffect(() => {
    const hash = typeof window !== 'undefined' ? window.location.hash.slice(1) : '';
    if (hash) {
      const el = document.getElementById(hash);
      if (el) el.scrollIntoView({ behavior: 'smooth' });
    }
  }, []);
  return null;
}
