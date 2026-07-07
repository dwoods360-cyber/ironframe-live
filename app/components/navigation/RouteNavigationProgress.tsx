"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

function isInternalNavigationAnchor(anchor: HTMLAnchorElement): boolean {
  if (anchor.target === "_blank") return false;
  if (anchor.hasAttribute("download")) return false;
  const href = anchor.getAttribute("href");
  if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
    return false;
  }
  try {
    const url = new URL(href, window.location.href);
    return url.origin === window.location.origin;
  } catch {
    return false;
  }
}

/** Thin top progress bar — starts on in-app link click, completes on pathname change. */
export default function RouteNavigationProgress() {
  const pathname = usePathname();
  const [visible, setVisible] = useState(false);
  const [width, setWidth] = useState(0);
  const navigatingRef = useRef(false);
  const stallTimerRef = useRef<number | null>(null);

  const finish = useCallback(() => {
    if (stallTimerRef.current) {
      window.clearTimeout(stallTimerRef.current);
      stallTimerRef.current = null;
    }
    if (!navigatingRef.current) return;
    setWidth(100);
    window.setTimeout(() => {
      setVisible(false);
      setWidth(0);
      navigatingRef.current = false;
    }, 240);
  }, []);

  const start = useCallback(() => {
    if (navigatingRef.current) return;
    navigatingRef.current = true;
    setVisible(true);
    setWidth(8);
    window.setTimeout(() => setWidth(36), 60);
    window.setTimeout(() => setWidth(64), 220);
    window.setTimeout(() => setWidth(88), 650);
    if (stallTimerRef.current) window.clearTimeout(stallTimerRef.current);
    stallTimerRef.current = window.setTimeout(() => finish(), 10_000);
  }, [finish]);

  useEffect(() => {
    finish();
  }, [pathname, finish]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented) return;
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }
      const anchor = (event.target as Element | null)?.closest("a");
      if (!(anchor instanceof HTMLAnchorElement)) return;
      if (!isInternalNavigationAnchor(anchor)) return;
      start();
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [start]);

  if (!visible) return null;

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[1300] h-0.5 bg-slate-900/70"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={width}
      aria-label="Route navigation in progress"
    >
      <div
        className="h-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.75)] transition-[width] duration-200 ease-out"
        style={{ width: `${width}%` }}
      />
    </div>
  );
}
