/**
 * Email 3M interview prep MP3 pack to dereck@ironframegrc.com
 * Usage: node scripts/dev/send-3m-interview-audio-email.mjs
 */
import { readFileSync, existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { execSync } from "node:child_process";
import { config } from "dotenv";
import { Resend } from "resend";

config({ path: resolve(process.cwd(), ".env.local"), override: true });

const PREP_DIR = resolve(process.cwd(), "docs/interview-prep/3m");
const AUDIO_DIR = join(PREP_DIR, "audio");
const ZIP_PATH = join(PREP_DIR, "3m-interview-audio-pack.zip");
const TO = "dereck@ironframegrc.com";

const apiKey = process.env.RESEND_API_KEY?.trim();
const fromEmail =
  process.env.SALES_FROM_EMAIL?.trim() || "dereck@ironframegrc.com";
const fromName = process.env.SALES_FROM_NAME?.trim() || "Dereck Woods";

if (!apiKey || !apiKey.startsWith("re_")) {
  console.error(JSON.stringify({ ok: false, error: "RESEND_API_KEY missing or invalid" }));
  process.exit(1);
}

const mp3s = existsSync(AUDIO_DIR)
  ? execSync(`powershell -NoProfile -Command "(Get-ChildItem '${AUDIO_DIR.replace(/'/g, "''")}' -Filter *.mp3).Count"`, {
      encoding: "utf8",
    }).trim()
  : "0";

if (Number(mp3s) < 1) {
  console.error(JSON.stringify({ ok: false, error: "No MP3 files — run npm run interview:3m:audio first" }));
  process.exit(1);
}

// Build zip (audio + player + README)
execSync(
  `powershell -NoProfile -Command "Compress-Archive -Path '${join(AUDIO_DIR, '*').replace(/'/g, "''")}','${join(PREP_DIR, 'player.html').replace(/'/g, "''")}','${join(PREP_DIR, 'README.md').replace(/'/g, "''")}' -DestinationPath '${ZIP_PATH.replace(/'/g, "''")}' -Force"`,
  { stdio: "inherit" },
);

const zipBuffer = readFileSync(ZIP_PATH);
const zipMb = (zipBuffer.length / (1024 * 1024)).toFixed(2);

const resend = new Resend(apiKey);
const stamp = new Date().toLocaleString("en-US", { timeZone: "America/Chicago" });

const text = [
  "3M Senior PM — IT Infrastructure interview audio prep",
  "",
  `Generated: ${stamp} Central`,
  "",
  "Attached: 3m-interview-audio-pack.zip",
  `- ${mp3s} MP3 chapters (intro + Q1–Q15 + lifecycle)`,
  "- player.html (open after unzip — use npx serve or any local server)",
  "- README.md",
  "",
  "Player controls: Play/Pause, -5s, +10s, Prev/Next question, Download MP3.",
  "",
  "On phone: unzip, copy MP3s to Files/Music, or open player.html on desktop.",
  "",
  "— Ironframe ops (not Path B outreach)",
].join("\n");

const { data, error } = await resend.emails.send({
  from: `${fromName} <${fromEmail}>`,
  to: [TO],
  subject: `3M interview audio prep — ${mp3s} chapters (${zipMb} MB)`,
  text,
  attachments: [
    {
      filename: "3m-interview-audio-pack.zip",
      content: zipBuffer,
    },
  ],
});

if (error) {
  console.log(JSON.stringify({ ok: false, error: error.message, to: TO }, null, 2));
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      ok: true,
      to: TO,
      from: `${fromName} <${fromEmail}>`,
      chapters: Number(mp3s),
      zipMb,
      emailId: data?.id ?? null,
    },
    null,
    2,
  ),
);
