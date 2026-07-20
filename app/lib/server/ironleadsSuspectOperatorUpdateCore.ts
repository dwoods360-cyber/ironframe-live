import "server-only";

import type { Prisma } from "@prisma/client";

import { looksLikeOsintTitleNoise } from "@/app/lib/server/ironleadsBuyingCommitteeExtract";
import { buildIronleadsSuspectReport } from "@/app/lib/server/ironleadsSuspectReportCore";
import prisma from "@/lib/prisma";

export type SuspectOperatorUpdateInput = {
  fullName?: string;
  email?: string;
  phone?: string | null;
  title?: string;
  company?: string;
  websiteUrl?: string | null;
  addressLine?: string | null;
  namedBuyerFullName?: string | null;
  namedBuyerTitle?: string | null;
  clearNamedBuyer?: boolean;
  promoteToProspect?: boolean;
  operatorNote?: string | null;
};

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return value as Record<string, unknown>;
}

function cleanOptional(value: string | null | undefined, max: number): string | null {
  if (value == null) return null;
  const trimmed = value.trim().replace(/\s+/g, " ");
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Operator HITL enrichment for Ironleads SUSPECT contacts — demographics + optional promote.
 */
export async function updateIronleadsSuspectContact(
  contactId: string,
  input: SuspectOperatorUpdateInput,
): Promise<
  | { ok: true; report: NonNullable<Awaited<ReturnType<typeof buildIronleadsSuspectReport>>> }
  | { ok: false; error: string; status: number }
> {
  const contact = await prisma.ironboardCrmContact.findUnique({
    where: { id: contactId },
    include: {
      primaryDeals: {
        orderBy: { updatedAt: "desc" },
        take: 1,
      },
    },
  });
  if (!contact) {
    return { ok: false, error: "Contact not found", status: 404 };
  }

  const deal = contact.primaryDeals[0] ?? null;
  const meta = asRecord(contact.metadata);
  const nextMeta: Record<string, unknown> = { ...meta };

  const data: Prisma.IronboardCrmContactUpdateInput = {};

  if (input.fullName !== undefined) {
    const fullName = cleanOptional(input.fullName, 200);
    if (!fullName) return { ok: false, error: "fullName is required", status: 400 };
    if (looksLikeOsintTitleNoise(fullName)) {
      return {
        ok: false,
        error: "fullName looks like page/title noise — enter a real person or role label",
        status: 400,
      };
    }
    data.fullName = fullName;
  }

  if (input.email !== undefined) {
    const email = cleanOptional(input.email, 320)?.toLowerCase();
    if (!email || !isValidEmail(email)) {
      return { ok: false, error: "email must be a valid address", status: 400 };
    }
    data.email = email;
  }

  if (input.phone !== undefined) {
    data.phone = cleanOptional(input.phone, 40);
  }

  if (input.title !== undefined) {
    data.title = cleanOptional(input.title, 200) ?? "";
  }

  if (input.company !== undefined) {
    const company = cleanOptional(input.company, 200);
    if (!company) return { ok: false, error: "company is required", status: 400 };
    data.company = company;
  }

  if (input.websiteUrl !== undefined) {
    const websiteUrl = cleanOptional(input.websiteUrl, 320);
    nextMeta.websiteUrl = websiteUrl;
  }

  if (input.addressLine !== undefined) {
    const line = cleanOptional(input.addressLine, 400);
    if (line) {
      nextMeta.addressLine = line;
      nextMeta.address = {
        ...(asRecord(meta.address) ?? {}),
        street: line,
        city: null,
        state: null,
        zip: null,
        country: null,
      };
    } else {
      delete nextMeta.addressLine;
      delete nextMeta.address;
    }
  }

  if (input.clearNamedBuyer) {
    delete nextMeta.namedBuyer;
  } else if (input.namedBuyerFullName !== undefined || input.namedBuyerTitle !== undefined) {
    const priorBuyer = asRecord(meta.namedBuyer);
    const fullName =
      input.namedBuyerFullName !== undefined
        ? cleanOptional(input.namedBuyerFullName, 200)
        : cleanOptional(typeof priorBuyer.fullName === "string" ? priorBuyer.fullName : null, 200);
    if (!fullName) {
      delete nextMeta.namedBuyer;
    } else if (looksLikeOsintTitleNoise(fullName)) {
      return {
        ok: false,
        error: "namedBuyerFullName looks like page/title noise — clear or enter a real name",
        status: 400,
      };
    } else {
      nextMeta.namedBuyer = {
        ...priorBuyer,
        fullName,
        title:
          input.namedBuyerTitle !== undefined
            ? cleanOptional(input.namedBuyerTitle, 200)
            : cleanOptional(typeof priorBuyer.title === "string" ? priorBuyer.title : null, 200),
        note: "Operator-corrected on SUSPECT intake report",
        seededAt: new Date().toISOString(),
      };
    }
  }

  const stamp = new Date().toISOString();
  nextMeta.operatorEnrichment = {
    ...(asRecord(meta.operatorEnrichment) ?? {}),
    lastUpdatedAt: stamp,
    lastNote: cleanOptional(input.operatorNote, 500),
  };

  data.metadata = nextMeta as Prisma.InputJsonValue;

  await prisma.ironboardCrmContact.update({
    where: { id: contact.id },
    data,
  });

  if (deal && input.promoteToProspect) {
    if (deal.stage === "PROSPECT") {
      // already there
    } else if (deal.stage !== "SUSPECT") {
      return {
        ok: false,
        error: `Cannot promote from stage ${deal.stage} (expected SUSPECT)`,
        status: 400,
      };
    } else {
      const noteLine = `[${stamp}] Operator promoted SUSPECT → PROSPECT from intake report.${
        input.operatorNote?.trim() ? ` ${input.operatorNote.trim().slice(0, 400)}` : ""
      }`;
      await prisma.ironboardCrmDeal.update({
        where: { id: deal.id },
        data: {
          stage: "PROSPECT",
          notes: deal.notes?.trim() ? `${deal.notes.trim()}\n${noteLine}` : noteLine,
        },
      });
    }
  } else if (deal && input.operatorNote?.trim() && !input.promoteToProspect) {
    const noteLine = `[${stamp}] Operator enrichment: ${input.operatorNote.trim().slice(0, 400)}`;
    await prisma.ironboardCrmDeal.update({
      where: { id: deal.id },
      data: {
        notes: deal.notes?.trim() ? `${deal.notes.trim()}\n${noteLine}` : noteLine,
      },
    });
  }

  const report = await buildIronleadsSuspectReport(contactId);
  if (!report) {
    return { ok: false, error: "Updated but report reload failed", status: 500 };
  }
  return { ok: true, report };
}
