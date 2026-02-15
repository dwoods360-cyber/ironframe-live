"use client";

import { useSyncExternalStore } from "react";
import { getMailHubSnapshot, subscribeMailHub } from "@/app/utils/mailHub";

export function useMailHubStore() {
  return useSyncExternalStore(subscribeMailHub, getMailHubSnapshot, getMailHubSnapshot);
}
