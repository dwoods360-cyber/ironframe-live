/**
 * Agent 14 (Irongate) — outbound webhook URL policy (SSRF / exfiltration guard).
 * All persisted notification URLs must pass this before save and again before POST.
 */

export class IrongateOutboundWebhookError extends Error {
  constructor(message: string) {
    super(`Irongate (Agent 14): ${message}`);
    this.name = "IrongateOutboundWebhookError";
  }
}

function extraAllowlistHosts(): string[] {
  return (process.env.IRONFRAME_WEBHOOK_HOST_ALLOWLIST ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

function hostMatchesAllowlist(hostname: string): boolean {
  const h = hostname.toLowerCase();
  for (const e of extraAllowlistHosts()) {
    if (!e) continue;
    if (h === e || h.endsWith(`.${e}`)) return true;
  }
  // Known SaaS webhook entrypoints (suffix-safe where applicable)
  const patterns: RegExp[] = [
    /^hooks\.slack\.com$/,
    /^hooks\.slack\.services$/,
    /\.webhook\.office\.com$/,
    /^outlook\.office\.com$/,
    /^outlook\.office365\.com$/,
    /\.logic\.azure\.com$/,
    /^discord\.com$/,
    /^discordapp\.com$/,
    /^events\.pagerduty\.com$/,
    /^hooks\.zapier\.com$/,
    /^api\.pushover\.net$/,
  ];
  return patterns.some((r) => r.test(h));
}

function isPrivateOrLoopbackIpv4(host: string): boolean {
  if (!/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) return false;
  const p = host.split(".").map((x) => Number(x));
  const [a, b] = p;
  if (a === undefined || b === undefined) return true;
  if (a === 10) return true;
  if (a === 127) return true;
  if (a === 0) return true;
  if (a === 169 && b === 254) return true;
  if (a === 192 && b === 168) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  return false;
}

function isBlockedHostname(host: string): boolean {
  const h = host.toLowerCase();
  if (h === "localhost" || h.endsWith(".local")) return true;
  if (h === "metadata.google.internal") return true;
  if (isPrivateOrLoopbackIpv4(h)) return true;
  if (h.startsWith("[") && h.endsWith("]")) {
    const inner = h.slice(1, -1).toLowerCase();
    if (inner === "::1" || inner.startsWith("fe80:") || inner.startsWith("fc") || inner.startsWith("fd")) {
      return true;
    }
  }
  return false;
}

/** Validates `rawUrl` for HTTPS outbound POST; throws `IrongateOutboundWebhookError` if rejected. */
export function assertWebhookUrlPassesIrongate(rawUrl: string): URL {
  const trimmed = rawUrl.trim();
  if (!trimmed) throw new IrongateOutboundWebhookError("Empty webhook URL.");
  let u: URL;
  try {
    u = new URL(trimmed);
  } catch {
    throw new IrongateOutboundWebhookError("URL is malformed.");
  }
  if (u.protocol !== "https:") {
    throw new IrongateOutboundWebhookError("Only https: outbound webhooks are permitted.");
  }
  if (u.username || u.password) {
    throw new IrongateOutboundWebhookError("Userinfo in webhook URLs is not permitted.");
  }
  const host = u.hostname;
  if (isBlockedHostname(host)) {
    throw new IrongateOutboundWebhookError("Hostname blocked (SSRF guard).");
  }
  if (!hostMatchesAllowlist(host)) {
    throw new IrongateOutboundWebhookError(
      "Hostname not on Irongate webhook allowlist. Extend with IRONFRAME_WEBHOOK_HOST_ALLOWLIST (comma-separated hostnames).",
    );
  }
  return u;
}
