'use server';
import nodemailer from 'nodemailer';

export async function sendVendorEmail(vendorName: string, docName: string, expiryDate: string) {
  // 1. Security Check: Ensure credentials exist
  if (!process.env.ZOHO_USER || !process.env.ZOHO_PASS) {
    console.error("❌ Missing Zoho Credentials");
    return { success: false, error: "Server configuration error" };
  }

  // 2. Configure Transporter (Zoho SMTP)
  const transporter = nodemailer.createTransport({
    host: "smtp.zoho.com",
    port: 587,
    secure: false, 
    auth: { 
      user: process.env.ZOHO_USER, 
      pass: process.env.ZOHO_PASS 
    },
  });

  // 3. Draft the Email
  const mailOptions = {
    from: `"Ironframe Agent" <${process.env.ZOHO_USER}>`, 
    to: "compliance@blackwoodscoffee.com", // Directed to internal team for testing
    subject: `ACTION REQUIRED: Expired Artifact for ${vendorName}`,
    text: `
      Vendor Risk Alert:
      
      The document "${docName}" for vendor "${vendorName}" has expired or is invalid.
      Expiration Date: ${expiryDate || 'Not on file'}
      
      Please request an updated copy immediately.
      
      - Ironframe GRC Agent
    `
  };

  // 4. Send and Log
  try {
    await transporter.sendMail(mailOptions);
    return { success: true };
  } catch (error) {
    console.error("❌ Email Failed:", error);
    return { success: false, error: "Failed to send email" };
  }
}
