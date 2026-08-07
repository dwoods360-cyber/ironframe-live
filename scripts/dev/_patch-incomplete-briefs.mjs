/**
 * Patch operator dossiers missing AccountResearchBriefPanel required arrays/objects.
 * Prevents digest 1456490624 (Cannot read properties of undefined reading 'length').
 */
import { resolve } from "node:path";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";

config({ path: resolve(process.cwd(), ".env.local"), override: true });
const p = new PrismaClient();
const TENANT = "11111111-1111-4111-8111-111111111111";
const now = new Date().toISOString();

function asRec(v) {
  return v && typeof v === "object" && !Array.isArray(v) ? { ...v } : null;
}

function normalizeBrief(brief) {
  const b = asRec(brief);
  if (!b) return null;
  let changed = false;
  if (!Array.isArray(b.triggerEvidence)) {
    b.triggerEvidence = [];
    changed = true;
  }
  if (!asRec(b.linkedInIntelligence)) {
    b.linkedInIntelligence = {
      urls: [],
      operatorPrompt:
        "Open company LinkedIn in a browser (link-only). Note hiring/posts for Path B timing — do not scrape.",
    };
    changed = true;
  } else {
    const li = asRec(b.linkedInIntelligence);
    if (!Array.isArray(li.urls)) {
      li.urls = [];
      changed = true;
    }
    if (typeof li.operatorPrompt !== "string") {
      li.operatorPrompt =
        "Open company LinkedIn in a browser (link-only). Note hiring/posts for Path B timing — do not scrape.";
      changed = true;
    }
    b.linkedInIntelligence = li;
  }
  if (!asRec(b.youtubeIntelligence)) {
    b.youtubeIntelligence = {
      urls: [],
      operatorPrompt: "No YouTube channel URL found yet.",
    };
    changed = true;
  } else {
    const yt = asRec(b.youtubeIntelligence);
    if (!Array.isArray(yt.urls)) {
      yt.urls = [];
      changed = true;
    }
    if (typeof yt.operatorPrompt !== "string") {
      yt.operatorPrompt = "No YouTube channel URL found yet.";
      changed = true;
    }
    b.youtubeIntelligence = yt;
  }
  if (!Array.isArray(b.sourceLedger)) {
    b.sourceLedger = [];
    changed = true;
  }
  if (!Array.isArray(b.buyerMap)) {
    b.buyerMap = [];
    changed = true;
  } else {
    b.buyerMap = b.buyerMap.map((row) => {
      const r = asRec(row) || {};
      if (!r.purchaseRole) {
        r.purchaseRole = "economic_buyer";
        changed = true;
      }
      return r;
    });
  }
  const outreach = asRec(b.outreach);
  if (outreach) {
    if (!Array.isArray(outreach.claimsToAvoid)) {
      outreach.claimsToAvoid = [];
      changed = true;
    }
    b.outreach = outreach;
  }
  return changed ? b : null;
}

try {
  const deals = await p.ironboardCrmDeal.findMany({
    where: { tenantId: TENANT, stage: { in: ["SUSPECT", "PROSPECT"] } },
    select: {
      primaryContact: { select: { id: true, company: true, metadata: true } },
    },
    take: 500,
  });

  const patched = [];
  for (const d of deals) {
    const c = d.primaryContact;
    if (!c) continue;
    const meta = asRec(c.metadata);
    if (!meta) continue;
    const nextBrief = normalizeBrief(meta.accountResearchBrief);
    if (!nextBrief) continue;
    await p.ironboardCrmContact.update({
      where: { id: c.id },
      data: {
        metadata: {
          ...meta,
          accountResearchBrief: {
            ...nextBrief,
            generatedAt: nextBrief.generatedAt || now,
          },
          briefShapePatchedAt: now,
        },
      },
    });
    patched.push(c.company);
  }

  console.log(JSON.stringify({ patchedCount: patched.length, patched }, null, 2));
} finally {
  await p.$disconnect();
}
