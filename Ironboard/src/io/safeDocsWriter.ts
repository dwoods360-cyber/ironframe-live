import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  validateOutboundContent,
  type ContentFirewallAgentRole,
} from "../validation/contentFirewall.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "../../..");
const DOCS_ROOT = path.join(REPO_ROOT, "docs");

const ALLOWED_HUB_PREFIXES = ["product/", "support/", "technical/", "training/"] as const;

export class ContentFirewallRejectedError extends Error {
  constructor(
    readonly violations: string[],
    readonly targetPath: string,
  ) {
    super(
      `[ContentFirewall] Blocked write to ${targetPath}: ${violations.join(" | ")}`,
    );
    this.name = "ContentFirewallRejectedError";
  }
}

function resolveDocsPath(relativePath: string): string {
  const normalized = relativePath.replace(/\\/g, "/").replace(/^\/+/, "");
  if (normalized.includes("..")) {
    throw new Error(`[ContentFirewall] Path traversal rejected: ${relativePath}`);
  }
  const isHubHtml =
    ALLOWED_HUB_PREFIXES.some((p) => normalized.startsWith(p)) && normalized.endsWith(".html");
  const isMarkdown = normalized.endsWith(".md") && ALLOWED_HUB_PREFIXES.some((p) => normalized.startsWith(p));
  if (!isHubHtml && !isMarkdown) {
    throw new Error(`[ContentFirewall] Unsupported docs extension: ${relativePath}`);
  }
  const absolute = path.resolve(DOCS_ROOT, normalized);
  if (!absolute.startsWith(DOCS_ROOT + path.sep) && absolute !== DOCS_ROOT) {
    throw new Error(`[ContentFirewall] Escape from docs root rejected: ${relativePath}`);
  }
  return absolute;
}

/**
 * Outbound content firewall — Trainer / Writer streams must pass validation before docs/hub writes.
 */
export function writeHubAssetSafely(
  relativePath: string,
  content: string,
  agentRole: ContentFirewallAgentRole,
): void {
  const validation = validateOutboundContent(content, { agentRole, requireSourceReferences: true });
  if (!validation.ok) {
    throw new ContentFirewallRejectedError(validation.violations, relativePath);
  }

  const absolute = resolveDocsPath(relativePath);
  fs.mkdirSync(path.dirname(absolute), { recursive: true });
  fs.writeFileSync(absolute, content, "utf8");
}
