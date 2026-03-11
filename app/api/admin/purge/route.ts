import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

/**
 * Master Purge API: wipes from the root of the hierarchy so no ghost data remains.
 * Tenant.deleteMany({}) triggers ON DELETE CASCADE for companies, departments, policies, active_risks, vendors, agent_logs.
 * Then explicitly wipes threat_events, work_notes, audit_logs (not under Tenant FK).
 */
export async function POST() {
  try {
    const tenantResult = await prisma.tenant.deleteMany({});
    const auditLogResult = await prisma.auditLog.deleteMany({});
    const workNoteResult = await prisma.workNote.deleteMany({});
    const threatEventResult = await prisma.threatEvent.deleteMany({});

    return NextResponse.json({
      ok: true,
      message: 'Purge complete (tenant-first cascade).',
      counts: {
        tenants: tenantResult.count,
        audit_logs: auditLogResult.count,
        work_notes: workNoteResult.count,
        threat_events: threatEventResult.count,
      },
    });
  } catch (e) {
    console.error('[admin/purge]', e);
    return NextResponse.json(
      { ok: false, error: e instanceof Error ? e.message : 'Purge failed' },
      { status: 500 }
    );
  }
}
