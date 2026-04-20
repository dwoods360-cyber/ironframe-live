"use client";

import { useEffect, useRef } from "react";
import { pollResilienceIntelStreamLines } from "@/app/actions/resilienceIntelStreamActions";
import { useAgentStore } from "@/app/store/agentStore";

/** Irontech / Ironintel resilience lines → Intelligence Stream (global so it runs off Strategic Intel). */
export function useResilienceIntelPoll() {
  const resilienceStreamCursorRef = useRef<string>(new Date().toISOString());

  useEffect(() => {
    resilienceStreamCursorRef.current = new Date().toISOString();
    const id = setInterval(() => {
      void (async () => {
        const since = resilienceStreamCursorRef.current;
        const rows = await pollResilienceIntelStreamLines(since);
        if (rows.length === 0) return;
        const add = useAgentStore.getState().addStreamMessage;
        for (const r of rows) {
          add(r.line);
        }
        resilienceStreamCursorRef.current = rows[rows.length - 1]!.createdAt;
      })();
    }, 2500);
    return () => clearInterval(id);
  }, []);
}
