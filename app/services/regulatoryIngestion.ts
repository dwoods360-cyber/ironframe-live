import "server-only";

import { createHash } from "crypto";
import { existsSync, readFileSync } from "fs";
import { join } from "path";
import {
  NIST_800_137_TAS_MAPPINGS,
  REGULATORY_VAULT_DOCS,
  type RegulatoryVaultDocId,
  type RegulatoryVaultDocMeta,
} from "@/app/config/regulatoryVaultCatalog";
import { CONSTITUTIONAL_DIRECTIVE_BY_ID } from "@/app/config/constitutionalDirectives";
import { IRONTALLY_FRAMEWORK_CONTROL_MAPPINGS } from "@/app/config/irontallyFrameworkControls";
import { getTasMdAbsolutePath } from "@/app/lib/tasMdIntegrity";

export type IngestedRegulatoryDocument = {
  id: RegulatoryVaultDocId;
  title: string;
  framework: "NIST" | "ISO";
  source: "vault_file" | "google_drive_env" | "unavailable";
  sha256: string | null;
  text: string;
  charCount: number;
};

export type TasDirectiveMappingRow = {
  nistSectionId: string;
  nistTitle: string;
  nistRequirement: string;
  tasSection: string;
  tasDirectives: Array<{
    id: string;
    label: string;
    summary: string;
    anchorId: string;
    tasLine: number;
  }>;
  gap: boolean;
  gapReason: string | null;
};

export type GovernanceComparisonMatrix = {
  ingestedAt: string;
  documents: IngestedRegulatoryDocument[];
  nistMappings: TasDirectiveMappingRow[];
  isoControls: Array<{
    controlId: string;
    controlTitle: string;
    tasDirectiveId: string | null;
    gap: boolean;
  }>;
  gapCount: number;
  diffSnapshot?: import("@/app/types/regulatoryIngestion").RegulatoryComparisonSnapshot | null;
  diffRows?: import("@/app/types/regulatoryIngestion").ComparisonDiffRow[];
};

async function fetchGoogleDriveText(url: string): Promise<string | null> {
  try {
    const res = await fetch(url, { next: { revalidate: 3600 } });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

function readVaultFile(relativePath: string): string | null {
  const abs = join(process.cwd(), relativePath.replace(/^\//, ""));
  if (!existsSync(abs)) return null;
  try {
    return readFileSync(abs, "utf8");
  } catch {
    return null;
  }
}

function ingestDocument(meta: RegulatoryVaultDocMeta): IngestedRegulatoryDocument {
  let text = readVaultFile(meta.relativePath);
  let source: IngestedRegulatoryDocument["source"] = text ? "vault_file" : "unavailable";
  if (!text) text = "";

  const sha256 =
    text.length > 0
      ? createHash("sha256").update(text, "utf8").digest("hex")
      : null;

  return {
    id: meta.id,
    title: meta.title,
    framework: meta.framework,
    source,
    sha256,
    text,
    charCount: text.length,
  };
}

export async function ingestRegulatoryVault(): Promise<IngestedRegulatoryDocument[]> {
  const docs: IngestedRegulatoryDocument[] = [];

  for (const meta of REGULATORY_VAULT_DOCS) {
    let doc = ingestDocument(meta);
    const driveUrl = meta.envDriveUrlKey
      ? process.env[meta.envDriveUrlKey]?.trim()
      : undefined;
    if (!doc.text && driveUrl) {
      const remote = await fetchGoogleDriveText(driveUrl);
      if (remote) {
        doc = {
          ...doc,
          text: remote,
          source: "google_drive_env",
          charCount: remote.length,
          sha256: createHash("sha256").update(remote, "utf8").digest("hex"),
        };
      }
    }
    docs.push(doc);
  }

  return docs;
}

function tasBodyContainsAnchor(tasMd: string, anchorId: string): boolean {
  return (
    tasMd.includes(`id="${anchorId}"`) ||
    tasMd.includes(`#${anchorId}`) ||
    tasMd.toLowerCase().includes(anchorId.replace(/-/g, " "))
  );
}

export function buildNistTasMappingRows(tasMd: string): TasDirectiveMappingRow[] {
  return NIST_800_137_TAS_MAPPINGS.map((m) => {
    const directives = m.tasDirectiveIds
      .map((id) => CONSTITUTIONAL_DIRECTIVE_BY_ID[id])
      .filter(Boolean)
      .map((d) => ({
        id: d!.id,
        label: d!.label,
        summary: d!.summary,
        anchorId: d!.anchorId,
        tasLine: d!.tasLine,
      }));

    const anchorHit = tasBodyContainsAnchor(tasMd, m.tasAnchorId);
    const directiveHit = m.tasDirectiveIds.some((id) => {
      const d = CONSTITUTIONAL_DIRECTIVE_BY_ID[id];
      return d ? tasMd.includes(d.label) || tasBodyContainsAnchor(tasMd, d.anchorId) : false;
    });

    const gap = !anchorHit && !directiveHit;
    return {
      nistSectionId: m.nistSectionId,
      nistTitle: m.nistTitle,
      nistRequirement: m.nistRequirement,
      tasSection: m.tasSection,
      tasDirectives: directives,
      gap,
      gapReason: gap
        ? `TAS.md lacks an explicit anchor for NIST ${m.nistSectionId} (${m.nistTitle}).`
        : null,
    };
  });
}

export async function buildGovernanceComparisonMatrix(): Promise<GovernanceComparisonMatrix> {
  const documents = await ingestRegulatoryVault();
  let tasMd = "";
  try {
    tasMd = readFileSync(getTasMdAbsolutePath(), "utf8");
  } catch {
    tasMd = "";
  }

  const nistMappings = buildNistTasMappingRows(tasMd);
  const isoControls = IRONTALLY_FRAMEWORK_CONTROL_MAPPINGS.iso_27001.map((c) => {
    const hit =
      tasMd.includes(c.directiveLabel) ||
      tasBodyContainsAnchor(tasMd, c.anchorId) ||
      tasMd.includes(c.controlId);
    return {
      controlId: c.controlId,
      controlTitle: c.controlTitle,
      tasDirectiveId: hit ? c.directiveId : null,
      gap: !hit,
    };
  });

  const gapCount =
    nistMappings.filter((r) => r.gap).length + isoControls.filter((c) => c.gap).length;

  return {
    ingestedAt: new Date().toISOString(),
    documents,
    nistMappings,
    isoControls,
    gapCount,
  };
}
