import { GoogleGenAI } from "@google/genai";

import { getIronboardApiKey, getIronboardGeminiModel } from "../loadIronboardEnv.js";
import { resolveIronframeCoreOrigin } from "../services/coreTelemetryBridge.js";

export type GeminiKeyShapeCheck = {
  ok: boolean;
  present: boolean;
  length: number;
  startsWithAIza: boolean;
  looksEmailLike: boolean;
  reason: string | null;
};

export type IronboardReadinessSnapshot = {
  ready: boolean;
  checkedAt: string;
  geminiKey: GeminiKeyShapeCheck;
  geminiProbe: {
    ok: boolean;
    skipped: boolean;
    model: string;
    detail: string | null;
  };
  coreTelemetry: {
    ok: boolean;
    origin: string;
    detail: string | null;
  };
};

/** Reject empty / mangled / email-glued Google AI Studio keys. */
export function inspectGeminiApiKeyShape(raw: string | undefined): GeminiKeyShapeCheck {
  const key = raw?.trim() ?? "";
  const present = key.length > 0;
  const length = key.length;
  const startsWithAIza = key.startsWith("AIza");
  const looksEmailLike = key.includes("@");

  if (!present) {
    return {
      ok: false,
      present: false,
      length: 0,
      startsWithAIza: false,
      looksEmailLike: false,
      reason: "GOOGLE_API_KEY missing",
    };
  }
  if (looksEmailLike) {
    return {
      ok: false,
      present: true,
      length,
      startsWithAIza,
      looksEmailLike: true,
      reason: "GOOGLE_API_KEY looks email-mangled (contains @)",
    };
  }
  if (length < 30 || length > 64) {
    return {
      ok: false,
      present: true,
      length,
      startsWithAIza,
      looksEmailLike: false,
      reason: `GOOGLE_API_KEY length ${length} outside expected 30–64`,
    };
  }
  if (!startsWithAIza) {
    return {
      ok: false,
      present: true,
      length,
      startsWithAIza: false,
      looksEmailLike: false,
      reason: "GOOGLE_API_KEY does not start with AIza",
    };
  }
  return {
    ok: true,
    present: true,
    length,
    startsWithAIza: true,
    looksEmailLike: false,
    reason: null,
  };
}

async function probeGeminiOnce(apiKey: string, model: string): Promise<{ ok: boolean; detail: string | null }> {
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model,
      contents: "Reply with exactly: ok",
    });
    const text = String(response.text ?? "").trim().toLowerCase();
    if (!text) {
      return { ok: false, detail: "Gemini returned an empty body" };
    }
    return { ok: true, detail: null };
  } catch (err) {
    const detail = err instanceof Error ? err.message.slice(0, 240) : String(err ?? "gemini probe failed");
    return { ok: false, detail };
  }
}

async function probeCoreTelemetry(origin: string): Promise<{ ok: boolean; detail: string | null }> {
  const url = `${origin.replace(/\/$/, "")}/api/board/shared-context`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(url, {
      method: "GET",
      headers: {
        Accept: "application/json",
        "x-ironboard-telemetry-bridge": "1",
        Cookie: `ironframe-tenant=${process.env.IRONBOARD_BOARD_ORG_TENANT_UUID?.trim() || "pilot1"}`,
      },
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) {
      return { ok: false, detail: `shared-context HTTP ${response.status}` };
    }
    return { ok: true, detail: null };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      return { ok: false, detail: "shared-context probe timed out" };
    }
    const detail = err instanceof Error ? err.message.slice(0, 240) : "shared-context unreachable";
    return { ok: false, detail };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Self-heal readiness: key shape + Ironframe core reachability + optional live Gemini ping.
 * Use as Cloud Run /ready before sending operator traffic.
 */
export async function buildIronboardReadiness(options?: {
  probeGemini?: boolean;
}): Promise<IronboardReadinessSnapshot> {
  const probeGemini = options?.probeGemini !== false;
  const key = getIronboardApiKey();
  const geminiKey = inspectGeminiApiKeyShape(key);
  const model = getIronboardGeminiModel();
  const origin = resolveIronframeCoreOrigin();

  const coreTelemetry = await probeCoreTelemetry(origin);

  let geminiProbe: IronboardReadinessSnapshot["geminiProbe"] = {
    ok: false,
    skipped: true,
    model,
    detail: "skipped",
  };

  if (!geminiKey.ok) {
    geminiProbe = { ok: false, skipped: true, model, detail: geminiKey.reason };
  } else if (probeGemini && key) {
    const live = await probeGeminiOnce(key, model);
    geminiProbe = { ok: live.ok, skipped: false, model, detail: live.detail };
  }

  const ready = geminiKey.ok && coreTelemetry.ok && (geminiProbe.skipped || geminiProbe.ok);

  return {
    ready,
    checkedAt: new Date().toISOString(),
    geminiKey,
    geminiProbe,
    coreTelemetry: {
      ok: coreTelemetry.ok,
      origin,
      detail: coreTelemetry.detail,
    },
  };
}
