/**
 * HOLD archive ranking — Fit-held verified seats float to the top for operator Fit review.
 */

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

const INTAKE_LOCAL =
  /^(info|sales|contact|support|media|marketing|hello|admin|contacto|contato|enquiries|privacy|partners|comercial|noc|hr|legal|bidmanagement|globalsales|pr|advisory|cybersecurity|corporate\.communications|wbo|protecciondedatos)$/i;

function isPersonSeatEmail(email: string | null | undefined): boolean {
  if (!email || typeof email !== "string") return false;
  const trimmed = email.trim().toLowerCase();
  if (!trimmed.includes("@") || /@ironleads\.local$/i.test(trimmed)) return false;
  const local = trimmed.split("@")[0] || "";
  if (INTAKE_LOCAL.test(local)) return false;
  return true;
}

function emailDomain(email: string): string | null {
  const d = email.split("@")[1]?.toLowerCase().replace(/^www\./, "").trim();
  return d || null;
}

function domainCore(domain: string | null | undefined): string | null {
  const d = String(domain || "")
    .toLowerCase()
    .replace(/^www\./, "")
    .trim();
  return d || null;
}

/** Employer / promote-to domains must share the same registrable host. */
export function domainsRelated(
  emailOrHost: string | null | undefined,
  accountDomain: string | null | undefined,
): boolean {
  const a = domainCore(
    emailOrHost?.includes("@") ? emailDomain(emailOrHost) : emailOrHost,
  );
  const b = domainCore(accountDomain);
  if (!a || !b) return true;
  if (a === b) return true;
  if (a.endsWith(`.${b}`) || b.endsWith(`.${a}`)) return true;
  return a.split(".").slice(-2).join(".") === b.split(".").slice(-2).join(".");
}

/**
 * SUSPECT parked in HOLD with a verified person email blocked only on Fit
 * (Gatekeeper: restore → Fit PASS → Promote).
 * Excludes Fit FAIL, Fit PASS (held for other reasons), and channel_competitor.
 */
export function isFitHeldVerifiedSuspect(
  metadata: unknown,
  accountDomain?: string | null,
): boolean {
  const meta = asRecord(metadata);
  if (!meta) return false;

  const hold = asRecord(meta.operatorHold);
  const classification =
    typeof hold?.classification === "string" ? hold.classification.toLowerCase() : "";
  if (classification === "channel_competitor" || classification === "pending_batch") {
    return false;
  }

  const gatekeeper = asRecord(meta.emailGatekeeper);
  const named = asRecord(meta.namedBuyer);
  const brief = asRecord(meta.accountResearchBrief);
  const gates = asRecord(brief?.gates);
  const fit = asRecord(gates?.fit);
  const fitResult = typeof fit?.result === "string" ? fit.result.toUpperCase() : null;

  // Fit already decided — not the Fit-review stack.
  if (fitResult === "FAIL" || fitResult === "PASS" || fitResult === "ADJACENT") {
    return false;
  }

  const promoteTo =
    (typeof gatekeeper?.promoteTo === "string" && gatekeeper.promoteTo.trim()) ||
    (typeof named?.email === "string" && named.email.trim()) ||
    null;
  if (!isPersonSeatEmail(promoteTo)) return false;
  if (!domainsRelated(promoteTo, accountDomain)) return false;

  const emailGate =
    typeof gatekeeper?.emailGate === "string" ? gatekeeper.emailGate.toUpperCase() : "";
  if (emailGate === "VERIFIED_HELD_FIT") return true;

  const emailStatus =
    typeof named?.emailStatus === "string" ? named.emailStatus.toLowerCase() : "";
  const verifiedStatus =
    emailStatus === "valid" ||
    emailStatus === "prospeo_verified" ||
    emailStatus === "prospeo_verified_held" ||
    emailStatus.includes("verified");
  if (!verifiedStatus) return false;
  if (gatekeeper?.promoteReady === true) return false;

  const pathB = asRecord(meta.pathBVerdict);
  const reasonBlob = [
    typeof pathB?.reason === "string" ? pathB.reason : "",
    typeof gatekeeper?.prospeoNote === "string" ? gatekeeper.prospeoNote : "",
    typeof gatekeeper?.hunterNote === "string" ? gatekeeper.hunterNote : "",
    typeof hold?.reason === "string" ? String(hold.reason) : "",
  ]
    .join(" ")
    .toLowerCase();

  // Awaiting Fit research / PASS — not mere "Fit FAIL" language.
  return (
    fitResult === "UNKNOWN" ||
    fitResult == null ||
    /fit not pass|fit unknown|fit not researched|held.?fit|verified_held_fit/i.test(
      reasonBlob,
    )
  );
}

export function resolveFitHeldPromoteTo(
  metadata: unknown,
  accountDomain?: string | null,
): string | null {
  const meta = asRecord(metadata);
  if (!meta) return null;
  const gatekeeper = asRecord(meta.emailGatekeeper);
  const named = asRecord(meta.namedBuyer);
  const promoteTo =
    (typeof gatekeeper?.promoteTo === "string" && gatekeeper.promoteTo.trim()) ||
    (typeof named?.email === "string" && named.email.trim()) ||
    null;
  if (!isPersonSeatEmail(promoteTo)) return null;
  if (!domainsRelated(promoteTo, accountDomain)) return null;
  return promoteTo!.toLowerCase();
}

/** Sort key: Fit-held verified first, then enrich_later, then holdAt desc. */
export function compareHoldArchiveRows(
  a: {
    metadata: unknown;
    createdAt?: Date | string;
    holdAt?: string | null;
    holdClassification?: string | null;
    accountDomain?: string | null;
  },
  b: {
    metadata: unknown;
    createdAt?: Date | string;
    holdAt?: string | null;
    holdClassification?: string | null;
    accountDomain?: string | null;
  },
): number {
  const aFit = isFitHeldVerifiedSuspect(a.metadata, a.accountDomain) ? 1 : 0;
  const bFit = isFitHeldVerifiedSuspect(b.metadata, b.accountDomain) ? 1 : 0;
  if (bFit !== aFit) return bFit - aFit;

  const rankClass = (c: string | null | undefined) => {
    const v = String(c || "hold").toLowerCase();
    if (v === "enrich_later") return 2;
    if (v === "hold") return 1;
    if (v === "other" || v === "channel_competitor") return 0;
    return 0;
  };
  const aHold = asRecord(a.metadata)?.operatorHold;
  const bHold = asRecord(b.metadata)?.operatorHold;
  const aClass =
    a.holdClassification ??
    (typeof asRecord(aHold)?.classification === "string"
      ? String(asRecord(aHold)?.classification)
      : null);
  const bClass =
    b.holdClassification ??
    (typeof asRecord(bHold)?.classification === "string"
      ? String(asRecord(bHold)?.classification)
      : null);
  const classDelta = rankClass(bClass) - rankClass(aClass);
  if (classDelta !== 0) return classDelta;

  const aAt = Date.parse(
    a.holdAt ||
      (typeof asRecord(aHold)?.at === "string" ? String(asRecord(aHold)?.at) : "") ||
      (a.createdAt instanceof Date ? a.createdAt.toISOString() : String(a.createdAt || 0)),
  );
  const bAt = Date.parse(
    b.holdAt ||
      (typeof asRecord(bHold)?.at === "string" ? String(asRecord(bHold)?.at) : "") ||
      (b.createdAt instanceof Date ? b.createdAt.toISOString() : String(b.createdAt || 0)),
  );
  return (Number.isFinite(bAt) ? bAt : 0) - (Number.isFinite(aAt) ? aAt : 0);
}

/** Visible HOLD archive Sort control modes (portal client). */
export type HoldArchiveSortMode = "fit_held_first" | "newest" | "classification";

export const HOLD_ARCHIVE_SORT_OPTIONS: ReadonlyArray<{
  value: HoldArchiveSortMode;
  label: string;
}> = [
  { value: "fit_held_first", label: "Fit-held verified first" },
  { value: "newest", label: "Newest hold first" },
  { value: "classification", label: "Classification" },
];

type HoldArchivePortalSortRow = {
  fitHeldVerified?: boolean;
  holdClassification?: string | null;
  holdAt?: string | null;
  createdAt?: string;
  company?: string;
};

function holdAtMs(row: HoldArchivePortalSortRow): number {
  const parsed = Date.parse(row.holdAt || row.createdAt || "");
  return Number.isFinite(parsed) ? parsed : 0;
}

function classificationRank(c: string | null | undefined): number {
  const v = String(c || "hold").toLowerCase();
  if (v === "enrich_later") return 2;
  if (v === "hold") return 1;
  return 0;
}

/** Client-side reorder for the HOLD archive Sort field. */
export function sortHoldArchivePortalRows<T extends HoldArchivePortalSortRow>(
  rows: readonly T[],
  mode: HoldArchiveSortMode,
): T[] {
  const copy = [...rows];
  if (mode === "newest") {
    return copy.sort((a, b) => holdAtMs(b) - holdAtMs(a));
  }
  if (mode === "classification") {
    return copy.sort((a, b) => {
      const classDelta =
        classificationRank(b.holdClassification) - classificationRank(a.holdClassification);
      if (classDelta !== 0) return classDelta;
      return holdAtMs(b) - holdAtMs(a);
    });
  }
  // fit_held_first (default) — mirrors server compareHoldArchiveRows using wire flags
  return copy.sort((a, b) => {
    const aFit = a.fitHeldVerified ? 1 : 0;
    const bFit = b.fitHeldVerified ? 1 : 0;
    if (bFit !== aFit) return bFit - aFit;
    const classDelta =
      classificationRank(b.holdClassification) - classificationRank(a.holdClassification);
    if (classDelta !== 0) return classDelta;
    return holdAtMs(b) - holdAtMs(a);
  });
}
