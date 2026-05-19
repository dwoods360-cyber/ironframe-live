import type { RiskDeckCardItem } from "@/app/types/riskCard";

import type { RiskRegistryRecord } from "@/app/types/riskLifecycle";

import {

  ensureResolvedAtStamped,

  isActiveStackEligible,

  isLegitimateRegistryDeckCard,

  isLegitimateRegistryRecord,

} from "@/app/utils/riskRegistryActiveStack";

import { riskRegistryToDeckCard } from "@/app/utils/riskRegistryCardMap";



export type RiskRegistryDeckPartition = {

  ingressCards: RiskDeckCardItem[];

  stackCards: RiskDeckCardItem[];

};



/** Split unified queue: horizontal ingress (INGESTED/REGISTERED) + vertical stack (ACTIVE + RESOLVED ≤4s). */

export function partitionRiskRegistryDeck(

  records: RiskRegistryRecord[],

  nowMs = Date.now(),

): RiskRegistryDeckPartition {

  const ingressCards: RiskDeckCardItem[] = [];

  const stackCards: RiskDeckCardItem[] = [];



  for (const row of records) {

    if (!isLegitimateRegistryRecord(row)) continue;

    const stamped = ensureResolvedAtStamped(row);

    const card = riskRegistryToDeckCard(stamped);

    if (!isLegitimateRegistryDeckCard(card, stamped)) continue;



    if (stamped.lifecycleStatus === "INGESTED" || stamped.lifecycleStatus === "REGISTERED") {

      ingressCards.push(card);

    } else if (isActiveStackEligible(stamped, nowMs)) {

      stackCards.unshift(card);

    }

  }



  return { ingressCards, stackCards };

}


