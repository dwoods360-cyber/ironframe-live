import "server-only";

import prisma from "@/lib/prisma";

export type RecordProspectLeadInput = {
  orgName: string;
  slug: string;
  email: string;
  reportedAle: bigint;
};

/**
 * Persist a vetted sales lead for Board / executive aggregation queries.
 * Upserts on slug so re-intake refreshes operator email and reported ALE.
 */
export async function recordProspectLead(input: RecordProspectLeadInput) {
  const orgName = input.orgName.trim();
  const slug = input.slug.trim().toLowerCase();
  const email = input.email.trim().toLowerCase();

  return prisma.prospect.upsert({
    where: { slug },
    create: {
      orgName,
      slug,
      email,
      reportedAle: input.reportedAle,
    },
    update: {
      orgName,
      email,
      reportedAle: input.reportedAle,
    },
  });
}
