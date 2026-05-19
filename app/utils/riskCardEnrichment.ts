import type { SystemIntegrityDrillKind } from "@/app/types/riskCard";
import { formatCentsToUSD } from "@/app/utils/formatCentsToUSD";

/** Display label for compliance framework chips on RiskCard. */
export function formatFrameworkLabelForCard(framework: string | null | undefined): string {
  const u = (framework ?? "").trim().toUpperCase();
  if (!u) return "NIST";
  if (u === "SOC2" || u === "SOC 2") return "SOC 2";
  if (u.startsWith("ISO")) return "ISO 27001";
  return framework!.trim();
}

export function formatGovernedLiabilityForCard(
  governedImpactCents: string | null | undefined,
): string {
  const raw = (governedImpactCents ?? "").trim();
  if (!raw || raw === "0") return "—";
  try {
    return formatCentsToUSD(raw);
  } catch {
    return "—";
  }
}

/** Detect Control Room Simulation Bots A–C from deck / threat title. */
export function systemIntegrityDrillFromTitle(
  title: string | null | undefined,
): SystemIntegrityDrillKind | null {
  const n = (title ?? "").trim().toUpperCase();
  if (!n.includes("SYSTEM INTEGRITY")) return null;
  if (n.includes("ATTBOT")) return "ATTBOT";
  if (n.includes("KIMBOT")) return "KIMBOT";
  if (n.includes("GRCBOT")) return "GRCBOT";
  return null;
}

export function systemIntegrityDrillFromIngestion(
  ingestionDetails: string | null | undefined,
): SystemIntegrityDrillKind | null {
  const raw = (ingestionDetails ?? "").trim();
  if (!raw) return null;
  try {
    const j = JSON.parse(raw) as { systemIntegrityDrillId?: unknown };
    const id = typeof j.systemIntegrityDrillId === "string" ? j.systemIntegrityDrillId.trim().toLowerCase() : "";
    if (id === "attbot") return "ATTBOT";
    if (id === "kimbot") return "KIMBOT";
    if (id === "grcbot") return "GRCBOT";
  } catch {
    /* fall through */
  }
  return null;
}
