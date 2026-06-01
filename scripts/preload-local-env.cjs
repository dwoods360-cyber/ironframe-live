/**
 * Next.js keeps existing process.env values (e.g. CI DATABASE_URL from a prior shell).
 * Reload workspace env files with override so local `npm run dev` uses Supabase from `.env`.
 */
const { resolve } = require("node:path");
const { config } = require("dotenv");

if (process.env.GITHUB_ACTIONS) return;

const root = resolve(__dirname, "..");
config({ path: resolve(root, ".env"), override: true });
config({ path: resolve(root, ".env.local"), override: true });
