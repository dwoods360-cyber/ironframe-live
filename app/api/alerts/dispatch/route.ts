import { NextResponse } from 'next/server';
import { sendRiskNotification } from '@/app/actions/email';

/** POST /api/alerts/dispatch — Stakeholder notification routing [cite: 2025-12-18] */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = typeof body?.email === 'string' ? body.email.trim() : '';
    const threatId = typeof body?.threatId === 'string' ? body.threatId.trim() : '';
    const severity = body?.severity === 'HIGH' || body?.severity === 'CRITICAL' ? body.severity : 'HIGH';
    const agentSource = typeof body?.agentSource === 'string' ? body.agentSource : 'Coreintel';

    if (!email) {
      return NextResponse.json({ ok: false, message: 'Missing email' }, { status: 400 });
    }
    if (!threatId) {
      return NextResponse.json({ ok: false, message: 'Missing threatId' }, { status: 400 });
    }

    const subject = `[${severity}] Threat Alert: ${threatId}`;
    const html = `
      <p><strong>Stakeholder Alert</strong> [cite: 2025-12-18]</p>
      <p><strong>Threat ID:</strong> ${threatId}</p>
      <p><strong>Severity:</strong> ${severity}</p>
      <p><strong>Source:</strong> ${agentSource}</p>
      <p>Routing via Ironcast agent. Please review in the GRC dashboard.</p>
      <p>— Ironframe GRC</p>
    `;

    const result = await sendRiskNotification(email, subject, html);

    if (result.success) {
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json(
      { ok: false, message: result.error ?? 'Send failed' },
      { status: 500 }
    );
  } catch (error) {
    console.error('[alerts/dispatch]', error);
    return NextResponse.json(
      { ok: false, message: error instanceof Error ? error.message : 'Dispatch failed' },
      { status: 500 }
    );
  }
}
