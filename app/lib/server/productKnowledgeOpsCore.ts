/**
 * Ops Hub product-knowledge check/sync — wraps the CLI sync engine for GLOBAL_ADMIN operators.
 * Apply writes git-tracked docs on the local workspace only (never silent Cloud Run / Vercel mutation).
 */
import {
  formatSyncReport,
  runProductKnowledgeSync,
  type SyncReport,
} from "@/lib/ironframeProductKnowledge/syncEngine";
import {
  readDriftNotice,
  type ProductKnowledgeDriftNotice,
} from "@/lib/ironframeProductKnowledge/driftNotice";

export type ProductKnowledgeOpsResult = {
  ok: boolean;
  apply: boolean;
  applyAllowed: boolean;
  applyBlockedReason: string | null;
  report: SyncReport;
  reportText: string;
  operatorHint: string;
  driftNotice: ProductKnowledgeDriftNotice | null;
  showFloatingNotice: boolean;
};

export function isProductKnowledgeApplyAllowed(): { allowed: boolean; reason: string | null } {
  if (process.env.VERCEL === "1") {
    return {
      allowed: false,
      reason:
        "Apply is disabled on Vercel — ephemeral filesystem cannot update the git spine. Run npm run knowledge:sync locally (or set IRONFRAME_ALLOW_PRODUCT_KNOWLEDGE_SYNC=1 only on a writable ops host).",
    };
  }
  if (process.env.IRONFRAME_ALLOW_PRODUCT_KNOWLEDGE_SYNC === "0") {
    return {
      allowed: false,
      reason: "IRONFRAME_ALLOW_PRODUCT_KNOWLEDGE_SYNC=0 — apply disabled by operator policy.",
    };
  }
  if (
    process.env.NODE_ENV === "production" &&
    process.env.IRONFRAME_ALLOW_PRODUCT_KNOWLEDGE_SYNC !== "1"
  ) {
    return {
      allowed: false,
      reason:
        "Production apply requires IRONFRAME_ALLOW_PRODUCT_KNOWLEDGE_SYNC=1 on a writable ops host (not Vercel).",
    };
  }
  return { allowed: true, reason: null };
}

export function runProductKnowledgeOps(opts: { apply: boolean }): ProductKnowledgeOpsResult {
  const gate = isProductKnowledgeApplyAllowed();
  const wantApply = opts.apply === true;
  const willApply = wantApply && gate.allowed;

  const report = runProductKnowledgeSync({ apply: willApply });
  const reportText = formatSyncReport(report);
  const driftNotice = readDriftNotice();

  let operatorHint =
    "Restart/redeploy blast-radius targets manually — this control does not kill perimeter processes.";
  if (wantApply && !gate.allowed) {
    operatorHint = gate.reason ?? "Apply blocked.";
  } else if (willApply && report.applied.length > 0) {
    operatorHint =
      "Mirrors/fingerprint updated on this workspace. Review git diff, commit, then restart IronBoard / redeploy workers listed below.";
  } else if (!wantApply && !report.ok) {
    operatorHint =
      "Drift detected — use Sync product knowledge (floating banner) or run npm run knowledge:sync.";
  } else if (report.ok && report.blastRadius.length === 0) {
    operatorHint = "Product knowledge in sync — no restart required.";
  }

  const ok = wantApply && !gate.allowed ? false : report.ok;

  return {
    ok,
    apply: willApply,
    applyAllowed: gate.allowed,
    applyBlockedReason: wantApply && !gate.allowed ? gate.reason : null,
    report,
    reportText,
    operatorHint,
    driftNotice,
    showFloatingNotice: !ok || driftNotice?.active === true,
  };
}
