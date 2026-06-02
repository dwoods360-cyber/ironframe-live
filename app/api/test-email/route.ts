import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';
import { getPrimaryThreatNotificationRecipient } from '@/app/utils/threatNotificationRecipients';

export async function GET() {
  const recipient = getPrimaryThreatNotificationRecipient();
  if (!recipient) {
    return NextResponse.json(
      { success: false, error: 'Set THREAT_CONFIRMATION_RECIPIENTS before running the Gmail isolation test.' },
      { status: 400 },
    );
  }

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.GMAIL_EMAIL_USER,
      pass: process.env.GMAIL_EMAIL_PASS,
    },
  });

  const fromUser = process.env.GMAIL_EMAIL_USER?.trim();
  if (!fromUser) {
    return NextResponse.json({ success: false, error: 'GMAIL_EMAIL_USER is not configured.' }, { status: 400 });
  }

  try {
    const info = await transporter.sendMail({
      from: `"Ironframe Testing" <${fromUser}>`,
      to: recipient,
      subject: 'GRC Notification Matrix - GMAIL TEST',
      html: 'If you see this, the Gmail SMTP transport layer is operational.',
    });
    return NextResponse.json({ success: true, messageId: info.messageId, to: recipient });
  } catch (error) {
    console.error('[GMAIL ISOLATION ERROR]', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
