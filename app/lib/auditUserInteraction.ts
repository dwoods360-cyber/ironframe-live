import type { CreateAuditLogInput } from "@/app/utils/auditLogger";

export type UserInteractionClickPayload = {
  action: "USER_INTERACTION_CLICK";
  targetId: string | null;
  targetName: string | null;
  targetLabel: string;
  componentContext: string;
  tenantScope: {
    uuid: string | null;
    key: string | null;
    label: string | null;
  };
  path: string;
  actorId?: string;
};

const INTERACTIVE_SELECTOR =
  "button,a,input,select,textarea,label,[role='button'],[data-audit-target]";

function trimLabel(raw: string, max = 96): string {
  const collapsed = raw.replace(/\s+/g, " ").trim();
  if (!collapsed) return "";
  return collapsed.length > max ? `${collapsed.slice(0, max - 1)}…` : collapsed;
}

function readElementLabel(el: HTMLElement): string {
  const auditTarget = el.getAttribute("data-audit-target")?.trim();
  if (auditTarget) return auditTarget;

  const aria = el.getAttribute("aria-label")?.trim();
  if (aria) return aria;

  const title = el.getAttribute("title")?.trim();
  if (title) return title;

  if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
    const placeholder = el.getAttribute("placeholder")?.trim();
    if (placeholder) return placeholder;
    if (el.value.trim()) return trimLabel(el.value, 48);
  }

  if (el instanceof HTMLOptionElement && el.textContent) {
    return trimLabel(el.textContent);
  }

  if (el instanceof HTMLSelectElement && el.selectedOptions[0]?.textContent) {
    return trimLabel(el.selectedOptions[0].textContent);
  }

  const text = el.innerText ?? el.textContent ?? "";
  const trimmed = trimLabel(text);
  if (trimmed) return trimmed;

  const id = el.id?.trim();
  if (id) return id;

  const name = el.getAttribute("name")?.trim();
  if (name) return name;

  return el.tagName.toLowerCase();
}

function resolveComponentContext(el: HTMLElement): string {
  const section =
    el.closest("[data-audit-section]")?.getAttribute("data-audit-section")?.trim() ||
    el.closest("[data-section]")?.getAttribute("data-section")?.trim() ||
    el.closest("[data-testid]")?.getAttribute("data-testid")?.trim();
  if (section) return section;
  return window.location.pathname || "dashboard";
}

/** Resolve nearest interactive ancestor and semantic click label. */
export function resolveClickTargetDescriptor(target: Element): Omit<
  UserInteractionClickPayload,
  "action" | "tenantScope" | "path" | "actorId"
> | null {
  if (!(target instanceof Element)) return null;

  const interactive = target.closest(INTERACTIVE_SELECTOR);
  if (!(interactive instanceof HTMLElement)) return null;

  if (interactive.closest("[data-audit-ignore='true']")) return null;

  const targetLabel = readElementLabel(interactive);
  if (!targetLabel) return null;

  return {
    targetId: interactive.id?.trim() || null,
    targetName: interactive.getAttribute("name")?.trim() || null,
    targetLabel,
    componentContext: resolveComponentContext(interactive),
  };
}

/** Ironscribe (Agent 5) structured line + Ironcast broadcast copy. */
export function formatUserInteractionAuditEntry(
  payload: UserInteractionClickPayload,
): { ledgerEntry: CreateAuditLogInput; ironcastLine: string; headline: string } {
  const actor = payload.actorId?.trim() || "Dereck";
  const tenantLabel =
    payload.tenantScope.label?.trim() ||
    payload.tenantScope.key?.trim() ||
    payload.tenantScope.uuid?.trim() ||
    "global";

  const headline = `${payload.targetLabel}`;
  const actionDetail = `Clicked ${payload.targetLabel}${payload.targetId ? ` (#${payload.targetId})` : ""}`;
  const ironscribeMessage = [
    `USER_INTERACTION_CLICK — ${headline}`,
    `Action: ${actionDetail}`,
    `Context: ${payload.componentContext}`,
    `Tenant scope: ${tenantLabel}`,
    `Actor: USER_ANALYST (${actor})`,
  ].join(" | ");

  const metadataParts = [
    "USER_INTERACTION",
    `context:${payload.componentContext}`,
    `tenant:${tenantLabel}`,
    payload.path ? `path:${payload.path}` : null,
    payload.targetId ? `targetId:${payload.targetId}` : null,
    payload.targetName ? `targetName:${payload.targetName}` : null,
  ].filter(Boolean);

  const ledgerEntry: CreateAuditLogInput = {
    action_type: "USER_INTERACTION_CLICK",
    log_type: "GRC",
    user_id: actor,
    metadata_tag: metadataParts.join("|"),
    forensic: {
      sourceName: "USER_ANALYST",
      eventLevel: "blue_team",
      message: ironscribeMessage,
      statusIcon: "✓",
    },
  };

  const ironcastLine = `> [Ironcast] USER_INTERACTION_CLICK — ${headline} · ${payload.componentContext}`;

  return { ledgerEntry, ironcastLine, headline };
}
