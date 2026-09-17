/**
 * LangGraph checkpoint tenant binding. Thread IDs are `{tenantUuid}::{threadKey}`.
 * Missing or nil tenant stamps fail closed — never return another tenant's state.
 */

export const NIL_TENANT_UUID = "00000000-0000-0000-0000-000000000000";
export const CHECKPOINT_THREAD_SEPARATOR = "::";

const TENANT_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const THREAD_TENANT_PREFIX_RE =
  /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})::/i;

export function requireCheckpointTenantUuid(tenantId: string | null | undefined): string {
  const id = tenantId?.trim() ?? "";
  if (!TENANT_UUID_RE.test(id) || id.toLowerCase() === NIL_TENANT_UUID) {
    throw new Error("IRONGUARD_SESSION_TENANT_UUID_REQUIRED");
  }
  return id.toLowerCase();
}

export function parseCheckpointThreadTenant(threadId: string | null | undefined): string | null {
  const thread = threadId?.trim() ?? "";
  const match = THREAD_TENANT_PREFIX_RE.exec(thread);
  if (!match?.[1]) return null;
  const tenant = match[1].toLowerCase();
  if (tenant === NIL_TENANT_UUID) return null;
  return tenant;
}

export function composeCheckpointThreadId(tenantId: string, threadId: string): string {
  const tenant = requireCheckpointTenantUuid(tenantId);
  const thread = threadId.trim();
  if (!thread) {
    throw new Error("CHECKPOINT_THREAD_ID_REQUIRED");
  }
  const existing = parseCheckpointThreadTenant(thread);
  if (existing) {
    if (existing !== tenant) {
      throw new Error(
        `CRITICAL_TENANT_VIOLATION: Thread ${thread} belongs to tenant ${existing}, not ${tenant}.`,
      );
    }
    return thread;
  }
  return `${tenant}${CHECKPOINT_THREAD_SEPARATOR}${thread}`;
}

export function tenantIdFromCheckpointValues(values: unknown): string | null {
  if (values == null || typeof values !== "object") return null;
  const record = values as Record<string, unknown>;
  const raw = record.tenant_id ?? record.tenantId;
  if (typeof raw !== "string" || !raw.trim()) return null;
  try {
    return requireCheckpointTenantUuid(raw);
  } catch {
    return null;
  }
}

export function assertCheckpointTenantParity(args: {
  callerTenant: string;
  threadId: string;
  channelValues?: unknown;
}): string {
  const caller = requireCheckpointTenantUuid(args.callerTenant);
  const fromThread = parseCheckpointThreadTenant(args.threadId);
  if (!fromThread) {
    throw new Error(
      `CRITICAL_TENANT_VIOLATION: Thread ${args.threadId.trim()} is not tenant-bound.`,
    );
  }
  if (fromThread !== caller) {
    throw new Error(
      `CRITICAL_TENANT_VIOLATION: Thread ${args.threadId.trim()} belongs to tenant ${fromThread}, not ${caller}.`,
    );
  }
  const stamped = tenantIdFromCheckpointValues(args.channelValues);
  if (!stamped) {
    throw new Error(
      `CRITICAL_TENANT_VIOLATION: Thread ${args.threadId.trim()} is missing a checkpoint tenant stamp.`,
    );
  }
  if (stamped !== caller) {
    throw new Error(
      `CRITICAL_TENANT_VIOLATION: Thread ${args.threadId.trim()} belongs to tenant ${stamped}, not ${caller}.`,
    );
  }
  return caller;
}
