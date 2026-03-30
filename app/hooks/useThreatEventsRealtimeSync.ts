"use client";

import { useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";

const DEBOUNCE_MS = 350;

/**
 * Zero-refresh Main Ops: refetch pipeline + active threats when `ThreatEvent` rows change in Supabase.
 * Requires Realtime enabled for `ThreatEvent` (Dashboard → Database → Publications / Replication).
 */
export function useThreatEventsRealtimeSync(onSync: () => void) {
  const onSyncRef = useRef(onSync);
  onSyncRef.current = onSync;

  useEffect(() => {
    const supabase = createClient();
    let debounceTimer: ReturnType<typeof setTimeout> | undefined;

    const schedule = () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        onSyncRef.current();
      }, DEBOUNCE_MS);
    };

    const channel = supabase
      .channel("threat-event-main-ops-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "ThreatEvent" },
        (payload) => {
          void payload;
          schedule();
        },
      )
      .subscribe((status) => {
        if (status === "TIMED_OUT" || status === "CHANNEL_ERROR") {
          console.warn("[Realtime] ThreatEvent subscription:", status);
        }
      });

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      void supabase.removeChannel(channel);
    };
  }, []);
}
