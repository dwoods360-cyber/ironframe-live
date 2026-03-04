"use server";

import { revalidatePath } from "next/cache";
import prisma from "@/lib/prisma";
import prismaDmz from "@/lib/prisma-dmz";
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
 * Full system purge: explicitly wipes active_risks, threat_events, audit_logs (main DB) and DMZ tables.
 * Dashboard sources: ActiveRisks → active_risks; Audit sidebar → audit_logs; Risk gauge → client store (cleared on purg).
 * Order respects foreign keys: audit_logs → work_notes → threat_events → active_risks → policies → departments → companies.
 * Then DMZ: agent_logs → quarantine_records (DMZ has no threat_events).
 */
export async function purgeSimulation(): Promise<{ ok: boolean; message: string }> {
  try {
    // Main DB: explicitly wipe tables (Prisma model → table: auditLog→audit_logs, threatEvent→threat_events, activeRisk→active_risks)
    const auditLogResult = await prisma.auditLog.deleteMany({});
    const workNoteResult = await prisma.workNote.deleteMany({});
    const threatEventResult = await prisma.threatEvent.deleteMany({});
    const activeRiskResult = await prisma.activeRisk.deleteMany({});
    await prisma.policy.deleteMany({});
    await prisma.department.deleteMany({});
    const companyResult = await prisma.company.deleteMany({});

    console.log("[PURGE] Main DB wiped:", {
      audit_logs: auditLogResult.count,
      threat_events: threatEventResult.count,
      active_risks: activeRiskResult.count,
      work_notes: workNoteResult.count,
      companies: companyResult.count,
    });

    // DMZ: wipe agent_logs and quarantine_records (DMZ has no threat_events table)
    let dmzQuarantineCount = 0;
    let dmzAgentLogCount = 0;
    try {
      dmzAgentLogCount = (await prismaDmz.agentLog.deleteMany({})).count;
      dmzQuarantineCount = (await prismaDmz.quarantineRecord.deleteMany({})).count;
      console.log("[PURGE] DMZ wiped:", { agent_logs: dmzAgentLogCount, quarantine_records: dmzQuarantineCount });
    } catch (dmzErr) {
      console.warn("purgeSimulation: DMZ wipe skipped (missing client or env)", dmzErr);
    }

    const uploadsResult = deleteOrphanedUploadsSync();
    if (uploadsResult.errors.length > 0) console.warn("purgeSimulation: uploads cleanup errors", uploadsResult.errors);

    // Force full layout + page revalidation so dashboard and all sections refetch (no ghost data)
    revalidatePath("/", "layout");
    revalidatePath("/");
    revalidatePath("/reports");

    const parts = [
      `${auditLogResult.count} audit log(s)`,
      `${workNoteResult.count} work note(s)`,
      `${threatEventResult.count} threat event(s)`,
      `${activeRiskResult.count} active risk(s)`,
      `${companyResult.count} company/tenant record(s)`,
    ];
    if (dmzQuarantineCount > 0 || dmzAgentLogCount > 0) {
      parts.push(`${dmzQuarantineCount} DMZ quarantine record(s)`, `${dmzAgentLogCount} DMZ agent log(s)`);
    }
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
