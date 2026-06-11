"use client";

import { useCallback, useEffect, useState } from "react";
import { dismissClockDriftWarning, readClockDriftDismissed } from "@/app/config/clockDrift";

export function useClockDriftDismiss() {
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    setDismissed(readClockDriftDismissed());
  }, []);

  const dismiss = useCallback(() => {
    dismissClockDriftWarning();
    setDismissed(true);
  }, []);

  return { dismissed, dismiss };
}
