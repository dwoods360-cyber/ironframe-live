import path from "path";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";
import {
  buildImmutableUploadOptions,
  resolveEvidenceStorageBucket,
  writeLocalWormBytes,
} from "@/app/lib/evidence/wormStoragePolicy";

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

  try {
    const supabase = await createSupabaseServerClient();
    const bucket = (process.env.INCIDENT_REPORTS_BUCKET ?? resolveEvidenceStorageBucket()).trim();
    const { error } = await supabase.storage.from(bucket).upload(
      objectPath,
      params.bytes,
      buildImmutableUploadOptions("application/pdf"),
    );
    if (!error) {
      return `supabase://${bucket}/${objectPath}`;
    }
  } catch {
    /* fall through to local */
  }

  const localRelative = await writeLocalWormBytes({
    relativeDir: path.join("storage", "worm", "incident-reports", safeTenant),
    fileName,
    bytes: params.bytes,
  });
  return localRelative;
}
