import { PRODUCT_MATRIX, type ProductMatrixEntry } from '../staticContext.js';

export type ProductMatrixHealthRow = {
  key: string;
  name: string;
  priority: string;
  port: number;
  healthUrl: string;
  reachable: boolean;
  status: string | null;
  latencyMs: number | null;
  crmStage?: string | null;
};

export type ProductMatrixHealthSnapshot = {
  checkedAt: string;
  services: ProductMatrixHealthRow[];
};

function serviceBaseUrl(entry: ProductMatrixEntry): string {
  const raw = process.env[entry.envUrlKey]?.trim();
  if (raw) return raw.replace(/\/$/, "");
  // Cloud Run listens on $PORT (8080); boardroom local default is still entry.port (8082).
  if (entry.key === "ironboard-exec") {
    const port = Number(process.env.PORT) || entry.port;
    return `http://127.0.0.1:${port}`;
  }
  return `http://127.0.0.1:${entry.port}`;
}

async function probeEntry(entry: ProductMatrixEntry): Promise<ProductMatrixHealthRow> {
  const base = serviceBaseUrl(entry);
  const healthUrl = `${base}${entry.healthPath}`;
  const started = Date.now();

  try {
    const response = await fetch(healthUrl, {
      cache: "no-store",
      signal: AbortSignal.timeout(4_000),
    });
    const latencyMs = Date.now() - started;
    let status: string | null = null;

    if (entry.healthPath.endsWith("/health") || entry.healthPath.endsWith("/api/health")) {
      try {
        const body = (await response.json()) as { status?: string; service?: string; ok?: boolean };
        status = body.status ?? body.service ?? (body.ok ? "OK" : null);
      } catch {
        status = response.ok ? "OK" : `HTTP ${response.status}`;
      }
    } else {
      status = response.ok ? "OK" : `HTTP ${response.status}`;
    }

    return {
      key: entry.key,
      name: entry.name,
      priority: entry.priority,
      port: entry.port,
      healthUrl,
      reachable: response.ok,
      status,
      latencyMs,
      crmStage: entry.crmStage ?? null,
    };
  } catch {
    return {
      key: entry.key,
      name: entry.name,
      priority: entry.priority,
      port: entry.port,
      healthUrl,
      reachable: false,
      status: null,
      latencyMs: Date.now() - started,
      crmStage: entry.crmStage ?? null,
    };
  }
}

export async function buildProductMatrixHealthSnapshot(): Promise<ProductMatrixHealthSnapshot> {
  const services = await Promise.all(PRODUCT_MATRIX.map((entry) => probeEntry(entry)));
  return {
    checkedAt: new Date().toISOString(),
    services,
  };
}

/** Deterministic board answer for perimeter / product-matrix health (red ≠ labor market). */
export function formatPerimeterWorkforceHealthAnswer(
  snapshot: ProductMatrixHealthSnapshot,
): string {
  const perimeter = snapshot.services.filter((row) =>
    /ironleads|salesteam|ironsuccess|ironsupport|ironboard-exec|ironframe/i.test(row.key + row.name),
  );
  const rows = (perimeter.length ? perimeter : snapshot.services).map((row) => {
    const state = row.reachable
      ? `green / reachable${row.latencyMs != null ? ` (${row.latencyMs}ms)` : ''}`
      : "red / unreachable (health probe failed)";
    return `- ${row.name} :${row.port} — ${state}; priority label ${row.priority} (static ops priority, not severity of being down)`;
  });
  const down = snapshot.services.filter((row) => !row.reachable);
  const summary =
    down.length === 0
      ? "Live product-matrix probes currently report all listed services reachable; if a UI dot still looks red, refresh the panel — the last probe may be stale."
      : `Live product-matrix probes mark ${down.length} service${down.length === 1 ? "" : "s"} unreachable: ${down
          .map((row) => `${row.name} (:${row.port})`)
          .join(", ")}.`;

  return [
    "Those red workforce indicators are the Ironboard product-matrix / Ops Hub perimeter fleet health dots — not U.S. labor-market statistics, and not CRM pipeline stage health.",
    "Red means the board could not reach that worker's health endpoint from this host; HIGH on Ironleads, SalesTeam, IronSuccessTeam, and IronSupportTeam is the static operational priority on each matrix row and stays HIGH whether the service is up or down.",
    `${summary} Probe checkedAt=${snapshot.checkedAt}.`,
    rows.join("\n"),
  ].join("\n\n");
}
