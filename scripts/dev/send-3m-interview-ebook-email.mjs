/**
 * Email mobile interview ebook (single HTML) to dereck@ironframegrc.com
 * Usage: node scripts/dev/send-3m-interview-ebook-email.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { execSync } from "node:child_process";
import { config } from "dotenv";
import { Resend } from "resend";

config({ path: resolve(process.cwd(), ".env.local"), override: true });

const PREP = resolve(process.cwd(), "docs/interview-prep/3m");
const EBOOK = join(PREP, "3m-interview-ebook-mobile.html");
const TO = "dereck@ironframegrc.com";

if (!existsSync(EBOOK)) {
  execSync("node scripts/dev/build-3m-interview-ebook.mjs", { stdio: "inherit" });
}

const apiKey = process.env.RESEND_API_KEY?.trim();
const fromEmail = process.env.SALES_FROM_EMAIL?.trim() || "dereck@ironframegrc.com";
const fromName = process.env.SALES_FROM_NAME?.trim() || "Dereck Woods";

if (!apiKey?.startsWith("re_")) {
  console.error(JSON.stringify({ ok: false, error: "RESEND_API_KEY missing" }));
  process.exit(1);
}

const body = readFileSync(EBOOK);
const sizeMb = (body.length / (1024 * 1024)).toFixed(2);

const resend = new Resend(apiKey);
const text = [
  "3M Interview Prep — MOBILE EBOOK (single file)",
  "",
  "Attachment: 3m-interview-ebook-mobile.html (~" + sizeMb + " MB)",
  "",
  "PHONE SETUP:",
  "1. Open the attachment in Safari (iPhone) or Chrome (Android).",
  "2. Tap Share → Save to Files (or Download).",
  "3. Open the saved .html file from Files/Downloads.",
  "4. Optional: Share → Add to Home Screen for app-like access.",
  "",
  "CONTROLS (sticky bar at bottom):",
  "▶ Play/Pause · −5s · +10s · ◀ Prev · Next ▶",
  "",
  "All 17 audio chapters are embedded — works offline, no server.",
  "",
  "— Ironframe ops",
].join("\n");

const { data, error } = await resend.emails.send({
  from: `${fromName} <${fromEmail}>`,
  to: [TO],
  subject: `3M interview MOBILE ebook — offline player (${sizeMb} MB)`,
  text,
  attachments: [{ filename: "3m-interview-ebook-mobile.html", content: body }],
});

if (error) {
  console.log(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, to: TO, sizeMb, emailId: data?.id }, null, 2));
