const CVE_PATTERN = /CVE-\d{4}-\d+/i;

function extractCveId(payload: Record<string, unknown>): string {
  if (typeof payload.cve === "string" && payload.cve.trim()) {
    return payload.cve.trim().toUpperCase();
  }
  if (typeof payload.cve_id === "string" && payload.cve_id.trim()) {
    return payload.cve_id.trim().toUpperCase();
  }
  const haystack = JSON.stringify(payload);
  const match = haystack.match(CVE_PATTERN);
  if (match) return match[0].toUpperCase();
  return "CVE-UNKNOWN";
}

export type IronsightCvePollResult = {
  id: string;
  cve: string;
  blastRadius: "cataloged" | "unknown";
};

/**
 * Epic 10.2 — Ironsight: CVE verification + blast-radius catalog stub.
 */
export async function ironsightCvePoll(
  sanitizedPayload: Record<string, unknown>,
): Promise<IronsightCvePollResult> {
  const cve = extractCveId(sanitizedPayload);
  const id = cve.replace(/^CVE-/i, "");
  return {
    id,
    cve,
    blastRadius: cve === "CVE-UNKNOWN" ? "unknown" : "cataloged",
  };
}
