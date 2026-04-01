/**
 * Initializes G:\ironframe_store (SSD cold-store mock) for Scenario 5 LKG attestation.
 * Run on Windows where G: is available: npm run cold-store:init
 *
 * Writes manifest `lkg_signatures.json` with the constitutional 19-agent Iron roster (mock SHA-256 per agent).
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = "G:\\ironframe_store";
const LKG_BIN = path.join(ROOT, "lkg_binaries");
const CHECKPOINTS = path.join(ROOT, "checkpoints");
const MANIFEST = path.join(ROOT, "manifest");
const SIGNATURES = path.join(MANIFEST, "lkg_signatures.json");

/** Must match `LKG_WORKFORCE_ROSTER` in `app/lib/integrityVaultServer.ts`. */
const IRON_ROSTER = [
  "Ironcore",
  "Ironwave",
  "Irontrust",
  "Ironsight",
  "Ironscribe",
  "Ironlock",
  "Ironcast",
  "Ironintel",
  "Ironlogic",
  "Ironmap",
  "Irontech",
  "Ironguard",
  "Ironwatch",
  "Irongate",
  "Ironquery",
  "Ironscout",
  "Ironbloom",
  "Ironethic",
  "Irontally",
];

function mockSha256(index) {
  const p = String(index).padStart(2, "0");
  return `${p}${"ab".repeat(31)}`.slice(0, 64);
}

const manifestPayload = {
  timestamp: "2026-03-31T20:00:00Z",
  vault_status: "LOCKED",
  agents: IRON_ROSTER.map((name, i) => ({
    name: name.toLowerCase(),
    version: "1.0.0",
    sha256: `${mockSha256(i)}_mock`,
  })),
};

function main() {
  try {
    fs.mkdirSync(LKG_BIN, { recursive: true });
    fs.mkdirSync(CHECKPOINTS, { recursive: true });
    fs.mkdirSync(MANIFEST, { recursive: true });
  } catch (e) {
    console.error("[cold-store] Failed to create directories (is G: available?)", e);
    process.exit(1);
  }

  fs.writeFileSync(SIGNATURES, `${JSON.stringify(manifestPayload, null, 2)}\n`, "utf8");
  console.log(`[cold-store] Wrote ${SIGNATURES}`);

  const bins = ["ironcore.bin", "irontech.bin", "ironlock.bin"];
  for (const name of bins) {
    const p = path.join(LKG_BIN, name);
    fs.writeFileSync(
      p,
      `IRONFRAME LKG PLACEHOLDER — ${name} — immutable gold image stub\n`,
      "utf8",
    );
    console.log(`[cold-store] Wrote ${p}`);
  }

  const ck = path.join(CHECKPOINTS, ".cold_store_ready");
  fs.writeFileSync(ck, "checkpoints root initialized\n", "utf8");
  console.log(`[cold-store] Ready under ${ROOT}`);
}

main();
