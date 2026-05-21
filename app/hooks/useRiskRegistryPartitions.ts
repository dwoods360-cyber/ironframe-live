"use client";



import { useEffect, useMemo, useState } from "react";

import { useRiskRegistryStore } from "@/app/store/riskRegistryStore";

import type { RiskDeckCardItem } from "@/app/types/riskCard";

import type { RiskRegistryRecord } from "@/app/types/riskLifecycle";

import {

  ensureResolvedAtStamped,

  isActiveStackEligible,

  isLegitimateRegistryDeckCard,

  isLegitimateRegistryRecord,

  RISK_REGISTRY_RESOLVED_LINGER_MS,

} from "@/app/utils/riskRegistryActiveStack";

import { riskRegistryToDeckCard } from "@/app/utils/riskRegistryCardMap";



function partitionRecords(

  records: RiskRegistryRecord[],

  nowMs: number,

): {

  ingress: RiskDeckCardItem[];

  activeStack: RiskDeckCardItem[];

} {

  const ingress: RiskDeckCardItem[] = [];

  const activeStack: RiskDeckCardItem[] = [];

  for (const row of records) {

    if (!isLegitimateRegistryRecord(row)) continue;

    const stamped = ensureResolvedAtStamped(row);

    const card = riskRegistryToDeckCard(stamped);

    if (!isLegitimateRegistryDeckCard(card, stamped)) continue;



    if (stamped.lifecycleStatus === "INGESTED" || stamped.lifecycleStatus === "REGISTERED") {

      ingress.push(card);

    } else if (isActiveStackEligible(stamped, nowMs)) {

      activeStack.unshift(card);

    }

  }

  return { ingress, activeStack };

}



function recordsNeedResolvedLingerTick(records: RiskRegistryRecord[]): boolean {

  return records.some((r) => r.lifecycleStatus === "RESOLVED");

}



/** Stable derived partitions — subscribe to `records` only (never call store methods in selectors). */

export function useRiskRegistryPartitions() {

  const records = useRiskRegistryStore((s) => s.records);

  const [lingerTick, setLingerTick] = useState(0);



  useEffect(() => {

    if (!recordsNeedResolvedLingerTick(records)) return;

    const iv = window.setInterval(() => {

      setLingerTick((n) => n + 1);

    }, Math.max(250, Math.floor(RISK_REGISTRY_RESOLVED_LINGER_MS / 8)));

    return () => window.clearInterval(iv);

  }, [records]);



  return useMemo(() => partitionRecords(records, Date.now()), [records, lingerTick]);

}


