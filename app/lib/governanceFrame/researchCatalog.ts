import "server-only";

import fs from "fs";
import path from "path";

import { resolveDocsRoot } from "@/app/lib/governanceFrame/briefingFilesystemLedger";
import { parseFrontmatterField } from "@/app/lib/governanceFrame/briefingMarkdown";
import { stripFrontmatter } from "@/app/lib/governanceFrame/briefingDraftValidation";

const GOVERNANCE_FRAME_DOCS = "governance-frame";

export type ResearchPaperListing = {
  researchId: string;
  slug: string;
  title: string;
  subtitle: string | null;
  version: string | null;
  status: string;
  publisher: string | null;
  /** Only PUBLISHED manuscripts are rendered in full on the public site. */
  isPublic: boolean;
  packagePath: string;
};

export type ResearchSeriesInstallment = {
  packageId: string;
  publishedSlug: string | null;
  status: string;
  era: string | null;
  yearRange: string | null;
};

export type ResearchSeriesListing = {
  seriesId: string;
  title: string;
  publicationClass: string | null;
  installments: ResearchSeriesInstallment[];
};

function readUtf8IfExists(filePath: string): string | null {
  try {
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return null;
    return fs.readFileSync(filePath, "utf8");
  } catch {
    return null;
  }
}

function isPublishedStatus(status: string | null | undefined): boolean {
  const normalized = (status ?? "").trim().toUpperCase();
  return normalized === "PUBLISHED" || normalized === "PUBLIC";
}

function isPlaceholderDoc(markdown: string): boolean {
  const status = parseFrontmatterField(markdown, "status")?.toUpperCase() ?? "";
  if (status === "PLACEHOLDER") return true;
  return /Draft pending\./i.test(stripFrontmatter(markdown));
}

export function listResearchPapers(): ResearchPaperListing[] {
  const root = path.join(resolveDocsRoot(), GOVERNANCE_FRAME_DOCS, "research-papers");
  if (!fs.existsSync(root)) return [];

  const listings: ResearchPaperListing[] = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const slug = entry.name;
    const packagePath = path.join(root, slug);
    const manuscript = readUtf8IfExists(path.join(packagePath, "manuscript.md"));
    if (!manuscript) continue;

    const researchId =
      parseFrontmatterField(manuscript, "researchId") ??
      slug.match(/^(GF-\d{4}-\d+)/i)?.[1] ??
      slug;
    const title =
      parseFrontmatterField(manuscript, "title") ??
      manuscript.match(/^#\s+(.+)$/m)?.[1]?.trim() ??
      researchId;
    const status = parseFrontmatterField(manuscript, "status") ?? "UNKNOWN";

    listings.push({
      researchId,
      slug,
      title,
      subtitle: parseFrontmatterField(manuscript, "subtitle"),
      version: parseFrontmatterField(manuscript, "version"),
      status,
      publisher: parseFrontmatterField(manuscript, "publisher"),
      isPublic: isPublishedStatus(status),
      packagePath: path.relative(resolveDocsRoot(), packagePath).replace(/\\/g, "/"),
    });
  }

  return listings.sort((a, b) => a.researchId.localeCompare(b.researchId));
}

export function getResearchPaperManuscript(
  slug: string,
  options?: { allowDraft?: boolean },
): {
  listing: ResearchPaperListing;
  bodyMarkdown: string;
} | null {
  const listing = listResearchPapers().find((paper) => paper.slug === slug);
  if (!listing) return null;
  if (!listing.isPublic && !options?.allowDraft) return null;

  const manuscript = readUtf8IfExists(
    path.join(resolveDocsRoot(), listing.packagePath, "manuscript.md"),
  );
  if (!manuscript) return null;

  return {
    listing,
    bodyMarkdown: stripFrontmatter(manuscript),
  };
}

function parseSeriesInstallments(indexMarkdown: string): ResearchSeriesInstallment[] {
  const rows = indexMarkdown.split("\n").filter((line) => /^\|/.test(line));
  const installments: ResearchSeriesInstallment[] = [];

  for (const row of rows) {
    const cells = row
      .split("|")
      .map((cell) => cell.trim())
      .filter(Boolean);
    if (cells.length < 5) continue;
    if (/^-+$/.test(cells[0] ?? "") || /installment/i.test(cells[0] ?? "")) continue;

    const packageId = (cells[1] ?? "").replace(/`/g, "").trim();
    if (!/^CF-GRC-/i.test(packageId) && !/^[A-Z]{2,}-/.test(packageId)) continue;

    const publishedSlug = (cells[4] ?? "").replace(/`/g, "").trim();
    const status = (cells[5] ?? "").replace(/`/g, "").trim();

    installments.push({
      packageId,
      publishedSlug:
        publishedSlug && !/^(status|published slug)$/i.test(publishedSlug) ? publishedSlug : null,
      status,
      era: (cells[2] ?? "").replace(/`/g, "").trim() || null,
      yearRange: (cells[3] ?? "").replace(/`/g, "").trim() || null,
    });
  }

  return installments;
}

export function listResearchSeries(): ResearchSeriesListing[] {
  const seriesRoot = path.join(
    resolveDocsRoot(),
    GOVERNANCE_FRAME_DOCS,
    "briefings",
    "series",
  );
  if (!fs.existsSync(seriesRoot)) return [];

  const listings: ResearchSeriesListing[] = [];
  for (const entry of fs.readdirSync(seriesRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const seriesId = entry.name;
    const indexMarkdown = readUtf8IfExists(path.join(seriesRoot, seriesId, "series-index.md"));
    if (!indexMarkdown) continue;

    const titleMatch = indexMarkdown.match(/^#\s+(.+)$/m);
    const titleBlock = indexMarkdown.match(/##\s+Series title\s+\n+([^\n]+)/i);

    listings.push({
      seriesId,
      title: titleBlock?.[1]?.trim() ?? titleMatch?.[1]?.trim() ?? seriesId,
      publicationClass: parseFrontmatterField(indexMarkdown, "publicationClass"),
      installments: parseSeriesInstallments(indexMarkdown),
    });
  }

  return listings.sort((a, b) => a.seriesId.localeCompare(b.seriesId));
}

export function getResearchSeries(seriesId: string): ResearchSeriesListing | null {
  return listResearchSeries().find((series) => series.seriesId === seriesId) ?? null;
}

export type PolicyDocListing = {
  id: string;
  title: string;
  relativePath: string;
  ready: boolean;
};

export function listEditorialPolicyDocs(): PolicyDocListing[] {
  const docsRoot = resolveDocsRoot();
  const candidates: Array<{ id: string; relativePath: string; fallbackTitle: string }> = [
    {
      id: "what-governance-frame-is",
      relativePath: "governance-frame/charter/what-governance-frame-is.md",
      fallbackTitle: "What Governance Frame Is",
    },
    {
      id: "editorial-standards",
      relativePath: "governance-frame/charter/editorial-standards.md",
      fallbackTitle: "Editorial Standards",
    },
    {
      id: "operating-outline",
      relativePath: "governance-frame/charter/operating-outline.md",
      fallbackTitle: "Operating Outline",
    },
    {
      id: "publication-desk-agents",
      relativePath: "governance-frame/charter/publication-desk-agents.md",
      fallbackTitle: "Publication Desk Agents",
    },
    {
      id: "editorial-charter",
      relativePath: "governance-frame/charter/editorial-charter.md",
      fallbackTitle: "Editorial Charter",
    },
    {
      id: "editorial-independence",
      relativePath: "governance-frame/charter/editorial-independence.md",
      fallbackTitle: "Editorial Independence",
    },
    {
      id: "conflicts-of-interest",
      relativePath: "governance-frame/charter/conflicts-of-interest.md",
      fallbackTitle: "Conflicts of Interest",
    },
    {
      id: "corrections-policy",
      relativePath: "governance-frame/charter/corrections-policy.md",
      fallbackTitle: "Corrections Policy",
    },
    {
      id: "citation-standard",
      relativePath: "governance-frame/methodology/citation-standard.md",
      fallbackTitle: "Citation Standard",
    },
    {
      id: "research-methodology",
      relativePath: "governance-frame/methodology/research-methodology.md",
      fallbackTitle: "Research Methodology",
    },
    {
      id: "verification-protocol",
      relativePath: "governance-frame/methodology/verification-protocol.md",
      fallbackTitle: "Verification Protocol",
    },
    {
      id: "editorial-style-guide",
      relativePath: "governance-frame/style/editorial-style-guide.md",
      fallbackTitle: "Editorial Style Guide",
    },
  ];

  return candidates.map((candidate) => {
    const absolute = path.join(docsRoot, candidate.relativePath);
    const markdown = readUtf8IfExists(absolute);
    const title =
      (markdown && parseFrontmatterField(markdown, "title")) ||
      markdown?.match(/^#\s+(.+)$/m)?.[1]?.trim() ||
      candidate.fallbackTitle;
    return {
      id: candidate.id,
      title,
      relativePath: candidate.relativePath,
      ready: Boolean(markdown && !isPlaceholderDoc(markdown)),
    };
  });
}

/** Load a published policy manuscript body for the public research site. */
export function getEditorialPolicyMarkdown(id: string): {
  listing: PolicyDocListing;
  bodyMarkdown: string;
} | null {
  const listing = listEditorialPolicyDocs().find((doc) => doc.id === id);
  if (!listing || !listing.ready) return null;
  const absolute = path.join(resolveDocsRoot(), listing.relativePath);
  const markdown = readUtf8IfExists(absolute);
  if (!markdown) return null;
  return { listing, bodyMarkdown: stripFrontmatter(markdown) };
}

export function listNewsletterPlaceholders(): string[] {
  const root = path.join(resolveDocsRoot(), GOVERNANCE_FRAME_DOCS, "newsletters");
  if (!fs.existsSync(root)) return [];
  return fs
    .readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() || (entry.isFile() && entry.name.endsWith(".md")))
    .map((entry) => entry.name)
    .filter((name) => name !== ".gitkeep")
    .sort();
}
