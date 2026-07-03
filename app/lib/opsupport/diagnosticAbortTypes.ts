/** `SystemHealthLog.serviceKey` for cooperative fetch abort / client disconnect telemetry. */
export const DIAGNOSTIC_FETCH_ABORT_SERVICE_KEY = "diagnostic.fetch.abort";

export type DiagnosticAbortInput = {
  reason: string;
  surface?: string;
  path?: string;
  method?: string;
};

export type DiagnosticAbortLogRow = {
  id: string;
  createdAt: string;
  reason: string;
  surface: string | null;
  path: string | null;
  method: string | null;
};
