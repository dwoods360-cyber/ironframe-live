import { unstable_noStore as noStore } from "next/cache";
import IntegrityAleHeroCard from "@/app/components/integrity/IntegrityAleHeroCard";
import IntegrityHubClient from "@/app/components/integrity/IntegrityHubClient";
import { fetchResolvedChaosLedgerRows } from "@/app/lib/integrityLedgerServer";
import { readIntegrityVaultSnapshot } from "@/app/lib/integrityVaultServer";
import {
  ALE_MITIGATED_PLACEHOLDER_CENTS,
  formatAleUsdFromCents,
} from "@/app/utils/integrityAlePlaceholder";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Integrity Hub | Ironframe",
  description: "GRC audit ledger, LKG cold-store inventory, and workforce attestation.",
};

/**
 * `noStore()` here plus `fetchResolvedChaosLedgerRows()` internal `noStore()` — no memoized RSC payload for the hub.
 * Workforce Inventory maps the constitutional 19-agent Iron roster from `readIntegrityVaultSnapshot()` / `LKG_WORKFORCE_ROSTER`.
 * Executive ALE hero uses `totalMitigated` from BigInt cents (`ALE_MITIGATED_PLACEHOLDER_CENTS`) — Epic 7 replaces source + formatting.
 * Ledger rows: `fetchResolvedChaosLedgerRows()` loads `ThreatEvent` with `status` in `RESOLVED` or `DE_ACKNOWLEDGED`, then JSON-filters chaos / agentic-heal rows (`isChaosTest`, `chaosScenario`, `integrityHubLedgerEntry`, etc.).
 * Autonomous attribution displays as "Irontech (autonomous)" while preserving `SYSTEM_IRONTECH_AUTO` as the stored id.
 * `IntegrityHubClient` polls with `router.refresh()` every 5s.
 */

export default async function IntegrityPage() {
  noStore();
  const [initialVault, ledgerRows] = await Promise.all([
    readIntegrityVaultSnapshot(),
    fetchResolvedChaosLedgerRows(),
  ]);

  const totalMitigated = formatAleUsdFromCents(ALE_MITIGATED_PLACEHOLDER_CENTS);

  return (
    <div className="min-h-0 bg-slate-950 px-4 pt-2 pb-3 text-slate-100 md:px-8 md:pt-2">
      <div className="mx-auto w-full max-w-[min(100%,96rem)]">
        <IntegrityHubClient
          initialVault={initialVault}
          ledgerRows={ledgerRows}
          aleHero={<IntegrityAleHeroCard key="ale-hero-card" totalMitigated={totalMitigated} />}
        />
      </div>
    </div>
  );
}
