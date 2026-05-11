"use client";

import { useEffect } from "react";
import { installIronguardFetchInterceptor } from "@/app/utils/apiClient";

/** Client-only: wraps native `fetch` so `/api` tenant headers cannot bypass Ironguard. */
export default function IronguardBootstrap() {
  useEffect(() => {
    installIronguardFetchInterceptor();
  }, []);
  return null;
}
