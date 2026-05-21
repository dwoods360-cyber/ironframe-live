/**
 * CISO dual-key breach signal: shared logic for Control Room and active-risk UI.
 * ATTBOT (or "Breach" in ingestion) without a resolution approval id requires CISO attention.
 */

export function hasResolutionApprovalIdOnThreat(threat: {
  resolutionApprovalId?: string | null;
  ingestionDetails?: string | null;
}): boolean {
  const id = (threat.resolutionApprovalId ?? "").trim();
  if (id.length > 0) return true;
  try {
    const j = JSON.parse(threat.ingestionDetails ?? "{}") as {
      shadowCisoHandshake?: { resolutionApprovalId?: string };
    };
    return Boolean((j?.shadowCisoHandshake?.resolutionApprovalId ?? "").trim().length);
  } catch {
    return false;
  }
}

export function isAttbotBreachStyleThreat(
  threat: { name?: string; ingestionDetails?: string | null; source?: string } & Record<string, unknown>,
): boolean {
  const n = (threat.name ?? "").toUpperCase();
  if (n.includes("ATTBOT")) return true;
  const typ = String((threat as { type?: string }).type ?? "").toUpperCase();
  if (typ === "ATTBOT" || typ.includes("ATTBOT")) return true;
  if ((threat.source ?? "").toUpperCase().includes("ATTBOT")) return true;
  if ((threat.ingestionDetails ?? "").toLowerCase().includes("breach")) return true;
  return false;
}

function isThreatOpenForBreachSignal(threat: {
  threatStatus?: string | null;
  lifecycleState?: string | null;
}): boolean {
  if ((threat.threatStatus ?? "").toUpperCase().trim() === "RESOLVED") return false;
  if (threat.lifecycleState === "resolved") return false;
  return true;
}

/** True when the pipeline (deduped) has an attbot/breach-style open threat with no CISO resolution approval. */
export function isCisoBreachAttestationPendingInSets(
  pipelineThreats: Array<{ id: string; threatStatus?: string | null; lifecycleState?: string | null; name?: string; ingestionDetails?: string | null; source?: string } & Record<string, unknown>>,
  activeThreats: Array<{ id: string; threatStatus?: string | null; lifecycleState?: string | null; name?: string; ingestionDetails?: string | null; source?: string } & Record<string, unknown>>,
): boolean {
  const all = [...pipelineThreats, ...activeThreats];
  const seen = new Set<string>();
  for (const t of all) {
    if (seen.has(t.id)) continue;
    seen.add(t.id);
    if (!isThreatOpenForBreachSignal(t)) continue;
    if (!isAttbotBreachStyleThreat(t)) continue;
    if (hasResolutionApprovalIdOnThreat(t)) continue;
    return true;
  }
  return false;
}
