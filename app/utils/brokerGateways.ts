/**
 * Broker / carrier portal adapters — outbound evidence submission.
 * Production deployments should mount mTLS material and OAuth2 client credentials per carrier runbook.
 */

import type { BulkEvidenceBundle } from "@/app/types/bulkEvidenceBundle";
import type { CarrierKey } from "@/app/utils/carrierTemplates";

/** OAuth2 client-credentials profile (2026 financial API baseline). */
export type BrokerOAuth2Config = {
  tokenUrl: string;
  clientId: string;
  /** Env var name holding client secret — never embed secrets in source. */
  clientSecretEnvVar: string;
  scope: string;
};

/** Mutual TLS material — PEM paths supplied via secure vault / sidecar. */
export type BrokerMtlsConfig = {
  clientCertPathEnvVar: string;
  clientKeyPathEnvVar: string;
  caBundlePathEnvVar?: string;
};

export type BrokerOutboundPrepare = {
  oauth?: BrokerOAuth2Config;
  mtls?: BrokerMtlsConfig;
};

/** Headers after OAuth2 access token issuance (client_credentials or mTLS-bound STS). */
export function brokerBearerHeaders(accessToken: string): Record<string, string> {
  return { Authorization: `Bearer ${accessToken}` };
}

/**
 * Placeholder for Node `https.Agent` / undici `Agent` wiring with client cert + CA.
 * Real implementation: load PEMs from paths in `BrokerMtlsConfig` and pass to `fetch(..., { dispatcher })`.
 */
export function describeMtlsReadiness(config: BrokerMtlsConfig | undefined): string {
  if (!config) {
    return "mTLS: not configured — set client cert/key env paths before outbound submission.";
  }
  return `mTLS: prepared for ${config.clientCertPathEnvVar} + ${config.clientKeyPathEnvVar} (PEM via vault).`;
}

const CHUBB_BASE = "https://api.cyber-submissions.chubb-insurance.example";
const BEAZLEY_BASE = "https://ingest.cyber.beazley.example";
const MUNICH_BASE = "https://fac-api.munichre-cyber.example";

export type CarrierBrokerRoute = {
  carrier: CarrierKey;
  /** Absolute URL the bulk bundle POST would target (illustrative). */
  bulkEvidenceUrl: string;
  method: "POST";
  apiVersion: string;
};

export function getCarrierBrokerRoute(carrier: CarrierKey): CarrierBrokerRoute {
  switch (carrier) {
    case "GENERIC":
      return {
        carrier: "GENERIC",
        bulkEvidenceUrl: `${CHUBB_BASE}/v2026/generic/grc-bundles`,
        method: "POST",
        apiVersion: "2026.01",
      };
    case "CHUBB":
      return {
        carrier: "CHUBB",
        bulkEvidenceUrl: `${CHUBB_BASE}/v2026/interconnected-risk/bundles`,
        method: "POST",
        apiVersion: "2026.01",
      };
    case "BEAZLEY":
      return {
        carrier: "BEAZLEY",
        bulkEvidenceUrl: `${BEAZLEY_BASE}/v2026/incident-lifecycle/bulk-evidence`,
        method: "POST",
        apiVersion: "2026.01",
      };
    case "MUNICH_RE":
      return {
        carrier: "MUNICH_RE",
        bulkEvidenceUrl: `${MUNICH_BASE}/v2026/actuarial/ale-bundles`,
        method: "POST",
        apiVersion: "2026.01",
      };
    default:
      return {
        carrier: "GENERIC",
        bulkEvidenceUrl: `${CHUBB_BASE}/v2026/generic/grc-bundles`,
        method: "POST",
        apiVersion: "2026.01",
      };
  }
}

/**
 * Placeholder — would chain: mTLS agent → OAuth2 token → signed JSON body + correlation id.
 */
export async function sendToChubb(
  bundle: BulkEvidenceBundle,
  apiKey: string,
  prepare?: BrokerOutboundPrepare,
): Promise<{ ok: boolean; status: number; detail: string }> {
  void bundle;
  void apiKey;
  void prepare;
  return {
    ok: false,
    status: 501,
    detail: "Chubb adapter not executed — configure mTLS + OAuth2 and enable outbound integration.",
  };
}

export async function sendToBeazley(
  bundle: BulkEvidenceBundle,
  apiKey: string,
  prepare?: BrokerOutboundPrepare,
): Promise<{ ok: boolean; status: number; detail: string }> {
  void bundle;
  void apiKey;
  void prepare;
  return {
    ok: false,
    status: 501,
    detail: "Beazley adapter not executed — configure mTLS + OAuth2 and enable outbound integration.",
  };
}

export async function sendToMunichRe(
  bundle: BulkEvidenceBundle,
  apiKey: string,
  prepare?: BrokerOutboundPrepare,
): Promise<{ ok: boolean; status: number; detail: string }> {
  void bundle;
  void apiKey;
  void prepare;
  return {
    ok: false,
    status: 501,
    detail: "Munich Re adapter not executed — configure mTLS + OAuth2 and enable outbound integration.",
  };
}

export const DEFAULT_BROKER_OUTBOUND_PREPARE: BrokerOutboundPrepare = {
  oauth: {
    tokenUrl: "https://auth.broker-portal.example/oauth2/token",
    clientId: "ironframe-evidence-integrator",
    clientSecretEnvVar: "BROKER_OAUTH_CLIENT_SECRET",
    scope: "evidence.bundles.submit",
  },
  mtls: {
    clientCertPathEnvVar: "BROKER_MTLS_CLIENT_CERT_PATH",
    clientKeyPathEnvVar: "BROKER_MTLS_CLIENT_KEY_PATH",
    caBundlePathEnvVar: "BROKER_MTLS_CA_BUNDLE_PATH",
  },
};
