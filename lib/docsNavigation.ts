import "server-only";

import fs from "fs";
import path from "path";
import { sanitizeDocSlugSegments } from "@/lib/docsLinkNormalization";

export const DOCS_ROOT = path.join(process.cwd(), "docs");

const SECTION_LABELS: Record<string, string> = {
  stakeholders: "Stakeholders",
  external: "External",
  "end-users": "End-users",
  support: "Support",
  sales: "Sales",
  marketing: "Marketing",
  social: "Social media",
  technical: "Technical",
  pr: "PR & epic notes",
  root: "Engineering & operations",
};

const SECTION_ORDER = [
  "root-hub",
  "stakeholders",
  "external",
  "end-users",
  "support",
  "sales",
  "marketing",
  "social",
  "technical",
  "root",
  "pr",
];

export interface DocNavItem {
  slug: string[];
  href: string;
  label: string;
  section: string;
  sectionLabel: string;
}

function humanizeFilename(name: string): string {
  return name
    .replace(/\.md$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}


export function walkMarkdownSlugs(dir: string, root: string): string[][] {
  let results: string[][] = [];
  if (!fs.existsSync(dir)) return results;

  for (const file of fs.readdirSync(dir)) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      results = results.concat(walkMarkdownSlugs(fullPath, root));
    } else if (file.endsWith(".md")) {
      const relativePath = path.relative(root, fullPath);
      const slug = relativePath.replace(/\.md$/i, "").split(path.sep);
      results.push(slug);
    }
  }
  return results;
}

function sectionKeyForSlug(slug: string[]): string {
  if (slug.length === 1 && slug[0] === "hub") return "root-hub";
  if (slug.length === 1) return "root";
  return slug[0] ?? "root";
}

export function buildDocsNavigation(): DocNavItem[] {
  const slugs = walkMarkdownSlugs(DOCS_ROOT, DOCS_ROOT);
  const items: DocNavItem[] = slugs.map((slug) => {
    const section = sectionKeyForSlug(slug);
    const filename = slug[slug.length - 1] ?? "README";
    const label =
      filename === "hub" && slug.length === 1
        ? "Documentation Hub"
        : humanizeFilename(filename);

    return {
      slug,
      href: `/docs/${slug.join("/")}`,
      label,
      section,
      sectionLabel: SECTION_LABELS[section] ?? humanizeFilename(section),
    };
  });

  return items.sort((a, b) => {
    const orderA = SECTION_ORDER.indexOf(a.section);
    const orderB = SECTION_ORDER.indexOf(b.section);
    const rankA = orderA === -1 ? SECTION_ORDER.length : orderA;
    const rankB = orderB === -1 ? SECTION_ORDER.length : orderB;
    if (rankA !== rankB) return rankA - rankB;
    return a.label.localeCompare(b.label);
  });
}

export interface DocNavSection {
  key: string;
  label: string;
  items: DocNavItem[];
}

export function groupDocsNavigation(items: DocNavItem[]): DocNavSection[] {
  const groups = new Map<string, DocNavItem[]>();
  for (const item of items) {
    if (item.section === "root-hub") continue;
    const existing = groups.get(item.section) ?? [];
    existing.push(item);
    groups.set(item.section, existing);
  }

  return SECTION_ORDER.filter((key) => key !== "root-hub" && groups.has(key)).map((key) => ({
    key,
    label: SECTION_LABELS[key] ?? humanizeFilename(key),
    items: groups.get(key) ?? [],
  }));
}

export function resolveDocPath(slugSegments: string[]): string | null {
  const sanitized = sanitizeDocSlugSegments(slugSegments);
  if (sanitized.length === 0) return null;

  const relativeDocPath = `${sanitized.join("/")}.md`;
  const candidate = path.resolve(DOCS_ROOT, relativeDocPath);
  const normalizedRoot = path.resolve(DOCS_ROOT);
  if (candidate !== normalizedRoot && !candidate.startsWith(`${normalizedRoot}${path.sep}`)) {
    return null;
  }
  if (!fs.existsSync(candidate) || !fs.statSync(candidate).isFile()) {
    return null;
  }
  return candidate;
}
