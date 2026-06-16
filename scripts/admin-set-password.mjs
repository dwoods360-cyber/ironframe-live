/**
 * Set a user's password via Supabase Admin API (no email — bypasses rate limits).
 *
 * Usage:
 *   1. Add SUPABASE_SERVICE_ROLE_KEY to .env.local (Dashboard → Project Settings → API)
 *   2. node scripts/admin-set-password.mjs "YourNewPassword123!"
 *
 * Optional second arg: user id (defaults to dwoods360@gmail.com lookup).
 */
import { createClient } from "@supabase/supabase-js";
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
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY?.trim();
const password = process.argv[2];
const userIdArg = process.argv[3];

if (!url || !serviceKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}
if (!password || password.length < 8) {
  console.error("Usage: node scripts/admin-set-password.mjs \"YourNewPassword123!\" [userId]");
  process.exit(1);
}

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

let userId = userIdArg;
if (!userId) {
  const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 50 });
  if (error) {
    console.error("listUsers failed:", error.message);
    process.exit(1);
  }
  const user = data.users.find((u) => u.email?.toLowerCase() === "dwoods360@gmail.com");
  if (!user) {
    console.error("User dwoods360@gmail.com not found");
    process.exit(1);
  }
  userId = user.id;
}

const { data, error } = await admin.auth.admin.updateUserById(userId, { password });
if (error) {
  console.error("updateUserById failed:", error.message);
  process.exit(1);
}

console.log("Password updated for:", data.user.email);
console.log("Sign in at http://localhost:3000/login");
