import { researchBuyingCommitteeForAllSuspects } from "../../app/lib/server/ironleadsBuyingCommitteeResearchCore";

async function main() {
  const r = await researchBuyingCommitteeForAllSuspects();
  console.log(
    JSON.stringify(
      {
        total: r.total,
        researched: r.researched,
        skipped: r.skipped,
        companies: r.results.map((x) => ({
          company: x.company,
          skipped: x.skipped,
          skipReason: x.skipReason,
          websiteUrl: x.websiteUrl,
          members: x.members?.length ?? 0,
        })),
      },
      null,
      2,
    ),
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
