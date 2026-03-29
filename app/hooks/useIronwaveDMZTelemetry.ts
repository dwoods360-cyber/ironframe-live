"use client";

import { useEffect, useRef } from "react";
import { useAgentStore } from "@/app/store/agentStore";

export type DmzPipelineTelemetryRow = {
  id: string;
  ingestionDetails: string | null;
};

type TelemetryResponse = {
  tenantUuid?: string;
  threats?: DmzPipelineTelemetryRow[];
};

const POLL_MS = 8_000;

const CRITICAL_MSG =
  "[IRONLOCK INTERRUPT] 🚨 CRITICAL PAYLOAD IN DMZ. APP CORRUPTION RISK DETECTED.";
const STANDARD_MSG = "[IRONWAVE] Standard telemetry payload arrived in DMZ Quarantine.";

function parseIngestionPayload(ingestionDetails: string | null): {
  severity?: string;
  vector?: string;
} {
  if (ingestionDetails == null || ingestionDetails.trim() === "") return {};
  try {
    const o = JSON.parse(ingestionDetails) as Record<string, unknown>;
    const severity = typeof o.severity === "string" ? o.severity : undefined;
    const vector = typeof o.vector === "string" ? o.vector : undefined;
    return { severity, vector };
  } catch {
    return {};
  }
}

/** App-corruption / IRONLOCK tier: audible alert tier (CRITICAL / SQL_INJECTION / RCE). */
export function dmzPayloadMeetsIronlockAudioThreshold(ingestionDetails: string | null): boolean {
  const { severity, vector } = parseIngestionPayload(ingestionDetails);
  if (severity?.toUpperCase() === "CRITICAL") return true;
  const v = vector?.toUpperCase();
  return v === "SQL_INJECTION" || v === "RCE";
}

function playIronlockAlarm(): void {
  try {
    const audio = new Audio("/notification_message-notification-alert-7-331719.mp3");
    audio.volume = 0.8;
    void audio.play().catch(() => {
      console.warn("Audio autoplay blocked by browser");
    });
  } catch {
    console.warn("Audio autoplay blocked by browser");
  }
}

/**
 * Global DMZ listener: polls PIPELINE threats for the active tenant.
 * - Audio: re-fires each poll while any unresolved row still meets the IRONLOCK threshold (no `<audio loop>`).
 * - Terminal: single-fire per threat id via `knownThreatIdsRef` (bootstrap seeds current queue without lines).
 */
export function useIronwaveDMZTelemetry(): void {
  const knownThreatIdsRef = useRef<Set<string>>(new Set());
  const bootstrappedRef = useRef(false);
  const lastTenantUuidRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const poll = async () => {
      try {
        const res = await fetch("/api/dmz/pipeline-telemetry", {
          method: "GET",
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as TelemetryResponse;
        const tenantUuid = data.tenantUuid ?? "";
        const threats = Array.isArray(data.threats) ? data.threats : [];

        if (tenantUuid && tenantUuid !== lastTenantUuidRef.current) {
          lastTenantUuidRef.current = tenantUuid;
          knownThreatIdsRef.current = new Set();
          bootstrappedRef.current = false;
        }

        const hasCriticalUnresolved = threats.some((t) =>
          dmzPayloadMeetsIronlockAudioThreshold(t.ingestionDetails),
        );
        if (hasCriticalUnresolved) {
          playIronlockAlarm();
        }

        if (!bootstrappedRef.current) {
          for (const t of threats) {
            knownThreatIdsRef.current.add(t.id);
          }
          bootstrappedRef.current = true;
          return;
        }

        const appendLine = useAgentStore.getState().appendRiskIngestionTerminalLine;

        for (const t of threats) {
          if (knownThreatIdsRef.current.has(t.id)) continue;
          knownThreatIdsRef.current.add(t.id);

          const critical = dmzPayloadMeetsIronlockAudioThreshold(t.ingestionDetails);
          appendLine(critical ? CRITICAL_MSG : STANDARD_MSG);
        }
      } catch {
        /* ignore transient network errors */
      }
    };

    void poll();
    const id = window.setInterval(poll, POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);
}
