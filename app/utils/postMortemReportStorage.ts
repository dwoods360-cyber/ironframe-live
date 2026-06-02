import path from "path";
import {
  resolveEvidenceStorageBucket,
  writeLocalWormBytes,
} from "@/app/lib/evidence/wormStoragePolicy";
import { uploadImmutableWormObject } from "@/app/lib/evidence/supabaseWormStorage";

/**
 * Persist PDF bytes to Supabase Storage when configured, else `uploads/reports/<tenant>/`.
 * Returns stored reference: `supabase://bucket/path` or POSIX path under `uploads/`.
 */
export async function persistPostMortemReportPdf(params: {
  tenantUuid: string;
  threatId: string;
  bytes: Uint8Array;
}): Promise<string> {
  const fileName = `post-mortem-${params.threatId.slice(0, 12)}-${Date.now()}.pdf`;
  const safeTenant = params.tenantUuid.replace(/[^a-f0-9-]/gi, "");
  const objectPath = `incident-reports/${safeTenant}/${fileName}`;

  const uploaded = await uploadImmutableWormObject({
    objectPath,
    bytes: params.bytes,
    mimeType: "application/pdf",
    tenantId: params.tenantUuid,
    bucketName: (process.env.INCIDENT_REPORTS_BUCKET ?? resolveEvidenceStorageBucket()).trim(),
  });
  if (uploaded.ok) {
    return uploaded.storagePath;
  }

  const localRelative = await writeLocalWormBytes({
    relativeDir: path.join("storage", "worm", "incident-reports", safeTenant),
    fileName,
    bytes: params.bytes,
  });
  return localRelative;
}
