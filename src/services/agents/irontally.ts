import {
  getFrameworkControlMappings,
  type IrontallyFrameworkId,
} from "@/app/config/irontallyFrameworkControls";
import { buildIrontallyFrameworkSnapshot } from "@/app/services/irontallyMapper";

function resolveFrameworkId(payload: Record<string, unknown>): IrontallyFrameworkId {
  const haystack = JSON.stringify(payload).toLowerCase();
  if (haystack.includes("csrd") || haystack.includes("esrs")) return "csrd_esrs";
  if (haystack.includes("iso") || haystack.includes("27001")) return "iso_27001";
  if (haystack.includes("nist") || haystack.includes("csf")) return "nist_csf";
  if (haystack.includes("soc2") || haystack.includes("soc 2")) return "soc2_type2";
  return "soc2_type2";
}

export type IrontallyFrameworkMapResult = {
  frameworkId: IrontallyFrameworkId;
  controls: string[];
  maturityScore: number;
};

/**
 * Epic 10.2 — Irontally: policy-to-framework control mapping.
 */
export async function irontallyFrameworkMap(
  sanitizedPayload: Record<string, unknown>,
): Promise<IrontallyFrameworkMapResult> {
  const frameworkId = resolveFrameworkId(sanitizedPayload);
  const maturity =
    typeof sanitizedPayload.maturity_score === "number"
      ? sanitizedPayload.maturity_score
      : typeof sanitizedPayload.governance_score === "number"
        ? sanitizedPayload.governance_score
        : 72;
  const snapshot = buildIrontallyFrameworkSnapshot(maturity);
  const mapped = getFrameworkControlMappings(frameworkId);
  const controls = [
    ...new Set([
      ...mapped.map((row) => row.controlId),
      ...snapshot.frameworks.map((f) => f.frameworkId),
    ]),
  ];
  return { frameworkId, controls, maturityScore: snapshot.maturityScore };
}
