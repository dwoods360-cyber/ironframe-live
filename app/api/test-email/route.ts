import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function GET() {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,
    auth: {
      user: process.env.GMAIL_EMAIL_USER,
      pass: process.env.GMAIL_EMAIL_PASS,
    },
  });

  try {
    const info = await transporter.sendMail({
      from: '"Ironframe Testing" <dwoods360@gmail.com>',
      to: 'dwoods360@gmail.com',
      subject: 'GRC Notification Matrix - GMAIL TEST',
      html: 'If you see this, the Gmail SMTP transport layer is 100% operational.',
    });
    return NextResponse.json({ success: true, messageId: info.messageId });
  } catch (error) {
    console.error('[GMAIL ISOLATION ERROR]', error);
    return NextResponse.json({ success: false, error: String(error) }, { status: 500 });
  }
}
