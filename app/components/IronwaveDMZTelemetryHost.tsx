"use client";

import { useIronwaveDMZTelemetry } from "@/app/hooks/useIronwaveDMZTelemetry";

/** Mount once under the root shell so DMZ polling runs app-wide (including threat detail routes). */
export default function IronwaveDMZTelemetryHost() {
  useIronwaveDMZTelemetry();
  return null;
}
