"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import { readdirSync, unlinkSync, rmSync, existsSync } from "fs";
import path from "path";

const UPLOADS_DIR = process.env.UPLOADS_DIR ?? "uploads";

const ORPHANED_EXTENSIONS = [".pdf", ".docx", ".xlsx", ".csv"];

/** Delete orphaned test/vendor_artifact files in /uploads using sync fs. Prevents storage bloat after deep purge. */
function deleteOrphanedUploadsSync(): { deleted: number; errors: string[] } {
  const errors: string[] = [];
  let deleted = 0;
  const root = path.isAbsolute(UPLOADS_DIR) ? UPLOADS_DIR : path.join(process.cwd(), UPLOADS_DIR);
  if (!existsSync(root)) return { deleted: 0, errors: [] };
  try {
    const entries = readdirSync(root, { withFileTypes: true });
    for (const ent of entries) {
      const full = path.join(root, ent.name);
      try {
        if (ent.isDirectory()) {
          rmSync(full, { recursive: true });
          deleted++;
        } else {
          const lower = ent.name.toLowerCase();
          if (ORPHANED_EXTENSIONS.some((ext) => lower.endsWith(ext))) {
            unlinkSync(full);
            deleted++;
          }
        }
      } catch (e) {
        errors.push(`${ent.name}: ${String(e)}`);
      }
    }
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code !== "ENOENT") errors.push(String(e));
  }
  return { deleted, errors };
}

/**
 * Full system purge: wipes from root (Tenant) so cascade removes companies, departments, policies, active_risks, vendors, agent_logs.
 * Then explicitly wipes threat_events, work_notes, audit_logs (not under Tenant FK). No ghost data.
 * Quarantine file metadata lives on the primary DB (`quarantine_records`).
 */
export async function purgeSimulation(): Promise<{ ok: boolean; message: string }> {
  try {
    // Master purge: root of hierarchy first (triggers ON DELETE CASCADE for companies, departments, policies, active_risks, vendors, agent_logs)
    const tenantResult = await prisma.tenant.deleteMany({});
    // Tables not under Tenant FK
    const auditLogResult = await prisma.auditLog.deleteMany({});
    const workNoteResult = await prisma.workNote.deleteMany({});
    const threatEventResult = await prisma.threatEvent.deleteMany({});
    const quarantineResult = await prisma.quarantineRecord.deleteMany({});

    console.log("[PURGE] Main DB wiped (tenant-first cascade):", {
      tenants: tenantResult.count,
      audit_logs: auditLogResult.count,
      threat_events: threatEventResult.count,
      work_notes: workNoteResult.count,
      quarantine_records: quarantineResult.count,
    });

    const uploadsResult = deleteOrphanedUploadsSync();
    if (uploadsResult.errors.length > 0) console.warn("purgeSimulation: uploads cleanup errors", uploadsResult.errors);

    // Force full layout + page revalidation so dashboard and all sections refetch (no ghost data)
    revalidatePath("/", "layout");
    revalidatePath("/");
    revalidatePath("/reports");

    const parts = [
      `${tenantResult.count} tenant(s) (cascade: companies, departments, policies, active_risks, vendors, agent_logs)`,
      `${auditLogResult.count} audit log(s)`,
      `${workNoteResult.count} work note(s)`,
      `${threatEventResult.count} threat event(s)`,
      `${quarantineResult.count} quarantine record(s)`,
    ];
    if (uploadsResult.deleted > 0) parts.push(`${uploadsResult.deleted} upload file(s)`);

    return {
      ok: true,
      message: `Purge complete. ${parts.join(", ")} removed.`,
    };
  } catch (e) {
    console.error("purgeSimulation", e);
    return { ok: false, message: String(e) };
  }
}
