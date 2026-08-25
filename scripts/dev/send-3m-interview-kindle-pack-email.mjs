/**
 * Email fixed Kindle EPUB + MP3 zip (phone-native) to dereck@ironframegrc.com
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { execSync } from "node:child_process";
import { config } from "dotenv";
import { Resend } from "resend";

config({ path: resolve(process.cwd(), ".env.local"), override: true });

const PREP = resolve(process.cwd(), "docs/interview-prep/3m");
const EPUB = join(PREP, "3m-interview-prep.epub");
const MP3_ZIP = join(PREP, "3m-interview-audio-phone.zip");
const TO = "dereck@ironframegrc.com";

if (!existsSync(EPUB) || !existsSync(MP3_ZIP)) {
  execSync("node scripts/dev/build-3m-interview-kindle-pack.mjs", { stdio: "inherit" });
}

const apiKey = process.env.RESEND_API_KEY?.trim();
const fromEmail = process.env.SALES_FROM_EMAIL?.trim() || "dereck@ironframegrc.com";
const fromName = process.env.SALES_FROM_NAME?.trim() || "Dereck Woods";

if (!apiKey?.startsWith("re_")) {
  console.error(JSON.stringify({ ok: false, error: "RESEND_API_KEY missing" }));
  process.exit(1);
}

const epub = readFileSync(EPUB);
const zip = readFileSync(MP3_ZIP);
const epubMb = (epub.length / (1024 * 1024)).toFixed(2);
const zipMb = (zip.length / (1024 * 1024)).toFixed(2);

const resend = new Resend(apiKey);
const text = [
  "3M Interview Prep — FIXED (Kindle read + phone audio)",
  "",
  "Previous EPUB/M4B had format errors. This email replaces them.",
  "",
  "ATTACHMENT 1: 3m-interview-prep.epub",
  "  Kindle: forward to Send-to-Kindle address, OR Kindle app → Import.",
  "  Apple Books: Share → Books.",
  "",
  "ATTACHMENT 2: 3m-interview-audio-phone.zip",
  "  1. Save zip to phone",
  "  2. Tap zip → Extract (or use Files app)",
  "  3. Tap 01-intro.mp3, 02-q01.mp3, etc.",
  "  4. Plays in native Music/Files — no browser, no Kindle audio needed",
  "",
  "17 tracks in order. Use skip track for prev/next question.",
  "",
  "— Ironframe ops",
].join("\n");

const { data, error } = await resend.emails.send({
  from: `${fromName} <${fromEmail}>`,
  to: [TO],
  subject: `3M interview prep FIXED — Kindle EPUB + phone MP3 zip`,
  text,
  attachments: [
    { filename: "3m-interview-prep.epub", content: epub },
    { filename: "3m-interview-audio-phone.zip", content: zip },
  ],
});

if (error) {
  console.log(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
}

console.log(JSON.stringify({ ok: true, to: TO, epubMb, zipMb, emailId: data?.id }, null, 2));
