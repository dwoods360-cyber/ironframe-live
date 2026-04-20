import { residualScoreToSeverityLabel } from "@/app/lib/opsupport/operationalDeficiencyQueue";

export function formatIngestionForGeminiPacket(ingestionDetails: string | null | undefined): string {
  if (!ingestionDetails?.trim()) return "{}\n(empty)";
  try {
    const parsed = JSON.parse(ingestionDetails) as unknown;
    return JSON.stringify(parsed, null, 2);
  } catch {
    return JSON.stringify(ingestionDetails, null, 2);
  }
}

export function buildGeminiRepairPacket(input: {
  comment: string;
  threatId: string;
  threatTitle: string;
  threatStatus: string;
  likelihood: number;
  impact: number;
  sourceComponentPath: string;
  gitRevision: string | null;
  ingestionDetails: string | null | undefined;
}): string {
  const L = Math.min(10, Math.max(1, Math.round(input.likelihood)));
  const I = Math.min(10, Math.max(1, Math.round(input.impact)));
  const residual = L * I;
  const sev = residualScoreToSeverityLabel(residual);
  const jsonBlock = formatIngestionForGeminiPacket(input.ingestionDetails);
  const rev =
    input.gitRevision ??
    "(unavailable — set VERCEL_GIT_COMMIT_SHA / GITHUB_SHA or run from a git checkout)";

  return `=== GEMINI REPAIR PACKET (Ironframe GRC) ===

## Deficiency (user)
${input.comment.trim() || "(no comment yet)"}

## Card
- Threat ID: ${input.threatId}
- Title: ${input.threatTitle}
- Status: ${input.threatStatus}
- Severity: ${sev} (likelihood × impact = ${L} × ${I} = ${residual})
- Source component: ${input.sourceComponentPath}

## Code revision (best effort)
${rev}

## ingestionDetails (JSON)
${jsonBlock}
`;
}
