import { resolveIronframeCoreOrigin } from "../services/coreTelemetryBridge.js";

export type AppDocumentReadingLevel = "LEVEL_1" | "LEVEL_2" | "TRAINING";

export class AppDocumentGatewayError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "AppDocumentGatewayError";
  }
}

function normalizeAppDocumentSlug(slugInput: string): string {
  const trimmed = slugInput.trim().replace(/\\/g, "/").replace(/^\/+/, "").replace(/\.md$/i, "");
  if (!trimmed || trimmed.toLowerCase() === "readme") return "readme";
  return trimmed.toLowerCase();
}

function inferReadingLevelFromSlug(slug: string): AppDocumentReadingLevel {
  const normalized = normalizeAppDocumentSlug(slug);
  if (normalized.startsWith("training/")) return "TRAINING";
  if (normalized.startsWith("technical/")) return "LEVEL_2";
  if (normalized.startsWith("user-manuals/") || normalized.startsWith("end-users/") || normalized === "readme") {
    return "LEVEL_1";
  }
  return "LEVEL_2";
}

function inferTitleFromMarkdown(content: string, slug: string): string {
  const h1 = content.match(/^#\s+(.+)$/m);
  if (h1?.[1]?.trim()) return h1[1].trim();
  const leaf = slug.split("/").pop() ?? slug;
  return leaf.replace(/[-_]+/g, " ").replace(/\b\w/g, (char) => char.toUpperCase());
}

export function resolveInternalGatewaySecret(): string | undefined {
  return (
    process.env.INTERNAL_GATEWAY_SECRET_KEY?.trim() ||
    process.env.IRONFRAME_INTERNAL_GATES_SECRET?.trim() ||
    undefined
  );
}

export type PushAppDocumentInput = {
  relativePath: string;
  content: string;
  title?: string;
  readingLevel?: AppDocumentReadingLevel;
};

export async function pushAppDocumentToIronframe(
  input: PushAppDocumentInput,
): Promise<{ targetSlug: string; documentId: string }> {
  const secret = resolveInternalGatewaySecret();
  if (!secret) {
    throw new AppDocumentGatewayError("INTERNAL_GATEWAY_SECRET_KEY is not configured", 503);
  }

  const slug = normalizeAppDocumentSlug(input.relativePath);
  const readingLevel = input.readingLevel ?? inferReadingLevelFromSlug(slug);
  const title = input.title?.trim() || inferTitleFromMarkdown(input.content, slug);
  const origin = resolveIronframeCoreOrigin();

  const response = await fetch(`${origin}/api/documentation/execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${secret}`,
      "x-ironboard-documentation-ingress": "1",
    },
    body: JSON.stringify({ slug, title, content: input.content, readingLevel }),
  });

  const payload = (await response.json().catch(() => ({}))) as {
    ok?: boolean;
    error?: string;
    targetSlug?: string;
    documentId?: string;
  };

  if (!response.ok) {
    throw new AppDocumentGatewayError(
      payload.error ?? `Ironframe documentation ingress HTTP ${response.status}`,
      response.status,
    );
  }

  return {
    targetSlug: payload.targetSlug ?? slug,
    documentId: payload.documentId ?? "",
  };
}
