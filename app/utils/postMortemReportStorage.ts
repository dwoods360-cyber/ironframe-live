import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { createClient as createSupabaseServerClient } from "@/lib/supabase/server";

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
    const bucket = (
      process.env.INCIDENT_REPORTS_BUCKET ??
      process.env.EVIDENCE_STORAGE_BUCKET ??
      "evidence-locker"
    ).trim();
    const { error } = await supabase.storage.from(bucket).upload(objectPath, params.bytes, {
      contentType: "application/pdf",
      upsert: true,
    });
    if (!error) {
      return `supabase://${bucket}/${objectPath}`;
    }
  } catch {
    /* fall through to local */
  }

  const localRelative = path.join("uploads", "reports", safeTenant, fileName);
  const localAbsolute = path.join(process.cwd(), localRelative);
  await mkdir(path.dirname(localAbsolute), { recursive: true });
  await writeFile(localAbsolute, Buffer.from(params.bytes));
  return localRelative.replace(/\\/g, "/");
}
