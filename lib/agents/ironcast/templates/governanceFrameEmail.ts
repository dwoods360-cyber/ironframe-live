/**
 * Alabaster Editorial Memo — inline HTML compiler for Governance Frame newsletters.
 * Pure presentation layer: no DB, scripts, or runtime application hooks.
 */

import {
  briefingBodyMarkdown,
  stripFrontmatter,
} from "@/app/lib/governanceFrame/briefingLoader";
import {
  parseBriefingSections,
  parseImpactMetrics,
  type BriefingSection,
  type ImpactMetricRow,
} from "@/app/lib/governanceFrame/parseBriefingSections";
import { parseBriefingCitations } from "@/app/lib/governanceFrame/parseBriefingCitations";
import { parseCentBigIntSafe } from "@/app/lib/governanceFrame/parseCentBigInt";
import { stripDangerousMarkdown } from "@/app/lib/governanceFrame/sanitizeMarkdown";

export const GOVERNANCE_FRAME_FEED_ORIGIN =
  process.env.GOVERNANCE_FRAME_PUBLIC_FEED_ORIGIN?.trim().replace(/\/$/, "") ||
  "https://brief.ironframegrc.com";

/** Static logo asset — absolute URL for email clients; no runtime DB coupling. */
export const IRONFRAME_LOGO_PUBLIC_URL = `${GOVERNANCE_FRAME_FEED_ORIGIN}/assets/Ironframe_logo.svg`;

export type GovernanceFrameEmailInput = {
  slug: string;
  title: string;
  publishedAt: string;
  markdown: string;
  author?: string | null;
  classification?: string | null;
};

export type GovernanceFrameEmailCompiled = {
  slug: string;
  subject: string;
  html: string;
  feedUrl: string;
  plainTextPreview: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function inlineBold(text: string): string {
  return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

/** USD display from whole-cent BigInt string — integer math only. */
export function formatUsdLocalizedFromCents(cents: string, locale = "en-US"): string {
  const normalized = parseCentBigIntSafe(cents);
  const value = BigInt(normalized);
  const negative = value < 0n;
  const abs = negative ? -value : value;
  const dollars = abs / 100n;
  const remainder = abs % 100n;
  const minor = remainder.toString().padStart(2, "0");
  const thousandsSep = locale === "en-US" ? "," : ",";
  const dollarsFormatted = dollars.toString().replace(/\B(?=(\d{3})+(?!\d))/g, thousandsSep);
  return `${negative ? "-" : ""}$${dollarsFormatted}.${minor}`;
}

function renderProseParagraphs(body: string): string {
  const blocks: string[] = [];
  let paragraph: string[] = [];

  const flush = () => {
    if (!paragraph.length) return;
    blocks.push(
      `<p style="margin:0 0 16px;font-family:system-ui,Arial,sans-serif;font-size:15px;line-height:1.65;color:#334155;">${inlineBold(paragraph.join(" "))}</p>`,
    );
    paragraph = [];
  };

  for (const raw of body.split(/\r?\n/)) {
    const trimmed = raw.trim();
    if (!trimmed) {
      flush();
      continue;
    }
    if (trimmed.startsWith("> ")) {
      flush();
      blocks.push(
        `<blockquote style="margin:0 0 20px;padding:12px 16px;border-left:3px solid #cbd5e1;background:#f8fafc;font-family:system-ui,Arial,sans-serif;font-size:14px;line-height:1.6;color:#475569;font-style:italic;">${inlineBold(trimmed.slice(2))}</blockquote>`,
      );
      continue;
    }
    if (trimmed.startsWith("- ")) {
      flush();
      blocks.push(
        `<p style="margin:0 0 8px 18px;font-family:system-ui,Arial,sans-serif;font-size:14px;line-height:1.6;color:#334155;">• ${inlineBold(trimmed.slice(2))}</p>`,
      );
      continue;
    }
    paragraph.push(trimmed);
  }

  flush();
  return blocks.join("\n");
}

function renderImpactTable(rows: ImpactMetricRow[], proseTail: string): string {
  const tableRows = rows
    .map(
      (row) => `<tr>
        <td style="padding:12px 14px;border-bottom:1px solid #e2e8f0;font-family:system-ui,Arial,sans-serif;font-size:13px;color:#334155;">${escapeHtml(row.label)}</td>
        <td style="padding:12px 14px;border-bottom:1px solid #e2e8f0;font-family:'Courier New',monospace;font-size:12px;color:#64748b;text-align:right;">${escapeHtml(row.rawDisplay)}</td>
        <td style="padding:12px 14px;border-bottom:1px solid #e2e8f0;font-family:'Courier New',monospace;font-size:12px;font-weight:700;color:#0f172a;text-align:right;">${escapeHtml(row.cents)}</td>
        <td style="padding:12px 14px;border-bottom:1px solid #e2e8f0;font-family:'Courier New',monospace;font-size:12px;color:#0f172a;text-align:right;">${escapeHtml(formatUsdLocalizedFromCents(row.cents))}</td>
      </tr>`,
    )
    .join("");

  const prose = proseTail.trim() ? renderProseParagraphs(proseTail) : "";

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;margin:16px 0 20px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;overflow:hidden;">
    <thead>
      <tr style="background:#f1f5f9;">
        <th align="left" style="padding:10px 14px;font-family:system-ui,Arial,sans-serif;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:#64748b;">Metric register</th>
        <th align="right" style="padding:10px 14px;font-family:system-ui,Arial,sans-serif;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:#64748b;">Raw allocation</th>
        <th align="right" style="padding:10px 14px;font-family:system-ui,Arial,sans-serif;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:#64748b;">BigInt (¢)</th>
        <th align="right" style="padding:10px 14px;font-family:system-ui,Arial,sans-serif;font-size:10px;letter-spacing:0.12em;text-transform:uppercase;color:#64748b;">Localized USD</th>
      </tr>
    </thead>
    <tbody>${tableRows}</tbody>
  </table>${prose}`;
}

function impactProseTail(sectionBody: string): string {
  return sectionBody
    .split(/\r?\n/)
    .filter((line) => !line.trim().match(/^-\s+\*\*/))
    .join("\n");
}

function renderMachineRuleBlock(body: string): string {
  const fence = body.match(/```(\w+)?\n([\s\S]*?)```/);
  const code = fence?.[2]?.trimEnd() ?? "";
  const rest = fence ? body.replace(fence[0], "").trim() : body.trim();

  const codeBlock = code
    ? `<pre style="margin:0;padding:16px;background:#0f172a;border:1px solid #1e293b;border-radius:6px;overflow-x:auto;"><code style="font-family:'Courier New',monospace;font-size:12px;line-height:1.55;color:#e2e8f0;white-space:pre-wrap;">${escapeHtml(code)}</code></pre>`
    : "";

  const tail = rest ? renderProseParagraphs(rest) : "";
  return `${codeBlock}${tail}`;
}

function sectionHeading(title: string): string {
  return `<h2 style="margin:32px 0 12px;padding-top:24px;border-top:1px solid #e2e8f0;font-family:Georgia,'Times New Roman',serif;font-size:13px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:#0f172a;">${escapeHtml(title)}</h2>`;
}

function renderCitationsTable(body: string): string {
  const citations = parseBriefingCitations(body);
  if (!citations.length) return renderProseParagraphs(body);

  const rows = citations
    .map(
      (c) =>
        `<tr>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-family:'Courier New',monospace;font-size:11px;color:#64748b;">${c.index}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-family:system-ui,Arial,sans-serif;font-size:13px;color:#0f172a;">${escapeHtml(c.label)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-family:'Courier New',monospace;font-size:11px;color:#475569;">${escapeHtml(c.locator)}</td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-family:'Courier New',monospace;font-size:11px;color:#64748b;">${escapeHtml(c.retrievedAt ?? "—")}</td>
        </tr>`,
    )
    .join("");

  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:12px 0 20px;border:1px solid #e2e8f0;border-radius:8px;border-collapse:collapse;overflow:hidden;">
    <thead>
      <tr style="background:#f8fafc;">
        <th style="padding:10px 12px;text-align:left;font-family:'Courier New',monospace;font-size:10px;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">#</th>
        <th style="padding:10px 12px;text-align:left;font-family:'Courier New',monospace;font-size:10px;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">Resource</th>
        <th style="padding:10px 12px;text-align:left;font-family:'Courier New',monospace;font-size:10px;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">Locator</th>
        <th style="padding:10px 12px;text-align:left;font-family:'Courier New',monospace;font-size:10px;letter-spacing:0.08em;text-transform:uppercase;color:#64748b;">Retrieved</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>`;
}

function renderSection(section: BriefingSection): string {
  const body = section.body.trim();
  if (!body && !section.title) return "";

  const heading = section.title ? sectionHeading(section.title) : "";

  switch (section.id) {
    case "impact": {
      const rows = parseImpactMetrics(body);
      return `${heading}${renderImpactTable(rows, impactProseTail(body))}`;
    }
    case "machine-rule":
      return `${heading}<div style="margin:12px 0 20px;padding:16px;border:1px solid #cbd5e1;border-radius:8px;background:#ffffff;">${renderMachineRuleBlock(body)}</div>`;
    case "citations":
      return `${heading}${renderCitationsTable(body)}`;
    case "exposure":
    case "preamble":
    case "verification":
    case "other":
    default:
      return `${heading}${renderProseParagraphs(body)}`;
  }
}

function formatPublishedLabel(iso: string): string {
  try {
    return new Intl.DateTimeFormat("en-US", { dateStyle: "long", timeZone: "UTC" }).format(
      new Date(iso),
    );
  } catch {
    return iso;
  }
}

function buildBrandLogoBlock(): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 20px;border-collapse:collapse;">
    <tr>
      <td align="center" style="padding:0;">
        <img
          src="${escapeHtml(IRONFRAME_LOGO_PUBLIC_URL)}"
          width="40"
          height="40"
          alt="Ironframe"
          style="display:block;margin:0 auto;width:40px;height:40px;border:0;outline:none;text-decoration:none;"
        />
      </td>
    </tr>
  </table>`;
}

function buildCta(feedUrl: string): string {
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:36px;border-collapse:collapse;">
    <tr>
      <td style="background:#0f172a;padding:28px 24px;border-radius:8px;text-align:center;">
        <p style="margin:0 0 16px;font-family:system-ui,Arial,sans-serif;font-size:14px;line-height:1.5;color:#cbd5e1;">Read the full institutional briefing on the public Governance Frame feed.</p>
        <a href="${escapeHtml(feedUrl)}" style="display:inline-block;padding:14px 28px;background:#f8fafc;color:#0f172a;font-family:system-ui,Arial,sans-serif;font-size:13px;font-weight:700;text-decoration:none;border-radius:4px;letter-spacing:0.04em;">Open Full Briefing</a>
      </td>
    </tr>
  </table>`;
}

/** Compile a single briefing markdown file into email-safe inline HTML. */
export function compileGovernanceFrameEmail(
  input: GovernanceFrameEmailInput,
): GovernanceFrameEmailCompiled {
  const safeMarkdown = stripDangerousMarkdown(input.markdown);
  const body = briefingBodyMarkdown(safeMarkdown, input.title);
  const sections = parseBriefingSections(body);
  const sectionHtml = sections.map(renderSection).join("\n");
  const feedUrl = `${GOVERNANCE_FRAME_FEED_ORIGIN}/governance-frame/${encodeURIComponent(input.slug)}`;
  const publishedLabel = formatPublishedLabel(input.publishedAt);
  const metaLine = [input.classification, input.author].filter(Boolean).join(" · ");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${escapeHtml(input.title)} · The Governance Frame</title>
</head>
<body style="margin:0;padding:0;background:#eef2f6;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef2f6;padding:32px 12px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;">
          <tr>
            <td style="padding:32px 32px 24px;background:#ffffff;">
              ${buildBrandLogoBlock()}
              <p style="margin:0 0 10px;font-family:'Courier New',monospace;font-size:10px;font-weight:700;letter-spacing:0.32em;text-transform:uppercase;color:#64748b;text-align:center;">IRONFRAME SYSTEM INTELLIGENCE</p>
              <h1 style="margin:0 0 8px;font-family:Georgia,'Times New Roman',serif;font-size:28px;font-weight:700;line-height:1.25;color:#0f172a;text-align:center;">The Governance Frame</h1>
              <p style="margin:0 0 4px;font-family:Georgia,'Times New Roman',serif;font-size:20px;line-height:1.35;color:#0f172a;text-align:center;">${escapeHtml(input.title)}</p>
              <p style="margin:8px 0 0;font-family:'Courier New',monospace;font-size:11px;letter-spacing:0.08em;color:#64748b;text-align:center;">${escapeHtml(publishedLabel)}${metaLine ? ` · ${escapeHtml(metaLine)}` : ""}</p>
            </td>
          </tr>
          <tr>
            <td style="padding:8px 32px 32px;background:#ffffff;">
              ${sectionHtml}
              ${buildCta(feedUrl)}
            </td>
          </tr>
          <tr>
            <td style="padding:16px 32px 24px;background:#f8fafc;border-top:1px solid #e2e8f0;">
              <p style="margin:0;font-family:system-ui,Arial,sans-serif;font-size:11px;line-height:1.5;color:#94a3b8;text-align:center;">Ironframe institutional intelligence · compiled from approved published briefings only · presentation layer egress via Ironcast (Agent 7)</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  const subject = `The Governance Frame · ${input.title}`;
  const plainTextPreview = stripFrontmatter(safeMarkdown).slice(0, 280).replace(/\s+/g, " ").trim();

  return { slug: input.slug, subject, html, feedUrl, plainTextPreview };
}
