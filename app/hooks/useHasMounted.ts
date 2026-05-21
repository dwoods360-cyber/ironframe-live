"use client";

import { useEffect, useState } from "react";

/** Avoid SSR/client mismatch for industry-dependent badges and similar UI. */
export function useHasMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  return mounted;
}
