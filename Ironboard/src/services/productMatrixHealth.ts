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
