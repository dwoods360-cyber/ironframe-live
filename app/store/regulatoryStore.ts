"use client";

import { useSyncExternalStore } from "react";

export type RegulationFeedItem = {
  id: string;
  title: string;
  region: string;
  severity: "HIGH" | "MEDIUM";
  publishedAt: string;
};

export type RegulatoryAutoTask = {
  id: string;
  title: string;
  priority: "HIGH";
  badge: "NEW REGULATION";
  sourceRegulationId: string;
  sourceRegulationTitle: string;
  status: "OPEN";
  createdAt: string;
};

export type VendorRegulatoryFeedItem = {
  vendorName: string;
  source: "Vendor Hub" | "Nth-Party Map";
  regulatoryStatus: "COMPLIANT" | "UNDER REVIEW" | "VIOLATION DETECTED";
};

type RegulatoryState = {
  feed: RegulationFeedItem[];
  autoTasks: RegulatoryAutoTask[];
  vendorRegulatoryFeed: VendorRegulatoryFeedItem[];
  ticker: string[];
  syncedAt: string | null;
  isSyncing: boolean;
  error: string | null;
};

const listeners = new Set<() => void>();

let regulatoryState: RegulatoryState = {
  feed: [],
  autoTasks: [],
  vendorRegulatoryFeed: [],
  ticker: [],
  syncedAt: null,
  isSyncing: false,
  error: null,
};

function emitChange() {
  listeners.forEach((listener) => listener());
}

export function subscribeRegulatory(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getRegulatorySnapshot() {
  return regulatoryState;
}

function mergeById<T extends { id: string }>(current: T[], incoming: T[]) {
  const map = new Map<string, T>();

  for (const item of current) {
    map.set(item.id, item);
  }

  for (const item of incoming) {
    map.set(item.id, item);
  }

  return Array.from(map.values());
}

function mergeVendorFeed(current: VendorRegulatoryFeedItem[], incoming: VendorRegulatoryFeedItem[]) {
  const map = new Map<string, VendorRegulatoryFeedItem>();

  for (const item of current) {
    map.set(item.vendorName, item);
  }

  for (const item of incoming) {
    map.set(item.vendorName, item);
  }

  return Array.from(map.values());
}

export async function syncRegulatoryFeed() {
  regulatoryState = {
    ...regulatoryState,
    isSyncing: true,
    error: null,
  };
  emitChange();

  try {
    const response = await fetch("/api/regulations/sync", {
      method: "POST",
      headers: {
        "content-type": "application/json",
      },
    });

    if (!response.ok) {
      throw new Error(`Regulation sync failed (${response.status})`);
    }

    const payload = (await response.json()) as {
      syncedAt: string;
      detectedRegulations: RegulationFeedItem[];
      autoTasks: RegulatoryAutoTask[];
      vendorRegulatoryFeed: VendorRegulatoryFeedItem[];
      ticker: string[];
    };

    regulatoryState = {
      ...regulatoryState,
      feed: mergeById(regulatoryState.feed, payload.detectedRegulations),
      autoTasks: mergeById(regulatoryState.autoTasks, payload.autoTasks),
      vendorRegulatoryFeed: mergeVendorFeed(regulatoryState.vendorRegulatoryFeed, payload.vendorRegulatoryFeed),
      ticker: payload.ticker,
      syncedAt: payload.syncedAt,
      isSyncing: false,
      error: null,
    };
  } catch (error) {
    regulatoryState = {
      ...regulatoryState,
      isSyncing: false,
      error: (error as Error).message,
    };
  }

  emitChange();
}

export function useRegulatoryStore() {
  return useSyncExternalStore(subscribeRegulatory, getRegulatorySnapshot, getRegulatorySnapshot);
}
