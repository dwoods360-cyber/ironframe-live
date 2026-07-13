/**
 * Free port 3000 before `next dev` so a stale `next start` (or second dev) cannot
 * serve production HTML while dev assets 400 on localhost.
 */
const { execSync } = require("node:child_process");

const port = String(process.env.PORT || "3000").trim();

function listListeningPids(targetPort) {
  try {
    const out = execSync(`netstat -ano | findstr ":${targetPort}" | findstr LISTENING`, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    });
    const pids = new Set();
    for (const line of out.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const pid = trimmed.split(/\s+/).pop();
      if (pid && /^\d+$/.test(pid)) pids.add(pid);
    }
    return [...pids];
  } catch {
    return [];
  }
}

for (const pid of listListeningPids(port)) {
  try {
    execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
    console.log(`[dev] Freed :${port} (stopped PID ${pid})`);
  } catch {
    console.warn(`[dev] Could not stop PID ${pid} on :${port}`);
  }
}
