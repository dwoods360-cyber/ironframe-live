"use client";

import { useEffect } from "react";

import { isChunkLoadError, recoverFromChunkLoadError } from "@/app/utils/chunkLoadRecovery";

/** One-shot reload when webpack chunks drift after `next dev` rebuilds or hot deploys. */
export default function ChunkLoadRecoveryBootstrap() {
  useEffect(() => {
    const onWindowError = (event: ErrorEvent) => {
      if (isChunkLoadError(event.error ?? event.message)) {
        recoverFromChunkLoadError();
      }
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (isChunkLoadError(event.reason)) {
        recoverFromChunkLoadError();
      }
    };

    window.addEventListener("error", onWindowError);
    window.addEventListener("unhandledrejection", onUnhandledRejection);
    return () => {
      window.removeEventListener("error", onWindowError);
      window.removeEventListener("unhandledrejection", onUnhandledRejection);
    };
  }, []);

  return null;
}
