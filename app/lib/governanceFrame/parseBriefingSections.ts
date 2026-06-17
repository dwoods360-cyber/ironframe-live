import { parseCentBigIntSafe } from "@/app/lib/governanceFrame/parseCentBigInt";

export type BriefingSectionId =
  | "preamble"
  | "exposure"
  | "impact"
  | "machine-rule"
  | "verification"
  | "other";

export type ImpactMetricRow = {
  label: string;
  cents: string;
  rawDisplay: string;
};

export type BriefingSection = {
  id: BriefingSectionId;
  title: string;
  body: string;
};

const SECTION_HEADING = /^#{2,3}\s+(.+)$/;

function classifySection(title: string): BriefingSectionId {
  const t = title.replace(/\*\*/g, "").trim();
  if (/^I\.\s*Exposure Vector/i.test(t)) return "exposure";
  if (/^II\.\s*Calculated Quantitative Impact/i.test(t)) return "impact";
  if (/^III\.\s*Machine-Rule Technical Translation/i.test(t)) return "machine-rule";
  if (/^IV\.\s*Verification Protocol/i.test(t)) return "verification";
  return "other";
}

/** Split briefing body into scannable frame zones (I–IV). */
export function parseBriefingSections(bodyMarkdown: string): BriefingSection[] {
  const lines = bodyMarkdown.split(/\r?\n/);
  const sections: BriefingSection[] = [];
  let current: BriefingSection = { id: "preamble", title: "", body: "" };

  const pushCurrent = () => {
    if (current.title || current.body.trim()) sections.push({ ...current });
  };

  for (const line of lines) {
    const heading = line.match(SECTION_HEADING);
    if (heading?.[1]) {
      pushCurrent();
      const title = heading[1].replace(/\*\*/g, "").trim();
      current = {
        id: classifySection(title),
        title,
        body: "",
      };
      continue;
    }
    current.body += `${line}\n`;
  }

  pushCurrent();
  return sections;
}

const METRIC_LINE = /^-\s+\*\*(.+?)\*\*:?\s*(.+)$/;

/** Parse Section II bullet metrics into cent-register table rows. */
export function parseImpactMetrics(sectionBody: string): ImpactMetricRow[] {
  const rows: ImpactMetricRow[] = [];

  for (const line of sectionBody.split(/\r?\n/)) {
    const match = line.trim().match(METRIC_LINE);
    if (!match?.[1] || !match[2]) continue;

    const label = match[1].trim().replace(/:$/, "");
    const rawDisplay = match[2].trim();
    const isCentRegister = /\(¢\)/i.test(label) || /^["']?\d+["']?$/.test(rawDisplay);

    rows.push({
      label,
      cents: isCentRegister ? parseCentBigIntSafe(rawDisplay) : parseCentBigIntSafe("0"),
      rawDisplay,
    });
  }

  return rows;
}

/** Frontmatter keys ending in `_cents` → stringified BigInt. */
export function parseFrontmatterCentFields(markdown: string): Record<string, string> {
  if (!markdown.startsWith("---")) return {};

  const end = markdown.indexOf("---", 3);
  if (end === -1) return {};

  const block = markdown.slice(3, end);
  const out: Record<string, string> = {};

  for (const line of block.split(/\r?\n/)) {
    const match = line.match(/^([A-Za-z0-9_]+):\s*(.+)$/);
    if (!match?.[1] || !match[2]) continue;
    if (!/_cents$/i.test(match[1]) && !/Cent$/i.test(match[1])) continue;
    out[match[1]] = parseCentBigIntSafe(match[2]);
  }

  return out;
}
