import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const env = Object.fromEntries(
  readFileSync(resolve(root, ".env.local"), "utf8")
    .split(/\r?\n/)
    .filter((l) => l && !l.startsWith("#") && l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      let v = l.slice(i + 1).trim();
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
        v = v.slice(1, -1);
      }
      return [l.slice(0, i), v];
    }),
);

const url = env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
const appUrl = (env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").trim().replace(/\/+$/, "");
const redirectTo = `${appUrl}/api/auth/callback?next=/reset-password`;
const email = process.argv[2] || "dwoods360@gmail.com";

if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local");
  process.exit(1);
}

const res = await fetch(`${url}/auth/v1/recover`, {
  method: "POST",
  headers: { apikey: key, "Content-Type": "application/json" },
  body: JSON.stringify({ email, redirect_to: redirectTo }),
});

const text = await res.text();
console.log("status:", res.status);
console.log("email:", email);
console.log("redirectTo:", redirectTo);
if (text) console.log("body:", text.slice(0, 500));
process.exit(res.ok ? 0 : 1);
