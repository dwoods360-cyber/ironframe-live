import type { PublishedBriefing } from "./briefingScanner.js";
import { parseCentBigIntSafe } from "./parseCentBigInt.js";

const BRAND_TITLE = "The Governance Frame";
const CTA_HREF =
  process.env.IRONFRAME_MARKETING_ORIGIN?.trim().replace(/\/$/, "") ||
  "http://127.0.0.1:3000";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function inlineMarkdown(text: string): string {
  return escapeHtml(text).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
}

function stripFrontmatter(markdown: string): string {
  if (!markdown.startsWith("---")) return markdown;
  const end = markdown.indexOf("---", 3);
  if (end === -1) return markdown;
  return markdown.slice(end + 3).trimStart();
}

function stripDuplicateTitle(markdown: string, title: string): string {
  const h1 = markdown.match(/^#\s+(.+)$/m);
  if (h1?.[1]?.trim() === title.trim()) {
    return markdown.replace(/^#\s+.+$/m, "").trimStart();
  }
  return markdown;
}

type SectionId = "preamble" | "exposure" | "impact" | "machine-rule" | "verification" | "other";

type Section = { id: SectionId; title: string; body: string };

function classifySection(title: string): SectionId {
  const t = title.replace(/\*\*/g, "").trim();
  if (/^I\.\s*Exposure Vector/i.test(t)) return "exposure";
  if (/^II\.\s*Calculated Quantitative Impact/i.test(t)) return "impact";
  if (/^III\.\s*Machine-Rule Technical Translation/i.test(t)) return "machine-rule";
  if (/^IV\.\s*Verification Protocol/i.test(t)) return "verification";
  return "other";
}

function parseSections(body: string): Section[] {
  const lines = body.split(/\r?\n/);
  const sections: Section[] = [];
  let current: Section = { id: "preamble", title: "", body: "" };

  const push = () => {
    if (current.title || current.body.trim()) sections.push({ ...current });
  };

  for (const line of lines) {
    const h = line.match(/^#{2,3}\s+(.+)$/);
    if (h?.[1]) {
      push();
      const title = h[1].replace(/\*\*/g, "").trim();
      current = { id: classifySection(title), title, body: "" };
      continue;
    }
    current.body += `${line}\n`;
  }
  push();
  return sections;
}

const METRIC_LINE = /^-\s+\*\*(.+?)\*\*:?\s*(.+)$/;

function renderImpactTable(body: string): string {
  const rows: Array<{ label: string; raw: string; cents: string }> = [];
  const prose: string[] = [];

  for (const line of body.split(/\r?\n/)) {
    const match = line.trim().match(METRIC_LINE);
    if (match?.[1] && match[2]) {
      const label = match[1].trim().replace(/:$/, "");
      const raw = match[2].trim();
      const isCent = /\(¢\)/i.test(label) || /^["']?\d+["']?$/.test(raw);
      rows.push({
        label,
        raw,
        cents: isCent ? parseCentBigIntSafe(raw) : "0",
      });
      continue;
    }
    if (line.trim()) prose.push(line);
  }

  const table =
    rows.length === 0
      ? ""
      : `<table class="impact-table">
      <thead><tr>
        <th>Metric register</th><th>Raw allocation</th><th class="num">BigInt (¢)</th>
      </tr></thead>
      <tbody>${rows
        .map(
          (r) => `<tr>
          <td>${escapeHtml(r.label)}</td>
          <td class="muted">${escapeHtml(r.raw)}</td>
          <td class="num">${escapeHtml(r.cents)}</td>
        </tr>`,
        )
        .join("")}</tbody>
    </table>`;

  const proseHtml = prose.length ? renderProse(prose.join("\n")) : "";
  return `${table}${proseHtml}`;
}

function renderFencedCode(body: string): string {
  const fence = body.match(/```(\w+)?\n([\s\S]*?)```/);
  if (!fence?.[2]) return renderProse(body);
  const lang = fence[1] ?? "";
  const code = escapeHtml(fence[2].trimEnd());
  const rest = body.replace(fence[0], "").trim();
  return `<pre class="code-block" data-lang="${escapeHtml(lang)}"><code>${code}</code></pre>${rest ? renderProse(rest) : ""}`;
}

function renderProse(body: string): string {
  const lines = body.split(/\r?\n/);
  const blocks: string[] = [];
  let paragraph: string[] = [];
  let listItems: string[] = [];
  let inList = false;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    blocks.push(`<p class="sans-body">${inlineMarkdown(paragraph.join(" "))}</p>`);
    paragraph = [];
  };

  const flushList = () => {
    if (!inList || !listItems.length) return;
    blocks.push(`<ul>${listItems.map((li) => `<li>${inlineMarkdown(li)}</li>`).join("")}</ul>`);
    listItems = [];
    inList = false;
  };

  for (const raw of lines) {
    const trimmed = raw.trim();
    if (!trimmed) {
      flushList();
      flushParagraph();
      continue;
    }
    if (trimmed.startsWith("> ")) {
      flushList();
      flushParagraph();
      blocks.push(`<blockquote>${inlineMarkdown(trimmed.slice(2))}</blockquote>`);
      continue;
    }
    if (trimmed.startsWith("- ")) {
      flushParagraph();
      inList = true;
      listItems.push(trimmed.slice(2));
      continue;
    }
    flushList();
    paragraph.push(trimmed);
  }

  flushList();
  flushParagraph();
  return blocks.join("\n");
}

function renderSection(section: Section): string {
  const body = section.body.trim();
  if (!body && !section.title) return "";

  const heading = section.title
    ? `<h2 class="zone-heading">${escapeHtml(section.title)}</h2>`
    : "";

  if (section.id === "impact") {
    return `<section class="zone zone-impact">${heading}${renderImpactTable(body)}</section>`;
  }

  if (section.id === "machine-rule") {
    return `<section class="zone zone-machine">${heading}${renderFencedCode(body)}</section>`;
  }

  const bodyClass = section.id === "exposure" || section.id === "preamble" ? "sans-body" : "";
  return `<section class="zone">${heading}<div class="${bodyClass}">${renderProse(body)}</div></section>`;
}

export function markdownToBriefingHtml(markdown: string, title: string): string {
  const body = stripDuplicateTitle(stripFrontmatter(markdown), title);
  return parseSections(body).map(renderSection).join("\n");
}

function earlyEnclaveCta(): string {
  return `<aside class="cta-enclave">
    <p class="cta-kicker">Invite-only provisioning</p>
    <h2 class="cta-title">Secure your isolated tenant enclave</h2>
    <p class="cta-copy">Request early access to coordinate your Command Tier evaluation.</p>
    <a class="cta-action" href="${escapeHtml(CTA_HREF)}/register/contact">[ Request Early Enclave Access ]</a>
  </aside>`;
}

function layoutShell(body: string, pageTitle: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="robots" content="noindex, nofollow">
  <title>${escapeHtml(pageTitle)} · ${BRAND_TITLE}</title>
  <style>
    :root {
      --slate-950: #020617;
      --slate-900: #0f172a;
      --slate-800: #1e293b;
      --slate-600: #475569;
      --slate-400: #94a3b8;
      --slate-300: #cbd5e1;
      --slate-100: #f1f5f9;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
      background: var(--slate-950);
      color: var(--slate-100);
      line-height: 1.65;
      min-height: 100vh;
    }
    header {
      border-bottom: 1px solid var(--slate-800);
      padding: 1.5rem;
      background: var(--slate-950);
    }
    header .brand {
      font-size: 0.65rem;
      letter-spacing: 0.28em;
      text-transform: uppercase;
      color: var(--slate-600);
      font-weight: 700;
    }
    header h1 {
      margin-top: 0.5rem;
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--slate-100);
    }
    header p {
      margin-top: 0.5rem;
      font-family: ui-sans-serif, system-ui, sans-serif;
      font-size: 0.85rem;
      color: var(--slate-400);
      max-width: 36rem;
    }
    main {
      max-width: 46rem;
      margin: 0 auto;
      padding: 2rem 1.5rem 3rem;
    }
    a { color: var(--slate-100); text-decoration: underline; text-underline-offset: 2px; }
    .feed-list { list-style: none; display: grid; gap: 1rem; }
    .feed-item {
      border: 1px solid var(--slate-800);
      border-radius: 0.75rem;
      padding: 1.25rem;
      background: rgba(15, 23, 42, 0.4);
    }
    .feed-item time { font-size: 0.65rem; color: var(--slate-600); letter-spacing: 0.12em; text-transform: uppercase; }
    .feed-item .metric { float: right; font-size: 0.65rem; font-weight: 700; color: var(--slate-300); }
    .feed-item a.title { display: block; margin-top: 0.5rem; font-size: 1rem; font-weight: 700; color: var(--slate-100); text-decoration: none; }
    .feed-item a.title:hover { color: #fff; }
    .zone-heading {
      margin-top: 2.5rem;
      padding-top: 2rem;
      border-top: 1px solid var(--slate-800);
      font-size: 0.68rem;
      letter-spacing: 0.24em;
      text-transform: uppercase;
      color: var(--slate-400);
      font-weight: 700;
    }
    .zone-impact { margin-top: 0.5rem; }
    .impact-table {
      width: 100%;
      border-collapse: collapse;
      margin: 1rem 0;
      font-size: 0.75rem;
      border: 1px solid var(--slate-800);
      border-radius: 0.5rem;
      overflow: hidden;
      background: rgba(15, 23, 42, 0.8);
    }
    .impact-table th, .impact-table td {
      padding: 0.75rem 1rem;
      border-bottom: 1px solid var(--slate-800);
      text-align: left;
    }
    .impact-table th { font-size: 0.62rem; letter-spacing: 0.14em; text-transform: uppercase; color: var(--slate-600); }
    .impact-table td.muted { color: var(--slate-600); }
    .impact-table td.num, .impact-table th.num { text-align: right; font-weight: 700; color: var(--slate-100); font-variant-numeric: tabular-nums; }
    .sans-body, .sans-body p, article p.sans-body { font-family: ui-sans-serif, system-ui, sans-serif; color: var(--slate-300); font-size: 0.9rem; margin-bottom: 0.85rem; }
    .zone-machine {
      margin-top: 1rem;
      border: 2px solid var(--slate-800);
      border-radius: 0.75rem;
      padding: 1.25rem;
      background: rgba(15, 23, 42, 0.3);
    }
    .code-block {
      margin: 1rem 0;
      padding: 1rem;
      border: 2px solid #334155;
      border-radius: 0.5rem;
      background: var(--slate-950);
      overflow-x: auto;
      font-size: 0.75rem;
      color: #7dd3fc;
    }
    blockquote {
      border-left: 2px solid var(--slate-600);
      padding: 0.5rem 0 0.5rem 1rem;
      margin: 1rem 0;
      font-family: ui-sans-serif, system-ui, sans-serif;
      font-style: italic;
      color: var(--slate-300);
      font-size: 0.9rem;
    }
    ul { margin: 0.5rem 0 1rem 1.25rem; color: var(--slate-300); font-family: ui-sans-serif, system-ui, sans-serif; font-size: 0.9rem; }
    .back-link { display: inline-block; margin-bottom: 1.25rem; font-size: 0.65rem; letter-spacing: 0.12em; text-transform: uppercase; color: var(--slate-600); text-decoration: none; }
    .cta-enclave {
      margin-top: 3rem;
      padding: 2rem;
      border: 1px solid #334155;
      border-radius: 0.75rem;
      background: linear-gradient(180deg, var(--slate-900), var(--slate-950));
      text-align: center;
    }
    .cta-kicker { font-size: 0.62rem; letter-spacing: 0.28em; text-transform: uppercase; color: var(--slate-600); }
    .cta-title { margin-top: 0.75rem; font-size: 1.15rem; color: var(--slate-100); }
    .cta-copy { margin-top: 0.75rem; font-family: ui-sans-serif, system-ui, sans-serif; font-size: 0.85rem; color: var(--slate-400); }
    .cta-action {
      display: inline-block;
      margin-top: 1.25rem;
      padding: 0.75rem 1.5rem;
      border: 1px solid #64748b;
      border-radius: 0.375rem;
      background: var(--slate-100);
      color: var(--slate-950);
      font-weight: 700;
      font-size: 0.8rem;
      letter-spacing: 0.04em;
      text-decoration: none;
    }
    .cta-action:hover { background: #fff; }
  </style>
</head>
<body>
  <header>
    <div class="brand">Ironframe · Institutional Intelligence</div>
    <h1>${BRAND_TITLE}</h1>
    <p>Chronological regulatory intelligence — published ledger at <code>docs/published-briefings/</code> only.</p>
  </header>
  <main>
    ${body}
    ${earlyEnclaveCta()}
  </main>
</body>
</html>`;
}

function primaryCentFromMarkdown(markdown: string, title: string): string | null {
  const body = stripDuplicateTitle(stripFrontmatter(markdown), title);
  const impact = parseSections(body).find((s) => s.id === "impact");
  if (!impact) return null;
  const line = impact.body.split(/\r?\n/).find((l) => /\(¢\)/i.test(l) && METRIC_LINE.test(l.trim()));
  if (!line) return null;
  const m = line.trim().match(METRIC_LINE);
  return m?.[2] ? parseCentBigIntSafe(m[2]) : null;
}

export function renderBriefingIndex(briefings: PublishedBriefing[]): string {
  const items =
    briefings.length === 0
      ? `<p class="sans-body">No published briefings yet. Add reviewed markdown to <strong>docs/published-briefings/</strong>.</p>`
      : `<ul class="feed-list">${briefings
          .map((b) => {
            const cent = primaryCentFromMarkdown(b.markdown, b.title);
            return `<li class="feed-item">
        ${cent ? `<span class="metric">¢ ${escapeHtml(cent)}</span>` : ""}
        <time datetime="${escapeHtml(b.publishedAt)}">${escapeHtml(new Date(b.publishedAt).toLocaleString())}</time>
        <a class="title" href="/governance-frame/${escapeHtml(b.slug)}">${escapeHtml(b.title)}</a>
      </li>`;
          })
          .join("")}</ul>`;

  return layoutShell(items, "Briefings");
}

export function renderBriefingArticle(briefing: PublishedBriefing): string {
  const body = `<a class="back-link" href="/governance-frame">← All briefings</a>
<article>
  <time datetime="${escapeHtml(briefing.publishedAt)}" style="font-size:0.65rem;color:#64748b;letter-spacing:0.1em;text-transform:uppercase">${escapeHtml(new Date(briefing.publishedAt).toLocaleString())}</time>
  <h1 style="margin:0.75rem 0 1.5rem;font-size:1.75rem">${escapeHtml(briefing.title)}</h1>
  ${markdownToBriefingHtml(briefing.markdown, briefing.title)}
</article>`;
  return layoutShell(body, briefing.title);
}

export function renderBriefingNotFound(slug: string): string {
  return layoutShell(
    `<p class="sans-body">Briefing <strong>${escapeHtml(slug)}</strong> was not found in the published ledger.</p>
     <p class="sans-body"><a href="/governance-frame">Return to index</a></p>`,
    "Not found",
  );
}
