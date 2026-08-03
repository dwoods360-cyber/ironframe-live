"use client";

import { useEffect } from "react";

import {
  isRecoverableClientDriftError,
  recoverFromClientDriftError,
} from "@/app/utils/chunkLoadRecovery";

/** One-shot reload when webpack chunks / Server Actions drift after rebuilds or hot deploys. */
export default function ChunkLoadRecoveryBootstrap() {
  useEffect(() => {
    const onWindowError = (event: ErrorEvent) => {
      if (isRecoverableClientDriftError(event.error ?? event.message)) {
        recoverFromClientDriftError();
      }
    };

    const onUnhandledRejection = (event: PromiseRejectionEvent) => {
      if (isRecoverableClientDriftError(event.reason)) {
        recoverFromClientDriftError();
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
