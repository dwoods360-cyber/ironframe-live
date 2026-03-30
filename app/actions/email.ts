'use server';

import nodemailer from 'nodemailer';

/** Testing override: route all outbound email to this inbox. */
const TEST_EMAIL_RECIPIENT = 'dwoods360@gmail.com';

/** Gmail SMTP transporter. From address must match auth user (GMAIL_EMAIL_USER). */
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.GMAIL_EMAIL_USER,
    pass: process.env.GMAIL_EMAIL_PASS,
  },
});

/**
 * Defensive sanitizer for email HTML:
 * - replaces unsupported modern color functions (oklab/oklch/color-mix)
 * - replaces CSS var-based hsl/rgb color functions often used by app themes
 * This keeps email rendering/parser isolated from app-wide Tailwind color functions.
 */
function sanitizeEmailHtmlColors(html: string): string {
  let safe = html;
  // Replace unsupported CSS color function families with conservative hex fallbacks.
  safe = safe.replace(/oklab\([^)]*\)/gi, '#0f172a');
  safe = safe.replace(/oklch\([^)]*\)/gi, '#0f172a');
  safe = safe.replace(/color-mix\([^)]*\)/gi, '#0f172a');
  // Replace var()-driven hsl/rgb forms (e.g., hsl(var(--background)) or rgb(var(--...))).
  safe = safe.replace(/\bhsla?\(\s*var\([^)]*\)\s*(?:\/\s*[^)]*)?\)/gi, '#0f172a');
  safe = safe.replace(/\brgba?\(\s*var\([^)]*\)\s*(?:\/\s*[^)]*)?\)/gi, '#0f172a');
  return safe;
}

/**
 * Send an email via Gmail. From address matches Gmail account (GMAIL_EMAIL_USER).
 * Content is sent as HTML so the security brief renders correctly.
 * Optional cc (string or array) for investigation reports.
 */
export async function sendRiskNotification(
  recipientEmail: string,
  subject: string,
  htmlBody: string,
  options?: { cc?: string | string[] },
): Promise<{ success: true; messageId?: string } | { success: false; error?: string }> {
  if (!process.env.GMAIL_EMAIL_USER) {
    console.warn('[EMAIL SKIPPED] No Gmail credentials found.');
    return { success: false, error: 'Missing credentials' };
  }

  try {
    const to = TEST_EMAIL_RECIPIENT;
    const mailOptions: Parameters<typeof transporter.sendMail>[0] = {
      from: ('"Ironframe" <' + (process.env.GMAIL_EMAIL_USER ?? '').trim() + '>').trim(),
      to,
      subject: subject.trim(),
      html: sanitizeEmailHtmlColors(htmlBody),
    };
    if (options?.cc) {
      // During testing, keep CC routed to the same controlled inbox.
      mailOptions.cc = [TEST_EMAIL_RECIPIENT];
    }
    const info = await transporter.sendMail(mailOptions);
    console.log('[EMAIL SUCCESS] Sent:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[EMAIL ERROR]', error);
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}

/**
 * Ironcast escalation: delivers to the configured operator inbox (Phone Home, human-in-the-loop).
 * Unlike `sendRiskNotification`, does not force the test-only recipient.
 */
export async function sendEscalationEmail(
  recipientEmail: string,
  subject: string,
  htmlBody: string,
): Promise<{ success: true; messageId?: string } | { success: false; error?: string }> {
  if (!process.env.GMAIL_EMAIL_USER || !process.env.GMAIL_EMAIL_PASS) {
    console.warn('[EMAIL SKIPPED] No Gmail credentials for escalation.');
    return { success: false, error: 'Missing credentials' };
  }
  const to = recipientEmail.trim();
  if (!to) {
    return { success: false, error: 'No recipient' };
  }
  try {
    const mailOptions: Parameters<typeof transporter.sendMail>[0] = {
      from: ('"Ironframe Ironcast" <' + (process.env.GMAIL_EMAIL_USER ?? '').trim() + '>').trim(),
      to,
      subject: subject.trim(),
      html: sanitizeEmailHtmlColors(htmlBody),
    };
    const info = await transporter.sendMail(mailOptions);
    console.log('[IRONCAST] Escalation email sent:', info.messageId, 'to', to);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('[IRONCAST EMAIL ERROR]', error);
    const message = error instanceof Error ? error.message : String(error);
    return { success: false, error: message };
  }
}

/** Comma-separated list of emails to receive threat confirmation notifications. */
const THREAT_CONFIRMATION_RECIPIENTS_KEY = 'THREAT_CONFIRMATION_RECIPIENTS';

/** Enterprise GRC distribution matrix (env overrides). Set in .env.local for your org. */
const GRC_DISTRIBUTION = {
  EXECUTIVE: process.env.GRC_EMAIL_EXECUTIVE?.trim() || TEST_EMAIL_RECIPIENT,
  OPERATIONAL: process.env.GRC_EMAIL_OPERATIONAL?.trim() || TEST_EMAIL_RECIPIENT,
  COMPLIANCE: process.env.GRC_EMAIL_COMPLIANCE?.trim() || TEST_EMAIL_RECIPIENT,
};

export type RouteRiskThreat = {
  id: string;
  title: string;
  state: string;
  financialRisk_cents: number;
};

/**
 * Route a risk notification by liability and state (Enterprise GRC standards).
 * High stakes (>= $5M) → EXECUTIVE; RESOLVED → COMPLIANCE; else → OPERATIONAL.
 */
export async function routeRiskNotification(
  threat: RouteRiskThreat,
): Promise<{ success: true; mocked?: boolean } | { success: false; error: string }> {
  if (!process.env.GMAIL_EMAIL_USER || !process.env.GMAIL_EMAIL_PASS) {
    console.warn('[EMAIL SKIPPED] Missing Gmail SMTP credentials.');
    return { success: true, mocked: true };
  }

  let recipient = GRC_DISTRIBUTION.OPERATIONAL;
  if (threat.financialRisk_cents >= 500_000_000) recipient = GRC_DISTRIBUTION.EXECUTIVE;
  if (threat.state === 'RESOLVED') recipient = GRC_DISTRIBUTION.COMPLIANCE;

  const liabilityMillions = (threat.financialRisk_cents / 100_000_000).toFixed(1);
  const subject = `[GRC ALERT] ${threat.state}: ${threat.title} ($${liabilityMillions}M)`;
  const html = `<h3>Risk Update</h3><p>ID: ${threat.id}</p><p>Title: ${threat.title}</p><p>Status: ${threat.state}</p><p>Financial Impact: $${liabilityMillions}M</p>`;

  const result = await sendRiskNotification(recipient, subject, html);
  if (result.success) {
    console.log('[EMAIL SUCCESS] GRC notification routed to', recipient);
    return result;
  }
  return { success: false, error: result.error ?? 'Send failed' };
}

function getThreatConfirmationRecipients(): string[] {
  const raw = process.env[THREAT_CONFIRMATION_RECIPIENTS_KEY]?.trim();
  if (raw) return raw.split(',').map((e) => e.trim()).filter(Boolean);
  // Fallback for testing when env not set
  return [TEST_EMAIL_RECIPIENT];
}

export async function sendThreatConfirmationEmail(
  params: { threatId: string; threatTitle: string; operatorId: string; recipientEmails?: string[] },
): Promise<{ success: true } | { success: false; error: string }> {
  const recipients = params.recipientEmails?.length
    ? params.recipientEmails
    : getThreatConfirmationRecipients();

  if (recipients.length === 0) {
    console.warn('[EMAIL SKIPPED] No recipients. Set THREAT_CONFIRMATION_RECIPIENTS in .env.local.');
    return { success: false, error: 'No recipients configured' };
  }

  if (!process.env.GMAIL_EMAIL_USER || !process.env.GMAIL_EMAIL_PASS) {
    console.warn('[EMAIL SKIPPED] Missing Gmail SMTP credentials.');
    return { success: false, error: 'Missing Gmail credentials' };
  }

  const toEmail = recipients[0];
  const subject = `Threat Confirmed: ${params.threatTitle}`;
  const html = `
    <p>A threat has been confirmed and is awaiting resolution.</p>
    <p><strong>Threat ID:</strong> ${params.threatId}</p>
    <p><strong>Title:</strong> ${params.threatTitle}</p>
    <p><strong>Confirmed by:</strong> ${params.operatorId}</p>
    <p>Please review in the GRC dashboard and proceed with remediation.</p>
    <p>— Ironframe GRC Agent</p>
  `;

  const result = await sendRiskNotification(toEmail, subject, html);
  return result.success ? { success: true } : { success: false, error: result.error !== undefined ? result.error : 'Send failed' };
}

export async function sendVendorEmail(vendorName: string, docName: string, expiryDate: string) {
  if (!process.env.GMAIL_EMAIL_USER || !process.env.GMAIL_EMAIL_PASS) {
    console.error('[EMAIL SKIPPED] Missing Gmail SMTP credentials.');
    return { success: false, error: 'Missing Gmail credentials' };
  }

  const subject = `ACTION REQUIRED: Expired Artifact for ${vendorName}`;
  const html = `
    <p>Vendor Risk Alert:</p>
    <p>The document "<strong>${docName}</strong>" for vendor "<strong>${vendorName}</strong>" has expired or is invalid.</p>
    <p>Expiration Date: ${expiryDate || 'Not on file'}</p>
    <p>Please request an updated copy immediately.</p>
    <p>— Ironframe GRC Agent</p>
  `;

  const result = await sendRiskNotification(
    'compliance@blackwoodscoffee.com',
    subject,
    html,
  );
  if (result.success) {
    console.log('[EMAIL SUCCESS] Vendor alert sent');
  }
  return result;
}

/** CC for investigation report emails (drawer "Email Stakeholders"). */
const INVESTIGATION_EMAIL_CC = 'dwoods360@gmail.com';

/**
 * Send the CoreIntel AI investigation report to stakeholders.
 * Uses Ironframe GRC header and pre-wrapped report body. Optionally appends Analyst Notes after the AI report.
 * CC: dwoods360@gmail.com
 */
export async function sendInvestigationEmail(
  threatId: string,
  threatTitle: string,
  aiReport: string,
  analystNotes?: string,
): Promise<{ success: true } | { success: false; error: string }> {
  const recipients = getThreatConfirmationRecipients();
  if (recipients.length === 0) {
    return { success: false, error: 'No recipients configured' };
  }
  if (!process.env.GMAIL_EMAIL_USER || !process.env.GMAIL_EMAIL_PASS) {
    return { success: false, error: 'Missing Gmail credentials' };
  }

  const subject = `[GRC] Investigation Report: ${threatTitle}`;
  const escape = (s: string) =>
    s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const escapedReport = escape(aiReport);
  const notesSection =
    analystNotes && analystNotes.trim()
      ? `
  <div style="page-break-before: always; margin-top: 24px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
    <h3 style="color: #0f172a; margin-top: 0;">Analyst Notes</h3>
    <pre style="white-space: pre-wrap; font-family: sans-serif; font-size: 14px; background: #f8fafc; padding: 15px; border-radius: 6px; border: 1px solid #e2e8f0; color: #334155;">${escape(analystNotes)}</pre>
  </div>`
      : '';
  const html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
  <div style="background-color: #1e3a8a; color: #ffffff; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h2 style="margin: 0; font-size: 20px; letter-spacing: 1px;">IRONFRAME GRC</h2>
    <p style="margin: 6px 0 0; font-size: 12px; opacity: 0.9;">Investigation Report</p>
  </div>
  <div style="padding: 20px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 8px 8px; background: #fff;">
    <h3 style="color: #0f172a; margin-top: 0;">${escape(threatTitle)}</h3>
    <p style="color: #64748b; font-size: 13px;">Threat ID: ${threatId}</p>
    <pre style="white-space: pre-wrap; font-family: sans-serif; font-size: 14px; background: #f8fafc; padding: 15px; border-radius: 6px; border: 1px solid #e2e8f0; color: #334155;">${escapedReport}</pre>
    ${notesSection}
    <p style="margin-top: 16px; font-size: 12px; color: #94a3b8;">— Ironframe CoreIntel Agent</p>
  </div>
</div>`;

  const result = await sendRiskNotification(recipients[0], subject, html, {
    cc: INVESTIGATION_EMAIL_CC,
  });
  return result.success ? { success: true } : { success: false, error: result.error ?? 'Send failed' };
}
