import { execSync } from "node:child_process";

/**
 * Best-effort revision for repair packets (Vercel/GitHub env, else local `git rev-parse HEAD`).
 */
export function getGitRevisionForDiagnostics(): string | null {
  const fromEnv =
    process.env.VERCEL_GIT_COMMIT_SHA?.trim() ||
    process.env.GITHUB_SHA?.trim() ||
    process.env.COMMIT_SHA?.trim() ||
    process.env.RAILWAY_GIT_COMMIT_SHA?.trim();
  if (fromEnv) return fromEnv.slice(0, 64);

  try {
    const out = execSync("git rev-parse HEAD", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
      timeout: 2000,
    }).trim();
    return out.length > 0 ? out.slice(0, 64) : null;
  } catch {
    return null;
  }
}
