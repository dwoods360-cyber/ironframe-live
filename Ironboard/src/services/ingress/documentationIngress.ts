import type { Request } from "express";

import {
  fetchIronframeSharedContext,
  type CoreTelemetryBridgeInput,
} from "../coreTelemetryBridge.js";
import {
  isIronframeDocumentationBrief,
  type IronframeDocumentationBrief,
} from "../../types/ironframeDocumentationBrief.js";

export type DocumentationIngressResult = {
  ok: boolean;
  brief: IronframeDocumentationBrief | null;
  telemetryJson: string;
  error?: string;
};

function parseDocumentationBriefFromTelemetry(jsonBody: string): IronframeDocumentationBrief | null {
  try {
    const parsed = JSON.parse(jsonBody) as { documentationBrief?: unknown };
    if (isIronframeDocumentationBrief(parsed.documentationBrief)) {
      return parsed.documentationBrief;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * One-way ingress — Ironframe shared-context is the sole documentation brief source.
 * IronBoard Trainer / Writer agents must not author without a validated brief.
 */
export async function fetchIronframeDocumentationBrief(
  input: CoreTelemetryBridgeInput,
): Promise<DocumentationIngressResult> {
  try {
    const bridge = await fetchIronframeSharedContext(input);
    if (bridge.status !== 200) {
      return {
        ok: false,
        brief: null,
        telemetryJson: bridge.jsonBody,
        error: `Ironframe shared-context HTTP ${bridge.status}`,
      };
    }

    const brief = parseDocumentationBriefFromTelemetry(bridge.jsonBody);
    if (!brief) {
      return {
        ok: false,
        brief: null,
        telemetryJson: bridge.jsonBody,
        error: "documentationBrief missing or invalid in shared-context payload",
      };
    }

    return { ok: true, brief, telemetryJson: bridge.jsonBody };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, brief: null, telemetryJson: "", error: message };
  }
}

export function buildDocumentationIngressFromRequest(
  req: Pick<Request, "headers">,
  tenantId?: string,
): CoreTelemetryBridgeInput {
  return { incomingRequest: req, tenantId };
}
