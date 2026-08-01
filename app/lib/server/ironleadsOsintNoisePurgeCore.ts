import "server-only";

import { looksLikeOsintTitleNoise } from "@/app/lib/server/ironleadsBuyingCommitteeExtract";
import prisma from "@/lib/prisma";

/**
 * Hard-delete a SUSPECT contact + its deals (title-noise / non-company harvest rows).
 * Returns false when the contact is missing or not SUSPECT-stage.
 */
export async function discardIronleadsSuspectContact(contactId: string): Promise<{
  ok: boolean;
  error?: string;
  status?: number;
}> {
  const contact = await prisma.ironboardCrmContact.findUnique({
    where: { id: contactId },
    select: {
      id: true,
      company: true,
      primaryDeals: {
        select: { id: true, stage: true },
      },
    },
  });
  if (!contact) {
    return { ok: false, error: "Contact not found", status: 404 };
  }

  const suspectDeals = contact.primaryDeals.filter((d) => d.stage === "SUSPECT");
  if (suspectDeals.length === 0) {
    return {
      ok: false,
      error: "Only SUSPECT-stage contacts can be discarded",
      status: 400,
    };
  }

  await deleteSuspectContactGraph(contact.id, contact.primaryDeals.map((d) => d.id));
  return { ok: true };
}

async function deleteSuspectContactGraph(contactId: string, dealIds: string[]): Promise<void> {
  if (dealIds.length) {
    await prisma.ironboardCrmInteraction.deleteMany({
      where: { dealId: { in: dealIds } },
    });
    await prisma.ironboardCrmDeal.deleteMany({
      where: { id: { in: dealIds } },
    });
  }
  await prisma.ironboardCrmInteraction.deleteMany({
    where: { contactId },
  });
  await prisma.ironboardCrmContact.delete({ where: { id: contactId } });
}

/**
 * Remove SUSPECT rows whose company name is OSINT title / directive noise
 * (e.g. "BOD 26-04 Prioritizing Security").
 */
export async function purgeOsintTitleNoiseSuspects(): Promise<{ removedContacts: number }> {
  const suspects = await prisma.ironboardCrmContact.findMany({
    where: { primaryDeals: { some: { stage: "SUSPECT" } } },
    select: {
      id: true,
      company: true,
      primaryDeals: {
        where: { stage: "SUSPECT" },
        select: { id: true },
      },
    },
  });

  let removedContacts = 0;
  for (const row of suspects) {
    if (!looksLikeOsintTitleNoise(row.company)) continue;
    const dealIds = row.primaryDeals.map((d) => d.id);
    await deleteSuspectContactGraph(row.id, dealIds);
    removedContacts += 1;
  }

  return { removedContacts };
}
