/**
 * Ironintel OSINT sweep ingress — loads manifest from disk, Irongate-validates, persists to CRM.
 * Run: npx tsx scripts/ingest-strategic-intel-manifest.ts
 */
import dotenv from "dotenv";
import { ingestGrcProfessionalResearchCorpus } from "../Ironboard/src/services/crm/strategicIntelIngress.js";
import { validateStrategicIntelManifest } from "../Ironboard/src/services/crm/strategicIntelSanitizer.js";
import { loadGrcProfessionalManifestFromDisk } from "../Ironboard/src/services/crm/strategicIntelManifestLoader.js";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

async function main(): Promise<void> {
  console.log("=== Irongate DMZ pre-flight (schema + BIGINT-cent gate) ===");
  const manifest = loadGrcProfessionalManifestFromDisk();
  validateStrategicIntelManifest(manifest);
  console.log(`   manifestId=${manifest.manifestId}`);
  console.log(`   generatedAt=${manifest.generatedAt}`);
  console.log(`   documents=${manifest.documents.length} ragChunks=${manifest.ragChunks.length}`);

  console.log("\n=== Persist Strategic Intel Update to CRM ===");
  const result = await ingestGrcProfessionalResearchCorpus();

  if (result.skippedDuplicate) {
    console.log(`⚠ Already ingested (${result.manifestId}) at ${result.ingestedAt}`);
  } else {
    console.log(`✅ Ingested ${result.manifestId} → interaction ${result.interactionId}`);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
