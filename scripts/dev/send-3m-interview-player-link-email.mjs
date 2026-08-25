/**
 * Email link to hosted mobile player after deployment is live.
 */
import { existsSync } from "node:fs";
import { resolve, join } from "node:path";
import { execSync } from "node:child_process";
import { config } from "dotenv";
import { Resend } from "resend";

config({ path: resolve(process.cwd(), ".env.local"), override: true });

const PUBLIC_PLAYER = join(process.cwd(), "public/interview-prep/3m/player.html");
const TO = "dereck@ironframegrc.com";
const PLAYER_URL = "https://ironframegrc.com/interview-prep/3m/player.html";

async function waitForPlayerLive(maxWaitMs = 900000) {
  const started = Date.now();
  while (Date.now() - started < maxWaitMs) {
    try {
      const res = await fetch(PLAYER_URL, { cache: "no-store" });
      const html = await res.text();
      if (res.ok && html.includes("btnPlay") && !html.includes("Sign in to your security console")) {
        return { ok: true, status: res.status };
      }
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 15000));
  }
  return { ok: false, error: "Player URL not live within wait window" };
}

if (!existsSync(PUBLIC_PLAYER)) {
  execSync("node scripts/dev/sync-3m-interview-public.mjs", { stdio: "inherit" });
}

const apiKey = process.env.RESEND_API_KEY?.trim();
const fromEmail = process.env.SALES_FROM_EMAIL?.trim() || "dereck@ironframegrc.com";
const fromName = process.env.SALES_FROM_NAME?.trim() || "Dereck Woods";

if (!apiKey?.startsWith("re_")) {
  console.error(JSON.stringify({ ok: false, error: "RESEND_API_KEY missing" }));
  process.exit(1);
}

console.log("Waiting for production player to go live…");
const live = await waitForPlayerLive();
if (!live.ok) {
  console.log(JSON.stringify({ ok: false, ...live }, null, 2));
  process.exit(1);
}

const resend = new Resend(apiKey);
const text = [
  "3M Interview Prep — LIVE mobile player",
  "",
  "Open on your phone (Safari or Chrome):",
  PLAYER_URL,
  "",
  "CONTROLS (sticky bar at bottom):",
  "▶ Play/Pause · −5s · +10s · ◀ Prev · Next ▶",
  "Chapter dropdown at top · scrollable answer text",
  "",
  "Tip: Share → Add to Home Screen for one-tap access.",
  "",
  "Deployment verified live.",
  "",
  "— Ironframe ops",
].join("\n");

const { data, error } = await resend.emails.send({
  from: `${fromName} <${fromEmail}>`,
  to: [TO],
  subject: "3M interview player LIVE — open on your phone",
  text,
});

if (error) {
  console.log(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
}

console.log(
  JSON.stringify({ ok: true, to: TO, playerUrl: PLAYER_URL, live: true, emailId: data?.id }, null, 2)
);
