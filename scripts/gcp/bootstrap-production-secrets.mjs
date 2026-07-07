#!/usr/bin/env node
/**
 * Idempotent sync of production secrets into GCP Secret Manager for sovereign-sentinel.
 * Values are read from the current shell environment ΓÇö never pass secrets on the CLI.
 *
 * Prerequisite: gcloud authenticated as project Owner.
 *
 *   export GCP_PROJECT_ID=ironframe-prod
 *   export DATABASE_URL='...'          # Supabase pooler URL (same as Vercel)
 *   export DIRECT_URL='...'
 *   export SUPABASE_URL='https://....supabase.co'
 *   export SUPABASE_SERVICE_ROLE_KEY='eyJ...'
 *   export GOOGLE_API_KEY='...'
 *   export IRONLEADS_INGRESS_SECRET='...'
 *   export SALESTEAM_INGRESS_SECRET='...'
 *   export SUCCESS_TEAM_INGRESS_SECRET='...'
 *   node scripts/gcp/bootstrap-production-secrets.mjs
 */

import { spawnSync } from "node:child_process";

const PROJECT_ID = process.env.GCP_PROJECT_ID?.trim() || process.env.GOOGLE_CLOUD_PROJECT?.trim();
const RUNTIME_SA =
  process.env.GCP_CLOUD_RUN_RUNTIME_SA?.trim() ||
  (PROJECT_ID ? `ironframe-gcp-sa-key@${PROJECT_ID}.iam.gserviceaccount.com` : "");

/** Secret Manager secret id === Cloud Run runtime env var name */
const SECRET_ENV_KEYS = [
  "DATABASE_URL",
  "DIRECT_URL",
  "SUPABASE_URL",
  "SUPABASE_SERVICE_ROLE_KEY",
  "GOOGLE_API_KEY",
  "IRONLEADS_INGRESS_SECRET",
  "SALESTEAM_INGRESS_SECRET",
  "SUCCESS_TEAM_INGRESS_SECRET",
];

const gcloudShell = process.platform === "win32";

function gcloud(args, { input } = {}) {
  const result = spawnSync("gcloud", args, {
    encoding: "utf8",
    input,
    shell: gcloudShell,
  });
  if (result.status !== 0) {
    const detail = [result.stdout, result.stderr].filter(Boolean).join("\n").trim();
    throw new Error(`gcloud ${args.join(" ")}\n${detail}`);
  }
  return (result.stdout || "").trim();
}

function secretExists(name) {
  const result = spawnSync(
    "gcloud",
    ["secrets", "describe", name, `--project=${PROJECT_ID}`, "--format=value(name)"],
    { encoding: "utf8", shell: gcloudShell },
  );
  return result.status === 0;
}

function upsertSecret(name, value) {
  if (secretExists(name)) {
    gcloud(["secrets", "versions", "add", name, `--project=${PROJECT_ID}`, "--data-file=-"], { input: value });
    console.log(`updated secret ${name}`);
  } else {
    gcloud(
      [
        "secrets",
        "create",
        name,
        `--project=${PROJECT_ID}`,
        "--replication-policy=automatic",
        "--data-file=-",
      ],
      { input: value },
    );
    console.log(`created secret ${name}`);
  }
}

function grantAccessor(secretName) {
  gcloud([
    "secrets",
    "add-iam-policy-binding",
    secretName,
    `--project=${PROJECT_ID}`,
    `--member=serviceAccount:${RUNTIME_SA}`,
    "--role=roles/secretmanager.secretAccessor",
    "--quiet",
  ]);
  console.log(`secretAccessor on ${secretName} ΓåÆ ${RUNTIME_SA}`);
}

function main() {
  if (!PROJECT_ID) {
    console.error("Set GCP_PROJECT_ID (or GOOGLE_CLOUD_PROJECT) before running.");
    process.exit(1);
  }
  if (!RUNTIME_SA) {
    console.error("Could not resolve Cloud Run runtime service account.");
    process.exit(1);
  }

  gcloud([
    "services",
    "enable",
    "secretmanager.googleapis.com",
    "iam.googleapis.com",
    `--project=${PROJECT_ID}`,
    "--quiet",
  ]);

  const missing = SECRET_ENV_KEYS.filter((key) => !process.env[key]?.trim());
  if (missing.length > 0) {
    console.error(`Missing required env vars: ${missing.join(", ")}`);
    console.error("Export production values (mirror Vercel) and re-run.");
    process.exit(1);
  }

  for (const key of SECRET_ENV_KEYS) {
    upsertSecret(key, process.env[key].trim());
    grantAccessor(key);
  }

  console.log("\nDone. Re-run Sovereign Deploy (GCP) to attach secrets to Cloud Run.");
}

main();
